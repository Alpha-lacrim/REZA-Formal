import { ApiError, apiError, isRecord } from './errors';

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const CSRF_PATH = '/api/auth/csrf/';
const AUTH_PATHS = new Set(['login', 'register', 'refresh', 'logout', 'google', 'csrf'].map(name => `/api/auth/${name}/`));
let csrfRequest: Promise<string | undefined> | null = null;
let refreshRequest: Promise<void> | null = null;
let sessionVersion = 0;
let refreshVersion = 0;
let sessionChanges = 0;
const expiryListeners = new Set<() => void>();
const accountWrites = new Set<Promise<unknown>>();
const SESSION_EPOCH_KEY = 'reza_session_epoch_v1';
const REFRESH_EPOCH_KEY = 'reza_refresh_epoch_v1';
const readRefreshEpoch = () => {
  try { return localStorage.getItem(REFRESH_EPOCH_KEY); } catch { return null; }
};

// Web Locks coordinate cookie mutation across same-origin tabs. In browsers
// without them the per-tab single-flight remains; a rotation race fails closed.
export async function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request('reza_auth_cookies', operation) : operation();
}
const readSessionEpoch = () => {
  try { return localStorage.getItem(SESSION_EPOCH_KEY); } catch { return null; }
};
let sessionEpoch = readSessionEpoch();

function synchronizeSessionEpoch(): void {
  const observed = readSessionEpoch();
  if (observed === sessionEpoch) return;
  sessionEpoch = observed;
  invalidateSession();
}
const onStorage = (event: StorageEvent) => {
  if (event.key === SESSION_EPOCH_KEY || event.key === null) synchronizeSessionEpoch();
};

// Cookie changes wait for dispatched writes; abort cannot undo a server commit.
export async function settleAccountWrites(): Promise<void> {
  await Promise.allSettled([...accountWrites]);
}

export function onSessionExpired(listener: () => void): () => void {
  expiryListeners.add(listener);
  if (expiryListeners.size === 1) window.addEventListener('storage', onStorage);
  return () => {
    expiryListeners.delete(listener);
    if (!expiryListeners.size) window.removeEventListener('storage', onStorage);
  };
}

export function invalidateSession(): void {
  sessionVersion++;
  csrfRequest = null;
  expiryListeners.forEach(listener => listener());
}

export function beginSessionChange(): () => void {
  sessionChanges++;
  // Non-secret change notification only; this value cannot authenticate a user.
  try {
    const epoch = `${Date.now()}:${Math.random()}`;
    localStorage.setItem(SESSION_EPOCH_KEY, epoch);
    sessionEpoch = epoch;
  } catch { /* In-memory session isolation still applies when storage is disabled. */ }
  invalidateSession();
  return () => { sessionChanges--; };
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
  // Also check synchronously: a queued request may run before the storage event.
  synchronizeSessionEpoch();
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

function refresh(version: number, observedRefresh: string | null): Promise<void> {
  if (!refreshRequest) {
    const pending = withSessionLock(async () => {
      try {
        synchronizeSessionEpoch();
        if (version !== sessionVersion) throw sessionChanged();
        if (readRefreshEpoch() !== observedRefresh) { refreshVersion++; return; }
        // Direct send: the refresh endpoint can never recursively refresh itself.
        const response = await send('/api/auth/refresh/', { method: 'POST' }, version);
        if (!response.ok) throw sessionChanged();
        if (version !== sessionVersion) throw sessionChanged();
        csrfRequest = null;
        refreshVersion++;
        try { localStorage.setItem(REFRESH_EPOCH_KEY, crypto.randomUUID()); } catch { /* Cookies remain authoritative. */ }
      } catch {
        if (version === sessionVersion) invalidateSession();
        throw sessionChanged();
      }
    });
    refreshRequest = pending;
    void pending.finally(() => { if (refreshRequest === pending) refreshRequest = null; }).catch(() => undefined);
  }
  return refreshRequest;
}

export function request(path: string, opts: RequestInit = {}, policy: { sessionBound?: boolean } = {}): Promise<unknown> {
  const pending = performRequest(path, opts, policy);
  if (!SAFE_METHODS.has((opts.method || 'GET').toUpperCase()) && !AUTH_PATHS.has(path.split('?')[0])) {
    accountWrites.add(pending);
    void pending.finally(() => accountWrites.delete(pending)).catch(() => undefined);
  }
  return pending;
}

async function performRequest(path: string, opts: RequestInit = {}, policy: { sessionBound?: boolean } = {}): Promise<unknown> {
  const identity = sessionVersion;
  const generation = refreshVersion;
  const observedRefresh = readRefreshEpoch();
  const endpoint = path.split('?')[0];
  const eligible = !AUTH_PATHS.has(endpoint);
  const sessionBound = eligible && policy.sessionBound !== false;
  try {
    let response = await send(path, opts, sessionBound ? identity : undefined);
    if (sessionBound && identity !== sessionVersion) throw sessionChanged();
    if (response.status === 401 && eligible) {
      // A new public/catalog read during logout must not race its cookie deletion.
      if (identity !== sessionVersion || sessionChanges > 0) throw sessionChanged();
      // Late 401s from the old token reuse the completed refresh as well.
      if (generation === refreshVersion) await waitForRefresh(refresh(identity, observedRefresh), opts.signal);
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
