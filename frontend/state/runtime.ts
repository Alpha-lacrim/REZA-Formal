import api from '../services/api';
import { SiteSettings, User } from '../types';
import { createAuth } from './auth';
import { createCommerce } from './commerce';
import { createUI } from './ui';
import { catalogOptions, createQueryClient, identityKey, settingsOptions } from './remote';
import { removeStorage, commerceKey, readCommerce, writeStorage } from './persistence';

export function createRuntime() {
  const queries = createQueryClient();
  const ui = createUI();
  let identity = 'loading';
  const commerce = createCommerce(() => queries.getQueryData(catalogOptions(auth.store.getSnapshot()).queryKey)?.products || [], ui.showToast);
  const auth = createAuth(state => {
    const next = identityKey(state);
    if (identity !== next) {
      // Clear identity-bound cache before publishing the next session.
      void queries.cancelQueries({ predicate: query => query.queryKey[0] !== 'settings' });
      queries.removeQueries({ predicate: query => query.queryKey[0] !== 'settings' });
      identity = next;
      commerce.select(state);
      ui.toggleCart(false);
    }
  });
  const refreshProducts = async () => {
    await Promise.all([
      queries.invalidateQueries({ queryKey: ['catalog'] }),
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
    addToCart(productId: string, qty?: number, variantId?: string) { if (commerce.addToCart(productId, qty, variantId)) ui.toggleCart(true); },
    async login(email: string, pass: string, code?: string) {
      if (await auth.login(email, pass, code)) { ui.setAuthModalOpen(false); ui.showToast('خوش آمدید'); }
    },
    async register(name: string, email: string, pass: string) {
      if (await auth.register(name, email, pass)) { ui.setAuthModalOpen(false); ui.showToast('حساب کاربری ایجاد شد'); }
    },
    async logout() { await auth.logout(); ui.showToast('خروج با موفقیت انجام شد'); },
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
    queries, auth, commerce, ui, actions,
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
