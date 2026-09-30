import { afterEach, expect, test, vi } from 'vitest';
import api, { ApiError } from '../services/api';
import { request } from '../services/http/client';
import { normalizeUser } from '../services/auth';
import { normalizeProduct } from '../services/catalog';

afterEach(() => vi.unstubAllGlobals());

test.each([
  [{ detail: 'Check the form', code: 'validation_error', errors: { address: { city: ['Required'] }, lines: [{ quantity: ['Too large'] }] } },
    { status: 400, message: 'Check the form', code: 'validation_error', fields: { 'address.city': ['Required'], 'lines.0.quantity': ['Too large'] } }],
  [{ email: ['Invalid email'] }, { status: 400, message: 'Invalid email', fields: { email: ['Invalid email'] } }],
  [{ detail: 'Inventory changed', code: 'inventory_conflict' }, { status: 409, message: 'Inventory changed', code: 'inventory_conflict', fields: {} }],
  [{ detail: 'Private provider diagnostic', code: 'payment_unavailable' }, { status: 503, message: 'The service is temporarily unavailable.', code: 'payment_unavailable', fields: {} }],
])('normalizes server errors without retaining the raw response', async (body, expected) => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(body, { status: expected.status })));
  try { await request('/api/test/'); throw new Error('Expected failure'); }
  catch (error) {
    expect(error).toBeInstanceOf(ApiError); expect(error).toMatchObject(expected);
    expect(error).not.toHaveProperty('data');
  }
});

test('masks server internals, proxy HTML, malformed success JSON and network errors', async () => {
  for (const response of [Response.json({ detail: 'private SQL driver exception' }, { status: 500 }),
    new Response('<html>private proxy internals</html>', { status: 502 })]) {
    vi.stubGlobal('fetch', vi.fn(async () => response));
    await expect(request('/api/test/')).rejects.toMatchObject({ message: 'The service is temporarily unavailable.' });
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response('invalid JSON')));
  await expect(request('/api/test/')).rejects.toMatchObject({ code: 'invalid_response' });
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('private host'); }));
  await expect(request('/api/test/')).rejects.toMatchObject({ status: 0, code: 'network_error', message: 'Unable to connect to the service.' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
  await expect(request('/api/test/')).resolves.toBeNull();
});

test('auth DTO validation rejects incomplete identities and unknown roles', () => {
  for (const input of [null, {}, { id: 'x', email: 'x@example.invalid' },
    { id: 'x', email: 'x@example.invalid', role: 'superadmin' },
    { id: {}, email: 'x@example.invalid', role: 'admin' }]) {
    expect(() => normalizeUser(input)).toThrow(ApiError);
  }
  expect(normalizeUser({ id: 42, email: 'a@example.invalid', role: 'admin', first_name: 'Ada', date_joined: '2026-01-01T00:00:00Z' }))
    .toMatchObject({ id: '42', role: 'admin', name: 'Ada', createdAt: Date.parse('2026-01-01T00:00:00Z') });
});

test('catalog DTO validation retains supported aliases and rejects malformed prices and variants', () => {
  expect(normalizeProduct({ id: 42, name: 'Suit', price: '120.50', compare_at_price: '150',
    is_active: true, images: '["/media/a.png"]', variants: [{ id: 'v', price: '120.50', stock: 2, is_active: true }] }))
    .toMatchObject({ id: '42', price: 120.5, compareAtPrice: 150, active: true, images: ['/media/a.png'], stock: 2 });
  for (const input of [{}, { id: 'p', price: 'garbage' }, { id: 'p', name: {} },
    { id: 'p', variants: [null] }, { id: 'p', images: [{}] }, { id: 'p', active: 'maybe' }]) {
    expect(() => normalizeProduct(input)).toThrow(ApiError);
  }
});

test('login returns only a normalized user and profile writes whitelist editable fields', async () => {
  const user = { id: 'buyer', email: 'buyer@example.invalid', role: 'user', first_name: 'Buyer' };
  let profile: unknown;
  vi.stubGlobal('fetch', vi.fn(async (path: string, opts: RequestInit) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/update/')) { profile = JSON.parse(String(opts.body)); return Response.json(user); }
    return Response.json({ user, access: 'fixture-must-not-escape', detail: 'logged in' });
  }));
  const result = await api.login('buyer@example.invalid', 'fixture');
  expect(Object.keys(result)).toEqual(['user']); expect(result.user.name).toBe('Buyer');
  await api.updateProfile({ ...result.user, name: 'New name', phone: '123' });
  expect(profile).toEqual({ name: 'New name', phone: '123', address: '' });
});
