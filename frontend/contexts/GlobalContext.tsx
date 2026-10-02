import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { CartLine, Product, SiteSettings, User } from '../types';
import api from '../services/api';
import { onSessionExpired } from '../services/http/client';
import { db } from '../services/db';

export const cartLineKey = (line: Pick<CartLine, 'productId' | 'variantId'>): string =>
    `${line.productId}::${line.variantId || ''}`;

export type AuthState =
    | { status: 'loading' }
    | { status: 'anonymous' }
    | { status: 'customer' | 'admin'; user: User };

type CatalogSource = 'server' | 'fallback' | 'none';

interface GlobalContextType {
    /** Aggregated legacy shape retained for Navbar and older callers. */
    cart: { [productId: string]: number };
    cartLines: CartLine[];
    addToCart: (productId: string, qty?: number, variantId?: string) => void;
    removeFromCart: (lineKeyOrProductId: string) => void;
    updateQty: (lineKeyOrProductId: string, delta: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    toggleCart: (open?: boolean) => void;

    wishlist: string[];
    toggleWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;

    user: User | null;
    isAuthLoading: boolean;
    authState: AuthState;
    login: (email: string, pass: string, code?: string) => Promise<void>;
    register: (name: string, email: string, pass: string) => Promise<void>;
    logout: () => void;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    cancelUserOrder: (orderId: string) => Promise<void>;

    products: Product[];
    catalogSource: CatalogSource;
    refreshProducts: () => Promise<void>;
    sendMessage: (name: string, email: string, message: string) => Promise<void>;

    siteSettings: SiteSettings | null;
    updateSiteSettings: (settings: SiteSettings | FormData) => Promise<void>;

    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (open: boolean) => void;
    toastMessage: string | null;
    showToast: (msg: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

const readLocalCart = (): CartLine[] => {
    try {
        const stored = JSON.parse(localStorage.getItem('reza_cart_v2') || '[]');
        if (Array.isArray(stored)) {
            return stored
                .filter(line => line && typeof line.productId === 'string' && Number(line.quantity) > 0)
                .map(line => ({
                    productId: line.productId,
                    variantId: typeof line.variantId === 'string' && line.variantId ? line.variantId : undefined,
                    quantity: Math.max(1, Math.floor(Number(line.quantity))),
                }));
        }
    } catch {
        // Migrate the previous product-id map below.
    }

    try {
        const legacy = JSON.parse(localStorage.getItem('reza_cart_v1') || '{}');
        return Object.entries(legacy)
            .filter(([productId, quantity]) => productId && Number(quantity) > 0)
            .map(([productId, quantity]) => ({ productId, quantity: Math.max(1, Math.floor(Number(quantity))) }));
    } catch {
        return [];
    }
};

const readLocalWishlist = (): string[] => {
    try {
        const stored = JSON.parse(localStorage.getItem('reza_wishlist_v1') || '[]');
        return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cartLines, setCartLines] = useState<CartLine[]>(readLocalCart);
    const [wishlist, setWishlist] = useState<string[]>(readLocalWishlist);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
    const user = 'user' in authState ? authState.user : null;
    const isAuthLoading = authState.status === 'loading';
    const authAttempt = useRef(0);
    const applyUser = (user: User) => setAuthState({ status: user.role === 'admin' ? 'admin' : 'customer', user });
    const catalogController = useRef<AbortController | null>(null);
    const catalogKey = isAuthLoading ? 'resolving' : JSON.stringify([user?.id ?? null, user?.role ?? null]);
    const [catalog, setCatalog] = useState<{ owner: string; products: Product[]; source: CatalogSource }>({
        owner: '', products: [], source: 'none',
    });
    const products = catalog.owner === catalogKey ? catalog.products : [];
    const catalogSource = catalog.owner === catalogKey ? catalog.source : 'none';
    const catalogIdentity = useRef<string | null>(null);
    const catalogRequest = useRef(0);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() =>
        (localStorage.getItem('reza_theme_pref') as 'light' | 'dark') || 'light');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const cartSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
    const accountController = useRef<AbortController | null>(null);

    const clearSession = useCallback(() => {
        authAttempt.current++;
        catalogController.current?.abort();
        accountController.current?.abort();
        if (cartSyncTimer.current) clearTimeout(cartSyncTimer.current);
        setHydratedUserId(null);
        setAuthState({ status: 'anonymous' });
        localStorage.removeItem('reza_session_v1');
    }, []);

    useEffect(() => onSessionExpired(clearSession), [clearSession]);

    const cart = useMemo(() => cartLines.reduce<{ [productId: string]: number }>((summary, line) => {
        summary[line.productId] = (summary[line.productId] || 0) + line.quantity;
        return summary;
    }, {}), [cartLines]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        window.setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        localStorage.setItem('reza_cart_v2', JSON.stringify(cartLines.map(({ productId, variantId, quantity }) => ({
            productId,
            variantId,
            quantity,
        }))));
        localStorage.setItem('reza_cart_v1', JSON.stringify(cart));
    }, [cart, cartLines]);

    useEffect(() => {
        localStorage.setItem('reza_wishlist_v1', JSON.stringify(wishlist));
    }, [wishlist]);

    useEffect(() => {
        if (user) localStorage.setItem('reza_session_v1', JSON.stringify(user));
        else localStorage.removeItem('reza_session_v1');
    }, [user]);

    useEffect(() => {
        localStorage.setItem('reza_theme_pref', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const refreshProducts = useCallback(async () => {
        if (isAuthLoading || catalogIdentity.current !== catalogKey) return;
        catalogController.current?.abort();
        const controller = new AbortController();
        catalogController.current = controller;
        const requestId = ++catalogRequest.current;
        const commit = (products: Product[], source: CatalogSource) => {
            if (!controller.signal.aborted && catalogIdentity.current === catalogKey && catalogRequest.current === requestId) {
                setCatalog({ owner: catalogKey, products, source });
            }
        };
        try {
            const serverProducts = user?.role === 'admin' ? await api.adminGetProducts(controller.signal) : await api.getProducts(controller.signal);
            commit(serverProducts, 'server');
        } catch {
            if (controller.signal.aborted) return;
            if (user?.role === 'admin') {
                commit([], 'none');
                return;
            }
            try {
                commit(await db.getProducts(), 'fallback');
            } catch {
                commit([], 'none');
            }
        }
    }, [catalogKey, isAuthLoading, user?.role]);

    useEffect(() => {
        catalogIdentity.current = catalogKey;
        void refreshProducts();
        return () => {
            catalogController.current?.abort();
            catalogIdentity.current = null;
            catalogRequest.current += 1;
        };
    }, [catalogKey, refreshProducts]);

    const loadSettings = async () => {
        try {
            setSiteSettings(await api.getSettings());
        } catch {
            setSiteSettings(null);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        const attempt = ++authAttempt.current;
        void loadSettings();
        void (async () => {
            try {
                const resolvedUser = await api.me(controller.signal);
                if (!controller.signal.aborted && attempt === authAttempt.current) applyUser(resolvedUser);
            } catch {
                if (!controller.signal.aborted && attempt === authAttempt.current) setAuthState({ status: 'anonymous' });
            }
        })();
        return () => { controller.abort(); };
    }, []);

    useEffect(() => {
        if (!user) return;
        const controller = new AbortController();
        accountController.current = controller;
        const attempt = authAttempt.current;
        const current = () => !controller.signal.aborted && attempt === authAttempt.current;
        setHydratedUserId(null);
        void (async () => {
            try {
                const savedCart = await api.getSavedCart(controller.signal);
                if (!current()) return;
                const localLines = readLocalCart();
                const mergedLines = new Map<string, CartLine>();
                [...savedCart.lines, ...localLines].forEach(({ productId, variantId, quantity }) => {
                    const key = cartLineKey({ productId, variantId });
                    const existing = mergedLines.get(key);
                    mergedLines.set(key, { productId, variantId, quantity: Math.max(existing?.quantity || 0, quantity) });
                });
                const mergedCart = Array.from(mergedLines.values());
                if (mergedCart.length > 0) {
                    setCartLines(mergedCart);
                    await api.syncSavedCart({ lines: mergedCart, currency: 'Toman' });
                }
            } catch {
                // Local cart stays usable if the saved-cart service is unavailable.
            }
            if (!current()) return;
            try {
                const serverProducts = await api.getWishlist(controller.signal);
                if (!current()) return;
                const serverIds = serverProducts.map(product => product.id);
                const localIds = readLocalWishlist();
                setWishlist(Array.from(new Set([...serverIds, ...localIds])));
                await Promise.all(localIds.filter(id => !serverIds.includes(id)).map(id => api.addToWishlist(id)));
            } catch {
                // Local wishlist stays usable if the account service is unavailable.
            }
            if (current()) setHydratedUserId(user.id);
        })();
        return () => controller.abort();
    }, [user?.id]);

    useEffect(() => {
        if (!user || hydratedUserId !== user.id) return;
        const attempt = authAttempt.current;
        cartSyncTimer.current = setTimeout(() => {
            if (attempt === authAttempt.current) {
                void api.syncSavedCart({ lines: cartLines, currency: 'Toman' }).catch(() => undefined);
            }
        }, 700);
        return () => {
            if (cartSyncTimer.current) clearTimeout(cartSyncTimer.current);
        };
    }, [cartLines, user?.id, hydratedUserId]);

    const resolveLineStock = (productId: string, variantId?: string): number => {
        const product = products.find(item => item.id === productId);
        if (!product) return 0;
        if (variantId) {
            const variant = product.variants?.find(item => item.id === variantId);
            return variant?.active === false ? 0 : Math.max(0, Number(variant?.stock ?? 0));
        }
        return product.stock === undefined || product.stock === null ? Number.POSITIVE_INFINITY : Math.max(0, Number(product.stock));
    };

    const addToCart = (productId: string, qty = 1, requestedVariantId?: string) => {
        const product = products.find(item => item.id === productId);
        const defaultVariant = product?.variants?.find(variant => variant.active && variant.stock > 0);
        const variantId = requestedVariantId || (product?.variants?.length ? defaultVariant?.id : undefined);
        if (product?.variants?.length && !variantId) {
            showToast('برای این محصول ابتدا یک گزینه موجود انتخاب کنید');
            return;
        }

        const requestedQty = Math.max(1, Math.floor(Number(qty) || 1));
        const stock = resolveLineStock(productId, variantId);
        if (stock <= 0) {
            showToast('این محصول ناموجود است');
            return;
        }

        const key = cartLineKey({ productId, variantId });
        setCartLines(previous => {
            const existing = previous.find(line => cartLineKey(line) === key);
            const currentQty = existing?.quantity || 0;
            const nextQty = Math.min(currentQty + requestedQty, stock);
            if (nextQty === currentQty) {
                showToast('موجودی بیشتری برای این گزینه در دسترس نیست');
                return previous;
            }
            const nextLine: CartLine = { productId, variantId, quantity: nextQty };
            showToast(nextQty < currentQty + requestedQty ? 'تعداد با موجودی انبار تنظیم شد' : 'به سبد خرید اضافه شد');
            return existing
                ? previous.map(line => cartLineKey(line) === key ? nextLine : line)
                : [...previous, nextLine];
        });
        setIsCartOpen(true);
    };

    const findMatchingLineKey = (lineKeyOrProductId: string): string | undefined => {
        if (lineKeyOrProductId.includes('::')) return lineKeyOrProductId;
        return cartLines.find(line => line.productId === lineKeyOrProductId)
            ? cartLineKey(cartLines.find(line => line.productId === lineKeyOrProductId)!)
            : undefined;
    };

    const removeFromCart = (lineKeyOrProductId: string) => {
        const key = findMatchingLineKey(lineKeyOrProductId);
        if (!key) return;
        setCartLines(previous => previous.filter(line => cartLineKey(line) !== key));
    };

    const updateQty = (lineKeyOrProductId: string, delta: number) => {
        const key = findMatchingLineKey(lineKeyOrProductId);
        if (!key) return;
        setCartLines(previous => previous.flatMap(line => {
            if (cartLineKey(line) !== key) return [line];
            const stock = resolveLineStock(line.productId, line.variantId);
            const nextQty = Math.min(line.quantity + delta, stock);
            if (nextQty <= 0) return [];
            if (nextQty === line.quantity && delta > 0) {
                showToast('موجودی بیشتری برای این گزینه در دسترس نیست');
                return [line];
            }
            return [{ ...line, quantity: nextQty }];
        }));
    };

    const clearCart = () => {
        setCartLines([]);
        if (user) void api.clearSavedCart().catch(() => undefined);
    };

    const toggleCart = (open?: boolean) => setIsCartOpen(previous => open ?? !previous);

    const toggleWishlist = (productId: string) => {
        const removing = wishlist.includes(productId);
        setWishlist(previous => removing ? previous.filter(id => id !== productId) : [...previous, productId]);
        showToast(removing ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد');
        if (user) {
            const operation = removing ? api.removeFromWishlist(productId) : api.addToWishlist(productId);
            void operation.catch(() => showToast('تغییر محلی ذخیره شد؛ همگام‌سازی حساب انجام نشد'));
        }
    };

    const isInWishlist = (productId: string) => wishlist.includes(productId);

    const login = async (email: string, pass: string, code?: string) => {
        const pending = api.login(email, pass, code);
        const attempt = ++authAttempt.current;
        setAuthState({ status: 'loading' });
        try {
            const response = await pending;
            if (attempt !== authAttempt.current) return;
            applyUser(response.user);
        } catch (error) {
            if (attempt === authAttempt.current) setAuthState({ status: 'anonymous' });
            throw error;
        }
        setAuthModalOpen(false);
        showToast('خوش آمدید');
    };

    const register = async (name: string, email: string, pass: string) => {
        const pending = api.register(name, email, pass);
        const attempt = ++authAttempt.current;
        setAuthState({ status: 'loading' });
        try {
            const response = await pending;
            if (attempt !== authAttempt.current) return;
            applyUser(response.user);
        } catch (error) {
            if (attempt === authAttempt.current) setAuthState({ status: 'anonymous' });
            throw error;
        }
        setAuthModalOpen(false);
        showToast('حساب کاربری ایجاد شد');
    };

    const logout = async () => {
        clearSession();
        try {
            await api.logout();
        } catch {
            // The local session must still be cleared if the server is unreachable.
        }
        showToast('خروج با موفقیت انجام شد');
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!user) return;
        try {
            const attempt = authAttempt.current;
            const updated = await api.updateProfile(data);
            if (attempt !== authAttempt.current) return;
            applyUser(updated);
            showToast('اطلاعات با موفقیت به‌روز شد');
        } catch (error) {
            showToast('خطا در به‌روزرسانی اطلاعات');
            throw error;
        }
    };

    const cancelUserOrder = async (orderId: string) => {
        try {
            await api.cancelOrder(orderId);
            await refreshProducts();
            showToast('سفارش لغو شد');
        } catch (error) {
            showToast('این سفارش قابل لغو نیست');
            throw error;
        }
    };

    const sendMessage = async (name: string, email: string, message: string) => {
        try {
            await api.contact(name, email, message);
            showToast('پیام شما با موفقیت ارسال شد');
        } catch (error) {
            showToast('خطا در ارسال پیام');
            throw error;
        }
    };

    const updateSiteSettings = async (settings: SiteSettings | FormData) => {
        try {
            setSiteSettings(await api.saveSettings(settings));
            showToast('تنظیمات سایت ذخیره شد');
        } catch (error) {
            showToast('خطا در ذخیره تنظیمات');
            throw error;
        }
    };

    const value: GlobalContextType = {
        cart,
        cartLines,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        isCartOpen,
        toggleCart,
        wishlist,
        toggleWishlist,
        isInWishlist,
        user,
        isAuthLoading,
        authState,
        login,
        register,
        logout,
        updateUserProfile,
        cancelUserOrder,
        products,
        catalogSource,
        refreshProducts,
        sendMessage,
        siteSettings,
        updateSiteSettings,
        theme,
        toggleTheme: () => setTheme(previous => previous === 'light' ? 'dark' : 'light'),
        isAuthModalOpen,
        setAuthModalOpen,
        toastMessage,
        showToast,
    };

    return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (!context) throw new Error('useGlobal must be used within GlobalProvider');
    return context;
};
