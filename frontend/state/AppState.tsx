import React, { createContext, ReactNode, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppRuntime, createRuntime } from './runtime';
import { catalogOptions, settingsOptions } from './remote';
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
  return { products: query.data?.products || [], catalogSource: query.data?.source || 'none', catalogLoading: query.isFetching, catalogError: query.error };
}
export function useSettings() {
  const query = useQuery(settingsOptions(), useRuntime().queries);
  return { siteSettings: query.data ?? null, settingsLoading: query.isFetching, settingsError: query.error };
}
