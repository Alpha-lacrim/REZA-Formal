"""Synthetic API measurements, with authentication excluded from query budgets."""
from decimal import Decimal
import json
from io import StringIO
import uuid

from django.db import connection
from django.core.management import call_command
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from .models import (ContactMessage, Order, OrderItem, Payment, Product,
                     ProductReview, ProductVariant, ReturnRequest, SavedCartItem, User)


class PerformanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = User.objects.create_user('perf-staff', 'perf-staff@example.invalid', is_staff=True)
        cls.buyer = User.objects.create_user('perf-buyer', 'perf-buyer@example.invalid')
        cls.products = []
        for index in range(30):
            product = Product.objects.create(id=f'perf-{index:03}', name=f'Suit {index}',
                category='suits', fabric='Wool', price=100, stock=100, description='D' * 4000,
                images=['/media/suit.jpg'] * 8)
            variant = ProductVariant.objects.create(product=product, sku=f'PERF-{index}', stock=100)
            SavedCartItem.objects.create(user=cls.buyer, variant=variant, quantity=1)
            order = Order.objects.create(id=f'ORD-PERF-{index}', user=cls.buyer, total=100, subtotal=100,
                                         status='delivered')
            item = OrderItem.objects.create(order=order, product=product, variant=variant,
                price=100, qty=1, product_name=product.name)
            Payment.objects.create(order=order, amount=100, status='paid', method='cod')
            ProductReview.objects.create(product=product, user=cls.buyer, rating=5, status='approved')
            ReturnRequest.objects.create(order=order, order_item=item, user=cls.buyer,
                                         quantity=1, reason='Synthetic')
            ContactMessage.objects.create(name='Synthetic', email='perf@example.invalid', message='Hello')
            cls.products.append(product)

    def test_measure_critical_paths(self):
        client = APIClient()
        paths = [('products', '/api/products/', None),
                 ('detail', '/api/products/perf-000/', None),
                 ('admin-products', '/api/admin/products/', self.staff),
                 ('customer-orders', '/api/orders/my/', self.buyer),
                 ('admin-orders', '/api/admin/orders/', self.staff),
                 ('reviews', '/api/products/perf-000/reviews/', None),
                 ('admin-reviews', '/api/admin/reviews/', self.staff),
                 ('users', '/api/admin/users/', self.staff),
                 ('messages', '/api/admin/messages/', self.staff),
                 ('returns', '/api/returns/', self.buyer),
                 ('admin-returns', '/api/admin/returns/', self.staff),
                 ('cart', '/api/cart/', self.buyer),
                 ('stats', '/api/admin/stats/', self.staff)]
        budgets = {'products': 3, 'detail': 2, 'admin-products': 3, 'customer-orders': 5,
                   'admin-orders': 5, 'reviews': 3, 'admin-reviews': 2, 'users': 2,
                   'messages': 2, 'returns': 3, 'admin-returns': 3, 'cart': 2, 'stats': 9}
        for name, path, actor in paths:
            client.force_authenticate(actor)
            with CaptureQueriesContext(connection) as queries:
                response = client.get(path)
                response.render()
            self.assertEqual(response.status_code, 200, (name, response.data))
            self.assertLessEqual(len(queries), budgets[name], name)
            if name == 'cart':
                self.assertLess(len(response.content), 40000)
                self.assertEqual(len(response.data['lines']), 30)
            if name == 'products':
                self.assertLess(len(response.content), 20000)
                self.assertEqual(response.data['count'], 30)
                self.assertEqual(len(response.data['results']), 25)
            print(f'PERF {name}: queries={len(queries)} bytes={len(response.content)}')
        client.force_authenticate(self.buyer)
        for size in (1, 30):
            payload = {'items': [{'product_id': p.pk, 'quantity': 1} for p in self.products[:size]]}
            with CaptureQueriesContext(connection) as queries:
                response = client.post('/api/checkout/quote/', payload, format='json')
                response.render()
            self.assertEqual(response.status_code, 200, response.data)
            # Persistent abuse controls add constant work independent of line
            # count: at most five queries to create a window, two thereafter.
            self.assertLessEqual(len(queries), 9 if size == 1 else 6)
            print(f'PERF quote-{size}: queries={len(queries)} bytes={len(response.content)}')

    def test_one_row_pages_and_single_cart_line_have_same_budgets(self):
        client = APIClient()
        for path, actor, budget in [('/api/products/', None, 3), ('/api/admin/products/', self.staff, 3),
                ('/api/orders/my/', self.buyer, 5), ('/api/admin/orders/', self.staff, 5),
                ('/api/returns/', self.buyer, 3), ('/api/admin/returns/', self.staff, 3)]:
            client.force_authenticate(actor)
            with self.assertNumQueries(budget):
                response = client.get(path, {'page_size': 1})
            self.assertEqual(len(response.data['results']), 1)
        SavedCartItem.objects.exclude(variant__product=self.products[0]).delete()
        client.force_authenticate(self.buyer)
        with self.assertNumQueries(2):
            response = client.get('/api/cart/')
        self.assertEqual(len(response.data['lines']), 1)

    def test_checkout_measurements_keep_inventory_ledger_and_replay(self):
        client = APIClient()
        client.force_authenticate(self.buyer)
        for size in (1, 30):
            payload = {'items': [{'product_id': p.pk, 'quantity': 1} for p in self.products[:size]],
                       'shipping_address': 'Synthetic delivery address', 'idempotency_key': str(uuid.uuid4())}
            with CaptureQueriesContext(connection) as queries:
                response = client.post('/api/orders/create/', payload, format='json')
                response.render()
            self.assertEqual(response.status_code, 201, response.data)
            print(f'PERF checkout-{size}: queries={len(queries)} bytes={len(response.content)}')
            replay = client.post('/api/orders/create/', payload, format='json')
            self.assertEqual(replay.status_code, 200)
            self.assertEqual(replay.data['order']['id'], response.data['order']['id'])
        self.products[0].refresh_from_db()
        self.assertEqual(self.products[0].stock, 98)

    def test_public_filters_facets_and_hidden_products_before_pagination(self):
        client = APIClient()
        Product.objects.filter(pk='perf-000').update(is_active=False, fabric='Hidden')
        Product.objects.filter(pk='perf-029').update(name='Needle', price=150, fabric='Linen')
        response = client.get('/api/products/', {'search': 'Needle', 'category': 'suits',
            'fabric': 'Linen', 'price_min': 140, 'price_max': 160, 'page_size': 1})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], 'perf-029')
        self.assertNotIn('description', response.data['results'][0])
        self.assertEqual(len(response.data['results'][0]['images']), 1)
        self.assertEqual(client.get('/api/products/perf-029/').data['description'], 'D' * 4000)
        for params in ({'price_min': 'NaN'}, {'price_max': '-1'}, {'ordering': 'private'}, {'ids': ','.join(['p'] * 101)}):
            self.assertEqual(client.get('/api/products/', params).status_code, 400)
        self.assertEqual(client.get('/api/products/', {'ids': 'perf-000,perf-029'}).data['count'], 1)
        self.assertEqual(client.get('/api/products/facets/').data['fabrics'], ['Linen', 'Wool'])

    def test_revenue_aggregation_preserves_partial_full_and_legacy_clamping(self):
        payments = list(Payment.objects.order_by('pk')[:4])
        for payment, status, refunded in zip(payments,
                ['paid', 'partially_refunded', 'refunded', 'paid'], ['20.01', '35.02', '100', '999']):
            payment.status = status
            payment.metadata = {'refunded_amount': refunded, 'large_unused_history': 'X' * 10000}
            payment.save()
        client = APIClient(); client.force_authenticate(self.staff)
        with CaptureQueriesContext(connection) as queries:
            response = client.get('/api/admin/stats/')
        self.assertEqual(Decimal(response.data['revenue']), Decimal('2744.97'))
        self.assertFalse(any('large_unused_history' in query['sql'] for query in queries))

    def test_readonly_inventory_audit_reports_without_repairing(self):
        from .models import InventoryMovement
        product = self.products[0]
        Product.objects.filter(pk=product.pk).update(stock=99)
        variant = product.variants.get()
        InventoryMovement.objects.create(variant=variant, sku=variant.sku, delta=98,
                                         resulting_stock=98, reason='initial')
        output = StringIO()
        call_command('audit_inventory', limit=1, stdout=output)
        result = json.loads(output.getvalue())
        self.assertEqual(result['projection_mismatch_count'], 1)
        self.assertEqual(result['ledger_mismatch_count'], 1)
        self.assertEqual(result['variants_without_ledger_count'], 29)
        product.refresh_from_db(); variant.refresh_from_db()
        self.assertEqual((product.stock, variant.stock), (99, 100))
