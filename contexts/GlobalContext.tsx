import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, User, SiteSettings } from '../types';
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
    const [user, setUser] = useState<User | null>(() => {
        try { return JSON.parse(localStorage.getItem('reza_session_v1') || 'null'); } catch { return null; }
    });
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
        refreshProducts();
        loadSettings();
    }, []);

    const refreshProducts = async () => {
        const data = await db.getProducts();
        setProducts(data);
    };

    const loadSettings = async () => {
        const settings = await db.getSettings();
        setSiteSettings(settings);
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
        const userData = await db.login(email, pass, code);
        setUser(userData);
        setAuthModalOpen(false);
        showToast(`خوش آمدید، ${userData.name}`);
    };

    const loginWithGoogle = async (email?: string) => {
        // Mock Google data
        const googleEmail = email && email.includes('@') ? email : 'user_google@gmail.com';
        const googleName = email ? email.split('@')[0] : 'Google User';
        const googleAvatar = 'https://lh3.googleusercontent.com/a/ACg8ocK...'; // Mock avatar url

        const userData = await db.loginWithGoogle(googleEmail, googleName, googleAvatar);
        setUser(userData);
        setAuthModalOpen(false);
        showToast(`خوش آمدید، ${userData.name}`);
    };

    const register = async (name: string, email: string, pass: string) => {
        const userData = await db.register(name, email, pass);
        setUser(userData);
        setAuthModalOpen(false);
        showToast('حساب کاربری ایجاد شد');
    };

    const logout = () => {
        setUser(null);
        showToast('خروج با موفقیت انجام شد');
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!user) return;
        const updated = await db.updateUser(user.id, data);
        setUser(updated);
        showToast('اطلاعات با موفقیت بروز شد');
    };

    const cancelUserOrder = async (orderId: string) => {
        await db.cancelOrder(orderId);
        await refreshProducts(); 
        showToast('سفارش لغو شد');
    };

    const sendMessage = async (name: string, email: string, message: string) => {
        await db.sendMessage(name, email, message);
        showToast('پیام شما با موفقیت ارسال شد');
    };

    const updateSiteSettings = async (settings: SiteSettings) => {
        await db.saveSettings(settings);
        setSiteSettings(settings);
        showToast('تنظیمات سایت ذخیره شد');
    };

    const sendOtp = async (email: string): Promise<string> => {
        const token = await db.sendOtp(email);
        return token;
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