import { expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import api from '../services/api';
import { server } from './setup';

test.each([
  ['orders', () => api.adminGetOrders()],
  ['users', () => api.adminGetUsers()],
  ['messages', () => api.adminGetMessages()],
  ['products', () => api.adminGetProducts()],
] as const)('%s retains all staff records across pages', async (collection, read) => {
  const requests: number[] = [];
  server.use(http.get(`*/api/admin/${collection}/`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page'));
    expect(url.searchParams.get('page_size')).toBe('100');
    requests.push(page);
    const start = (page - 1) * 100;
    return HttpResponse.json({
      results: Array.from({ length: page === 1 ? 100 : 3 }, (_, i) => ({ id: String(start + i), email: `user${i}@example.invalid`, role: 'user' })),
      count: 103, page, page_size: 100, total_pages: 2,
    });
  }));
  const rows = await read();
  expect(rows).toHaveLength(103);
  expect(new Set(rows.map(row => row.id)).size).toBe(103);
  expect(requests).toEqual([1, 2]);
});

test('a failed later staff page rejects the entire collection', async () => {
  server.use(http.get('*/api/admin/products/', ({ request }) => {
    if (new URL(request.url).searchParams.get('page') === '2') {
      return HttpResponse.json({ detail: 'Unavailable' }, { status: 503 });
    }
    return HttpResponse.json({ results: [{ id: 'first' }], count: 2, page: 1, page_size: 1, total_pages: 2 });
  }));
  await expect(api.adminGetProducts()).rejects.toThrow();
});

test('legacy arrays remain compatible and repeated page metadata cannot loop', async () => {
  server.use(http.get('*/api/admin/products/', () => HttpResponse.json([{ id: 'legacy' }])));
  expect(await api.adminGetProducts()).toHaveLength(1);
  server.use(http.get('*/api/admin/products/', () => HttpResponse.json({
    results: [{ id: 'first' }], count: 2, page: 1, page_size: 1, total_pages: 2,
  })));
  await expect(api.adminGetProducts()).rejects.toThrow('Invalid administrative pagination response');
});
