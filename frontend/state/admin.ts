import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth, useRuntime } from './AppState';
import { identityKey } from './remote';

// Forms, selection and pagination remain in the screen; server snapshots live here.
export type CommerceSection = 'capabilities' | 'coupons' | 'shipping' | 'payments' | 'reviews' | 'returns' | 'bespoke';
export function useAdminData(tab: string, section: CommerceSection = 'capabilities', page = 1) {
  const { authState } = useAuth();
  const { queries } = useRuntime();
  const prefix = ['admin', identityKey(authState)];
  const enabled = authState.status === 'admin';
  function useRead<T>(name: string, fetch: (signal: AbortSignal) => Promise<T>, active = true) {
    return useQuery({ queryKey: [...prefix, name, name === 'stats' ? 1 : page], queryFn: ({ signal }) => fetch(signal), enabled: enabled && active, gcTime: 5 * 60_000 }, queries);
  }
  const stats = useRead('stats', () => api.adminGetStats());
  const active = (name: string) => tab === 'commerce' && section === name;
  const params = { page, page_size: 8 };
  const capabilities = useRead('capabilities', () => api.adminGetCapabilities(), active('capabilities'));
  const coupons = useRead('coupons', (signal) => api.adminGetCoupons(params, signal), active('coupons'));
  const shipping = useRead('shipping', (signal) => api.adminGetShippingMethods(params, signal), active('shipping'));
  const payments = useRead('payments', (signal) => api.adminGetPayments(params, signal), active('payments'));
  const reviews = useRead('reviews', (signal) => api.adminGetReviews(params, signal), active('reviews'));
  const returns = useRead('returns', (signal) => api.adminGetReturns(params, signal), active('returns'));
  const bespoke = useRead('bespoke', (signal) => api.adminGetBespokeRequests(params, signal), active('bespoke'));
  const commerce = { capabilities, coupons, shipping, payments, reviews, returns, bespoke }[section];
  const invalidate = () => queries.invalidateQueries({ queryKey: prefix });
  return {
    stats: stats.data || { productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 },
    commercePage: ({ coupons: coupons.data, shipping: shipping.data, payments: payments.data, reviews: reviews.data, returns: returns.data, bespoke: bespoke.data } as Record<string, { count: number; totalPages?: number } | undefined>)[section],
    capabilities: capabilities.data || null, coupons: coupons.data?.results || [],
    shippingMethods: shipping.data?.results || [], payments: payments.data?.results || [],
    reviews: reviews.data?.results || [], returns: returns.data?.results || [], bespokeRequests: bespoke.data?.results || [],
    commerceLoading: commerce.isFetching,
    commerceError: commerce.isError ? 'دریافت این بخش انجام نشد؛ دوباره تلاش کنید.' : '',
    adminError: stats.isError,
    loadData: invalidate, loadCommerceData: invalidate,
  };
}
