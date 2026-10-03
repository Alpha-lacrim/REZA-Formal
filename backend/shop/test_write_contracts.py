from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Coupon, NewsletterSubscription, Order, Product, ShippingMethod, User


class WriteContractTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user('writer', 'writer@example.invalid', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def test_profile_is_bounded_and_cannot_elevate_role(self):
        for field, value in [('first_name', None), ('last_name', 'x' * 151),
                             ('phone', []), ('phone', 'x' * 33), ('address', 'x' * 2001)]:
            with self.subTest(field=field):
                response = self.client.put('/api/auth/me/update/', {field: value}, format='json')
                self.assertEqual(response.status_code, 400, response.data)
        response = self.client.put('/api/auth/me/update/', {'name': 'Updated', 'role': 'admin'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertEqual((self.staff.first_name, self.staff.role), ('Updated', 'user'))

    def test_non_object_product_and_promotion_payloads_are_validation_errors(self):
        for path in ('/api/admin/products/', '/api/products/new/', '/api/admin/coupons/',
                     '/api/admin/shipping-methods/'):
            for payload in ([], 12, 'invalid'):
                with self.subTest(path=path, payload=payload):
                    self.assertEqual(self.client.post(path, payload, format='json').status_code, 400)

    def test_coupon_range_dates_and_merged_update(self):
        url = '/api/admin/coupons/'
        for data in [
            {'type': 'percent', 'value': '101'},
            {'type': 'fixed', 'value': '-1'},
            {'type': 'fixed', 'value': '1', 'minimum_order_amount': '-1'},
            {'type': 'fixed', 'value': '1', 'maximum_discount_amount': '-1'},
            {'type': 'fixed', 'value': '1', 'starts_at': '2026-02-01T00:00:00Z', 'expires_at': '2026-01-01T00:00:00Z'},
        ]:
            response = self.client.post(url, {'code': 'BAD', **data}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Coupon.objects.count(), 0)
        coupon = Coupon.objects.create(code='SAVED', discount_type='fixed', value=101)
        response = self.client.put(f'{url}{coupon.pk}/', {'type': 'percent'}, format='json')
        self.assertEqual(response.status_code, 400)
        coupon.refresh_from_db()
        self.assertEqual(coupon.discount_type, 'fixed')
        duplicate = self.client.post(url, {'code': ' saved ', 'type': 'fixed', 'value': 1}, format='json')
        self.assertEqual(duplicate.status_code, 400)

    def test_shipping_validates_partial_state_and_negative_amounts(self):
        method = ShippingMethod.objects.create(code='SHIP', name='Ship', estimated_days_min=2, estimated_days_max=4)
        for data in [{'estimated_days_min': 5}, {'estimated_days_max': 1}, {'price': '-1'}, {'free_above': '-1'}]:
            response = self.client.put(f'/api/admin/shipping-methods/{method.pk}/', data, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        method.refresh_from_db()
        self.assertEqual((method.estimated_days_min, method.estimated_days_max), (2, 4))

    def test_promotion_multipart_fields_survive_code_normalization(self):
        coupon = self.client.post('/api/admin/coupons/', {
            'code': ' form-coupon ', 'type': 'fixed', 'value': '10',
        }, format='multipart')
        shipping = self.client.post('/api/admin/shipping-methods/', {
            'code': ' form-shipping ', 'name': 'Shipping', 'price': '10',
        }, format='multipart')
        self.assertEqual(coupon.status_code, 201, coupon.data)
        self.assertEqual(shipping.status_code, 201, shipping.data)
        self.assertEqual(coupon.data['code'], 'FORM-COUPON')
        self.assertEqual(shipping.data['code'], 'FORM-SHIPPING')

    def test_unidentified_write_conflict_is_not_mislabeled_as_own_duplicate(self):
        coupon = Coupon.objects.create(code='OWN', discount_type='fixed', value=10)
        with patch('shop.commerce_views.CouponSerializer.save', side_effect=IntegrityError('private diagnostic')):
            response = self.client.put(f'/api/admin/coupons/{coupon.pk}/', {'code': 'OWN'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'write_conflict')
        self.assertNotIn('private', str(response.data))

    def test_checkout_bounds_address_lines_and_total_before_writes(self):
        product = Product.objects.create(id='huge', name='Suit', price='9999999999.99', stock=2)
        base = {'items': [{'product_id': product.pk, 'quantity': 1}], 'shipping_address': 'Street'}
        for address in [[], 123, 'x' * 2001, {
            'recipientName': 'Buyer', 'phone': 'x' * 33, 'province': 'Tehran',
            'city': 'Tehran', 'addressLine': 'Street',
        }]:
            response = self.client.post('/api/orders/create/', {**base, 'shipping_address': address}, format='json')
            self.assertEqual(response.status_code, 400, response.data)
        response = self.client.post('/api/orders/create/', {**base, 'items': base['items'] * 101}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post('/api/orders/create/', {
            **base, 'items': [{'product_id': product.pk, 'quantity': 2}],
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'order_total_exceeded')
        self.assertFalse(Order.objects.exists())
        product.refresh_from_db()
        self.assertEqual(product.stock, 2)

    def test_newsletter_repeat_case_and_reactivation(self):
        self.client.force_authenticate(None)
        first = self.client.post('/api/newsletter/subscribe/', {'email': 'Reader@example.com'}, format='json')
        repeat = self.client.post('/api/newsletter/subscribe/', {'email': 'READER@example.com'}, format='json')
        self.assertEqual((first.status_code, repeat.status_code), (201, 200))
        subscription = NewsletterSubscription.objects.get()
        original_time = subscription.subscribed_at
        self.assertEqual(subscription.email, 'reader@example.com')
        self.assertEqual(first.data['id'], repeat.data['id'])
        NewsletterSubscription.objects.filter(pk=subscription.pk).update(is_active=False, unsubscribed_at=timezone.now())
        reactivated = self.client.post('/api/newsletter/subscribe/', {'email': subscription.email}, format='json')
        self.assertEqual(reactivated.status_code, 200)
        subscription.refresh_from_db()
        self.assertTrue(subscription.is_active)
        self.assertIsNone(subscription.unsubscribed_at)
        self.assertGreaterEqual(subscription.subscribed_at, original_time)

    def test_quote_does_not_require_a_completed_checkout_address(self):
        product = Product.objects.create(id='quote-address', name='Suit', price=10, stock=2)
        payload = {
            'items': [{'product_id': product.pk, 'quantity': 1}],
            'shipping_address': {'recipient_name': '', 'phone': '', 'address_line': ''},
        }
        self.assertEqual(self.client.post('/api/checkout/quote/', payload, format='json').status_code, 200)
        self.assertEqual(self.client.post('/api/orders/create/', payload, format='json').status_code, 400)
        self.assertFalse(Order.objects.exists())
