import './dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { GlobalProvider, useGlobal } from '../contexts/GlobalContext.tsx';
import api from '../services/api.ts';

const customer = { id: 'customer', role: 'user', email: 'customer@example.invalid' };
const admin = { id: 'admin', role: 'admin', email: 'admin@example.invalid' };
const publicProducts = [{ id: 'active', name: 'Active suit', active: true }];
const adminProducts = [...publicProducts, { id: 'hidden', name: 'Inactive suit', active: false }];
let context;

function Probe() {
  context = useGlobal();
  return React.createElement('div', null, context.products.map(p => p.id).join(','));
}
function mount() { return render(React.createElement(GlobalProvider, null, React.createElement(Probe))); }
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  localStorage.clear();
  mock.method(api, 'getProducts', async () => publicProducts);
  mock.method(api, 'adminGetProducts', async () => adminProducts);
  mock.method(api, 'getSettings', async () => null);
  mock.method(api, 'getSavedCart', async () => ({ lines: [] }));
  mock.method(api, 'syncSavedCart', async () => ({ lines: [] }));
  mock.method(api, 'getWishlist', async () => []);
  mock.method(api, 'logout', async () => undefined);
});
afterEach(() => { cleanup(); mock.restoreAll(); });

for (const [label, user] of [['anonymous', null], ['customer', customer], ['admin', admin]]) {
  test(`${label} startup selects catalog only after session resolution`, async () => {
    const session = deferred();
    mock.method(api, 'me', () => session.promise);
    mount();
    assert.equal(context.isAuthLoading, true);
    assert.equal(api.getProducts.mock.callCount(), 0);
    assert.equal(api.adminGetProducts.mock.callCount(), 0);
    await act(async () => user ? session.resolve(user) : session.reject(new Error('Unauthenticated')));
    await waitFor(() => assert.equal(context.isAuthLoading, false));
    await waitFor(() => assert.deepEqual(context.products, user?.role === 'admin' ? adminProducts : publicProducts));
    assert.equal(api.adminGetProducts.mock.callCount(), user?.role === 'admin' ? 1 : 0);
    assert.equal(api.getProducts.mock.callCount(), user?.role === 'admin' ? 0 : 1);
    assert.equal(context.user?.id ?? null, user?.id ?? null);
  });
}

test('logout reloads the public catalog and a late admin refresh cannot restore inactive products', async () => {
  mock.method(api, 'me', async () => admin);
  mount();
  await waitFor(() => assert.deepEqual(context.products, adminProducts));
  const pending = deferred();
  api.adminGetProducts.mock.mockImplementation(() => pending.promise);
  let refresh;
  act(() => { refresh = context.refreshProducts(); });
  await act(async () => context.logout());
  await waitFor(() => assert.deepEqual(context.products, publicProducts));
  await act(async () => { pending.resolve(adminProducts); await refresh; });
  assert.equal(context.user, null);
  assert.deepEqual(context.products, publicProducts);
});

test('failed admin catalog never presents the public catalog as complete staff data', async () => {
  mock.method(api, 'me', async () => admin);
  api.adminGetProducts.mock.mockImplementation(async () => { throw new Error('Catalog unavailable'); });
  mount();
  await waitFor(() => assert.equal(context.isAuthLoading, false));
  await act(async () => {});
  assert.equal(api.getProducts.mock.callCount(), 0);
  assert.deepEqual(context.products, []);
  assert.equal(context.catalogSource, 'none');
});

test('logging in after anonymous startup loads the resolved admin catalog', async () => {
  mock.method(api, 'me', async () => { throw new Error('Anonymous'); });
  mock.method(api, 'login', async () => ({ user: admin }));
  mount();
  await waitFor(() => assert.deepEqual(context.products, publicProducts));
  api.me.mock.mockImplementation(async () => admin);
  await act(async () => context.login('admin@example.invalid', 'test-input'));
  await waitFor(() => assert.deepEqual(context.products, adminProducts));
});
