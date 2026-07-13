import uuid
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from .models import (
    Address,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    ReturnRequest,
    ShippingMethod,
    User,
)


class CommerceRouteIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='route-buyer',
            email='route-buyer@example.com',
            password='A-strong-route-password-493!',
            first_name='Route Buyer',
        )
        self.admin = User.objects.create_superuser(
            username='route-admin',
            email='route-admin@example.com',
            password='A-strong-route-password-493!',
        )
        self.product = Product.objects.create(
            id='route-suit',
            name='Route Suit',
            price=Decimal('100.00'),
            currency='Toman',
            stock=4,
            images=['/images/suit/charcoal-check.jpg'],
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku='ROUTE-SUIT-50',
            size='50',
            color='Black',
            stock=4,
        )
        self.shipping = ShippingMethod.objects.create(
            code='STANDARD',
            name='Original shipping name',
            price=Decimal('20.00'),
        )
        self.address = Address.objects.create(
            user=self.user,
            recipient_name='Route Buyer',
            phone='09120000000',
            province='Tehran',
            city='Tehran',
            postal_code='1234567890',
            line1='Example street',
            is_default=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def checkout_payload(self, **overrides):
        payload = {
            'idempotency_key': str(uuid.uuid4()),
            'items': [
                {'product_id': self.product.pk, 'variant_id': str(self.variant.pk), 'quantity': 2},
            ],
            'address_id': self.address.pk,
            'payment_method': 'manual',
        }
        payload.update(overrides)
        return payload

    def test_checkout_routes_default_shipping_idempotency_and_snapshots(self):
        options = self.client.get('/api/checkout/options/')
        self.assertEqual(options.status_code, 200)
        self.assertEqual(options.data['payment_methods'], ['cod', 'manual'])

        payload = self.checkout_payload()
        quote = self.client.post('/api/checkout/quote/', payload, format='json')
        self.assertEqual(quote.status_code, 200, quote.data)
        self.assertEqual(Decimal(quote.data['shipping_total']), Decimal('20.00'))
        self.assertEqual(Decimal(quote.data['total']), Decimal('220.00'))

        created = self.client.post('/api/orders/create/', payload, format='json')
        repeated = self.client.post('/api/orders/create/', payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(repeated.status_code, 200, repeated.data)
        self.assertEqual(created.data['order']['id'], repeated.data['order']['id'])
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 2)
        self.assertEqual(created.data['order']['payment_status'], 'pending')
        self.assertEqual(created.data['order']['items'][0]['image'], '/images/suit/charcoal-check.jpg')

        self.shipping.name = 'Changed after purchase'
        self.shipping.save(update_fields=['name'])
        detail = self.client.get(f"/api/orders/{created.data['order']['id']}/")
        history = self.client.get('/api/orders/my/')
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['shipping_method']['name'], 'Original shipping name')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data['count'], 1)

    def test_admin_order_and_payment_routes_enforce_lifecycle(self):
        created = self.client.post('/api/orders/create/', self.checkout_payload(), format='json')
        order_id = created.data['order']['id']
        payment_id = created.data['payment']['id']
        admin_client = APIClient()
        admin_client.force_authenticate(self.admin)

        invalid = admin_client.put(
            f'/api/admin/orders/{order_id}/status/', {'status': 'shipped'}, format='json',
        )
        processing = admin_client.put(
            f'/api/admin/orders/{order_id}/status/', {'status': 'processing'}, format='json',
        )
        unpaid_shipping = admin_client.put(
            f'/api/admin/orders/{order_id}/status/', {'status': 'shipped'}, format='json',
        )
        paid = admin_client.put(
            f'/api/admin/payments/{payment_id}/', {'status': 'paid'}, format='json',
        )
        shipped = admin_client.put(
            f'/api/admin/orders/{order_id}/status/', {'status': 'shipped'}, format='json',
        )
        tracked = admin_client.put(
            f'/api/admin/orders/{order_id}/status/', {'tracking_code': 'TRACK-493'}, format='json',
        )

        self.assertEqual(invalid.status_code, 409)
        self.assertEqual(processing.status_code, 200)
        self.assertEqual(unpaid_shipping.status_code, 409)
        self.assertEqual(paid.status_code, 200)
        self.assertEqual(shipped.status_code, 200)
        self.assertEqual(tracked.status_code, 200)
        self.assertEqual(tracked.data['tracking_code'], 'TRACK-493')

    def test_multi_item_returns_and_note_only_admin_update(self):
        second_product = Product.objects.create(
            id='route-shirt', name='Route Shirt', price=Decimal('50.00'), stock=1,
        )
        second_variant = ProductVariant.objects.create(
            product=second_product, sku='ROUTE-SHIRT', stock=1,
        )
        order = Order.objects.create(
            id='ORD-ROUTE-RETURN', user=self.user, subtotal=Decimal('150.00'),
            total=Decimal('150.00'), status='delivered', payment_status='paid',
        )
        first_item = OrderItem.objects.create(
            order=order, product=self.product, variant=self.variant, qty=1,
            price=Decimal('100.00'), product_id_snapshot=self.product.pk,
            product_name=self.product.name, sku=self.variant.sku,
        )
        second_item = OrderItem.objects.create(
            order=order, product=second_product, variant=second_variant, qty=1,
            price=Decimal('50.00'), product_id_snapshot=second_product.pk,
            product_name=second_product.name, sku=second_variant.sku,
        )
        Payment.objects.create(
            order=order, method='manual', status='paid', amount=order.total, currency='Toman',
        )

        response = self.client.post('/api/returns/', {
            'order_id': order.pk,
            'item_ids': [first_item.pk, second_item.pk],
            'reason': 'Size issue',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(ReturnRequest.objects.filter(order=order).count(), 2)
        self.assertCountEqual(response.data['item_ids'], [str(first_item.pk), str(second_item.pk)])

        return_request = ReturnRequest.objects.filter(order=order).first()
        admin_client = APIClient()
        admin_client.force_authenticate(self.admin)
        noted = admin_client.put(
            f'/api/admin/returns/{return_request.pk}/',
            {'adminNote': 'Please retain the package.'},
            format='json',
        )
        self.assertEqual(noted.status_code, 200, noted.data)
        return_request.refresh_from_db()
        self.assertEqual(return_request.resolution_note, 'Please retain the package.')

        return_requests = list(ReturnRequest.objects.filter(order=order).order_by('pk'))
        for item in return_requests:
            for next_status in ('approved', 'received', 'refunded'):
                transition = admin_client.put(
                    f'/api/admin/returns/{item.pk}/', {'status': next_status}, format='json',
                )
                self.assertEqual(transition.status_code, 200, transition.data)

        payment = Payment.objects.get(order=order)
        order.refresh_from_db()
        self.assertEqual(payment.status, 'refunded')
        self.assertEqual(payment.metadata['refunded_amount'], '150.00')
        self.assertEqual(order.payment_status, 'refunded')
