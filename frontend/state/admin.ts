import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Order } from '../types';
import { useAuth, useRuntime } from './AppState';
import { identityKey } from './remote';

// Forms, selection and pagination remain in the screen; server snapshots live here.
export function useAdminData(tab: string) {
  const { authState } = useAuth();
  const { queries } = useRuntime();
  const prefix = ['admin', identityKey(authState)];
  const enabled = authState.status === 'admin';
  function useRead<T>(name: string, fetch: () => Promise<T>, active = true) {
    return useQuery({ queryKey: [...prefix, name], queryFn: fetch, enabled: enabled && active }, queries);
  }
  const stats = useRead('stats', () => api.adminGetStats());
  const orders = useRead('orders', () => api.adminGetOrders(), tab === 'orders');
  const users = useRead('users', () => api.adminGetUsers(), tab === 'orders');
  const messages = useRead('messages', () => api.adminGetMessages(), tab === 'messages');
  const capabilities = useRead('capabilities', () => api.adminGetCapabilities(), tab === 'commerce');
  const coupons = useRead('coupons', () => api.adminGetCoupons(), tab === 'commerce');
  const shipping = useRead('shipping', () => api.adminGetShippingMethods(), tab === 'commerce');
  const payments = useRead('payments', () => api.adminGetPayments(), tab === 'commerce');
  const reviews = useRead('reviews', () => api.adminGetReviews(), tab === 'commerce');
  const returns = useRead('returns', () => api.adminGetReturns(), tab === 'commerce');
  const bespoke = useRead('bespoke', () => api.adminGetBespokeRequests(), tab === 'commerce');
  const commerce = [capabilities, coupons, shipping, payments, reviews, returns, bespoke];
  const invalidate = () => queries.invalidateQueries({ queryKey: prefix });
  return {
    stats: stats.data || { productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 },
    orders: orders.data || [], users: users.data || [], messages: messages.data || [],
    capabilities: capabilities.data || null, coupons: coupons.data?.results || [],
    shippingMethods: shipping.data?.results || [], payments: payments.data?.results || [],
    reviews: reviews.data?.results || [], returns: returns.data?.results || [], bespokeRequests: bespoke.data?.results || [],
    commerceLoading: commerce.some(query => query.isFetching),
    commerceError: commerce.some(query => query.isError) ? 'دریافت برخی بخش‌ها انجام نشد؛ دوباره تلاش کنید.' : '',
    adminError: [stats, ...(tab === 'orders' ? [orders, users] : tab === 'messages' ? [messages] : [])].some(query => query.isError),
    loadData: invalidate, loadCommerceData: invalidate,
    setOrders: (next: Order[] | ((previous: Order[]) => Order[])) => queries.setQueryData<Order[]>([...prefix, 'orders'], old => typeof next === 'function' ? next(old || []) : next),
  };
}
