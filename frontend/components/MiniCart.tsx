import React, { useRef, useEffect } from 'react';
import ImageLoader from './ImageLoader';
import { X, Plus, Minus, Trash2 } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import { products as fallbackProducts } from '../data';
import { formatPrice, toPersianDigits } from '../utils';
import { Link } from 'react-router-dom';
import { CartItem } from '../types';

const MiniCart: React.FC = () => {
    const { isCartOpen, toggleCart, cart, updateQty, removeFromCart, products: dbProducts } = useGlobal();
    const cartRef = useRef<HTMLDivElement>(null);

    // Close cart when clicking outside
    useEffect(() => {
        if (!isCartOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
                toggleCart(false);
            }
        };

        // Add small delay to avoid closing immediately on the click that opened it
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCartOpen, toggleCart]);

    if (!isCartOpen) return null;

    const cartItems = Object.entries(cart).map(([id, qty]) => {
        // Fallback to static seed if not found in context
        const product = dbProducts.find(p => p.id === id) || fallbackProducts.find(p => p.id === id);
        return product ? { ...product, qty } : null;
    }).filter((item): item is CartItem => item !== null);

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    return (
        <div ref={cartRef} className="fixed bottom-4 right-4 z-[9999] w-[90vw] md:w-80 max-w-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                <strong className="text-lux-black dark:text-white">سبد خرید</strong>
                <button onClick={() => toggleCart(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded">
                    <X size={18} className="dark:text-white" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
                {cartItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">سبد خرید خالی است</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {cartItems.map((item) => (
                            <div key={item.id} className="p-3 flex gap-3">
                                <div className="w-14 h-18 rounded overflow-hidden bg-gray-100">
                                    <ImageLoader src={item.image} alt={item.name} className="w-full h-full" loading="lazy" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate dark:text-gray-200 interactive">{item.name}</h4>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{formatPrice(item.price)}</div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQty(item.id, -1)} className="p-1 border rounded hover:bg-gray-50 dark:border-zinc-700 dark:text-white"><Minus size={12} /></button>
                                        <span className="text-sm w-6 text-center dark:text-white">{toPersianDigits(item.qty)}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="p-1 border rounded hover:bg-gray-50 dark:border-zinc-700 dark:text-white"><Plus size={12} /></button>
                                    </div>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 self-start">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between mb-3 font-bold text-lux-black dark:text-white">
                    <span>مجموع:</span>
                    <span>{formatPrice(total)}</span>
                </div>
                <Link 
                    to="/cart" 
                    onClick={() => toggleCart(false)}
                    className="block w-full text-center py-2 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-semibold hover:opacity-90 transition-opacity btn-ripple interactive focus-ring"
                >
                    تسویه حساب
                </Link>
            </div>
        </div>
    );
};

export default MiniCart;