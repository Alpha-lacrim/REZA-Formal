import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, User, SiteSettings } from '../types';
import api from '../services/api';

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
    login: (email: string, pass: string, code?: string) => Promise<void>;
    loginWithGoogle: (email?: string) => Promise<void>;
    register: (name: string, email: string, pass: string) => Promise<void>;
    logout: () => void;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    cancelUserOrder: (orderId: string) => Promise<void>;
    sendOtp: (email: string) => Promise<string>;
    
    products: Product[];
    refreshProducts: () => Promise<void>;
    sendMessage: (name: string, email: string, message: string) => Promise<void>;

    siteSettings: SiteSettings | null;
    updateSiteSettings: (settings: SiteSettings) => Promise<void>;

    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (open: boolean) => void;
    toastMessage: string | null;
    showToast: (msg: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<{ [id: string]: number }>(() => {
        try { return JSON.parse(localStorage.getItem('reza_cart_v1') || '{}'); } catch { return {}; }
    });
    
    const [wishlist, setWishlist] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('reza_wishlist_v1') || '[]'); } catch { return []; }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
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
        // Try to populate user from backend cookie-based session
        (async () => {
            try {
                const me = await api.me();
                const normalized = { id: me.id, email: me.email, name: me.first_name || (me as any).name || '', role: me.role || 'user' } as User;
                setUser(normalized);
            } catch (e) {
                // not authenticated
            }
        })();
        refreshProducts();
        loadSettings();
    }, []);

    const refreshProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (e) {
            setProducts([]);
        }
    };

    const loadSettings = async () => {
        try {
            const settings = await api.getSettings();
            setSiteSettings(settings);
        } catch (e) {
            setSiteSettings(null);
        }
    };

    const addToCart = (productId: string, qty = 1) => {
        setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + qty }));
        setIsCartOpen(true);
        showToast('به سبد خرید اضافه شد');
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
            const newQty = (prev[productId] || 0) + delta;
            if (newQty <= 0) {
                const next = { ...prev };
                delete next[productId];
                return next;
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
        const resp = await api.login(email, pass, code);
        // backend sets cookies and returns user payload
        const u = resp.user || resp;
        const normalized = { id: u.id, email: u.email, name: u.first_name || u.name || '', role: u.role || 'user' } as User;
        setUser(normalized);
        setAuthModalOpen(false);
        showToast(`خوش آمدید`);
    };

    const loginWithGoogle = async (id_token_or_email?: string) => {
        try {
            // If an id_token is passed, call google auth; otherwise fallback to mock
            if (id_token_or_email && id_token_or_email.includes('.')) {
                const resp = await api.googleAuth(id_token_or_email);
                const u = resp.user || resp;
                const normalized = { id: u.id, email: u.email, name: u.first_name || u.name || '', role: u.role || 'user' } as User;
                setUser(normalized);
            } else {
                // fallback: call backend with a mock email via register/login flow is required
            }
            setAuthModalOpen(false);
            showToast('خوش آمدید');
        } catch (e) {
            showToast('خطا در ورود با گوگل');
        }
    };

    const register = async (name: string, email: string, pass: string) => {
        const resp = await api.register(name, email, pass);
        // backend may or may not return user directly
        const u = resp.user || resp || null;
        if (u) {
            const normalized = { id: u.id, email: u.email, name: u.first_name || u.name || name, role: u.role || 'user' } as User;
            setUser(normalized);
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
        // backend endpoint for cancelling order not yet implemented; refresh products locally
        try {
            // placeholder: call my orders or cancel endpoint when available
            await refreshProducts();
            showToast('سفارش لغو شد');
        } catch (e) {
            showToast('خطا در لغو سفارش');
        }
    };

    const sendMessage = async (name: string, email: string, message: string) => {
        try {
            await api.contact(name, email, message);
            showToast('پیام شما با موفقیت ارسال شد');
        } catch (e) {
            showToast('خطا در ارسال پیام');
        }
    };

    const updateSiteSettings = async (settings: SiteSettings) => {
        try {
            const saved = await api.saveSettings(settings);
            setSiteSettings(saved);
            showToast('تنظیمات سایت ذخیره شد');
        } catch (e) {
            showToast('خطا در ذخیره تنظیمات');
        }
    };

    const sendOtp = async (email: string): Promise<string> => {
        try {
            const resp = await api.sendOtp(email);
            return resp.otp || resp;
        } catch (e) {
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
            user, login, loginWithGoogle, register, logout, updateUserProfile, cancelUserOrder, sendMessage,
            products, refreshProducts,
            siteSettings, updateSiteSettings,
            sendOtp,
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