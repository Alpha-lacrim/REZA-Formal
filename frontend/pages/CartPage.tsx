import React, { useState } from 'react';
import ImageLoader from '../components/ImageLoader';
import { ArrowLeft, Trash2, Plus, Minus, CreditCard, MapPin, Banknote, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobal } from '../contexts/GlobalContext';
import { formatPrice, toPersianDigits } from '../utils';
import { CartItem } from '../types';
import api from '../services/api';
import SEO from '../components/SEO';

const CartPage: React.FC = () => {
    const { cart, updateQty, removeFromCart, user, setAuthModalOpen, clearCart, showToast, products: contextProducts, refreshProducts } = useGlobal();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState(user?.address || '');
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
    const [error, setError] = useState('');

    const resolveProduct = (id: string) => {
        return contextProducts.find(p => p.id === id);
    };

    const cartItems = Object.entries(cart).map(([id, qty]) => {
        const product = resolveProduct(id);
        return product ? { ...product, qty } : null;
    }).filter((item): item is CartItem => item !== null);

    const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleCheckout = async () => {
        setError('');
        
        if (!user) {
            setAuthModalOpen(true);
            showToast('برای ثبت سفارش لطفاً وارد شوید');
            return;
        }

        if (!address.trim()) {
            setError('لطفاً آدرس ارسال را وارد کنید');
            return;
        }

        const unavailableItem = cartItems.find(item => item.stock !== undefined && item.qty > item.stock);
        if (unavailableItem) {
            setError('تعداد انتخاب‌شده از موجودی انبار بیشتر است');
            return;
        }

        setLoading(true);
        try {
            const items = cartItems.map(i => ({ id: i.id, qty: i.qty, price: i.price }));
            await api.createOrder({ items, total, shipping_address: address.trim(), payment_method: paymentMethod });
            await refreshProducts(); // Update stock in global state
            clearCart();
            showToast('سفارش با موفقیت ثبت شد');
            navigate('/profile');
        } catch (error: any) {
            setError(error.message || 'خطا در ثبت سفارش');
            showToast(error.message || 'خطا در ثبت سفارش');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO title="Shopping cart" />
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-2">سبد خرید</h1>
                    <p className="text-white/80 text-sm">مرور و نهایی‌سازی سفارش</p>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-32 bg-lux-gold/20 rounded-md -z-0 blur-xl"></div>
            </header>
            
            <div className="bg-lux-black px-4 pb-4">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md hover:brightness-95 text-xs md:text-sm">
                    <ArrowLeft size={14} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-5xl mx-auto px-4 py-12">
                {cartItems.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xl text-gray-500 dark:text-gray-400 mb-6">سبد خرید شما خالی است.</p>
                        <Link to="/" className="inline-block px-6 py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg">
                            بازگشت به فروشگاه
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-zinc-700 mb-6">
                                <div className="divide-y divide-gray-100 dark:divide-zinc-700">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                                            <div className="w-24 h-32 rounded overflow-hidden bg-gray-100">
                                                <ImageLoader src={item.image} alt={item.name} className="w-full h-full" loading="lazy" />
                                            </div>
                                            
                                            <div className="flex-1">
                                                <h3 className="font-serif text-lg font-bold text-lux-black dark:text-white mb-1">{item.name}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.short}</p>
                                                <div className="font-semibold text-lux-gold">{formatPrice(item.price)}</div>
                                                {((item.stock || 0) < 5) && (
                                                    <div className="text-xs text-orange-500 mt-1">
                                                        تنها {toPersianDigits(item.stock)} عدد باقی مانده
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-6 mt-2 sm:mt-0">
                                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900 rounded-lg p-1 border border-gray-200 dark:border-zinc-700">
                                                    <button onClick={() => updateQty(item.id, -1)} className="p-1 hover:text-lux-gold dark:text-white"><Minus size={16} /></button>
                                                    <span className="w-8 text-center font-bold dark:text-white">{toPersianDigits(item.qty)}</span>
                                                    <button onClick={() => updateQty(item.id, 1)} className="p-1 hover:text-lux-gold dark:text-white"><Plus size={16} /></button>
                                                </div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border border-gray-100 dark:border-zinc-700">
                                <h3 className="font-bold text-lg text-lux-black dark:text-white mb-4 flex items-center gap-2">
                                    <Banknote size={20}/> روش پرداخت
                                </h3>
                                <div className="space-y-3">
                                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-lux-gold bg-lux-gold/5' : 'border-gray-200 dark:border-zinc-600'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            checked={paymentMethod === 'online'} 
                                            onChange={() => setPaymentMethod('online')}
                                            className="accent-lux-gold w-4 h-4"
                                        />
                                        <span className="text-lux-black dark:text-white font-medium">پرداخت اینترنتی</span>
                                    </label>
                                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-lux-gold bg-lux-gold/5' : 'border-gray-200 dark:border-zinc-600'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            checked={paymentMethod === 'cod'} 
                                            onChange={() => setPaymentMethod('cod')}
                                            className="accent-lux-gold w-4 h-4"
                                        />
                                        <span className="text-lux-black dark:text-white font-medium">پرداخت در محل</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-96">
                            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-200 dark:border-zinc-700 sticky top-24">
                                <h3 className="font-bold text-lg text-lux-black dark:text-white mb-6 border-b pb-4 border-gray-200 dark:border-zinc-700">خلاصه سفارش</h3>
                                
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>تعداد اقلام:</span>
                                        <span>{toPersianDigits(cartItems.reduce((a, b) => a + b.qty, 0))}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-lux-black dark:text-white">
                                        <span>مجموع:</span>
                                        <span>{formatPrice(total)}</span>
                                    </div>
                                </div>

                                {user ? (
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-500 mb-2"><MapPin size={16} className="inline ml-1"/> آدرس تحویل</label>
                                        <textarea 
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            rows={3}
                                            className="w-full p-2 text-sm border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                            placeholder="لطفا آدرس دقیق را وارد کنید..."
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded">
                                        برای تکمیل خرید باید وارد حساب کاربری شوید.
                                    </div>
                                )}

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded flex items-center gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <button 
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    className="w-full py-4 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-lg font-bold rounded-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50 btn-ripple interactive focus-ring"
                                >
                                    <CreditCard size={20} />
                                    {loading ? 'در حال پردازش...' : 'پرداخت و تکمیل خرید'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CartPage;
