import './dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalProvider } from '../contexts/GlobalContext.tsx';
import AdminPanel from '../pages/AdminPanel.tsx';
import api from '../services/api.ts';

beforeEach(() => {
  localStorage.clear();
  mock.method(api, 'me', async () => ({ id: 'admin', role: 'admin' }));
  mock.method(api, 'adminGetProducts', async () => []);
  mock.method(api, 'getSettings', async () => null);
  mock.method(api, 'getSavedCart', async () => ({ lines: [] }));
  mock.method(api, 'syncSavedCart', async () => ({ lines: [] }));
  mock.method(api, 'getWishlist', async () => []);
  mock.method(api, 'adminGetStats', async () => ({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 }));
  mock.method(api, 'adminSaveProduct', async () => ({}));
  let next = 0;
  mock.method(URL, 'createObjectURL', () => `blob:test-${++next}`);
  mock.method(URL, 'revokeObjectURL', () => undefined);
});
afterEach(() => { cleanup(); mock.restoreAll(); });

async function openNewProduct() {
  await act(async () => render(React.createElement(MemoryRouter, null,
    React.createElement(GlobalProvider, null, React.createElement(AdminPanel)))));
  await waitFor(() => assert.equal(api.adminGetProducts.mock.callCount(), 1));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'محصولات' })));
  fireEvent.click(screen.getByRole('button', { name: 'افزودن' }));
  fireEvent.change(screen.getByPlaceholderText('نام کامل محصول...'), { target: { value: 'Test suit' } });
  fireEvent.change(screen.getByText('قیمت (تومان)').parentElement.querySelector('input'), { target: { value: '100' } });
  return document.querySelector('input[type="file"][multiple]');
}

test('all selected files are previewed separately and sent as multipart binary files', async () => {
  const input = await openNewProduct();
  const files = [new File(['first'], 'first.png', { type: 'image/png' }), new File(['second'], 'second.png', { type: 'image/png' })];
  fireEvent.change(input, { target: { files } });
  await waitFor(() => assert.equal(document.querySelectorAll('img[src^="blob:"]').length, 2));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' })));
  await waitFor(() => assert.equal(api.adminSaveProduct.mock.callCount(), 1));
  const form = api.adminSaveProduct.mock.calls[0].arguments[0];
  assert.equal(form.get('image'), files[0]);
  assert.deepEqual(form.getAll('images[]'), [files[1]]);
  assert.deepEqual(JSON.parse(form.get('images')), []);
  for (const [, value] of form) if (typeof value === 'string') assert.doesNotMatch(value, /data:|blob:/);
  await waitFor(() => assert.equal(URL.revokeObjectURL.mock.callCount(), 2));
});

test('removing a pending preview removes its file and canceling releases previews', async () => {
  const input = await openNewProduct();
  fireEvent.change(input, { target: { files: [new File(['x'], 'remove.png', { type: 'image/png' })] } });
  await waitFor(() => assert.equal(document.querySelectorAll('img[src^="blob:"]').length, 1));
  fireEvent.click(screen.getByRole('button', { name: 'حذف تصویر انتخاب‌شده 1' }));
  await waitFor(() => assert.equal(document.querySelectorAll('img[src^="blob:"]').length, 0));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' })));
  await waitFor(() => assert.equal(api.adminSaveProduct.mock.callCount(), 1));
  const form = api.adminSaveProduct.mock.calls[0].arguments[0];
  assert.equal(form.has('image'), false);
  assert.deepEqual(form.getAll('images[]'), []);
  assert.equal(URL.revokeObjectURL.mock.callCount(), 1);
  fireEvent.click(screen.getByRole('button', { name: 'افزودن' }));
  fireEvent.change(document.querySelector('input[type="file"][multiple]'), {
    target: { files: [new File(['y'], 'cancel.png', { type: 'image/png' })] },
  });
  await waitFor(() => assert.equal(document.querySelectorAll('img[src^="blob:"]').length, 1));
  fireEvent.click(screen.getByRole('button', { name: 'انصراف' }));
  await waitFor(() => assert.equal(URL.revokeObjectURL.mock.callCount(), 2));
});

test('subsequent edit displays both persisted primary/gallery and can explicitly clear all images', async () => {
  api.adminGetProducts.mock.mockImplementation(async () => [{
    id: 'persisted', name: 'Persisted suit', price: 100, stock: 2, inventoryVersion: 'version',
    image: '/media/primary.png', images: ['/media/gallery.png'],
  }]);
  await act(async () => render(React.createElement(MemoryRouter, null,
    React.createElement(GlobalProvider, null, React.createElement(AdminPanel)))));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'محصولات' })));
  fireEvent.click(screen.getByRole('button', { name: 'ویرایش Persisted suit' }));
  assert.equal(screen.getAllByRole('button', { name: /حذف تصویر ذخیره‌شده/ }).length, 2);
  fireEvent.click(screen.getByRole('button', { name: 'حذف تصویر ذخیره‌شده 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'حذف تصویر ذخیره‌شده 1' }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'ذخیره تغییرات' })));
  const form = api.adminSaveProduct.mock.calls[0].arguments[0];
  assert.equal(form.get('image'), '');
  assert.equal(form.get('images'), '[]');
  assert.equal(form.get('inventory_version'), 'version');
});
