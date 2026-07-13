import React, { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { CartLine, Product, SiteSettings, User } from '../types';
import api from '../services/api';
import { db } from '../services/db';

export const cartLineKey = (line: Pick<CartLine, 'productId' | 'variantId'>): string =>
    `${line.productId}::${line.variantId || ''}`;

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

const normalizeUserForContext = (raw: any, fallbackName = ''): User => ({
    ...raw,
    id: String(raw?.id ?? ''),
    name: raw?.name || [raw?.first_name, raw?.last_name].filter(Boolean).join(' ') || fallbackName || raw?.email || '',
    email: raw?.email || '',
    role: raw?.role || 'user',
    address: raw?.address || '',
    createdAt: raw?.createdAt || Date.now(),
});

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
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [catalogSource, setCatalogSource] = useState<CatalogSource>('none');
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() =>
        (localStorage.getItem('reza_theme_pref') as 'light' | 'dark') || 'light');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const cartSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hydratedUserId = useRef<string | null>(null);

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

    const refreshProducts = async () => {
        try {
            let serverProducts: Product[];
            if (user?.role === 'admin') {
                try {
                    serverProducts = await api.adminGetProducts();
                } catch {
                    serverProducts = await api.getProducts();
                }
            } else {
                serverProducts = await api.getProducts();
            }
            setProducts(serverProducts);
            setCatalogSource('server');
        } catch {
            try {
                setProducts(await db.getProducts());
                setCatalogSource('fallback');
            } catch {
                setProducts([]);
                setCatalogSource('none');
            }
        }
    };

    const loadSettings = async () => {
        try {
            setSiteSettings(await api.getSettings());
        } catch {
            setSiteSettings(null);
        }
    };

    useEffect(() => {
        void (async () => {
            try {
                setUser(normalizeUserForContext(await api.me()));
            } catch {
                setUser(null);
            } finally {
                setIsAuthLoading(false);
            }
            await Promise.all([refreshProducts(), loadSettings()]);
        })();
    }, []);

    useEffect(() => {
        if (!user || hydratedUserId.current === user.id) return;
        hydratedUserId.current = user.id;

        void (async () => {
            try {
                const savedCart = await api.getSavedCart();
                const localLines = readLocalCart();
                const mergedLines = new Map<string, CartLine>();
                [...savedCart.lines, ...localLines].forEach(({ productId, variantId, quantity }) => {
                    const key = cartLineKey({ productId, variantId });
                    const existing = mergedLines.get(key);
                    mergedLines.set(key, {
                        productId,
                        variantId,
                        quantity: Math.max(existing?.quantity || 0, quantity),
                    });
                });
                const mergedCart = Array.from(mergedLines.values());
                if (mergedCart.length > 0) {
                    setCartLines(mergedCart);
                    await api.syncSavedCart({ lines: mergedCart, currency: 'Toman' });
                }
            } catch {
                // Local cart stays usable if the saved-cart service is unavailable.
            }

            try {
                const serverProducts = await api.getWishlist();
                const serverIds = serverProducts.map(product => product.id);
                const localIds = readLocalWishlist();
                const merged = Array.from(new Set([...serverIds, ...localIds]));
                setWishlist(merged);
                await Promise.all(localIds.filter(id => !serverIds.includes(id)).map(id => api.addToWishlist(id)));
            } catch {
                // Local wishlist stays usable if the account service is unavailable.
            }
        })();
    }, [user?.id]);

    useEffect(() => {
        if (!user || hydratedUserId.current !== user.id) return;
        if (cartSyncTimer.current) clearTimeout(cartSyncTimer.current);
        cartSyncTimer.current = setTimeout(() => {
            void api.syncSavedCart({ lines: cartLines, currency: 'Toman' }).catch(() => undefined);
        }, 700);
        return () => {
            if (cartSyncTimer.current) clearTimeout(cartSyncTimer.current);
        };
    }, [cartLines, user?.id]);

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
        const response = await api.login(email, pass, code);
        try {
            setUser(normalizeUserForContext(await api.me()));
        } catch {
            setUser(normalizeUserForContext(response?.user || response));
        }
        setAuthModalOpen(false);
        showToast('خوش آمدید');
    };

    const register = async (name: string, email: string, pass: string) => {
        const response = await api.register(name, email, pass);
        const newUser = response?.user || response;
        if (newUser) setUser(normalizeUserForContext(newUser, name));
        setAuthModalOpen(false);
        showToast('حساب کاربری ایجاد شد');
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch {
            // The local session must still be cleared if the server is unreachable.
        }
        hydratedUserId.current = null;
        setUser(null);
        showToast('خروج با موفقیت انجام شد');
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!user) return;
        try {
            setUser(await api.updateProfile(data));
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
