from unittest.mock import patch

from django.test import TestCase
from django.urls import resolve
from rest_framework.test import APIClient

from . import commerce_views
from .models import ContactMessage, Order, OrderItem, Payment, Product, ProductReview, ReturnRequest, User
from .selectors import product_reads
from .serializers import AdminProductReadSerializer, PublicProductReadSerializer


class RouteContractTests(TestCase):
    def test_customer_order_routes_use_commerce(self):
        for path, view in (
            ('orders/create/', commerce_views.create_order),
            ('orders/my/', commerce_views.my_orders),
            ('orders/ORD-test/', commerce_views.order_detail),
            ('orders/ORD-test/cancel/', commerce_views.cancel_order),
        ):
            with self.subTest(path=path):
                self.assertIs(resolve('/api/' + path).func, view)


class ProductContractTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user('contract-staff', 'staff@example.invalid', is_staff=True)
        self.buyer = User.objects.create_user('contract-buyer', 'buyer@example.invalid')
        self.product = Product.objects.create(id='contract-product', name='Suit', price=100, stock=3)
        self.client = APIClient()

    def test_public_and_staff_keys_are_deliberate(self):
        public = self.client.get('/api/products/').data[0]
        self.assertEqual(set(public), set(PublicProductReadSerializer.Meta.fields))
        self.assertNotIn('inventory_version', public)
        self.client.force_authenticate(self.staff)
        staff = self.client.get('/api/admin/products/contract-product/').data
        self.assertEqual(set(staff), set(AdminProductReadSerializer.Meta.fields))
        self.assertTrue(staff['inventory_version'])
        response = self.client.put('/api/admin/products/contract-product/', {
            'name': 'Edited', 'created_at': '2000-01-01T00:00:00Z', 'rating': 5,
            'review_count': 900, 'compare_at_price': '-1',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Suit')

    def test_all_product_mutations_still_require_staff(self):
        for actor in (None, self.buyer):
            self.client.force_authenticate(actor)
            for path in ('/api/products/contract-product/', '/api/admin/products/contract-product/'):
                for method in ('put', 'delete'):
                    response = getattr(self.client, method)(path, {'name': 'Forbidden'}, format='json')
                    self.assertIn(response.status_code, (401, 403))
            response = self.client.post('/api/admin/products/', {'name': 'Forbidden'}, format='json')
            self.assertIn(response.status_code, (401, 403))
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Suit')

    def test_database_error_details_are_not_returned(self):
        from django.db import IntegrityError
        self.client.force_authenticate(self.staff)
        with patch('shop.views.save_product', side_effect=IntegrityError('private database diagnostic')):
            response = self.client.put('/api/admin/products/contract-product/', {'name': 'Edit'}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'product_conflict')
        self.assertNotIn('private', str(response.data))

    def test_review_aggregation_has_constant_query_budget_and_approved_only_values(self):
        ProductReview.objects.create(product=self.product, user=self.staff, rating=5, status='approved')
        ProductReview.objects.create(product=self.product, user=self.buyer, rating=1, status='pending')
        with self.assertNumQueries(2):
            one = PublicProductReadSerializer(product_reads(), many=True).data
        self.assertEqual((one[0]['rating'], one[0]['review_count']), (5.0, 1))
        Product.objects.bulk_create([
            Product(id=f'bulk-{index}', name='Suit', price=100) for index in range(99)
        ])
        with self.assertNumQueries(2):
            many = PublicProductReadSerializer(product_reads(), many=True).data
        self.assertEqual(len(many), 100)
        empty = next(item for item in many if item['id'] == 'bulk-0')
        self.assertEqual((empty['rating'], empty['review_count']), (None, 0))


class AdminPaginationTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user('pager-staff', 'pager@example.invalid', is_staff=True)
        self.buyer = User.objects.create_user('pager-buyer', 'pager-buyer@example.invalid')
        self.client = APIClient()
        for index in range(103):
            Product.objects.create(id=f'page-{index:03}', name='Suit', price=10)
            Order.objects.create(id=f'ORD-PAGE-{index:03}', user=self.buyer, total=10)
            ContactMessage.objects.create(name='Buyer', email='buyer@example.invalid', message='Hello')
            User.objects.create_user(f'page-{index:03}', f'page-{index:03}@example.invalid')

    def test_product_search_and_ordering_apply_before_pagination(self):
        self.client.force_authenticate(self.staff)
        Product.objects.filter(id='page-001').update(name='Special suit', price=99)
        Product.objects.filter(id='page-002').update(name='Special suit', price=25)
        params = {'search': 'Special', 'ordering': 'price-desc', 'page_size': 1}
        first = self.client.get('/api/admin/products/', params)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['count'], 2)
        self.assertEqual(first.data['results'][0]['id'], 'page-001')
        second = self.client.get(first.data['next'])
        self.assertEqual(second.data['results'][0]['id'], 'page-002')
        self.assertEqual(second.data['count'], 2)
        self.assertEqual(self.client.get('/api/admin/products/', {'ordering': 'private_field'}).status_code, 400)

    def test_order_filters_and_message_search_use_server_counts(self):
        from datetime import datetime, timezone
        self.client.force_authenticate(self.staff)
        Order.objects.filter(id='ORD-PAGE-002').update(
            recipient_name='Specific Buyer', status='processing',
            created_at=datetime(2025, 2, 4, 12, tzinfo=timezone.utc),
        )
        response = self.client.get('/api/admin/orders/', {
            'search': 'Specific', 'status': 'processing', 'date_start': '2025-02-04', 'date_end': '2025-02-04', 'page_size': 1,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], 'ORD-PAGE-002')
        for params in ({'date_start': '2025-02-31'}, {'date_end': 'bad'}, {'status': 'invalid'}):
            self.assertEqual(self.client.get('/api/admin/orders/', params).status_code, 400)
        ContactMessage.objects.create(name='Specific', email='specific@example.invalid', message='Find me')
        response = self.client.get('/api/admin/messages/', {'search': 'Find me'})
        self.assertEqual(response.data['count'], 1)

    def test_admin_collections_are_bounded_complete_and_permission_checked(self):
        for collection in ('products', 'orders', 'users', 'messages'):
            path = f'/api/admin/{collection}/'
            for actor in (None, self.buyer):
                self.client.force_authenticate(actor)
                self.assertIn(self.client.get(path).status_code, (401, 403))
            self.client.force_authenticate(self.staff)
            first = self.client.get(path)
            self.assertEqual(first.status_code, 200)
            self.assertEqual(len(first.data['results']), 25)
            self.assertIsNone(first.data['previous'])
            seen = [row['id'] for row in first.data['results']]
            current = first
            while current.data['next']:
                current = self.client.get(current.data['next'])
                seen.extend(row['id'] for row in current.data['results'])
            self.assertEqual(len(seen), first.data['count'])
            self.assertEqual(len(set(seen)), len(seen))
            limited = self.client.get(path, {'page_size': 999})
            self.assertEqual(len(limited.data['results']), 100)
            self.assertEqual(self.client.get(path, {'page': 999}).data['results'], [])
            malformed = self.client.get(path, {'page': 'bad', 'page_size': 'bad'})
            self.assertEqual((malformed.data['page'], malformed.data['page_size']), (1, 25))


class LegacyOrderContractTests(TestCase):
    def test_missing_payment_history_is_readable_but_cannot_be_refunded(self):
        from .commerce_services import CommerceError, transition_return
        buyer = User.objects.create_user('legacy-buyer', 'legacy@example.invalid')
        client = APIClient()
        client.force_authenticate(buyer)
        for status in ('pending', 'delivered', 'cancelled'):
            order = Order.objects.create(id=f'LEGACY-{status}', user=buyer, total=10, status=status)
            response = client.get(f'/api/orders/{order.pk}/')
            self.assertEqual(response.status_code, 200)
            self.assertIsNone(response.data['payment'])
            self.assertEqual(response.data['status'], status)
            other = APIClient()
            other.force_authenticate(User.objects.create_user(f'other-{status}', f'{status}@example.invalid'))
            self.assertEqual(other.get(f'/api/orders/{order.pk}/').status_code, 404)
        delivered = Order.objects.get(pk='LEGACY-delivered')
        line = OrderItem.objects.create(order=delivered, qty=1, price=10, product_name='Historical suit')
        returned = ReturnRequest.objects.create(
            user=buyer, order=delivered, order_item=line, quantity=1, reason='Size', status='received',
        )
        with self.assertRaises(CommerceError) as error:
            transition_return(returned.pk, 'refunded', buyer)
        self.assertEqual(error.exception.code, 'payment_not_found')
        returned.refresh_from_db()
        self.assertEqual(returned.status, 'received')
        self.assertFalse(Payment.objects.exists())
