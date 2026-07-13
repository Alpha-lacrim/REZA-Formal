from django.test import TestCase
from rest_framework.test import APIClient

from .models import InventoryMovement, Product, ProductVariant, User


class ProductVariantApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='variant-admin',
            email='variant-admin@example.com',
            password='A-strong-variant-password-493!',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_admin_can_create_and_reconcile_variant_inventory(self):
        created = self.client.post(
            '/api/admin/products/',
            {
                'name': 'Variant Suit',
                'price': '1000.00',
                'stock': 0,
                'category': 'suits',
                'variants': [
                    {'sku': 'SUIT-50-BLK', 'size': '50', 'color': 'Black', 'stock': 2},
                    {'sku': 'SUIT-52-BLK', 'size': '52', 'color': 'Black', 'stock': 3},
                ],
            },
            format='json',
        )

        self.assertEqual(created.status_code, 201, created.data)
        product = Product.objects.get(pk=created.data['id'])
        self.assertEqual(product.stock, 5)
        self.assertEqual(len(created.data['variants']), 2)
        self.assertEqual(InventoryMovement.objects.filter(reason='initial').count(), 2)

        retained = product.variants.get(sku='SUIT-50-BLK')
        updated = self.client.put(
            f'/api/admin/products/{product.id}/',
            {
                'variants': [
                    {
                        'id': str(retained.id),
                        'sku': retained.sku,
                        'size': retained.size,
                        'color': retained.color,
                        'stock': 4,
                        'is_active': True,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(updated.status_code, 200, updated.data)
        product.refresh_from_db()
        self.assertEqual(product.stock, 4)
        self.assertEqual(product.variants.filter(is_active=True).count(), 1)
        self.assertTrue(InventoryMovement.objects.filter(reason='adjustment', delta=2).exists())

    def test_legacy_product_create_gets_default_variant_and_inactive_products_are_hidden(self):
        created = self.client.post(
            '/api/admin/products/',
            {'name': 'Simple Product', 'price': '20.00', 'stock': 7},
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(ProductVariant.objects.get(product_id=created.data['id']).stock, 7)

        Product.objects.filter(pk=created.data['id']).update(is_active=False)
        public_client = APIClient()
        product_list = public_client.get('/api/products/')
        product_detail = public_client.get(f"/api/products/{created.data['id']}/")
        self.assertEqual(product_list.status_code, 200)
        self.assertEqual(product_list.data, [])
        self.assertEqual(product_detail.status_code, 404)
