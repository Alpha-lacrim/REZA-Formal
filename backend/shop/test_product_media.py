import base64
import json
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .models import Product, User
from .product_media import ProductGalleryField


def png_bytes(size=(2, 2)):
    stream = BytesIO()
    Image.new('RGB', size, 'blue').save(stream, format='PNG')
    return stream.getvalue()


def upload(name='image.png', content=None, mime='image/png'):
    return SimpleUploadedFile(name, png_bytes() if content is None else content, content_type=mime)


class ProductMediaTests(TestCase):
    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.staff = User.objects.create_superuser('media-admin', 'media-admin@example.invalid', 'Test-only-493!')
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def files(self):
        return [path for path in Path(self.media.name).rglob('*') if path.is_file()]

    def test_gallery_active_content_and_mime_extension_mismatch_rejected_on_both_routes(self):
        for url in ('/api/admin/products/', '/api/products/new-product/'):
            for name, content, mime in (
                ('page.html', b'<html>Not an image</html>', 'text/html'),
                ('image.svg', b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml'),
                ('image.png', b'not an image', 'image/png'),
                ('image.html', png_bytes(), 'image/png'),
                ('image.png', png_bytes(), 'text/html'),
            ):
                with self.subTest(url=url, name=name, mime=mime):
                    result = self.client.post(url, {'name': 'Suit', 'price': '10', 'stock': 1,
                                                   'images[]': upload(name, content, mime)}, format='multipart')
                    self.assertEqual(result.status_code, 400, result.data)
                    self.assertEqual(self.files(), [])

    def test_invalid_product_or_variant_leaves_no_files_including_primary(self):
        for changes in ({'price': '-1'}, {'variants': json.dumps([{'sku': 'DUP', 'stock': 1}, {'sku': 'DUP', 'size': '52', 'stock': 1}])}):
            response = self.client.post('/api/admin/products/', {
                'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(), 'images[]': upload(), **changes,
            }, format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
            self.assertEqual(self.files(), [])
            self.assertEqual(Product.objects.count(), 0)

    def test_primary_and_multiple_gallery_files_survive_edit_as_urls_without_inline_data(self):
        created = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(),
            'images': json.dumps(['/images/existing.png']), 'images[]': [upload(), upload()],
        }, format='multipart')
        self.assertEqual(created.status_code, 201, created.data)
        product = Product.objects.get(pk=created.data['id'])
        self.assertIsInstance(product.images, list)
        self.assertEqual(len(product.images), 3)
        self.assertNotIn('data:', json.dumps(created.data, default=str))
        self.assertEqual(len(self.files()), 3)
        edited = self.client.put(f'/api/admin/products/{product.pk}/', {
            'name': 'Edited', 'images': json.dumps(product.images),
        }, format='multipart')
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertEqual(edited.data['images'], created.data['images'])
        self.assertEqual(len(self.files()), 3)
        cleared = self.client.put(f'/api/admin/products/{product.pk}/', {'images': '[]', 'image': ''}, format='multipart')
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.assertEqual(cleared.data['images'], [])
        self.assertIsNone(cleared.data['image'])
        # Keep prior files: immutable order image snapshots may still refer to them.
        self.assertEqual(len(self.files()), 3)

    def test_legacy_inline_gallery_is_converted_on_edit_without_losing_image(self):
        inline = 'data:image/png;base64,' + base64.b64encode(png_bytes()).decode()
        # Retain legacy JSON-string representation coverage without inserting a
        # scalar JSON value rejected by SQL Server's JSONField CHECK constraint.
        self.assertEqual(ProductGalleryField().to_representation(json.dumps([inline])), [inline])
        product = Product.objects.create(id='legacy-image', name='Legacy', price='10', images=[inline])
        response = self.client.put(f'/api/admin/products/{product.pk}/', {'images': json.dumps([inline])}, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        product.refresh_from_db()
        self.assertIsInstance(product.images, list)
        self.assertNotIn('data:', json.dumps(product.images))
        self.assertEqual(len(self.files()), 1)
        with Image.open(self.files()[0]) as image:
            self.assertEqual(image.size, (2, 2))

    def test_storage_failure_cleans_only_new_files(self):
        saved = default_storage.save('existing.png', upload())
        save = default_storage.save
        count = 0

        def fail_second(*args, **kwargs):
            nonlocal count
            count += 1
            if count == 2:
                raise OSError('Synthetic storage failure')
            return save(*args, **kwargs)

        with patch('django.core.files.storage.default_storage.save', side_effect=fail_second):
            with self.assertRaisesMessage(OSError, 'Synthetic storage failure'):
                self.client.post('/api/admin/products/', {
                    'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(), 'images[]': upload(),
                }, format='multipart')
        self.assertEqual(len(self.files()), 1)
        self.assertTrue(default_storage.exists(saved))
        self.assertEqual(Product.objects.count(), 0)

    def test_bounds_and_unsafe_gallery_urls_are_rejected(self):
        for gallery in ('not json', json.dumps({'bad': 'shape'}), json.dumps(['javascript:alert(1)']),
                        json.dumps(['blob:preview']), json.dumps(['/media/page.html']),
                        json.dumps(['http://[invalid']), json.dumps(['/media/%5Cpage.png']),
                        json.dumps(['/images/image.png'] * 13)):
            response = self.client.post('/api/admin/products/', {
                'name': 'Suit', 'price': '10', 'stock': 1, 'images': gallery,
            }, format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
        for field in ('image', 'images[]'):
            response = self.client.post('/api/admin/products/', {
                'name': 'Suit', 'price': '10', 'stock': 1, field: upload(content=png_bytes((8001, 1))),
            }, format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.files(), [])

    def test_file_size_and_gallery_count_limits_apply_to_binary_uploads(self):
        oversized = png_bytes() + b'x' * (10 * 1024 * 1024)
        for field in ('image', 'images[]'):
            response = self.client.post('/api/admin/products/', {
                'name': 'Suit', 'price': '10', 'stock': 1, field: upload(content=oversized),
            }, format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
        response = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'images[]': [upload() for _ in range(13)],
        }, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.files(), [])

    def test_reencoding_removes_appended_active_content(self):
        response = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1,
            'images[]': upload(content=png_bytes() + b'<script>unsafe()</script>'),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn(b'<script>', self.files()[0].read_bytes())

    def test_total_image_count_includes_primary_and_preserves_existing_references(self):
        response = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(),
            'images': json.dumps([f'/images/{i}.png' for i in range(12)]),
        }, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.files(), [])
        created = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(),
            'images': json.dumps([f'/images/{i}.png' for i in range(11)]),
        }, format='multipart')
        self.assertEqual(created.status_code, 201, created.data)
        # Existing clients may include the primary URL in the gallery: count it once.
        edited = self.client.put(f"/api/admin/products/{created.data['id']}/", {
            'images': json.dumps([created.data['image'], *created.data['images']]),
        }, format='multipart')
        self.assertEqual(edited.status_code, 200, edited.data)

    def test_combined_upload_budget_is_checked_before_decoding_or_storage(self):
        with patch('shop.views.MAX_UPLOAD_BYTES', 100):
            with patch('shop.product_media.Image.open') as decode:
                response = self.client.post('/api/admin/products/', {
                    'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload(), 'images[]': upload(),
                }, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        decode.assert_not_called()
        self.assertEqual(self.files(), [])

    def test_edit_can_clear_compare_price_and_replace_primary_without_inline_storage(self):
        created = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'compare_at_price': '15', 'stock': 2, 'image': upload(),
        }, format='multipart')
        self.assertEqual(created.status_code, 201, created.data)
        edited = self.client.put(f"/api/admin/products/{created.data['id']}/", {
            'compare_at_price': '', 'image': upload('replacement.png'),
            'images': json.dumps([created.data['image']]),
        }, format='multipart')
        self.assertEqual(edited.status_code, 200, edited.data)
        self.assertIsNone(edited.data['compare_at_price'])
        self.assertNotEqual(created.data['image'], edited.data['image'])
        self.assertEqual(edited.data['images'], [created.data['image']])
        self.assertEqual(len(self.files()), 2)

    def test_animated_images_are_rejected_and_storage_ignores_supplied_filenames(self):
        stream = BytesIO()
        Image.new('RGB', (2, 2), 'red').save(stream, format='GIF', save_all=True, append_images=[Image.new('RGB', (2, 2), 'blue')], duration=100)
        response = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload('animated.gif', stream.getvalue(), 'image/gif'),
        }, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(self.files(), [])
        response = self.client.post('/api/admin/products/', {
            'name': 'Suit', 'price': '10', 'stock': 1, 'image': upload('../../supplied.png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertNotIn('supplied', response.data['image'])
        self.assertRegex(self.files()[0].name, r'^[a-f0-9]{32}\.png$')

    def test_replacing_primary_validates_legacy_gallery_instead_of_crashing_or_dropping_it(self):
        product = Product.objects.create(id='invalid-gallery', name='Legacy', price=10, images=['http://[invalid'])
        response = self.client.put(f'/api/admin/products/{product.pk}/', {'image': upload()}, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        product.refresh_from_db()
        self.assertEqual(product.images, ['http://[invalid'])
        self.assertEqual(self.files(), [])
