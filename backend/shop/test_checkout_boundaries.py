"""HTTP boundary regressions; all fixtures are synthetic and transaction isolated."""
import uuid
from datetime import timedelta
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .commerce_services import create_checkout_order
from .models import Coupon, CouponRedemption, InventoryMovement, Order, Payment, Product, ProductVariant, User


class CheckoutBoundaryTests(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user('boundary', 'boundary@example.invalid', 'Test-only-493!')
        self.other = User.objects.create_user('other-boundary', 'other-boundary@example.invalid', 'Test-only-493!')
        self.product = Product.objects.create(id='boundary-suit', name='Suit', price='100', stock=2)
        self.variant = ProductVariant.objects.create(product=self.product, sku='BOUNDARY', stock=2)
        self.client = APIClient()
        self.client.force_authenticate(self.buyer)
        self.payload = {'items': [{'variant_id': str(self.variant.pk), 'quantity': 1}],
                        'shipping_address': 'Synthetic test address', 'payment_method': 'cod'}

    def assert_untouched(self):
        self.variant.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual((self.variant.stock, self.product.stock), (2, 2))
        for model in (Order, Payment, InventoryMovement, CouponRedemption):
            self.assertFalse(model.objects.exists(), model.__name__)

    def test_checkout_serializer_rejects_invalid_shapes_and_quantities(self):
        for changes in ({'items': []}, {'items': None}, {'items': 'bad'},
                        {'items': [{'quantity': 1}]},
                        {'items': [{'variant_id': 'not-a-uuid', 'quantity': 1}]},
                        *({'items': [{'id': self.product.pk, 'quantity': qty}]} for qty in (0, -1, 101, 'bad')),
                        {'idempotency_key': 'invalid'}, {'payment_method': 'invented'},
                        {'customer_note': 'x' * 2001}):
            with self.subTest(changes=changes):
                response = self.client.post('/api/orders/create/', {**self.payload, **changes}, format='json')
                self.assertEqual(response.status_code, 400, response.data)
                self.assert_untouched()

    def test_malformed_json_and_top_level_arrays_are_client_errors(self):
        for data in ('{', '[]', 'null', '"string"'):
            with self.subTest(data=data):
                response = self.client.generic('POST', '/api/orders/create/', data, content_type='application/json')
                self.assertEqual(response.status_code, 400)
                self.assert_untouched()

    def test_anonymous_checkout_and_customer_staff_writes_are_denied(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.post('/api/orders/create/', self.payload, format='json').status_code, (401, 403))
        self.client.force_authenticate(self.buyer)
        for method, path in (('post', '/api/admin/products/'), ('put', f'/api/admin/products/{self.product.pk}/'),
                             ('delete', f'/api/admin/products/{self.product.pk}/'), ('post', '/api/admin/coupons/')):
            with self.subTest(method=method, path=path):
                self.assertEqual(getattr(self.client, method)(path, {}, format='json').status_code, 403)
        self.assert_untouched()

    def test_foreign_order_read_and_cancel_cannot_mutate_inventory(self):
        order, _ = create_checkout_order(self.buyer, self.payload)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/').status_code, 404)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/cancel/').status_code, 404)
        self.variant.refresh_from_db(); order.refresh_from_db()
        self.assertEqual(self.variant.stock, 1)
        self.assertEqual(order.status, 'pending')

    def test_multi_line_shortage_rolls_back_entire_checkout(self):
        payload = {**self.payload, 'items': [*self.payload['items'], {'id': 'missing', 'quantity': 1}]}
        response = self.client.post('/api/orders/create/', payload, format='json')
        self.assertIn(response.status_code, (400, 404, 409))
        self.assert_untouched()

    def test_failure_after_inventory_and_coupon_write_rolls_back_everything(self):
        Coupon.objects.create(code='ROLLBACK', discount_type='fixed', value=10)
        with patch('shop.commerce_services.Payment.objects.create', side_effect=RuntimeError('test failure')):
            with self.assertRaises(RuntimeError):
                create_checkout_order(self.buyer, {**self.payload, 'coupon_code': 'ROLLBACK'})
        self.assert_untouched()

    def test_inactive_and_expired_coupons_cannot_consume_stock(self):
        for code, changes in (('OFF', {'is_active': False}), ('EXPIRED', {'ends_at': timezone.now() - timedelta(days=1)})):
            Coupon.objects.create(code=code, discount_type='fixed', value=10, **changes)
            response = self.client.post('/api/orders/create/', {**self.payload, 'coupon_code': code}, format='json')
            self.assertIn(response.status_code, (400, 409))
            self.assert_untouched()

    def test_replay_after_cancellation_does_not_create_or_decrement_again(self):
        payload = {**self.payload, 'idempotency_key': str(uuid.uuid4())}
        first = self.client.post('/api/orders/create/', payload, format='json')
        self.assertEqual(first.status_code, 201)
        order_id = first.data['order']['id']
        self.assertEqual(self.client.post(f'/api/orders/{order_id}/cancel/').status_code, 200)
        replay = self.client.post('/api/orders/create/', payload, format='json')
        self.assertEqual(replay.status_code, 200)
        self.assertEqual(replay.data['order']['id'], order_id)
        self.assertEqual(Order.objects.count(), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 2)
        self.assertEqual(InventoryMovement.objects.filter(reason='cancel').count(), 1)

    def test_customer_upload_denied_before_storage(self):
        from pathlib import Path
        with TemporaryDirectory() as media, override_settings(MEDIA_ROOT=media):
            response = self.client.post('/api/admin/products/', {
                'name': 'Forbidden', 'price': '10', 'image': SimpleUploadedFile('bad.png', b'bad', 'image/png'),
            }, format='multipart')
            self.assertEqual(response.status_code, 403)
            self.assertEqual(list(Path(media).rglob('*')), [])
