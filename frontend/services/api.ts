import { Order, Product, SiteSettings, User } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE) return normalizedPath;

  // Accept both an origin (https://api.example.com) and an API prefix (/api)
  // without producing paths such as /api/api/products/.
  if (API_BASE.endsWith('/api') && (normalizedPath === '/api' || normalizedPath.startsWith('/api/'))) {
    return `${API_BASE}${normalizedPath.slice(4)}`;
  }

  return `${API_BASE}${normalizedPath}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

function normalizeProduct(raw: any): Product {
  const images = parseJsonList(raw?.images);
  const image = raw?.image || images[0] || '';

  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    name_fa: raw?.name_fa,
    price: toNumber(raw?.price),
    currency: raw?.currency || 'Toman',
    image,
    images: images.length > 0 ? images : (image ? [image] : []),
    short: raw?.short ?? '',
    short_fa: raw?.short_fa,
    description: raw?.description ?? '',
    description_fa: raw?.description_fa,
    category: raw?.category ?? '',
    fabric: raw?.fabric || undefined,
    stock: raw?.stock === null || raw?.stock === undefined ? undefined : toNumber(raw.stock)
  };
}

function normalizeUser(raw: any): User {
  const firstName = raw?.first_name ?? '';
  const lastName = raw?.last_name ?? '';
  const fullName = raw?.name || [firstName, lastName].filter(Boolean).join(' ') || raw?.email || '';

  return {
    id: String(raw?.id ?? ''),
    name: fullName,
    email: raw?.email ?? '',
    role: raw?.role || 'user',
    phone: raw?.phone,
    address: raw?.address || '',
    createdAt: raw?.createdAt ?? (raw?.date_joined ? Date.parse(raw.date_joined) : Date.now()),
    avatar: raw?.avatar,
    provider: raw?.provider
  };
}

function normalizeOrderItem(raw: any) {
  const product = raw?.product ? normalizeProduct(raw.product) : normalizeProduct(raw);
  const qty = toNumber(raw?.qty, 1);
  const price = toNumber(raw?.price, product.price);
  return { ...product, qty, price };
}

function normalizeOrder(raw: any): Order {
  const createdAt = raw?.createdAt ?? raw?.created_at;
  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.userId ?? raw?.user_id ?? raw?.user ?? ''),
    items: Array.isArray(raw?.items) ? raw.items.map(normalizeOrderItem) : [],
    total: toNumber(raw?.total),
    status: raw?.status || 'pending',
    createdAt: typeof createdAt === 'number' ? createdAt : (createdAt ? Date.parse(createdAt) : Date.now()),
    shippingAddress: raw?.shippingAddress ?? raw?.shipping_address ?? ''
  };
}

function normalizeSettings(raw: any): SiteSettings {
  return {
    aboutTitle: raw?.aboutTitle ?? raw?.about_title ?? '',
    aboutDescription: raw?.aboutDescription ?? raw?.about_description ?? '',
    aboutImage: raw?.aboutImage ?? raw?.about_image ?? '',
    heroImage: raw?.heroImage ?? raw?.hero_image ?? '',
    suitsSectionImage: raw?.suitsSectionImage ?? raw?.suits_section_image ?? '',
    shirtsSectionImage: raw?.shirtsSectionImage ?? raw?.shirts_section_image ?? '',
    blazersSectionImage: raw?.blazersSectionImage ?? raw?.blazers_section_image ?? '',
    accessoriesSectionImage: raw?.accessoriesSectionImage ?? raw?.accessories_section_image ?? '',
    bespokeSectionImage: raw?.bespokeSectionImage ?? raw?.bespoke_section_image ?? ''
  };
}

const NO_AUTO_REFRESH_PATHS = new Set([
  '/api/auth/login/',
  '/api/auth/register/',
  '/api/auth/refresh/',
  '/api/auth/logout/',
  '/api/auth/google/',
]);

async function fetchApi(path: string, opts: RequestInit): Promise<Response> {
  const requestOptions = { ...opts, credentials: 'include' as RequestCredentials };
  let response = await fetch(apiUrl(path), requestOptions);

  if (response.status === 401 && !NO_AUTO_REFRESH_PATHS.has(path)) {
    const refreshResponse = await fetch(apiUrl('/api/auth/refresh/'), {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshResponse.ok) {
      response = await fetch(apiUrl(path), requestOptions);
    }
  }

  return response;
}

async function request(path: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetchApi(path, { ...opts, headers });
  const text = await res.text();

  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const message = data?.detail || data?.message || (typeof data === 'string' ? data : 'Request failed');
    const error = new Error(message) as Error & { status?: number; data?: unknown };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function isFile(value: any): boolean {
  if (!value) return false;
  return (value instanceof File || value instanceof Blob);
}

export const api = {
  async getProducts() { return (await request('/api/products/')).map(normalizeProduct); },
  async getProduct(id: string) { return normalizeProduct(await request('/api/products/' + id + '/')); },
  async register(name: string, email: string, pass: string) {
    const data = await request('/api/auth/register/', { method: 'POST', body: JSON.stringify({ first_name: name, email, password: pass }) });
    return data?.user ? { ...data, user: normalizeUser(data.user) } : normalizeUser(data);
  },
  async login(email: string, pass: string, otp?: string) {
    const data = await request('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password: pass, otp }) });
    return data?.user ? { ...data, user: normalizeUser(data.user) } : normalizeUser(data);
  },
  async logout() { return await request('/api/auth/logout/', { method: 'POST' }); },
  async me() { return normalizeUser(await request('/api/auth/me/')); },
  async createOrder(payload: any) { return normalizeOrder(await request('/api/orders/create/', { method: 'POST', body: JSON.stringify(payload) })); },
  async myOrders() { return (await request('/api/orders/my/')).map(normalizeOrder); },
  async cancelOrder(id: string) { return normalizeOrder(await request('/api/orders/' + id + '/cancel/', { method: 'POST' })); },
  async getSettings() { return normalizeSettings(await request('/api/settings/')); },
  async saveSettings(data: any) {
    // If caller provided FormData, send multipart PUT without forcing JSON headers
    if (data instanceof FormData) {
      const send = async () => {
        const res = await fetchApi('/api/settings/', { method: 'PUT', body: data });
        const text = await res.text();
        let parsed: any = null;
        try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
        if (!res.ok) {
          const error = new Error(parsed?.detail || parsed?.message || 'Request failed') as Error & { status?: number; data?: unknown };
          error.status = res.status;
          error.data = parsed;
          throw error;
        }
        return normalizeSettings(parsed);
      };
      return await send();
    }
    return normalizeSettings(await request('/api/settings/', { method: 'PUT', body: JSON.stringify(data) }));
  },
  async contact(name: string, email: string, message: string) { return await request('/api/contact/', { method: 'POST', body: JSON.stringify({ name, email, message }) }); },
  async updateProfile(payload: any) { return normalizeUser(await request('/api/auth/me/update/', { method: 'PUT', body: JSON.stringify(payload) })); },

  async adminGetStats() { return await request('/api/admin/stats/'); },
  async adminGetOrders() { return (await request('/api/admin/orders/')).map(normalizeOrder); },
  async adminUpdateOrderStatus(id: string, status: string) { return normalizeOrder(await request('/api/admin/orders/' + id + '/status/', { method: 'PUT', body: JSON.stringify({ status }) })); },
  async adminGetUsers() { return (await request('/api/admin/users/')).map(normalizeUser); },
  async adminGetMessages() { return await request('/api/admin/messages/'); },
  async adminMarkMessageRead(id: string) { return await request('/api/admin/messages/' + id + '/mark-read/', { method: 'POST' }); },
  async adminGetProducts() { return (await request('/api/admin/products/')).map(normalizeProduct); },

  async adminSaveProduct(product: any) {
    let payload = product;

    // 1. Convert plain object to FormData if needed
    if (!(product instanceof FormData)) {
      const fd = new FormData();
      Object.keys(product).forEach(key => {
        const value = product[key];
        if (value === null || value === undefined) return;

        if (isFile(value)) {
          fd.append(key, value);
        }
        else if (Array.isArray(value)) {
          if (value.length > 0 && isFile(value[0])) {
             value.forEach((f) => fd.append(key, f));
          } else {
             fd.append(key, JSON.stringify(value));
          }
        }
        else if (typeof value === 'object') {
          fd.append(key, JSON.stringify(value));
        }
        else {
          fd.append(key, String(value));
        }
      });
      payload = fd;
    }

    // 2. Send FormData
    if (payload instanceof FormData) {
      const id = payload.get('id') as string | null;
      const path = id ? '/api/admin/products/' + id + '/' : '/api/admin/products/';
      const method = id ? 'PUT' : 'POST';

      const send = async () => {
        // IMPORTANT: NO headers. Let browser set Content-Type
        const res = await fetchApi(path, {
            method: method, 
            body: payload,
        });
        
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }

        if (!res.ok) {
          const error = new Error(data?.detail || data?.message || 'Request failed') as Error & { status?: number; data?: unknown };
          error.status = res.status;
          error.data = data;
          throw error;
        }
        return normalizeProduct(data);
      };

      return await send();
    }

    if (product.id) return normalizeProduct(await request('/api/admin/products/' + product.id + '/', { method: 'PUT', body: JSON.stringify(product) }));
    return normalizeProduct(await request('/api/admin/products/', { method: 'POST', body: JSON.stringify(product) }));
  },

  async adminDeleteProduct(id: string) { return await request('/api/admin/products/' + id + '/', { method: 'DELETE' }); }
};

export default api;
