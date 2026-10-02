import React, { createContext, ReactNode, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppRuntime, createRuntime } from './runtime';
import { catalogOptions, catalogPageOptions, identityKey, selectedProductsOptions, settingsOptions } from './remote';
import api from '../services/api';
import { createStore } from './store';

const RuntimeContext = createContext<AppRuntime | null>(null);
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(createRuntime);
  useEffect(() => runtime.start(), [runtime]);
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
export function useRuntime() {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('State hooks must be used within AppStateProvider');
  return runtime;
}
function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export const useActions = () => useRuntime().actions;
export function useAuth() {
  const authState = useStore(useRuntime().auth.store);
  return { authState, user: 'user' in authState ? authState.user : null, isAuthLoading: authState.status === 'loading' };
}
export function useCart() {
  const state = useStore(useRuntime().commerce.cart);
  return { ...state, cart: state.cartLines.reduce<Record<string, number>>((summary, line) => {
    summary[line.productId] = (summary[line.productId] || 0) + line.quantity;
    return summary;
  }, {}) };
}
export function useWishlist() {
  const state = useStore(useRuntime().commerce.wishlist);
  return { ...state, isInWishlist: (id: string) => state.wishlist.includes(id) };
}
export const useOverlays = () => useStore(useRuntime().ui.overlays);
export const useTheme = () => ({ theme: useStore(useRuntime().ui.theme) });
export const useToast = () => ({ toastMessage: useStore(useRuntime().ui.toast) });
export function useCatalog() {
  const { authState } = useAuth();
  const runtime = useRuntime();
  const query = useQuery(catalogOptions(authState), runtime.queries);
  const { cartLines } = useCart();
  const { wishlist } = useWishlist();
  const previewIds = new Set(query.data?.products.map(product => product.id));
  const selected = useQuery(selectedProductsOptions(authState,
    query.data ? [...cartLines.map(line => line.productId), ...wishlist].filter(id => !previewIds.has(id)) : []), runtime.queries);
  const known = useStore(runtime.knownProducts);
  const products = React.useMemo(() => [...new Map([...known, ...(query.data?.products || []), ...(selected.data || [])]
    .map(product => [product.id, product])).values()], [query.data, known, selected.data]);
  return { products, catalogSource: query.data?.source || 'none', catalogLoading: query.isFetching || selected.isFetching, catalogError: query.error || selected.error };
}
export function useCatalogPage(params: Record<string, unknown>, enabled = true) {
  const { authState } = useAuth();
  return useQuery(catalogPageOptions(authState, params, enabled), useRuntime().queries);
}
export function useProductFacets(category: string) {
  const { authState } = useAuth();
  return useQuery({ queryKey: ['catalog-facets', identityKey(authState), category], enabled: authState.status !== 'loading',
    gcTime: 300_000, queryFn: ({ signal }) => api.getProductFacets(category, signal) }, useRuntime().queries);
}
export function useSettings() {
  const query = useQuery(settingsOptions(), useRuntime().queries);
  return { siteSettings: query.data ?? null, settingsLoading: query.isFetching, settingsError: query.error };
}
