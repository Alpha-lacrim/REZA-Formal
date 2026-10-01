import { QueryClient, queryOptions } from '@tanstack/react-query';
import api from '../services/api';
import { db } from '../services/db';
import { AuthState } from './auth';
import { Product } from '../types';

export type CatalogSource = 'server' | 'fallback' | 'none';
export const identityKey = (state: AuthState) => 'user' in state ? `${state.status}:${state.user.id}` : state.status;
export const createQueryClient = () => new QueryClient({ defaultOptions: {
  // The bounded catalog/settings/admin key set lives for this app session.
  // Identity changes and provider disposal explicitly clear it.
  queries: { staleTime: 30_000, gcTime: Infinity, retry: false, refetchOnWindowFocus: false },
  mutations: { retry: false },
} });
export function catalogOptions(state: AuthState) {
  return queryOptions({
    queryKey: ['catalog', identityKey(state)],
    enabled: state.status !== 'loading',
    queryFn: async ({ signal }): Promise<{ products: Product[]; source: CatalogSource }> => {
      try {
        const products = state.status === 'admin' ? await api.adminGetProducts(signal) : await api.getProducts(signal);
        return { products, source: 'server' };
      } catch (error) {
        if (signal.aborted || state.status === 'admin') throw error;
        return { products: await db.getProducts(), source: 'fallback' };
      }
    },
  });
}
export const settingsOptions = () => queryOptions({
  queryKey: ['settings'], queryFn: ({ signal }) => api.getSettings(signal), staleTime: 60_000,
});
