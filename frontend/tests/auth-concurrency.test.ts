import { afterEach, beforeEach, expect, test, vi } from 'vitest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
let client: typeof import('../services/http/client');
beforeEach(async () => { vi.resetModules(); client = await import('../services/http/client'); });
afterEach(() => vi.unstubAllGlobals());

test('concurrent 401s share one refresh, including a late old-token response', async () => {
  const release = deferred<Response>();
  const late = deferred<Response>();
  const reads = new Map<string, number>();
  let refreshes = 0;
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/refresh/')) { refreshes++; return release.promise; }
    const count = (reads.get(path) || 0) + 1; reads.set(path, count);
    if (count === 1) return path.endsWith('/late/') ? late.promise : Response.json({}, { status: 401 });
    return Response.json({ ok: true });
  }));
  const requests = ['one', 'two', 'three', 'four'].map(id => client.request(`/api/${id}/`));
  const delayed = client.request('/api/late/');
  await vi.waitFor(() => expect(refreshes).toBe(1));
  release.resolve(Response.json({}));
  await expect(Promise.all(requests)).resolves.toHaveLength(4);
  late.resolve(Response.json({}, { status: 401 }));
  await expect(delayed).resolves.toEqual({ ok: true });
  expect(refreshes).toBe(1);
  expect([...reads.values()]).toEqual([2, 2, 2, 2, 2]);
});

test.each(['unauthorized', 'network'])('shared %s refresh failure expires once and never retries', async failure => {
  const release = deferred<Response>();
  let refreshes = 0; let reads = 0;
  const expired = vi.fn(); client.onSessionExpired(expired);
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/refresh/')) {
      refreshes++;
      await release.promise;
      if (failure === 'network') throw new TypeError('private network detail');
      return Response.json({}, { status: 401 });
    }
    reads++; return Response.json({}, { status: 401 });
  }));
  const results = Promise.allSettled([client.request('/api/cart/'), client.request('/api/orders/my/')]);
  await vi.waitFor(() => expect(refreshes).toBe(1));
  release.resolve(Response.json({}));
  for (const result of await results) {
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') expect(result.reason).toMatchObject({ status: 401, code: 'session_expired' });
  }
  expect(expired).toHaveBeenCalledTimes(1); expect(reads).toBe(2); expect(refreshes).toBe(1);
});

test('a retry returning 401 expires once; auth endpoints never recursively refresh', async () => {
  let refreshes = 0; let reads = 0;
  const expired = vi.fn(); client.onSessionExpired(expired);
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/refresh/')) { refreshes++; return Response.json({}); }
    reads++; return Response.json({}, { status: 401 });
  }));
  await expect(client.request('/api/private/')).rejects.toMatchObject({ code: 'session_expired' });
  expect(reads).toBe(2); expect(refreshes).toBe(1); expect(expired).toHaveBeenCalledTimes(1);
  for (const endpoint of ['login', 'register', 'logout', 'google', 'refresh']) {
    vi.stubGlobal('fetch', vi.fn(async (path: string) => path.endsWith('/csrf/')
      ? Response.json({ csrfToken: 'fixture' }) : Response.json({}, { status: 401 })));
    await expect(client.request(`/api/auth/${endpoint}/?test=1`, { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(endpoint === 'login' ? 2 : 1);
  }
});

test('aborting one waiter does not cancel refresh or retry that waiter', async () => {
  const release = deferred<Response>();
  const controller = new AbortController();
  const reads = new Map<string, number>(); let refreshes = 0;
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/refresh/')) { refreshes++; return release.promise; }
    const count = (reads.get(path) || 0) + 1; reads.set(path, count);
    return Response.json({}, { status: count === 1 ? 401 : 200 });
  }));
  const cancelled = client.request('/api/cancelled/', { signal: controller.signal });
  const survivor = client.request('/api/survivor/');
  await vi.waitFor(() => expect(refreshes).toBe(1));
  controller.abort();
  await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
  release.resolve(Response.json({}));
  await survivor;
  expect(reads.get('http://localhost:3000/api/cancelled/')).toBe(1);
  expect(reads.get('http://localhost:3000/api/survivor/')).toBe(2);
});

test('unsafe multipart retry retains its body and rebuilds CSRF after rotation', async () => {
  let tokens = 0; let writes = 0; let refreshes = 0;
  const form = new FormData(); form.append('image', new Blob(['fixture']), 'photo.png');
  vi.stubGlobal('fetch', vi.fn(async (path: string, opts: RequestInit) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: `fixture-${++tokens}` });
    expect(opts.credentials).toBe('include');
    const headers = new Headers(opts.headers);
    if (path.endsWith('/refresh/')) {
      refreshes++; expect(headers.get('X-CSRFToken')).toBe('fixture-1'); return Response.json({});
    }
    writes++;
    expect(opts.body).toBe(form); expect(headers.has('Content-Type')).toBe(false);
    expect(headers.get('X-CSRFToken')).toBe(`fixture-${writes}`);
    return Response.json({}, { status: writes === 1 ? 401 : 200 });
  }));
  await client.request('/api/admin/products/', { method: 'POST', body: form });
  expect(writes).toBe(2); expect(tokens).toBe(2); expect(refreshes).toBe(1);
});

test('logout waits for refresh cookies then clears them; old request cannot retry', async () => {
  const release = deferred<Response>(); const calls: string[] = [];
  const { authApi } = await import('../services/auth');
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    if (path.endsWith('/csrf/')) return Response.json({ csrfToken: 'fixture' });
    if (path.endsWith('/refresh/')) { calls.push('refresh'); return release.promise; }
    if (path.endsWith('/logout/')) { calls.push('logout'); return Response.json({}); }
    calls.push('read'); return Response.json({}, { status: 401 });
  }));
  const pending = Promise.allSettled([client.request('/api/private/')]);
  await vi.waitFor(() => expect(calls).toEqual(['read', 'refresh']));
  const logout = authApi.logout();
  await Promise.resolve(); expect(calls).not.toContain('logout');
  release.resolve(Response.json({}));
  await logout;
  expect((await pending)[0].status).toBe('rejected');
  expect(calls).toEqual(['read', 'refresh', 'logout']);
});

test('a session change during response body streaming rejects the stale success', async () => {
  const body = deferred<string>();
  const response = Response.json({});
  vi.spyOn(response, 'text').mockImplementation(() => body.promise);
  vi.stubGlobal('fetch', vi.fn(async () => response));
  const pending = client.request('/api/auth/me/');
  await vi.waitFor(() => expect(response.text).toHaveBeenCalled());
  client.invalidateSession();
  body.resolve(JSON.stringify({ id: 'old-admin', role: 'admin' }));
  await expect(pending).rejects.toMatchObject({ code: 'session_expired' });
});

test('public site settings can finish while anonymous bootstrap expires the session', async () => {
  const body = deferred<string>();
  const response = Response.json({});
  vi.spyOn(response, 'text').mockImplementation(() => body.promise);
  vi.stubGlobal('fetch', vi.fn(async () => response));
  const { default: api } = await import('../services/api');
  const pending = api.getSettings();
  await vi.waitFor(() => expect(response.text).toHaveBeenCalled());
  client.invalidateSession();
  body.resolve(JSON.stringify({ hero_image: '/media/hero.png' }));
  await expect(pending).resolves.toMatchObject({ heroImage: '/media/hero.png' });
});
