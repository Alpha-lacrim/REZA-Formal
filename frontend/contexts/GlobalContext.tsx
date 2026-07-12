import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, User, SiteSettings } from '../types';
import api from '../services/api';
import { db } from '../services/db';

interface GlobalContextType {
    cart: { [id: string]: number };
    addToCart: (productId: string, qty?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQty: (productId: string, delta: number) => void;
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
    createdAt: raw?.createdAt || Date.now()
});

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<{ [id: string]: number }>(() => {
        try { return JSON.parse(localStorage.getItem('reza_cart_v1') || '{}'); } catch { return {}; }
    });
    
    const [wishlist, setWishlist] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('reza_wishlist_v1') || '[]'); } catch { return []; }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('reza_theme_pref') as 'light' | 'dark') || 'light';
    });
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('reza_cart_v1', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('reza_wishlist_v1', JSON.stringify(wishlist));
    }, [wishlist]);

    useEffect(() => {
        if (user) localStorage.setItem('reza_session_v1', JSON.stringify(user));
        else localStorage.removeItem('reza_session_v1');
    }, [user]);

    useEffect(() => {
        localStorage.setItem('reza_theme_pref', theme);
        const html = document.documentElement;
        if (theme === 'dark') html.classList.add('dark');
        else html.classList.remove('dark');
    }, [theme]);

    useEffect(() => {
        // Try to populate user from backend cookie-based session, then load products and settings
        (async () => {
            try {
                const me = await api.me();
                setUser(normalizeUserForContext(me));
            } catch (e) {
                // not authenticated
            } finally {
                setIsAuthLoading(false);
            }

            // After attempting to populate user, refresh products and settings.
            await refreshProducts();
            await loadSettings();
        })();
    }, []);

    const refreshProducts = async () => {
        try {
            let serverProducts: Product[];
            if (user?.role === 'admin') {
                try {
                    serverProducts = await api.adminGetProducts();
                } catch {
                    // The public endpoint remains useful if an admin session expires.
                    serverProducts = await api.getProducts();
                }
            } else {
                serverProducts = await api.getProducts();
            }

            // A successful server response is authoritative, including an empty list.
            // Local seeds are browse-only fallback data when the API is unavailable.
            setProducts(serverProducts);
        } catch (e) {
            try {
                const local = await db.getProducts();
                setProducts(local);
            } catch {
                setProducts([]);
            }
        }
    };

    const loadSettings = async () => {
        try {
            const settings = await api.getSettings();
            // The API service owns wire-format normalization.
            setSiteSettings(settings || null);
        } catch (e) {
            setSiteSettings(null);
        }
    };

    const getTrackedStock = (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product?.stock === undefined || product.stock === null ? Infinity : Number(product.stock);
    };

    const addToCart = (productId: string, qty = 1) => {
        const requestedQty = Math.max(1, Number(qty) || 1);
        const stock = getTrackedStock(productId);

        if (stock <= 0) {
            showToast('این محصول ناموجود است');
            return;
        }

        setCart(prev => {
            const currentQty = prev[productId] || 0;
            const nextQty = Math.min(currentQty + requestedQty, stock);

            if (nextQty === currentQty) {
                showToast('موجودی بیشتری برای این محصول در دسترس نیست');
                return prev;
            }

            showToast(nextQty < currentQty + requestedQty ? 'تعداد محصول با موجودی انبار تنظیم شد' : 'به سبد خرید اضافه شد');
            return { ...prev, [productId]: nextQty };
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    };

    const updateQty = (productId: string, delta: number) => {
        setCart(prev => {
            const stock = getTrackedStock(productId);
            const newQty = Math.min((prev[productId] || 0) + delta, stock);
            if (newQty <= 0) {
                const next = { ...prev };
                delete next[productId];
                return next;
            }
            if (newQty === prev[productId] && delta > 0) {
                showToast('موجودی بیشتری برای این محصول در دسترس نیست');
                return prev;
            }
            return { ...prev, [productId]: newQty };
        });
    };

    const clearCart = () => {
        setCart({});
    };

    const toggleCart = (open?: boolean) => {
        setIsCartOpen(prev => open !== undefined ? open : !prev);
    };

    const toggleWishlist = (productId: string) => {
        setWishlist(prev => {
            if (prev.includes(productId)) {
                showToast('از علاقه‌مندی‌ها حذف شد');
                return prev.filter(id => id !== productId);
            } else {
                showToast('به علاقه‌مندی‌ها اضافه شد');
                return [...prev, productId];
            }
        });
    };

    const isInWishlist = (productId: string) => wishlist.includes(productId);

    const login = async (email: string, pass: string, code?: string) => {
        // Call login to let backend set cookies, then fetch /me to get authoritative user data (including role)
        const resp = await api.login(email, pass, code);
        try {
            const me = await api.me();
            setUser(normalizeUserForContext(me));
        } catch (e) {
            // Fallback to any user payload returned by login
            const u = resp?.user || resp;
            setUser(normalizeUserForContext(u));
        }
        setAuthModalOpen(false);
        showToast(`خوش آمدید`);
    };

    const register = async (name: string, email: string, pass: string) => {
        // Registration returns the new user and establishes the JWT cookies.
        const resp = await api.register(name, email, pass);
        const u = resp.user || resp || null;
        if (u) {
            setUser(normalizeUserForContext(u, name));
        }
        setAuthModalOpen(false);
        showToast('حساب کاربری ایجاد شد');
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (e) {
            // ignore
        }
        setUser(null);
        showToast('خروج با موفقیت انجام شد');
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!user) return;
        try {
            const updated = await api.updateProfile(data);
            setUser(updated);
            showToast('اطلاعات با موفقیت بروز شد');
        } catch (e) {
            showToast('خطا در بروزرسانی');
        }
    };

    const cancelUserOrder = async (orderId: string) => {
        try {
            await api.cancelOrder(orderId);
            await refreshProducts();
            showToast('سفارش لغو شد');
        } catch (e) {
            showToast('خطا در لغو سفارش');
        }
    };

    const sendMessage = async (name: string, email: string, message: string) => {
        let sendError: unknown;
        try {
            await api.contact(name, email, message);
            showToast('پیام شما با موفقیت ارسال شد');
        } catch (e) {
            sendError = e;
            showToast('خطا در ارسال پیام');
        }
        if (sendError) throw sendError;
    };

    const updateSiteSettings = async (settings: SiteSettings | FormData) => {
        try {
            const saved = await api.saveSettings(settings);
            setSiteSettings(saved);
            showToast('تنظیمات سایت ذخیره شد');
        } catch (e) {
            showToast('خطا در ذخیره تنظیمات');
            throw e;
        }
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <GlobalContext.Provider value={{
            cart, addToCart, removeFromCart, updateQty, clearCart, isCartOpen, toggleCart,
            wishlist, toggleWishlist, isInWishlist,
            user, isAuthLoading, login, register, logout, updateUserProfile, cancelUserOrder, sendMessage,
            products, refreshProducts,
            siteSettings, updateSiteSettings,
            theme, toggleTheme,
            isAuthModalOpen, setAuthModalOpen,
            toastMessage, showToast
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (!context) throw new Error("useGlobal must be used within GlobalProvider");
    return context;
};
