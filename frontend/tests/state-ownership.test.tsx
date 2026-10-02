import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import api from '../services/api';
import { AppStateProvider, useActions, useCatalog, useRuntime, useSettings } from '../state/AppState';
import { useGlobal } from '../contexts/GlobalContext';
import { createCommerce } from '../state/commerce';
import { cartLineKey, commerceKey, readCommerce } from '../state/persistence';
import { Order, Product, User } from '../types';
import CartPage from '../pages/CartPage';
import { formatPrice } from '../utils';
import { useAdminData } from '../state/admin';
import { useAdminPage } from '../features/admin/shared';
import { invalidateSession } from '../services/http/client';

const buyer = (id: string): User => ({ id, email: `${id}@example.invalid`, name: id, role: 'user', createdAt: 0 });
const product = { id: 'suit', name: 'Suit', stock: 5, price: 100, variants: [
  { id: 'small', active: true, stock: 2 }, { id: 'inactive', active: false, stock: 9 },
] } as Product;
const line = (quantity = 1) => ({ productId: 'suit', variantId: 'small', quantity });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
let state: ReturnType<typeof useGlobal>;
let runtime: ReturnType<typeof useRuntime>;
function Probe() { state = useGlobal(); runtime = useRuntime(); return null; }
async function mount() {
  const view = render(<AppStateProvider><Probe /></AppStateProvider>);
  await waitFor(() => expect(state.isAuthLoading).toBe(false));
  await waitFor(() => expect(state.catalogSource).toBe('server'));
  return view;
}
beforeEach(() => {
  vi.spyOn(api, 'me').mockRejectedValue(new Error('Anonymous'));
  vi.spyOn(api, 'getProducts').mockResolvedValue([product]);
  vi.spyOn(api, 'adminGetProducts').mockResolvedValue([{ ...product, id: 'private' }]);
  vi.spyOn(api, 'getSettings').mockResolvedValue({ aboutTitle: 'Original' } as never);
  vi.spyOn(api, 'getSavedCart').mockResolvedValue({ lines: [], currency: 'Toman' });
  vi.spyOn(api, 'getWishlist').mockResolvedValue([]);
  vi.spyOn(api, 'syncSavedCart').mockImplementation(async cart => cart);
  vi.spyOn(api, 'addToWishlist').mockResolvedValue([]);
  vi.spyOn(api, 'removeFromWishlist').mockResolvedValue([]);
  vi.spyOn(api, 'logout').mockResolvedValue(undefined);
  vi.spyOn(api, 'login').mockImplementation(async email => ({ user: buyer(email) }));
});

test('legacy migration reads v1 when v2 is absent; validates and deduplicates storage', () => {
  localStorage.setItem('reza_cart_v1', JSON.stringify({ suit: 2, invalid: -1 }));
  expect(readCommerce('guest').cartLines).toEqual([{ productId: 'suit', variantId: undefined, quantity: 2 }]);
  localStorage.setItem('reza_cart_v2', JSON.stringify([line(), line(2), { ...line(), quantity: 1.5 }]));
  localStorage.setItem('reza_wishlist_v1', JSON.stringify(['suit', 'suit', null]));
  expect(readCommerce('guest').cartLines).toEqual([line(2)]);
  expect(readCommerce('guest').wishlist).toEqual(['suit']);
});

test('guest intent transfers once; logout and user-to-user changes isolate both domains', async () => {
  localStorage.setItem('reza_cart_v2', JSON.stringify([line()]));
  localStorage.setItem('reza_wishlist_v1', JSON.stringify(['suit']));
  await mount();
  expect(state.cartLines).toEqual([line()]);
  await act(() => state.login('a', 'fixture'));
  await waitFor(() => expect(api.syncSavedCart).toHaveBeenCalled());
  await act(() => state.retrySync());
  expect(state.wishlist).toEqual(['suit']);
  expect(readCommerce('customer:a').cartLines).toEqual([line()]);
  await act(() => state.logout());
  expect(state.cartLines).toEqual([]);
  expect(state.wishlist).toEqual([]);
  await act(() => state.login('b', 'fixture'));
  await act(() => state.retrySync());
  expect(state.cartLines).toEqual([]);
  expect(state.wishlist).toEqual([]);
  expect(readCommerce('customer:a').wishlist).toEqual(['suit']);
  expect(readCommerce('guest').cartLines).toEqual([]);
});

test('admin startup does not consume guest intent or call customer commerce endpoints', async () => {
  localStorage.setItem('reza_cart_v2', JSON.stringify([line()]));
  vi.mocked(api.me).mockResolvedValue({ ...buyer('staff'), role: 'admin' });
  await mount();
  expect(state.authState.status).toBe('admin');
  expect(api.getSavedCart).not.toHaveBeenCalled();
  expect(api.getWishlist).not.toHaveBeenCalled();
  expect(state.cartLines).toEqual([]);
  await act(() => state.logout());
  expect(state.cartLines).toEqual([line()]);
});

test('failed hydration cannot overwrite server cart; retry merges server data with current local intent', async () => {
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  vi.mocked(api.getSavedCart).mockRejectedValue(new Error('offline'));
  vi.mocked(api.getWishlist).mockRejectedValue(new Error('offline'));
  await mount();
  act(() => { state.addToCart('suit', 1, 'small'); state.toggleWishlist('suit'); });
  expect(runtime.commerce.cart.getSnapshot().syncStatus).toBe('error');
  expect(runtime.commerce.wishlist.getSnapshot().syncStatus).toBe('error');
  await act(() => state.retrySync());
  expect(api.syncSavedCart).not.toHaveBeenCalled();
  expect(api.addToWishlist).not.toHaveBeenCalled();
  vi.mocked(api.getSavedCart).mockResolvedValue({ lines: [{ productId: 'other', quantity: 1 }], currency: 'Toman' });
  vi.mocked(api.getWishlist).mockResolvedValue([{ ...product, id: 'other' }]);
  await act(() => state.retrySync());
  expect(state.cartLines).toEqual([{ productId: 'other', quantity: 1 }, line()]);
  expect(state.wishlist).toEqual(['other', 'suit']);
  expect(runtime.commerce.cart.getSnapshot().syncStatus).toBe('synced');
});

test('failed wishlist removal and cart clear survive reload as tombstones, then retry', async () => {
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  vi.mocked(api.getSavedCart).mockResolvedValue({ lines: [line()], currency: 'Toman' });
  vi.mocked(api.getWishlist).mockResolvedValue([product]);
  const view = await mount();
  await waitFor(() => expect(state.wishlist).toEqual(['suit']));
  vi.mocked(api.syncSavedCart).mockRejectedValue(new Error('offline'));
  vi.mocked(api.removeFromWishlist).mockRejectedValue(new Error('offline'));
  act(() => { state.clearCart(); state.toggleWishlist('suit'); });
  await act(() => state.retrySync());
  expect(readCommerce('customer:a').wishEdits).toEqual({ suit: false });
  view.unmount();
  await mount();
  await act(() => state.retrySync());
  expect(state.cartLines).toEqual([]);
  expect(state.wishlist).toEqual([]);
  vi.mocked(api.syncSavedCart).mockImplementation(async cart => cart);
  vi.mocked(api.removeFromWishlist).mockResolvedValue([]);
  await act(() => state.retrySync());
  expect(readCommerce('customer:a').wishEdits).toEqual({});
  expect(readCommerce('customer:a').clearCart).toBe(false);
});

test('edits while hydration is pending win over late server snapshots', async () => {
  const saved = deferred<Awaited<ReturnType<typeof api.getSavedCart>>>();
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  vi.mocked(api.getSavedCart).mockReturnValue(saved.promise);
  await mount();
  act(() => { state.addToCart('suit', 1, 'small'); state.removeFromCart('suit::small'); });
  await act(async () => saved.resolve({ lines: [line(2)], currency: 'Toman' }));
  await waitFor(() => expect(api.syncSavedCart).toHaveBeenCalled());
  expect(state.cartLines).toEqual([]);
});

test('cart writes serialize edits and clear behind an in-flight write', async () => {
  const saved = deferred<Awaited<ReturnType<typeof api.syncSavedCart>>>();
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  await mount();
  await waitFor(() => expect(runtime.commerce.cart.getSnapshot().syncStatus).toBe('synced'));
  vi.mocked(api.syncSavedCart).mockReturnValueOnce(saved.promise);
  act(() => state.addToCart('suit', 1, 'small'));
  let pending!: Promise<void>;
  act(() => { pending = state.retrySync(); });
  act(() => { state.updateQty('suit::small', 1); state.clearCart(); });
  expect(api.syncSavedCart).toHaveBeenCalledTimes(1);
  await act(async () => { saved.resolve({ lines: [line()], currency: 'Toman' }); await pending; });
  expect(api.syncSavedCart).toHaveBeenCalledTimes(2);
  expect(vi.mocked(api.syncSavedCart).mock.calls[1][0].lines).toEqual([]);
  expect(state.cartLines).toEqual([]);
});

test('catalog requests deduplicate and invalidate; settings mutation replaces shared data', async () => {
  function CatalogReader() { useCatalog(); useSettings(); return null; }
  render(<AppStateProvider><Probe /><CatalogReader /><CatalogReader /></AppStateProvider>);
  await waitFor(() => expect(state.catalogSource).toBe('server'));
  expect(api.getProducts).toHaveBeenCalledTimes(1);
  expect(api.getSettings).toHaveBeenCalledTimes(1);
  vi.mocked(api.getProducts).mockResolvedValue([{ ...product, stock: 0, variants: [] }]);
  await act(() => state.refreshProducts());
  await waitFor(() => expect(state.products[0].stock).toBe(0));
  act(() => state.addToCart('suit'));
  expect(state.cartLines).toEqual([]);
  vi.spyOn(api, 'saveSettings').mockResolvedValue({ aboutTitle: 'Changed' } as never);
  await act(() => state.updateSiteSettings({} as never));
  await waitFor(() => expect(state.siteSettings?.aboutTitle).toBe('Changed'));
});

test('action-only consumers do not rerender on toast, theme or commerce updates', async () => {
  let renders = 0;
  function ActionReader() { useActions(); renders++; return null; }
  render(<AppStateProvider><Probe /><ActionReader /></AppStateProvider>);
  await waitFor(() => expect(state.catalogSource).toBe('server'));
  const baseline = renders;
  act(() => { state.showToast('test'); state.toggleTheme(); state.addToCart('suit', 1, 'small'); state.toggleWishlist('suit'); });
  expect(renders).toBe(baseline);
});

test('blocked storage stays usable and stock rejects invalid quantities or variants', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  const commerce = createCommerce(() => [product], vi.fn());
  commerce.select({ status: 'anonymous' });
  commerce.addToCart('suit', Infinity, 'small');
  commerce.addToCart('suit', 1, 'inactive');
  commerce.addToCart('suit', 1, 'missing');
  commerce.addToCart('suit', 9, 'small');
  expect(commerce.cart.getSnapshot().cartLines).toEqual([line(2)]);
  commerce.stop();
});

test('legacy session data is quarantined and no user/token snapshot is persisted', async () => {
  localStorage.setItem('reza_session_v1', JSON.stringify(buyer('old')));
  localStorage.setItem('reza_cart_v2', JSON.stringify([line()]));
  await mount();
  expect(state.cartLines).toEqual([]);
  expect(localStorage.getItem('reza_session_v1')).toBeNull();
  expect(localStorage.getItem('reza_cart_v2')).not.toBeNull();
  await act(() => state.login('new', 'fixture'));
  expect(localStorage.getItem('reza_session_v1')).toBeNull();
});

test('StrictMode lifecycle still resolves the current session and cleans up safely', async () => {
  render(<StrictMode><AppStateProvider><Probe /></AppStateProvider></StrictMode>);
  await waitFor(() => expect(state.authState.status).toBe('anonymous'));
  await waitFor(() => expect(state.catalogSource).toBe('server'));
  act(() => state.addToCart('suit', 1, 'small'));
  expect(state.cartLines).toEqual([line()]);
});

function checkoutMocks() {
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  localStorage.setItem('reza_cart_v2', JSON.stringify([line()]));
  vi.spyOn(api, 'getCheckoutOptions').mockResolvedValue({ shippingMethods: [], paymentMethods: ['cod'], capabilities: {} } as never);
  vi.spyOn(api, 'getAddresses').mockResolvedValue([]);
  vi.spyOn(api, 'createCheckout').mockResolvedValue({} as never);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
}
const quote = (total: number) => ({ lines: [], currency: 'Toman' as const, subtotal: total, total, taxTotal: 0, shippingTotal: 0, discountTotal: 0 });

test('quote changes abort the previous request and late success cannot replace the current total', async () => {
  checkoutMocks();
  const first = deferred<ReturnType<typeof quote>>();
  const quoteMock = vi.spyOn(api, 'quoteCheckout').mockResolvedValue(quote(2002));
  quoteMock.mockReturnValueOnce(first.promise);
  render(<MemoryRouter><AppStateProvider><Probe /><CartPage /></AppStateProvider></MemoryRouter>);
  await waitFor(() => expect(quoteMock).toHaveBeenCalledTimes(1));
  const signal = quoteMock.mock.calls[0][1];
  act(() => state.updateQty('suit::small', 1));
  expect(signal?.aborted).toBe(true);
  await waitFor(() => expect(quoteMock).toHaveBeenCalledTimes(2));
  await act(async () => first.resolve(quote(1001)));
  expect(screen.getAllByText(formatPrice(2002)).length).toBeGreaterThan(0);
  expect(screen.queryByText(formatPrice(1001))).not.toBeInTheDocument();
});

test('anonymous session invalidation resets quote ownership even when the role does not change', async () => {
  checkoutMocks();
  vi.mocked(api.me).mockRejectedValue(new Error('Anonymous'));
  const quoteMock = vi.spyOn(api, 'quoteCheckout').mockResolvedValue(quote(100));
  render(<MemoryRouter><AppStateProvider><Probe /><CartPage /></AppStateProvider></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'ثبت نهایی سفارش' })).toBeEnabled());
  act(() => invalidateSession());
  await waitFor(() => expect(quoteMock).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'ثبت نهایی سفارش' })).toBeEnabled());
});

test('logout during optional address save cannot submit checkout for the next account', async () => {
  checkoutMocks();
  vi.spyOn(api, 'quoteCheckout').mockResolvedValue(quote(100));
  const address = deferred<Awaited<ReturnType<typeof api.createAddress>>>();
  vi.spyOn(api, 'createAddress').mockReturnValue(address.promise);
  render(<MemoryRouter><AppStateProvider><Probe /><CartPage /></AppStateProvider></MemoryRouter>);
  await screen.findByPlaceholderText('نام تحویل‌گیرنده');
  for (const placeholder of ['نام تحویل‌گیرنده', 'شماره تماس', 'استان', 'شهر', 'کد پستی', 'نشانی کامل، پلاک و واحد']) {
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: 'Fixture' } });
  }
  const submit = screen.getByRole('button', { name: 'ثبت نهایی سفارش' });
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() => expect(api.createAddress).toHaveBeenCalled());
  await act(() => state.logout());
  await act(() => state.login('b', 'fixture'));
  await act(async () => address.resolve({ id: 'old-address' } as never));
  expect(api.createCheckout).not.toHaveBeenCalled();
  expect(state.cartLines).toEqual([]);
});

test('late customer hydration and pending debounce cannot restore data after logout', async () => {
  const saved = deferred<Awaited<ReturnType<typeof api.getSavedCart>>>();
  const wished = deferred<Product[]>();
  vi.mocked(api.me).mockResolvedValue(buyer('a'));
  vi.mocked(api.getSavedCart).mockReturnValue(saved.promise);
  vi.mocked(api.getWishlist).mockReturnValue(wished.promise);
  await mount();
  act(() => { state.addToCart('suit', 1, 'small'); state.toggleWishlist('suit'); });
  await act(() => state.logout());
  await act(async () => { saved.resolve({ lines: [line(2)], currency: 'Toman' }); wished.resolve([product]); });
  expect(state.cartLines).toEqual([]);
  expect(state.wishlist).toEqual([]);
  expect(api.syncSavedCart).not.toHaveBeenCalled();
  expect(api.addToWishlist).not.toHaveBeenCalled();
});

test('admin queries cache across tabs, invalidate after mutations and disappear on logout', async () => {
  vi.mocked(api.me).mockResolvedValue({ ...buyer('staff'), role: 'admin' });
  vi.spyOn(api, 'adminGetStats').mockResolvedValue({ productsCount: 1 } as never);
  vi.spyOn(api, 'adminGetOrderPage').mockResolvedValue({ results: [{ id: 'private-order' }] } as never);
  vi.spyOn(api, 'adminGetMessagePage').mockResolvedValue({ results: [] } as never);
  let admin!: ReturnType<typeof useAdminPage<Order>>;
  function AdminReader() { admin = useAdminPage('orders', { page: 1 }, api.adminGetOrderPage); return null; }
  function MessagesReader() { useAdminPage('messages', { page: 1 }, api.adminGetMessagePage); return null; }
  function StatsReader() { useAdminData('shell'); return null; }
  const tree = (tab: string) => <AppStateProvider><Probe /><StatsReader />{tab === 'orders' ? <AdminReader /> : <MessagesReader />}</AppStateProvider>;
  const view = render(tree('orders'));
  await waitFor(() => expect(admin.data?.results[0]?.id).toBe('private-order'));
  view.rerender(tree('messages'));
  await waitFor(() => expect(api.adminGetMessagePage).toHaveBeenCalledTimes(1));
  view.rerender(tree('orders'));
  expect(api.adminGetStats).toHaveBeenCalledTimes(1);
  expect(api.adminGetOrderPage).toHaveBeenCalledTimes(1);
  vi.mocked(api.adminGetOrderPage).mockResolvedValue({ results: [{ id: 'updated-order' }] } as never);
  await act(() => admin.invalidate());
  await waitFor(() => expect(admin.data?.results[0]?.id).toBe('updated-order'));
  vi.mocked(api.adminGetOrderPage).mockRejectedValue(new Error('unavailable'));
  await act(() => admin.invalidate());
  await waitFor(() => expect(admin.isError).toBe(true));
  expect(admin.data?.results[0]?.id).toBe('updated-order');
  await act(() => state.logout());
  expect(admin.data).toBeUndefined();
  expect(runtime.queries.getQueryCache().findAll({ queryKey: ['admin', 'admin:staff'] })).toEqual([]);
});
