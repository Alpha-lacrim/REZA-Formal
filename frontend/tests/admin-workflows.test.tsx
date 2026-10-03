import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { AppStateProvider } from '../state/AppState';
import AdminPanel from '../pages/AdminPanel';
import api, { ApiError } from '../services/api';
import type { Order, Page, Product, User } from '../types';

const product: Product = { id: 'suit', name: 'Persisted suit', price: 100, compareAtPrice: 150, stock: 2, inventoryVersion: 'version', image: '/media/primary.png', images: ['/media/gallery.png'], category: 'suits', description: '', short: '', currency: 'Toman' };
const pageOf = <T,>(results: T[], page = 1, count = results.length): Page<T> => ({ results, count, page, pageSize: 8, totalPages: Math.max(1, Math.ceil(count / 8)), next: null, previous: null });
beforeEach(() => {
  vi.spyOn(api, 'me').mockResolvedValue({ id: 'admin', name: 'Admin', role: 'admin' } as User);
  vi.spyOn(api, 'adminGetProducts').mockResolvedValue([]);
  vi.spyOn(api, 'getSettings').mockResolvedValue(null);
  vi.spyOn(api, 'adminGetStats').mockResolvedValue({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 });
  vi.spyOn(api, 'adminGetProductPage').mockResolvedValue(pageOf([product]));
  vi.spyOn(api, 'adminSaveProduct').mockResolvedValue(product);
  URL.createObjectURL = vi.fn(file => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
});

async function openProducts() {
  render(<MemoryRouter><AppStateProvider><AdminPanel /></AppStateProvider></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'محصولات' }));
  await screen.findByRole('button', { name: 'ویرایش Persisted suit' });
  return user;
}

test('create sends binary files, releases object URLs, locks duplicate saves and supports zero stock', async () => {
  const user = await openProducts();
  await user.click(screen.getByRole('button', { name: 'افزودن' }));
  await user.type(screen.getByLabelText('نام محصول'), 'New suit');
  await user.type(screen.getByLabelText('قیمت (تومان)'), '125');
  const files = [new File(['one'], 'one.png', { type: 'image/png' }), new File(['two'], 'two.png', { type: 'image/png' })];
  await user.upload(screen.getByLabelText('آپلود تصاویر'), files);
  expect(document.querySelectorAll('img[src^="blob:"]')).toHaveLength(2);
  let finish!: (value: Product) => void;
  vi.mocked(api.adminSaveProduct).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  expect(screen.getByRole('button', { name: 'ذخیره تغییرات' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'انصراف' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('در حال ارسال');
  expect(api.adminSaveProduct).toHaveBeenCalledTimes(1);
  const form = vi.mocked(api.adminSaveProduct).mock.calls[0][0] as FormData;
  expect(form.get('image')).toBe(files[0]);
  expect(form.getAll('images[]')).toEqual([files[1]]);
  expect(form.get('images')).toBe('[]');
  expect(form.get('stock')).toBe('0');
  expect(form.has('variants')).toBe(false); // Backend creates the default inventory variant.
  for (const [, value] of form) if (typeof value === 'string') expect(value).not.toMatch(/data:|blob:/);
  await act(async () => finish(product));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one.png');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:two.png');
});

test('edit clears persisted primary/gallery and compare-at price while retaining the inventory version', async () => {
  const user = await openProducts();
  await user.click(screen.getByRole('button', { name: 'ویرایش Persisted suit' }));
  expect(screen.getAllByRole('button', { name: /حذف تصویر ذخیره‌شده/ })).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'حذف تصویر ذخیره‌شده 1' }));
  await user.click(screen.getByRole('button', { name: 'حذف تصویر ذخیره‌شده 1' }));
  await user.clear(screen.getByLabelText('قیمت قبل از تخفیف (اختیاری)'));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  const form = vi.mocked(api.adminSaveProduct).mock.calls[0][0] as FormData;
  expect(form.get('id')).toBe('suit');
  expect(form.get('image')).toBe('');
  expect(form.get('images')).toBe('[]');
  expect(form.get('compare_at_price')).toBe('');
  expect(form.get('inventory_version')).toBe('version');
});

test('removing a pending image removes its payload and cancelling releases previews and resets the draft', async () => {
  const user = await openProducts();
  await user.click(screen.getByRole('button', { name: 'افزودن' }));
  await user.upload(screen.getByLabelText('آپلود تصاویر'), new File(['one'], 'one.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'حذف تصویر انتخاب‌شده 1' }));
  expect(document.querySelectorAll('img[src^="blob:"]')).toHaveLength(0);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:one.png');
  await user.type(screen.getByLabelText('نام محصول'), 'Discard me');
  await user.upload(screen.getByLabelText('آپلود تصاویر'), new File(['two'], 'two.png', { type: 'image/png' }));
  await user.click(screen.getByRole('button', { name: 'انصراف' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:two.png');
  expect(api.adminSaveProduct).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'افزودن' }));
  expect(screen.getByLabelText('نام محصول')).toHaveValue('');
  expect(document.querySelectorAll('img[src^="blob:"]')).toHaveLength(0);
});

test('editing a product whose display image comes only from its gallery preserves that managed reference', async () => {
  vi.mocked(api.adminGetProductPage).mockResolvedValue(pageOf([{ ...product, primaryImage: null, image: '/media/gallery.png', images: ['/media/gallery.png'] }]));
  const user = await openProducts();
  await user.click(screen.getByRole('button', { name: 'ویرایش Persisted suit' }));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  const form = vi.mocked(api.adminSaveProduct).mock.calls[0][0] as FormData;
  expect(form.get('images')).toBe('["/media/gallery.png"]');
  expect(form.has('image')).toBe(false);
});

test('invalid metadata, variants and upload bounds are surfaced before save; server errors preserve the draft', async () => {
  const user = await openProducts();
  await user.click(screen.getByRole('button', { name: 'افزودن' }));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('نام محصول')).toHaveAttribute('aria-invalid', 'true');
  expect(api.adminSaveProduct).not.toHaveBeenCalled();
  const input = screen.getByLabelText('آپلود تصاویر');
  fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.svg', { type: 'image/svg+xml' })] } });
  expect(screen.getByRole('alert')).toHaveTextContent('فقط PNG');
  fireEvent.change(input, { target: { files: Array.from({ length: 13 }, (_, i) => new File(['x'], `${i}.png`, { type: 'image/png' })) } });
  expect(screen.getByRole('alert')).toHaveTextContent('حداکثر ۱۲');
  await user.type(screen.getByLabelText('نام محصول'), 'Keep me');
  await user.type(screen.getByLabelText('قیمت (تومان)'), '25');
  await user.click(screen.getByRole('button', { name: 'افزودن تنوع' }));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  expect(screen.getByLabelText('SKU')).toHaveAttribute('aria-invalid', 'true');
  expect(api.adminSaveProduct).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('SKU'), 'SKU-1');
  vi.mocked(api.adminSaveProduct).mockRejectedValue(new ApiError(400, 'Validation failed', { name: ['Server name error'] }));
  await user.click(screen.getByRole('button', { name: 'ذخیره تغییرات' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Server name error');
  expect(screen.getByLabelText('نام محصول')).toHaveValue('Keep me');
  expect(screen.getByRole('button', { name: 'ذخیره تغییرات' })).toBeEnabled();
});

test('product pagination sends search and sort to the server, resets page and handles page failure/retry', async () => {
  vi.mocked(api.adminGetProductPage).mockImplementation(async params => pageOf([{ ...product, name: Number(params?.page) === 2 ? 'Second page suit' : product.name }], Number(params?.page), 17));
  const user = await openProducts();
  expect(api.adminGetProductPage).toHaveBeenCalledTimes(1);
  expect(api.adminGetProducts).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));
  await screen.findByRole('button', { name: 'ویرایش Second page suit' });
  expect(vi.mocked(api.adminGetProductPage).mock.lastCall?.[0]).toMatchObject({ page: 2, page_size: 8 });
  fireEvent.change(screen.getByLabelText('جستجوی محصولات'), { target: { value: 'کت' } });
  await waitFor(() => expect(vi.mocked(api.adminGetProductPage).mock.lastCall?.[0]).toMatchObject({ page: 1, search: 'کت' }));
  vi.mocked(api.adminGetProductPage).mockRejectedValueOnce(new Error('offline'));
  await user.selectOptions(screen.getByLabelText('مرتب‌سازی محصولات'), 'price-desc');
  await screen.findByRole('alert');
  await user.click(screen.getByRole('button', { name: 'تلاش مجدد' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(vi.mocked(api.adminGetProductPage).mock.lastCall?.[0]).toMatchObject({ page: 1, search: 'کت', ordering: 'price-desc' });
});

test('staff cancellation uses the server transition and refreshes only the active order page', async () => {
  const order = { id: 'ORDER-1', status: 'pending', createdAt: Date.now(), items: [], total: 100, customer: { name: 'Buyer' }, allowedTransitions: ['cancelled'] } as Order;
  vi.spyOn(api, 'adminGetOrderPage').mockResolvedValue(pageOf([order]));
  vi.spyOn(api, 'adminGetUsers');
  vi.spyOn(api, 'adminGetOrders');
  vi.spyOn(api, 'adminUpdateOrderStatus').mockImplementation(async () => {
    const updated = { ...order, status: 'cancelled', allowedTransitions: [] } as Order;
    vi.mocked(api.adminGetOrderPage).mockResolvedValue(pageOf([updated]));
    return updated;
  });
  render(<MemoryRouter><AppStateProvider><AdminPanel /></AppStateProvider></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'سفارشات' }));
  await user.click(await screen.findByRole('button', { name: 'لغو شده' }));
  expect(api.adminUpdateOrderStatus).toHaveBeenCalledWith('ORDER-1', 'cancelled');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'لغو شده' })).not.toBeInTheDocument());
  expect(api.adminGetOrderPage).toHaveBeenCalledTimes(2);
  expect(api.adminGetUsers).not.toHaveBeenCalled();
  expect(api.adminGetOrders).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'جزئیات کامل' }));
  expect(within(screen.getByRole('dialog')).getByText('لغو شده')).toBeVisible();
});

test('commerce fetches only its selected section, pages it, and preserves a failed coupon draft', async () => {
  vi.spyOn(api, 'adminGetCapabilities').mockResolvedValue({} as never);
  vi.spyOn(api, 'adminGetCoupons').mockResolvedValue(pageOf([], 1, 17));
  vi.spyOn(api, 'adminGetShippingMethods').mockResolvedValue(pageOf([]));
  vi.spyOn(api, 'adminGetPayments');
  vi.spyOn(api, 'adminSaveCoupon').mockRejectedValue(new ApiError(400, 'Coupon rejected'));
  render(<MemoryRouter><AppStateProvider><AdminPanel /></AppStateProvider></MemoryRouter>);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'عملیات فروشگاه' }));
  await waitFor(() => expect(api.adminGetCapabilities).toHaveBeenCalledTimes(1));
  expect(api.adminGetCoupons).not.toHaveBeenCalled();
  expect(api.adminGetPayments).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'تخفیف‌ها' }));
  await waitFor(() => expect(api.adminGetCoupons).toHaveBeenCalledTimes(1));
  await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));
  await waitFor(() => expect(vi.mocked(api.adminGetCoupons).mock.lastCall?.[0]).toMatchObject({ page: 2, page_size: 8 }));
  await user.type(await screen.findByLabelText('کد تخفیف'), 'RETRY');
  await user.type(screen.getByLabelText('مقدار'), '10');
  await user.click(screen.getByRole('button', { name: 'ذخیره' }));
  await waitFor(() => expect(api.adminSaveCoupon).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('کد تخفیف')).toHaveValue('RETRY');
  await user.click(screen.getByRole('button', { name: 'ارسال' }));
  await waitFor(() => expect(vi.mocked(api.adminGetShippingMethods).mock.lastCall?.[0]).toMatchObject({ page: 1, page_size: 8 }));
  expect(api.adminGetPayments).not.toHaveBeenCalled();
});
