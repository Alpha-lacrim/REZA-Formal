from unittest.mock import patch

from django.db import transaction
from django.test import TestCase
from rest_framework.test import APIClient

from .commerce_services import create_checkout_order
from .models import InventoryMovement, Product, ProductVariant, User
from .serializers import ProductSerializer
from .views import _sync_product_variants


class InventoryAuthorityTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_superuser('stock-admin', 'stock-admin@example.invalid', 'Test-only-493!')
        self.product = Product.objects.create(id='stock-product', name='Suit', price='100', stock=10)
        self.variant = ProductVariant.objects.create(product=self.product, sku='STOCK-SUIT', stock=10)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)
        self.url = f'/api/admin/products/{self.product.pk}/'

    def sell(self):
        return create_checkout_order(self.staff, {
            'items': [{'variant_id': self.variant.pk, 'quantity': 2}], 'shipping_address': 'Test address',
        })[0]

    def test_stale_serializer_description_cannot_restore_sold_stock(self):
        serializer = ProductSerializer(self.product, data={'name': 'Edited'}, partial=True)
        self.assertTrue(serializer.is_valid())
        self.sell()
        with transaction.atomic():
            serializer.save()
            _sync_product_variants(serializer.instance, None, self.staff)
        self.product.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual((self.product.name, self.product.stock, self.variant.stock), ('Edited', 8, 8))
        self.assertFalse(InventoryMovement.objects.filter(reason='adjustment').exists())

    def test_stale_absolute_inventory_write_is_rejected_on_both_routes(self):
        snapshot = self.client.get(self.url).data
        self.sell()
        for url in (self.url, f'/api/products/{self.product.pk}/'):
            for values in ({'stock': 10}, {'variants': [{
                'id': str(self.variant.pk), 'sku': self.variant.sku, 'stock': 10,
            }]}):
                response = self.client.put(url, {
                    'name': 'Must not persist', 'inventory_version': snapshot.get('inventory_version'), **values,
                }, format='json')
                self.assertEqual(response.status_code, 409, response.data)
        self.product.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual((self.product.name, self.product.stock, self.variant.stock), ('Suit', 8, 8))

    def test_fresh_adjustment_is_audited_and_missing_version_is_rejected(self):
        denied = self.client.put(self.url, {'stock': 20}, format='json')
        self.assertEqual(denied.status_code, 409, denied.data)
        snapshot = self.client.get(self.url).data
        updated = self.client.put(self.url, {
            'stock': 12, 'inventory_version': snapshot.get('inventory_version'),
        }, format='json')
        self.assertEqual(updated.status_code, 200, updated.data)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 12)
        self.assertEqual(InventoryMovement.objects.get(reason='adjustment').delta, 2)

    def test_foreign_variant_id_does_not_create_or_deactivate_inventory(self):
        other = Product.objects.create(id='other-product', name='Other', price='50', stock=1)
        foreign = ProductVariant.objects.create(product=other, sku='OTHER-SUIT', stock=1)
        snapshot = self.client.get(self.url).data
        response = self.client.put(self.url, {
            'inventory_version': snapshot.get('inventory_version'),
            'variants': [{'id': str(foreign.pk), 'sku': 'WRONG-NEW-SKU', 'size': '52', 'stock': 50}],
        }, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(ProductVariant.objects.count(), 2)
        self.variant.refresh_from_db()
        self.assertTrue(self.variant.is_active)

    def test_failed_adjustment_rolls_back_product_variant_and_ledger(self):
        snapshot = self.client.get(self.url).data
        with patch('shop.views.InventoryMovement.objects.create', side_effect=RuntimeError('Ledger failed')):
            with self.assertRaisesMessage(RuntimeError, 'Ledger failed'):
                self.client.put(self.url, {
                    'stock': 12, 'name': 'Must roll back',
                    'inventory_version': snapshot.get('inventory_version'),
                }, format='json')
        self.product.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual((self.product.name, self.product.stock, self.variant.stock), ('Suit', 10, 10))

    def test_edit_cannot_recreate_a_deleted_product(self):
        self.product.delete()
        response = self.client.put(self.url, {'name': 'Stale form', 'price': '100', 'stock': 10}, format='json')
        self.assertEqual(response.status_code, 404, response.data)
        self.assertFalse(Product.objects.filter(pk='stock-product').exists())

    def test_same_id_edit_succeeds_but_changing_identity_is_rejected(self):
        response = self.client.put(self.url, {'id': self.product.pk, 'name': 'Edited'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.put(self.url, {'id': 'new-identity', 'name': 'Wrong'}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(Product.objects.count(), 1)
