const API_BASE = (import.meta.env?.VITE_API_BASE as string) || 'http://localhost:8000';

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as any || {}) };

  // try primary (relative/proxied) endpoint first
  let res = await fetch(API_BASE + path, { ...opts, headers, credentials: 'include' });
  let text = await res.text();
  // if we got HTML (vite index) or 404, attempt direct backend fallback
  const contentType = res.headers.get('content-type') || '';
  const looksLikeHtml = contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE html');
  if (res.status === 404 || looksLikeHtml) {
    try {
      const backend = 'http://localhost:8000';
      res = await fetch(backend + path, { ...opts, headers, credentials: 'include' });
      text = await res.text();
    } catch (e) {
      // ignore fallback error, will handle below
    }
  }

  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw { status: res.status, data };
  return data;
}

export const api = {
  async getProducts() { return await request('/api/products/'); },
  async getProduct(id: string) { return await request('/api/products/' + id + '/'); },
  async register(name: string, email: string, pass: string) {
    return await request('/api/auth/register/', { method: 'POST', body: JSON.stringify({ first_name: name, email, password: pass }) });
  },
  async login(email: string, pass: string, otp?: string) {
    // server will set cookies; return user payload
    return await request('/api/auth/login/', { method: 'POST', body: JSON.stringify({ email, password: pass, otp }) });
  },
  async logout() { return await request('/api/auth/logout/', { method: 'POST' }); },
  async me() { return await request('/api/auth/me/'); },
  async sendOtp(email: string) { return await request('/api/auth/send-otp/', { method: 'POST', body: JSON.stringify({ email }) }); },
  async createOrder(payload: any) { return await request('/api/orders/create/', { method: 'POST', body: JSON.stringify(payload) }); },
  async myOrders() { return await request('/api/orders/my/'); },
  async getCart() { return await request('/api/cart/'); },
  async addToCart(product_id: string, qty = 1) { return await request('/api/cart/add/', { method: 'POST', body: JSON.stringify({ product_id, qty }) }); },
  async updateCartItem(product_id: string, qty: number) { return await request('/api/cart/update/', { method: 'POST', body: JSON.stringify({ product_id, qty }) }); },
  async clearCart() { return await request('/api/cart/clear/', { method: 'POST' }); },
  async getSettings() { return await request('/api/settings/'); },
  async saveSettings(data: any) { return await request('/api/settings/', { method: 'PUT', body: JSON.stringify(data) }); },
  async contact(name: string, email: string, message: string) { return await request('/api/contact/', { method: 'POST', body: JSON.stringify({ name, email, message }) }); },
  async googleAuth(id_token: string) { return await request('/api/auth/google/', { method: 'POST', body: JSON.stringify({ id_token }) }); },
  async updateProfile(payload: any) { return await request('/api/auth/me/update/', { method: 'PUT', body: JSON.stringify(payload) }); }
  ,
  // Admin endpoints
  async adminGetStats() { return await request('/api/admin/stats/'); },
  async adminGetOrders() { return await request('/api/admin/orders/'); },
  async adminUpdateOrderStatus(id: string, status: string) { return await request('/api/admin/orders/' + id + '/status/', { method: 'PUT', body: JSON.stringify({ status }) }); },
  async adminGetUsers() { return await request('/api/admin/users/'); },
  async adminGetMessages() { return await request('/api/admin/messages/'); },
  async adminMarkMessageRead(id: string) { return await request('/api/admin/messages/' + id + '/mark-read/', { method: 'POST' }); },
  async adminGetProducts() { return await request('/api/admin/products/'); },
  async adminSaveProduct(product: any) {
    // If a FormData instance is provided (contains files), send multipart without forcing JSON headers
    if (product instanceof FormData) {
      const id = product.get('id') as string | null;
      const path = id ? '/api/admin/products/' + id + '/' : '/api/admin/products/';
      const method = id ? 'PUT' : 'POST';

      const send = async (base: string, methodOverride?: string) => {
        const useMethod = methodOverride || method;
        const res = await fetch(base + path, { method: useMethod, body: product, credentials: 'include' });
        const text = await res.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) throw { status: res.status, data, statusCode: res.status };
        return data;
      };

      // Try primary then fallback to direct backend if needed. If a PUT fails because the id
      // is local-only (404/400), retry as POST (create) without the id field.
      const API_BASE = (import.meta.env?.VITE_API_BASE as string) || 'http://localhost:8000';
      try {
        return await send(API_BASE);
      } catch (e: any) {
        // If server indicates resource not found or bad request for PUT, retry as POST
        if (e && (e.statusCode === 404 || e.statusCode === 400 || e.statusCode === 500) && method === 'PUT') {
          try {
            // Remove 'id' from FormData for create
            const fd = new FormData();
            for (const [k, v] of (product as FormData).entries()) {
              if (k === 'id') continue;
              fd.append(k, v as any);
            }
            // send POST to collection endpoint
            const postPath = '/api/admin/products/';
            const postRes = await fetch(API_BASE + postPath, { method: 'POST', body: fd, credentials: 'include' });
            const postText = await postRes.text();
            let postData: any = null;
            try { postData = postText ? JSON.parse(postText) : null; } catch { postData = postText; }
            if (!postRes.ok) throw { status: postRes.status, data: postData };
            return postData;
          } catch (inner) {
            // fall through to trying backend direct
          }
        }

        try {
          const backend = 'http://localhost:8000';
          return await send(backend);
        } catch (err: any) {
          // If PUT failed on backend and was due to missing resource, try POST there too
          if (err && (err.statusCode === 404 || err.statusCode === 400 || err.statusCode === 500) && method === 'PUT') {
            try {
              const fd = new FormData();
              for (const [k, v] of (product as FormData).entries()) {
                if (k === 'id') continue;
                fd.append(k, v as any);
              }
              const postRes = await fetch(backend + '/api/admin/products/', { method: 'POST', body: fd, credentials: 'include' });
              const postText = await postRes.text();
              let postData: any = null;
              try { postData = postText ? JSON.parse(postText) : null; } catch { postData = postText; }
              if (!postRes.ok) throw { status: postRes.status, data: postData };
              return postData;
            } catch (inner) {
              throw inner;
            }
          }
          throw err;
        }
      }
    }

    if (product.id) return await request('/api/admin/products/' + product.id + '/', { method: 'PUT', body: JSON.stringify(product) });
    return await request('/api/admin/products/', { method: 'POST', body: JSON.stringify(product) });
  },
  async adminDeleteProduct(id: string) { return await request('/api/admin/products/' + id + '/', { method: 'DELETE' }); }
};

export default api;
