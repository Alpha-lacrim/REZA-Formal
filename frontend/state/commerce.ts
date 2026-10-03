import api from '../services/api';
import { CartLine, Product } from '../types';
import { AuthState } from './auth';
import { createStore } from './store';
import { cartLineKey, cleanLines, CommerceRecord, commerceKey, emptyRecord, readCommerce, writeStorage } from './persistence';

type SyncStatus = 'local' | 'loading' | 'pending' | 'synced' | 'error';
export function createCommerce(getProducts: () => Product[], notify: (message: string) => void) {
  const cart = createStore({ cartLines: [] as CartLine[], syncStatus: 'loading' as SyncStatus });
  const wishlist = createStore({ wishlist: [] as string[], syncStatus: 'loading' as SyncStatus });
  let guest = readCommerce('guest');
  let record = emptyRecord();
  let owner = '';
  let account = false;
  let generation = 0;
  let controller = new AbortController();
  let cartReady = false;
  let wishReady = false;
  let cartLoading = false;
  let wishLoading = false;
  let cartRunning = false;
  let wishRunning = false;
  let cartVersion = 0;
  let wishVersion = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => {
    if (!owner) return;
    if (owner === 'guest') guest = record;
    if (!writeStorage(commerceKey(owner), record)) notify('ذخیره در مرورگر انجام نشد؛ تغییرات فعلاً در حافظه است');
  };
  const publishCart = (syncStatus: SyncStatus) => cart.set({ cartLines: record.cartLines, syncStatus });
  const publishWish = (syncStatus: SyncStatus) => wishlist.set({ wishlist: record.wishlist, syncStatus });
  const current = (id: number) => id === generation && !controller.signal.aborted;
  const cartDirty = () => record.clearCart || record.guestLines.length > 0 || Object.keys(record.cartEdits).length > 0;
  const wishDirty = () => Object.keys(record.wishEdits).length > 0;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void flushCart(); void flushWish(); }, 300); };

  async function flushCart() {
    if (!account || !cartReady || cartRunning || !cartDirty()) return;
    const id = generation;
    cartRunning = true;
    publishCart('pending');
    try {
      while (current(id) && cartDirty()) {
        const version = cartVersion;
        const lines = record.cartLines;
        const saved = await api.syncSavedCart({ lines, currency: 'Toman' });
        if (!current(id)) return;
        if (version === cartVersion) {
          record = { ...record, cartLines: cleanLines(saved.lines), cartEdits: {}, guestLines: [], clearCart: false };
          persist();
        }
      }
      if (current(id)) publishCart('synced');
    } catch {
      if (current(id)) { publishCart('error'); notify('سبد خرید محلی ذخیره شد؛ همگام‌سازی حساب انجام نشد'); }
    } finally { if (current(id)) cartRunning = false; }
  }
  async function flushWish() {
    if (!account || !wishReady || wishRunning || !wishDirty()) return;
    const id = generation;
    wishRunning = true;
    publishWish('pending');
    try {
      while (current(id) && wishDirty()) {
        const [productId, wanted] = Object.entries(record.wishEdits)[0];
        const version = wishVersion;
        await (wanted ? api.addToWishlist(productId) : api.removeFromWishlist(productId));
        if (!current(id)) return;
        if (version === wishVersion) {
          const edits = { ...record.wishEdits }; delete edits[productId];
          record = { ...record, wishEdits: edits };
          persist();
        }
      }
      if (current(id)) publishWish('synced');
    } catch {
      if (current(id)) { publishWish('error'); notify('علاقه‌مندی‌ها محلی ذخیره شد؛ همگام‌سازی حساب انجام نشد'); }
    } finally { if (current(id)) wishRunning = false; }
  }
  async function hydrateCart() {
    if (!account || cartReady || cartLoading) return;
    const id = generation;
    cartLoading = true;
    publishCart('loading');
    try {
      const saved = await api.getSavedCart(controller.signal);
      if (!current(id)) return;
      const merged = new Map<string, CartLine>();
      if (!record.clearCart) cleanLines(saved.lines).forEach(line => merged.set(cartLineKey(line), line));
      record.guestLines.forEach(line => {
        const key = cartLineKey(line);
        merged.set(key, { ...line, quantity: Math.max(line.quantity, merged.get(key)?.quantity || 0) });
      });
      Object.entries(record.cartEdits).forEach(([key, line]) => line.quantity ? merged.set(key, line) : merged.delete(key));
      record = { ...record, cartLines: [...merged.values()] };
      cartReady = true;
      persist();
      publishCart(cartDirty() ? 'pending' : 'synced');
      await flushCart();
    } catch { if (current(id)) publishCart('error'); }
    finally { if (current(id)) cartLoading = false; }
  }
  async function hydrateWish() {
    if (!account || wishReady || wishLoading) return;
    const id = generation;
    wishLoading = true;
    publishWish('loading');
    try {
      const saved = await api.getWishlist(controller.signal);
      if (!current(id)) return;
      const merged = new Set(saved.map(product => product.id));
      Object.entries(record.wishEdits).forEach(([key, wanted]) => wanted ? merged.add(key) : merged.delete(key));
      record = { ...record, wishlist: [...merged] };
      wishReady = true;
      persist();
      publishWish(wishDirty() ? 'pending' : 'synced');
      await flushWish();
    } catch { if (current(id)) publishWish('error'); }
    finally { if (current(id)) wishLoading = false; }
  }
  const retrySync = async () => {
    await Promise.all([cartReady ? flushCart() : hydrateCart(), wishReady ? flushWish() : hydrateWish()]);
  };
  function stop() { generation++; controller.abort(); clearTimeout(timer); owner = ''; }
  function select(state: AuthState) {
    const next = state.status === 'loading' ? '' : state.status === 'anonymous' ? 'guest'
      : `${state.status}:${state.user.id}`;
    if (owner === next) return;
    stop();
    controller = new AbortController();
    owner = next;
    account = state.status === 'customer';
    cartReady = wishReady = cartLoading = wishLoading = cartRunning = wishRunning = false;
    cartVersion = wishVersion = 0;
    record = !owner ? emptyRecord() : owner === 'guest' ? guest : readCommerce(owner);
    if (account && (guest.cartLines.length || guest.wishlist.length)) {
      record = {
        ...record,
        guestLines: [...record.guestLines, ...guest.cartLines],
        cartEdits: Object.fromEntries(Object.entries(record.cartEdits).filter(([key]) => !guest.cartLines.some(line => cartLineKey(line) === key))),
        cartLines: [...record.cartLines, ...guest.cartLines].filter((line, index, lines) => lines.findIndex(other => cartLineKey(other) === cartLineKey(line)) === index),
        wishlist: [...new Set([...record.wishlist, ...guest.wishlist])],
        wishEdits: { ...record.wishEdits, ...Object.fromEntries(guest.wishlist.map(id => [id, true])) },
      };
      // Persist the receiving owner before consuming guest intent.
      persist();
      guest = emptyRecord();
      writeStorage(commerceKey('guest'), guest);
    }
    persist();
    publishCart(account || !owner ? 'loading' : 'local');
    publishWish(account || !owner ? 'loading' : 'local');
    if (account) void retrySync();
  }
  const stock = (productId: string, variantId?: string, suppliedProduct?: Product) => {
    const product = suppliedProduct || getProducts().find(item => item.id === productId);
    if (!product || product.active === false) return 0;
    if (product.variants?.length) {
      const variant = product.variants.find(item => item.id === variantId && item.active);
      return variant && Number.isFinite(variant.stock) ? Math.max(0, Math.floor(variant.stock)) : 0;
    }
    if (variantId) return 0;
    return Number.isFinite(product.stock) ? Math.max(0, Math.floor(product.stock!)) : 0;
  };
  function changeCart(lines: CartLine[], edits: CartLine[], clear = false) {
    if (!owner) return;
    cartVersion++;
    record = { ...record, cartLines: lines, clearCart: clear || record.clearCart,
      guestLines: clear ? [] : record.guestLines,
      cartEdits: { ...(clear ? {} : record.cartEdits), ...Object.fromEntries(edits.map(line => [cartLineKey(line), line])) } };
    persist(); publishCart(account ? !cartReady && !cartLoading ? 'error' : 'pending' : 'local'); schedule();
  }
  const findLine = (key: string) => record.cartLines.find(line => cartLineKey(line) === key || line.productId === key);
  return {
    cart, wishlist, select, stop, retrySync,
    addToCart(productId: string, qty = 1, requestedVariantId?: string, suppliedProduct?: Product) {
      const product = suppliedProduct || getProducts().find(item => item.id === productId);
      const variantId = requestedVariantId || product?.variants?.find(item => item.active && item.stock > 0)?.id;
      const key = cartLineKey({ productId, variantId });
      const existing = record.cartLines.find(line => cartLineKey(line) === key);
      if (!Number.isSafeInteger(qty) || qty <= 0 || !owner) return;
      const quantity = Math.min((existing?.quantity || 0) + qty, stock(productId, variantId, product));
      if (quantity <= 0 || quantity === existing?.quantity) { notify('موجودی بیشتری برای این گزینه در دسترس نیست'); return; }
      const line = { productId, variantId, quantity };
      changeCart(existing ? record.cartLines.map(item => cartLineKey(item) === key ? line : item) : [...record.cartLines, line], [line]);
      notify('به سبد خرید اضافه شد');
      return true;
    },
    updateQty(key: string, delta: number) {
      const line = findLine(key);
      if (!line || !Number.isSafeInteger(delta)) return;
      // Decreasing/removing a persisted line works even while the catalog is unavailable.
      const quantity = Math.max(0, delta > 0 ? Math.min(line.quantity + delta, stock(line.productId, line.variantId)) : line.quantity + delta);
      if (delta > 0 && quantity <= line.quantity) return;
      const updated = { ...line, quantity };
      changeCart(record.cartLines.flatMap(item => cartLineKey(item) === cartLineKey(line) ? quantity ? [updated] : [] : [item]), [updated]);
    },
    removeFromCart(key: string) {
      const line = findLine(key);
      if (line) changeCart(record.cartLines.filter(item => cartLineKey(item) !== cartLineKey(line)), [{ ...line, quantity: 0 }]);
    },
    clearCart: () => changeCart([], [], true),
    toggleWishlist(productId: string) {
      if (!owner) return;
      const wanted = !record.wishlist.includes(productId);
      wishVersion++;
      record = { ...record, wishlist: wanted ? [...record.wishlist, productId] : record.wishlist.filter(id => id !== productId), wishEdits: { ...record.wishEdits, [productId]: wanted } };
      persist(); publishWish(account ? !wishReady && !wishLoading ? 'error' : 'pending' : 'local'); schedule();
      notify(wanted ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد');
    },
  };
}
