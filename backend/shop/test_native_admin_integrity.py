from django.contrib.auth.models import Permission
from django.forms.models import model_to_dict
from django.test import TestCase

from .commerce_services import create_checkout_order
from .models import InventoryMovement, OrderEvent, Product, ProductVariant, ReturnRequest, User


class NativeAdminIntegrityTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_superuser('native-admin', 'native-admin@example.invalid', 'Test-only-493!')
        self.product = Product.objects.create(id='native-product', name='Suit', price='100', stock=5)
        self.variant = ProductVariant.objects.create(product=self.product, sku='NATIVE-SUIT', stock=5)
        self.order, _ = create_checkout_order(self.staff, {
            'items': [{'variant_id': self.variant.pk, 'quantity': 1}], 'shipping_address': 'Test address',
        })
        self.return_request = ReturnRequest.objects.create(
            user=self.staff, order=self.order, order_item=self.order.items.get(), quantity=1, reason='Size',
        )
        self.records = (self.product, self.variant, self.order, self.order.payment, self.return_request)
        self.client.force_login(self.staff)

    def test_superuser_cannot_bypass_services_through_forms_inlines_or_add(self):
        before = []
        for obj in self.records:
            obj.refresh_from_db()
            before.append(model_to_dict(obj))
        for obj in self.records:
            with self.subTest(model=obj._meta.model_name):
                base = f'/admin/shop/{obj._meta.model_name}/'
                self.assertEqual(self.client.get(f'{base}{obj.pk}/change/').status_code, 200)
                response = self.client.post(f'{base}{obj.pk}/change/', {
                    'stock': 99, 'status': 'refunded', 'is_active': '', 'name': 'Tampered',
                    'payment-0-status': 'paid', 'variants-0-stock': 99, '_save': 'Save',
                })
                self.assertEqual(response.status_code, 403)
                self.assertEqual(self.client.post(f'{base}add/', {'stock': 99}).status_code, 403)
        for obj, expected in zip(self.records, before):
            obj.refresh_from_db()
            self.assertEqual(model_to_dict(obj), expected)
        self.assertEqual(InventoryMovement.objects.count(), 1)
        self.assertEqual(OrderEvent.objects.count(), 1)

    def test_individual_and_bulk_deletes_preserve_financial_history(self):
        for obj in self.records:
            with self.subTest(model=obj._meta.model_name):
                base = f'/admin/shop/{obj._meta.model_name}/'
                self.assertEqual(self.client.post(f'{base}{obj.pk}/delete/', {'post': 'yes'}).status_code, 403)
                self.client.post(base, {'action': 'delete_selected', '_selected_action': [str(obj.pk)], 'post': 'yes'})
                self.assertTrue(type(obj).objects.filter(pk=obj.pk).exists())
        self.assertEqual(self.order.items.count(), 1)
        self.assertEqual(InventoryMovement.objects.count(), 1)

    def test_model_change_permissions_do_not_restore_service_owned_writes(self):
        limited = User.objects.create_user('native-limited', 'native-limited@example.invalid', 'Test-only-493!', is_staff=True)
        limited.user_permissions.add(*Permission.objects.filter(content_type__app_label='shop'))
        self.client.force_login(limited)
        response = self.client.post(f'/admin/shop/productvariant/{self.variant.pk}/change/', {'stock': 99})
        self.assertEqual(response.status_code, 403)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 4)
