from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from .commerce_services import create_checkout_order
from .models import InventoryMovement, NotificationOutbox, OrderEvent, Product, ProductVariant, User


class StaffOrderAtomicityTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_superuser('atomic-admin', 'atomic-admin@example.invalid', 'Test-only-493!')
        self.buyer = User.objects.create_user('atomic-buyer', 'atomic-buyer@example.invalid', 'Test-only-493!')
        self.product = Product.objects.create(id='atomic-product', name='Suit', price='100', stock=5)
        self.variant = ProductVariant.objects.create(product=self.product, sku='ATOMIC-SUIT', stock=5)
        self.order, _ = create_checkout_order(self.buyer, {
            'items': [{'variant_id': self.variant.pk, 'quantity': 2}],
            'shipping_address': 'Test address', 'payment_method': 'cod',
        })
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = f'/api/admin/orders/{self.order.pk}/status/'

    def state(self):
        self.order.refresh_from_db()
        self.variant.refresh_from_db()
        self.product.refresh_from_db()
        return (self.order.status, self.order.tracking_code, self.order.admin_note,
                self.order.payment_status, self.order.payment.status, self.variant.stock,
                self.product.stock, OrderEvent.objects.count(), InventoryMovement.objects.count(),
                NotificationOutbox.objects.count())

    def test_invalid_details_do_not_commit_transition_or_restock(self):
        original = self.state()
        for target in ('processing', 'cancelled'):
            for details in ({'tracking_code': 'x' * 129}, {'adminNote': 'x' * 5001},
                            {'trackingCode': None}, {'admin_note': ['invalid']}):
                with self.subTest(target=target, details=list(details)):
                    response = self.client.put(self.url, {'status': target, **details}, format='json')
                    self.assertEqual(response.status_code, 400)
                    self.assertEqual(self.state(), original)

    def test_detail_event_failure_rolls_back_cancellation_and_all_side_effects(self):
        original = self.state()
        create_event = OrderEvent.objects.create

        def fail_details(**values):
            if values['event_type'] == 'order_details_updated':
                raise RuntimeError('Synthetic event write failure')
            return create_event(**values)

        with patch('shop.models.OrderEvent.objects.create', side_effect=fail_details):
            with self.assertRaisesMessage(RuntimeError, 'Synthetic event write failure'):
                self.client.put(self.url, {'status': 'cancelled', 'tracking_code': 'TRACK'}, format='json')
        self.assertEqual(self.state(), original)

    def test_valid_update_is_atomic_and_cancellation_cannot_restock_twice(self):
        response = self.client.put(self.url, {
            'status': 'cancelled', 'trackingCode': ' TRACK ', 'adminNote': ' Confirmed ',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        state = self.state()
        self.assertEqual(state[:7], ('cancelled', 'TRACK', 'Confirmed', 'cancelled', 'cancelled', 5, 5))
        repeat = self.client.put(self.url, {'status': 'cancelled'}, format='json')
        self.assertEqual(repeat.status_code, 409)
        self.assertEqual(self.state(), state)
