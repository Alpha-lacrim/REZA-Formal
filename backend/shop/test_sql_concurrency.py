"""Real connections/transactions; skipped under SQLite, never an SQLite proof."""
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest import skipUnless
from unittest.mock import patch

from django.db import IntegrityError, close_old_connections, connection, connections, transaction
from django.test import TransactionTestCase

from .commerce_services import CommerceError, create_checkout_order, transition_order_status
from .models import InventoryMovement, Order, Payment, Product, ProductVariant, User


@skipUnless(connection.vendor == 'microsoft', 'Dedicated SQL Server lane only')
class SqlConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user('sql-buyer', 'sql-buyer@example.invalid', 'Test-only-493!')
        self.product = Product.objects.create(id='sql-suit', name='SQL suit', price=100, stock=1)
        self.variant = ProductVariant.objects.create(product=self.product, sku='SQL-SUIT', stock=1)

    def payload(self, key=None):
        return {'items': [{'variant_id': self.variant.pk, 'quantity': 1}],
                'shipping_address': 'Synthetic SQL test address', 'payment_method': 'cod',
                'idempotency_key': key or uuid.uuid4()}

    def race(self, keys):
        barrier = threading.Barrier(2)
        def checkout(key):
            close_old_connections()
            try:
                buyer = User.objects.get(pk=self.user.pk)
                barrier.wait(timeout=10)
                try:
                    order, created = create_checkout_order(buyer, self.payload(key))
                    return ('ok', order.pk, created)
                except CommerceError as error:
                    return ('rejected', error.code)
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(checkout, keys))
        self.variant.refresh_from_db(); self.product.refresh_from_db()
        self.assertEqual((self.variant.stock, self.product.stock), (0, 0))
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(InventoryMovement.objects.filter(reason='sale').count(), 1)
        return results

    def test_concurrent_checkout_cannot_oversell_last_unit(self):
        results = self.race([uuid.uuid4(), uuid.uuid4()])
        self.assertEqual(sum(row[0] == 'ok' for row in results), 1, results)
        self.assertEqual(sum(row[0] == 'rejected' for row in results), 1, results)

    def test_duplicate_idempotency_converges_to_one_order(self):
        key = uuid.uuid4()
        results = self.race([key, key])
        self.assertTrue(all(row[0] == 'ok' for row in results), results)
        self.assertEqual(results[0][1], results[1][1])
        self.assertEqual(sum(row[2] for row in results), 1)

    def test_rollback_and_cancellation_restock(self):
        with patch('shop.commerce_services.Payment.objects.create', side_effect=RuntimeError('rollback probe')):
            with self.assertRaises(RuntimeError):
                create_checkout_order(self.user, self.payload())
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 1)
        self.assertFalse(Order.objects.exists())
        self.assertFalse(InventoryMovement.objects.exists())
        self.assertFalse(Payment.objects.exists())
        order, _ = create_checkout_order(self.user, self.payload())
        transition_order_status(order.pk, 'cancelled', self.user)
        with self.assertRaises(CommerceError):
            transition_order_status(order.pk, 'cancelled', self.user)
        self.variant.refresh_from_db(); self.product.refresh_from_db()
        self.assertEqual((self.variant.stock, self.product.stock), (1, 1))
        self.assertEqual(InventoryMovement.objects.filter(reason='cancel').count(), 1)

    def test_stock_constraint_is_enforced_by_database(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductVariant.objects.filter(pk=self.variant.pk).update(stock=-1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 1)

    def test_select_for_update_blocks_an_independent_writer(self):
        attempted = threading.Event()
        completed = threading.Event()
        def write():
            close_old_connections()
            try:
                attempted.set()
                ProductVariant.objects.filter(pk=self.variant.pk).update(stock=0)
                completed.set()
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                ProductVariant.objects.select_for_update().get(pk=self.variant.pk)
                future = pool.submit(write)
                self.assertTrue(attempted.wait(5))
                self.assertFalse(completed.wait(0.5), 'Writer bypassed the held row lock')
            future.result(timeout=15)
        self.assertTrue(completed.is_set())
