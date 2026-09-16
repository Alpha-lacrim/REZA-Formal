import { expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import api from '../services/api';
import { server } from './setup';

test('expired session refresh failure rejects without a retry loop', async () => {
  let refreshes = 0; let reads = 0;
  let refreshCsrf: string | null = null;
  server.use(
    http.get('*/api/auth/me/', () => { reads++; return HttpResponse.json({ detail: 'Expired' }, { status: 401 }); }),
    http.get('*/api/auth/csrf/', () => HttpResponse.json({ csrfToken: 'csrf-fixture' })),
    http.post('*/api/auth/refresh/', ({ request }) => {
      refreshes++;
      refreshCsrf = request.headers.get('X-CSRFToken');
      return HttpResponse.json({ detail: 'Expired refresh' }, { status: 401 });
    }),
  );
  await expect(api.me()).rejects.toThrow();
  expect(refreshes).toBe(1); expect(reads).toBe(1);
  expect(refreshCsrf).toBe('csrf-fixture');
});

test('successful refresh retries the session request and returns the authenticated user', async () => {
  let reads = 0; let refreshes = 0;
  server.use(
    http.get('*/api/auth/me/', () => ++reads === 1
      ? HttpResponse.json({}, { status: 401 })
      : HttpResponse.json({ id: 42, email: 'buyer@example.invalid', role: 'user' })),
    http.get('*/api/auth/csrf/', () => HttpResponse.json({ csrfToken: 'csrf-fixture' })),
    http.post('*/api/auth/refresh/', () => { refreshes++; return HttpResponse.json({}); }),
  );
  expect(await api.me()).toMatchObject({ id: '42', email: 'buyer@example.invalid', role: 'user' });
  expect(reads).toBe(2); expect(refreshes).toBe(1);
});

test('login and logout send credentials and CSRF through the real adapter', async () => {
  const calls: string[] = [];
  server.use(
    http.get('*/api/auth/csrf/', () => HttpResponse.json({ csrfToken: 'csrf-fixture' })),
    http.post('*/api/auth/login/', async ({ request }) => {
      expect(request.credentials).toBe('include');
      expect(request.headers.get('X-CSRFToken')).toBe('csrf-fixture');
      expect(await request.json()).toEqual({ email: 'buyer@example.invalid', password: 'test-password' });
      calls.push('login'); return HttpResponse.json({ user: { id: 'buyer' } });
    }),
    http.post('*/api/auth/logout/', ({ request }) => {
      expect(request.headers.get('X-CSRFToken')).toBe('csrf-fixture');
      calls.push('logout'); return HttpResponse.json({});
    }),
  );
  await api.login('buyer@example.invalid', 'test-password'); await api.logout();
  expect(calls).toEqual(['login', 'logout']);
});
