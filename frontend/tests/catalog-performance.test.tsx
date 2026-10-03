import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppStateProvider, useCart, useCatalog } from '../state/AppState';
import CatalogPage from '../pages/CatalogPage';
import UserPanel from '../pages/UserPanel';
import api from '../services/api';
import type { Order, Product, User } from '../types';

const product = (id: string): Product => ({ id, name: `Suit ${id}`, price: 100, stock: 5, currency: 'Toman',
  category: 'suits', fabric: 'Wool', short: '', description: '', image: '', images: [], variants: [{ id: `v-${id}`, sku: id, size: '', color: '', stock: 5, price: 100, currency: 'Toman', active: true, attributes: {} }] });
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.spyOn(api, 'me').mockRejectedValue(new Error('anonymous'));
  vi.spyOn(api, 'getProducts').mockResolvedValue([product('0')]);
  vi.spyOn(api, 'getProductFacets').mockResolvedValue(['Wool', 'Linen']);
  vi.spyOn(api, 'getSavedCart').mockResolvedValue({ lines: [], currency: 'Toman' });
  vi.spyOn(api, 'getWishlist').mockResolvedValue([]);
});
function Probe() {
  const { products } = useCatalog();
  const { cartLines } = useCart();
  return <output>{cartLines.map(line => products.find(item => item.id === line.productId)?.name).join(',')}</output>;
}

test('catalog pages/search filters remain bounded and a product beyond the preview can enter cart', async () => {
  const pageApi = vi.spyOn(api, 'getProductsPage').mockImplementation(async params => {
    if (params?.ids) return { results: [product(String(params.ids))], count: 1, next: null, previous: null, totalPages: 1 };
    const page = Number(params?.page || 1);
    const id = params?.fabric ? 'filtered' : page === 1 ? '0' : '102';
    return { results: [product(id)], count: 103, page, totalPages: 5, next: page < 5 ? '?page=2' : null, previous: null };
  });
  render(<MemoryRouter><AppStateProvider><CatalogPage /><Probe /></AppStateProvider></MemoryRouter>);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Suit 0' });
  await user.click(screen.getByRole('button', { name: 'بعدی' }));
  await screen.findByRole('heading', { name: 'Suit 102' });
  await user.click(screen.getByRole('button', { name: 'افزودن گزینه موجود Suit 102' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Suit 102'));
  expect(api.getProducts).toHaveBeenCalledTimes(1);
  expect(pageApi.mock.calls.filter(([params]) => !params?.ids).every(([params]) => params?.page_size === 24)).toBe(true);
  fireEvent.change(screen.getByRole('combobox', { name: 'مرتب‌سازی محصولات' }), { target: { value: 'price-desc' } });
  await waitFor(() => expect(pageApi).toHaveBeenCalledWith(expect.objectContaining({ ordering: 'price-desc', page: 1 }), expect.any(AbortSignal)));
});

test('customer pages fetch only the active collection and expand embedded orders without another request', async () => {
  vi.mocked(api.me).mockResolvedValue({ id: 'buyer', role: 'user', name: 'Buyer', email: 'buyer@example.invalid', createdAt: 1 } as User);
  const order = (id: string): Order => ({ id, userId: 'buyer', items: [], status: 'pending', paymentStatus: 'unpaid', total: 100, subtotal: 100, discountTotal: 0, shippingTotal: 0, taxTotal: 0, currency: 'Toman', createdAt: Date.now(), shippingAddress: 'Synthetic' });
  const orders = vi.spyOn(api, 'myOrdersPage').mockImplementation(async page => ({ results: [order(`ORD-${page}`)], count: 26, page, totalPages: 4, next: '?page=2', previous: null }));
  const addresses = vi.spyOn(api, 'getAddresses').mockResolvedValue([]);
  const returns = vi.spyOn(api, 'getReturnsPage').mockResolvedValue({ results: [], count: 0, totalPages: 1, next: null, previous: null });
  const detail = vi.spyOn(api, 'getOrder');
  render(<MemoryRouter><AppStateProvider><UserPanel /></AppStateProvider></MemoryRouter>);
  const user = userEvent.setup();
  await screen.findByRole('button', { name: /ORD-۱/ });
  expect(addresses).not.toHaveBeenCalled(); expect(returns).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /ORD-۱/ }));
  expect(detail).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'بعدی' }));
  await waitFor(() => expect(orders).toHaveBeenCalledWith(2, expect.any(AbortSignal)));
  await user.click(screen.getByRole('button', { name: 'مرجوعی‌ها' }));
  await waitFor(() => expect(returns).toHaveBeenCalledTimes(1));
  expect(addresses).not.toHaveBeenCalled();
});
