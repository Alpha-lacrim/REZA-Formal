const API_BASE = (import.meta.env?.VITE_API_BASE as string) || 'http://localhost:8000';

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as any || {}) };
  const res = await fetch(API_BASE + path, { ...opts, headers, credentials: 'include' });
  const text = await res.text();
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
    if (product.id) return await request('/api/admin/products/' + product.id + '/', { method: 'PUT', body: JSON.stringify(product) });
    return await request('/api/admin/products/', { method: 'POST', body: JSON.stringify(product) });
  },
  async adminDeleteProduct(id: string) { return await request('/api/admin/products/' + id + '/', { method: 'DELETE' }); }
};

export default api;
