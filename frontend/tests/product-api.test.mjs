import './dom.mjs';
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import api from '../services/api.ts';

test('product adapter retains multipart files, CSRF and the server URLs/version for subsequent edits', async () => {
  const form = new FormData();
  const primary = new File(['primary'], 'primary.png', { type: 'image/png' });
  const gallery = new File(['gallery'], 'gallery.png', { type: 'image/png' });
  form.append('image', primary);
  form.append('images[]', gallery);
  form.append('images', '[]');
  const transport = mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).endsWith('/auth/csrf/')) return Response.json({ csrfToken: 'synthetic-test-token' });
    assert.equal(options.body, form);
    assert.equal(options.headers.has('Content-Type'), false);
    assert.equal(options.headers.get('X-CSRFToken'), 'synthetic-test-token');
    assert.equal(options.credentials, 'include');
    return Response.json({ id: 'product', name: 'Suit', image: '/media/primary.png',
      images: ['/media/gallery.png'], inventory_version: 'server-version', stock: 2 });
  });
  try {
    const product = await api.adminSaveProduct(form);
    assert.equal(product.image, '/media/primary.png');
    assert.deepEqual(product.images, ['/media/gallery.png']);
    assert.equal(product.inventoryVersion, 'server-version');
    assert.equal(transport.mock.callCount(), 2);
  } finally { mock.restoreAll(); }
});
