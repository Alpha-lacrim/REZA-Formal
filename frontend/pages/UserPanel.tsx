import React, { useState, useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import { Order } from '../types';
import { toPersianDigits, formatPrice } from '../utils';
import { User, Package, MapPin, Save, LogOut, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserPanel: React.FC = () => {
    const { user, updateUserProfile, logout, showToast, cancelUserOrder } = useGlobal();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        setName(user.name);
        setAddress(user.address || '');
        loadOrders();
    }, [user]);

    const loadOrders = async () => {
        if (user) {
            setLoading(true);
            try {
                const o = await api.myOrders();
                setOrders(o);
            } catch (e) {
                setOrders([]);
            }
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateUserProfile({ name, address });
        } catch (err) {
            showToast('خطا در بروزرسانی');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (window.confirm('آیا از لغو این سفارش اطمینان دارید؟')) {
            try {
                await cancelUserOrder(orderId);
                loadOrders(); // Refresh list
            } catch (err: any) {
                showToast(err.message || 'خطا در لغو سفارش');
            }
        }
    };

    const statusColors: Record<string, string> = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'processing': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-indigo-100 text-indigo-800',
        'delivered': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
    };

    const statusLabels: Record<string, string> = {
        'pending': 'در انتظار بررسی',
        'processing': 'در حال آماده‌سازی',
        'shipped': 'ارسال شده',
        'delivered': 'تحویل شده',
        'cancelled': 'لغو شده',
    };

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-24 pb-12">
            <div className="container max-w-5xl mx-auto px-4">
                
                <div className="flex flex-col md:flex-row gap-8">
                    
                    <div className="w-full md:w-1/3">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-6 sticky top-24">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-lux-black dark:bg-lux-gold text-white dark:text-black flex items-center justify-center text-3xl font-bold mb-4">
                                    {user?.name.charAt(0)}
                                </div>
                                <h2 className="text-xl font-bold text-lux-black dark:text-white">{user?.name}</h2>
                                <p className="text-gray-500 text-sm">{user?.email}</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2">
                                        <User size={16} /> نام و نام خانوادگی
                                    </label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2">
                                        <MapPin size={16} /> آدرس پیش‌فرض
                                    </label>
                                    <textarea 
                                        rows={3}
                                        value={address} 
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white text-sm"
                                        placeholder="آدرس دقیق پستی جهت ارسال سفارشات"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-lux-gold text-white py-2 rounded font-bold hover:bg-lux-gold-dark transition-colors flex justify-center gap-2 items-center">
                                    <Save size={16} /> ذخیره تغییرات
                                </button>
                            </form>

                            <button onClick={logout} className="w-full mt-4 border border-red-200 text-red-500 py-2 rounded font-bold hover:bg-red-50 transition-colors flex justify-center gap-2 items-center">
                                <LogOut size={16} /> خروج از حساب
                            </button>
                        </div>
                    </div>

                    <div className="w-full md:w-2/3">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-6">
                            <h3 className="text-xl font-bold text-lux-black dark:text-white mb-6 flex items-center gap-2">
                                <Package className="text-lux-gold" /> تاریخچه سفارشات
                            </h3>

                            {loading ? (
                                <div className="text-center py-10 text-gray-400">در حال بارگذاری...</div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 dark:bg-zinc-700/30 rounded-lg">
                                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">هنوز سفارشی ثبت نکرده‌اید.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {orders.map(order => (
                                        <div key={order.id} className="border border-gray-200 dark:border-zinc-600 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 flex justify-between items-center flex-wrap gap-2">
                                                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                                                    <span>کد: <span className="font-bold text-lux-black dark:text-white">{order.id}</span></span>
                                                    <span>تاریخ: {new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>
                                                        {statusLabels[order.status]}
                                                    </span>
                                                    {order.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleCancelOrder(order.id)}
                                                            className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs"
                                                            title="لغو سفارش"
                                                        >
                                                            <XCircle size={16} />
                                                            لغو
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <ul className="space-y-3">
                                                    {order.items.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded overflow-hidden bg-gray-100">
                                                                    <ImageLoader src={item.image} alt="" className="w-10 h-10" loading="lazy" />
                                                                </div>
                                                                <span className="text-lux-black dark:text-white">{item.name} <span className="text-gray-400">x{toPersianDigits(item.qty)}</span></span>
                                                            </div>
                                                            <span className="font-bold dark:text-white">{formatPrice(item.price * item.qty)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                                                    <span className="text-sm text-gray-500">آدرس: {order.shippingAddress}</span>
                                                    <span className="text-lg font-bold text-lux-gold">{formatPrice(order.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default UserPanel;