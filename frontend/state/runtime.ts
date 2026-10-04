import api from '../services/api';
import { Product, SiteSettings, User } from '../types';
import { createStore } from './store';
import { createAuth } from './auth';
import { createCommerce } from './commerce';
import { createUI } from './ui';
import { catalogOptions, createQueryClient, identityKey, selectedProductsOptions, settingsOptions } from './remote';
import { removeStorage, commerceKey, readCommerce, writeStorage } from './persistence';

export function createRuntime() {
  const queries = createQueryClient();
  const ui = createUI();
  const knownProducts = createStore<Product[]>([]);
  const rememberProduct = (product: Product) => {
    knownProducts.set([...knownProducts.getSnapshot().filter(item => item.id !== product.id), product].slice(-100));
    const key = catalogOptions(auth.store.getSnapshot()).queryKey;
    queries.setQueryData(key, data => data ? { ...data, products: data.products.map(item => item.id === product.id ? product : item) } : data);
    queries.setQueriesData<Product[]>({ queryKey: ['catalog-selected'] }, data => data?.map(item => item.id === product.id ? product : item));
  };
  let identity = 'loading';
  const commerce = createCommerce(() => {
    const preview = queries.getQueryData(catalogOptions(auth.store.getSnapshot()).queryKey)?.products || [];
    const previewIds = new Set(preview.map(product => product.id));
    const wanted = [...commerce.cart.getSnapshot().cartLines.map(line => line.productId), ...commerce.wishlist.getSnapshot().wishlist]
      .filter(id => !previewIds.has(id));
    const selected = queries.getQueryData(selectedProductsOptions(auth.store.getSnapshot(), wanted).queryKey) || [];
    return [...new Map([...knownProducts.getSnapshot(), ...preview, ...selected].map(product => [product.id, product])).values()];
  }, ui.showToast);
  const auth = createAuth(state => {
    const next = identityKey(state);
    if (identity !== next) {
      // Clear identity-bound cache before publishing the next session.
      void queries.cancelQueries({ predicate: query => query.queryKey[0] !== 'settings' });
      queries.removeQueries({ predicate: query => query.queryKey[0] !== 'settings' });
      identity = next;
      knownProducts.set([]);
      commerce.select(state);
      ui.toggleCart(false);
    }
  });
  const refreshProducts = async () => {
    knownProducts.set([]);
    await Promise.all([
      queries.invalidateQueries({ queryKey: ['catalog'] }),
      queries.invalidateQueries({ queryKey: ['catalog-page'] }),
      queries.invalidateQueries({ queryKey: ['catalog-selected'] }),
      queries.invalidateQueries({ predicate: query => query.queryKey[0] === 'admin' && query.queryKey[2] === 'stats' }),
    ]);
    const state = auth.store.getSnapshot();
    if (state.status !== 'loading') await queries.fetchQuery(catalogOptions(state)).catch(() => undefined);
  };
  const actions = {
    showToast: ui.showToast,
    toggleTheme: ui.toggleTheme,
    toggleCart: ui.toggleCart,
    setAuthModalOpen: ui.setAuthModalOpen,
    removeFromCart: commerce.removeFromCart,
    updateQty: commerce.updateQty,
    clearCart: commerce.clearCart,
    toggleWishlist: commerce.toggleWishlist,
    retrySync: commerce.retrySync,
    addToCart(productId: string, qty?: number, variantId?: string, product?: Product) {
      if (product?.id === productId) rememberProduct(product);
      if (commerce.addToCart(productId, qty, variantId, product?.id === productId ? product : undefined)) ui.toggleCart(true);
    },
    async login(email: string, pass: string, code?: string) {
      if (await auth.login(email, pass, code)) { ui.setAuthModalOpen(false); ui.showToast('خوش آمدید'); }
    },
    async register(name: string, email: string, pass: string) {
      if (await auth.register(name, email, pass)) { ui.setAuthModalOpen(false); ui.showToast('حساب کاربری ایجاد شد'); }
    },
    async logout() {
      try { await auth.logout(); ui.showToast('خروج با موفقیت انجام شد'); }
      catch { ui.showToast('خروج از سرور تأیید نشد. دوباره تلاش کنید.'); }
    },
    updateUserProfile: (data: Partial<User>) => auth.updateUserProfile(data),
    refreshProducts,
    async cancelUserOrder(orderId: string) {
      await api.cancelOrder(orderId);
      await refreshProducts();
      ui.showToast('سفارش لغو شد');
    },
    async sendMessage(name: string, email: string, message: string) {
      try {
        await api.contact(name, email, message);
        ui.showToast('پیام شما با موفقیت ارسال شد');
      } catch (error) { ui.showToast('خطا در ارسال پیام'); throw error; }
    },
    async updateSiteSettings(settings: SiteSettings | FormData) {
      const version = auth.getVersion();
      const saved = await api.saveSettings(settings);
      if (auth.getVersion() !== version) return;
      await queries.cancelQueries({ queryKey: ['settings'] });
      queries.setQueryData(settingsOptions().queryKey, saved);
      ui.showToast('تنظیمات سایت ذخیره شد');
    },
  };
  return {
    queries, auth, commerce, ui, actions, knownProducts,
    start() {
      // Persist migration/quarantine before removing the unused legacy session copy.
      if (writeStorage(commerceKey('guest'), readCommerce('guest'))) removeStorage('reza_session_v1');
      queries.mount();
      ui.start();
      const stopAuth = auth.start();
      const retry = () => { void commerce.retrySync(); };
      window.addEventListener('online', retry);
      return () => { stopAuth(); commerce.stop(); ui.stop(); queries.clear(); queries.unmount(); window.removeEventListener('online', retry); identity = 'loading'; };
    },
  };
}
export type AppRuntime = ReturnType<typeof createRuntime>;
