import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import ImageLoader from './ImageLoader';
import { cartLineKey, useGlobal } from '../contexts/GlobalContext';
import { formatPrice, toPersianDigits } from '../utils';

const MiniCart: React.FC = () => {
    const { isCartOpen, toggleCart, cartLines, updateQty, removeFromCart, products } = useGlobal();
    const cartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isCartOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (cartRef.current && !cartRef.current.contains(event.target as Node)) toggleCart(false);
        };
        const timer = window.setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 50);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCartOpen, toggleCart]);

    if (!isCartOpen) return null;

    const items = cartLines.flatMap(line => {
        const product = products.find(item => item.id === line.productId);
        if (!product) return [];
        const variant = line.variantId ? product.variants?.find(item => item.id === line.variantId) : undefined;
        return [{ line, product, variant, key: cartLineKey(line), price: variant?.price ?? product.price }];
    });
    const total = items.reduce((sum, item) => sum + item.price * item.line.quantity, 0);

    return (
        <div ref={cartRef} dir="rtl" className="fixed bottom-4 right-4 z-[9999] w-[90vw] max-w-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                <strong className="text-lux-black dark:text-white">سبد خرید</strong>
                <button onClick={() => toggleCart(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded" aria-label="بستن سبد خرید">
                    <X size={18} className="dark:text-white" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">سبد خرید خالی است</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                        {items.map(({ line, product, variant, key, price }) => (
                            <div key={key} className="p-3 flex gap-3">
                                <div className="w-14 h-20 shrink-0 rounded overflow-hidden bg-gray-100">
                                    <ImageLoader src={variant?.image || product.image} alt={product.name} className="w-full h-full" loading="lazy" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate dark:text-gray-200">{product.name}</h4>
                                    {variant && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {[variant.size && `سایز ${variant.size}`, variant.color && `رنگ ${variant.color}`].filter(Boolean).join('، ') || variant.name || variant.sku}
                                        </p>
                                    )}
                                    <div className="text-xs text-lux-gold my-2">{formatPrice(price)}</div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQty(key, -1)} className="p-1 border rounded hover:bg-gray-50 dark:border-zinc-700 dark:text-white" aria-label="کاهش تعداد"><Minus size={12} /></button>
                                        <span className="text-sm w-6 text-center dark:text-white">{toPersianDigits(line.quantity)}</span>
                                        <button onClick={() => updateQty(key, 1)} className="p-1 border rounded hover:bg-gray-50 dark:border-zinc-700 dark:text-white" aria-label="افزایش تعداد"><Plus size={12} /></button>
                                    </div>
                                </div>
                                <button onClick={() => removeFromCart(key)} className="text-gray-400 hover:text-red-500 self-start" aria-label="حذف از سبد">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between mb-3 font-bold text-lux-black dark:text-white">
                    <span>جمع کالاها:</span>
                    <span>{formatPrice(total)}</span>
                </div>
                <Link to="/cart" onClick={() => toggleCart(false)} className="block w-full text-center py-2 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    مشاهده و تکمیل خرید
                </Link>
            </div>
        </div>
    );
};

export default MiniCart;
