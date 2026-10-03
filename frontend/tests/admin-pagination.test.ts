import { expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import api from '../services/api';
import { server } from './setup';

test.each([
  ['orders', api.adminGetOrderPage], ['messages', api.adminGetMessagePage],
  ['products', api.adminGetProductPage], ['coupons', api.adminGetCoupons],
  ['shipping-methods', api.adminGetShippingMethods], ['payments', api.adminGetPayments],
  ['reviews', api.adminGetReviews], ['returns', api.adminGetReturns], ['bespoke', api.adminGetBespokeRequests],
] as const)('%s reads only the requested server page and retains metadata', async (collection, read) => {
  const requests: string[] = [];
  server.use(http.get(`*/api/admin/${collection}/`, ({ request }) => {
    const url = new URL(request.url);
    requests.push(url.search);
    return HttpResponse.json({ results: [{ id: 'page-two', price: '25.50' }], count: 17, page: 2, page_size: 8, total_pages: 3, next: '/ignored' });
  }));
  const page = await read({ page: 2, page_size: 8, search: 'کت', ordering: 'price-desc' });
  expect(page.results).toHaveLength(1);
  expect(page.count).toBe(17);
  expect(page.totalPages).toBe(3);
  expect(page.page).toBe(2);
  expect(requests).toHaveLength(1);
  const params = new URLSearchParams(requests[0]);
  expect(params.get('search')).toBe('کت');
  expect(params.get('ordering')).toBe('price-desc');
  expect(params.get('page')).toBe('2');
});

test('page failures reject without returning a partial collection or following links', async () => {
  server.use(http.get('*/api/admin/products/', () => HttpResponse.json({ detail: 'Unavailable' }, { status: 503 })));
  await expect(api.adminGetProductPage({ page: 2 })).rejects.toMatchObject({ status: 503 });
});

test('shared staff catalog compatibility reads a bounded snapshot without walking all pages', async () => {
  const pages: string[] = [];
  server.use(http.get('*/api/admin/products/', ({ request }) => {
    pages.push(new URL(request.url).searchParams.get('page')!);
    return HttpResponse.json({ results: [{ id: 'first' }], count: 1000, page: 1, page_size: 100, total_pages: 10 });
  }));
  expect(await api.adminGetProducts()).toHaveLength(1);
  expect(pages).toEqual(['1']);
});
