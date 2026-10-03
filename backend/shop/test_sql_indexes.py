"""Disposable SQL index evidence; never inferred from SQLite."""
import re
from unittest import skipUnless

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

from .models import Product, ProductVariant


@skipUnless(connection.vendor == 'microsoft', 'Dedicated SQL Server lane only')
class SqlIndexTests(TransactionTestCase):
    def test_sku_index_migration_forward_reverse_keeps_uniqueness(self):
        before = [('shop', '0007_commerce_payment_refund_states')]
        after = [('shop', '0008_remove_redundant_sku_index')]
        latest = MigrationExecutor(connection).loader.graph.leaf_nodes()
        def constraints():
            with connection.cursor() as cursor:
                return connection.introspection.get_constraints(cursor, 'shop_productvariant')
        try:
            MigrationExecutor(connection).migrate(before)
            self.assertIn('variant_sku_idx', constraints())
            MigrationExecutor(connection).migrate(after)
            current = constraints()
            self.assertNotIn('variant_sku_idx', current)
            self.assertTrue(any(value['unique'] and value['columns'] == ['sku'] for value in current.values()))
            MigrationExecutor(connection).migrate(before)
            self.assertIn('variant_sku_idx', constraints())
        finally:
            MigrationExecutor(connection).migrate(latest)

    def test_sku_index_shapes_and_lookup_plan(self):
        product = Product.objects.create(id='index-product', name='Synthetic', price=10)
        ProductVariant.objects.bulk_create([
            ProductVariant(product=product, sku=f'INDEX-{index:04}', size=str(index)) for index in range(1000)
        ])
        with connection.cursor() as cursor:
            cursor.execute("""SELECT i.name, i.is_unique, c.name, ic.key_ordinal, ic.is_included_column
                FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id
                JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
                WHERE i.object_id=OBJECT_ID('shop_productvariant') ORDER BY i.name, ic.key_ordinal""")
            rows = cursor.fetchall()
            sku_indexes = {}
            for name, unique, column, ordinal, included in rows:
                if ordinal and not included:
                    entry = sku_indexes.setdefault(name, {'unique': unique, 'columns': []})
                    entry['columns'].append(column)
            sku_indexes = {name: info for name, info in sku_indexes.items() if info['columns'] == ['sku']}
            print('SQL SKU INDEX SHAPES:', sku_indexes)
            self.assertTrue(any(info['unique'] for info in sku_indexes.values()))
            self.assertNotIn('variant_sku_idx', sku_indexes)
            cursor.execute('SET SHOWPLAN_XML ON')
            try:
                cursor.execute("SELECT id FROM shop_productvariant WHERE sku = 'INDEX-0500'")
                plan = cursor.fetchone()[0]
            finally:
                cursor.execute('SET SHOWPLAN_XML OFF')
            print('SQL SKU LOOKUP PLAN:', sorted(set(re.findall(r'Index="([^"]+)"', plan))))
            self.assertIn('Index Seek', plan)
