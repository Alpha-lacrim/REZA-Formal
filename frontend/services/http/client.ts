import { ApiError, apiError, isRecord } from './errors';

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const CSRF_PATH = '/api/auth/csrf/';
const AUTH_PATHS = new Set(['login', 'register', 'refresh', 'logout', 'google', 'csrf'].map(name => `/api/auth/${name}/`));
let csrfRequest: Promise<string | undefined> | null = null;
let refreshRequest: Promise<void> | null = null;
let sessionVersion = 0;
let refreshVersion = 0;
const expiryListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  expiryListeners.add(listener);
  return () => { expiryListeners.delete(listener); };
}

export function invalidateSession(): void {
  sessionVersion++;
  csrfRequest = null;
  expiryListeners.forEach(listener => listener());
}

export async function settleRefresh(): Promise<void> {
  await refreshRequest?.catch(() => undefined);
}

function sessionChanged(): ApiError {
  return new ApiError(401, 'Your session has expired. Please sign in again.', {}, 'session_expired');
}

function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE.endsWith('/api') && normalized.startsWith('/api/')
    ? `${API_BASE}${normalized.slice(4)}` : `${API_BASE}${normalized}`;
}

function cookieToken(): string | undefined {
  const value = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('csrftoken='));
  try { return value ? decodeURIComponent(value.slice('csrftoken='.length)) : undefined; }
  catch { return undefined; }
}

async function csrfToken(): Promise<string | undefined> {
  const cookie = cookieToken();
  if (cookie) return cookie;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetch(apiUrl(CSRF_PATH), { credentials: 'include' });
      if (!response.ok) throw apiError(response.status, null);
      const raw: unknown = await response.json();
      const token = isRecord(raw) ? raw.csrfToken ?? raw.csrf_token ?? raw.token : undefined;
      return typeof token === 'string' ? token : cookieToken();
    })();
    // Failure must not poison all future unsafe requests.
    const pending = csrfRequest;
    void pending.catch(() => { if (csrfRequest === pending) csrfRequest = null; });
  }
  return csrfRequest;
}

async function send(path: string, opts: RequestInit, identity?: number): Promise<Response> {
  opts.signal?.throwIfAborted();
  const method = (opts.method || 'GET').toUpperCase();
  const headers = new Headers(opts.headers);
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!SAFE_METHODS.has(method)) {
    const token = await csrfToken();
    // Always rebuild after refresh, including multipart requests.
    headers.delete('X-CSRFToken');
    if (token) headers.set('X-CSRFToken', token);
  }
  opts.signal?.throwIfAborted();
  if (identity !== undefined && identity !== sessionVersion) throw sessionChanged();
  return fetch(apiUrl(path), { ...opts, method, headers, credentials: 'include' });
}

function waitForRefresh(pending: Promise<void>, signal?: AbortSignal | null): Promise<void> {
  if (!signal) return pending;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    void pending.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function refresh(version: number): Promise<void> {
  if (!refreshRequest) {
    const pending = (async () => {
      try {
        // Direct send: the refresh endpoint can never recursively refresh itself.
        const response = await send('/api/auth/refresh/', { method: 'POST' }, version);
        if (!response.ok) throw sessionChanged();
        if (version !== sessionVersion) throw sessionChanged();
        csrfRequest = null;
        refreshVersion++;
      } catch {
        if (version === sessionVersion) invalidateSession();
        throw sessionChanged();
      }
    })();
    refreshRequest = pending;
    void pending.finally(() => { if (refreshRequest === pending) refreshRequest = null; }).catch(() => undefined);
  }
  return refreshRequest;
}

export async function request(path: string, opts: RequestInit = {}, policy: { sessionBound?: boolean } = {}): Promise<unknown> {
  const identity = sessionVersion;
  const generation = refreshVersion;
  const endpoint = path.split('?')[0];
  const eligible = !AUTH_PATHS.has(endpoint);
  const sessionBound = eligible && policy.sessionBound !== false;
  try {
    let response = await send(path, opts, sessionBound ? identity : undefined);
    if (sessionBound && identity !== sessionVersion) throw sessionChanged();
    if (response.status === 401 && eligible) {
      if (identity !== sessionVersion) throw sessionChanged();
      // Late 401s from the old token reuse the completed refresh as well.
      if (generation === refreshVersion) await waitForRefresh(refresh(identity), opts.signal);
      opts.signal?.throwIfAborted();
      if (identity !== sessionVersion) throw sessionChanged();
      response = await send(path, opts, identity);
      if (identity !== sessionVersion) throw sessionChanged();
      if (response.status === 401) {
        invalidateSession();
        throw sessionChanged();
      }
    }
    if (response.ok && AUTH_PATHS.has(endpoint)) csrfRequest = null;
    const text = await response.text();
    opts.signal?.throwIfAborted();
    if (sessionBound && identity !== sessionVersion) throw sessionChanged();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* Never expose proxy HTML. */ }
    if (!response.ok) throw apiError(response.status, data);
    if (text && data === null) throw new ApiError(502, 'The service returned an invalid response.', {}, 'invalid_response');
    return data;
  } catch (error) {
    if (opts.signal?.aborted) opts.signal.throwIfAborted();
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Unable to connect to the service.', {}, 'network_error');
  }
}

export function jsonBody(payload: unknown): Pick<RequestInit, 'body' | 'headers'> {
  return { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } };
}
