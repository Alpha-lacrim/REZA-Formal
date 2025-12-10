
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, User } from '../types';
import { db } from '../services/db';

interface GlobalContextType {
    cart: { [id: string]: number };
    addToCart: (productId: string, qty?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQty: (productId: string, delta: number) => void;
    clearCart: () => void;
    isCartOpen: boolean;
    toggleCart: (open?: boolean) => void;
    
    // Auth & User
    user: User | null;
    login: (email: string, pass: string) => Promise<void>;
    register: (name: string, email: string, pass: string) => Promise<void>;
    logout: () => void;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
    
    // Data
    products: Product[];
    refreshProducts: () => Promise<void>;

    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isAuthModalOpen: boolean;
    setAuthModalOpen: (open: boolean) => void;
    toastMessage: string | null;
    showToast: (msg: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State ---
    const [cart, setCart] = useState<{ [id: string]: number }>(() => {
        try { return JSON.parse(localStorage.getItem('reza_cart_v1') || '{}'); } catch { return {}; }
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [user, setUser] = useState<User | null>(() => {
        try { return JSON.parse(localStorage.getItem('reza_session_v1') || 'null'); } catch { return null; }
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return (localStorage.getItem('reza_theme_pref') as 'light' | 'dark') || 'light';
    });
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('reza_cart_v1', JSON.stringify(cart));
    }, [cart]);

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

    // Load products on mount
    useEffect(() => {
        refreshProducts();
    }, []);

    const refreshProducts = async () => {
        const data = await db.getProducts();
        setProducts(data);
    };

    // --- Actions ---

    // Cart
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

    // Auth
    const login = async (email: string, pass: string) => {
        const userData = await db.login(email, pass);
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

    // UI
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
            user, login, register, logout, updateUserProfile,
            products, refreshProducts,
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
