from unittest.mock import patch

from django.test import TestCase
from django.urls import resolve
from rest_framework.test import APIClient

from . import commerce_views
from .models import Product, ProductReview, User
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
