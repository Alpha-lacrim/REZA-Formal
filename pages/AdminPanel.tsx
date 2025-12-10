
import React, { useState, useEffect } from 'react';
import { useGlobal } from '../contexts/GlobalContext';
import { db } from '../services/db';
import { Product, Order } from '../types';
import { toPersianDigits, formatPrice } from '../utils';
import { LayoutDashboard, Package, ShoppingBag, Plus, Trash2, Edit2, X, Check, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPanel: React.FC = () => {
    const { user, products, refreshProducts, showToast } = useGlobal();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
    const [stats, setStats] = useState({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Product Edit State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        loadData();
    }, [activeTab, user]);

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'dashboard') {
            const s = await db.getStats();
            setStats(s);
        } else if (activeTab === 'orders') {
            const o = await db.getOrders();
            setOrders(o);
        }
        setLoading(false);
    };

    const handleSaveProduct = async () => {
        if (!editingProduct.name || !editingProduct.price) {
            showToast('لطفا نام و قیمت را وارد کنید');
            return;
        }

        const productToSave: Product = {
            id: editingProduct.id || 'prod-' + Date.now(),
            name: editingProduct.name!,
            price: Number(editingProduct.price),
            category: editingProduct.category || 'accessories',
            description: editingProduct.description || '',
            image: editingProduct.image || 'https://via.placeholder.com/400',
            currency: 'Toman',
            short: editingProduct.short || '',
            fabric: editingProduct.fabric || ''
        };

        await db.saveProduct(productToSave);
        await refreshProducts();
        setIsProductModalOpen(false);
        setEditingProduct({});
        showToast('محصول ذخیره شد');
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm('آیا از حذف این محصول مطمئن هستید؟')) {
            await db.deleteProduct(id);
            await refreshProducts();
            showToast('محصول حذف شد');
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
        await db.updateOrderStatus(orderId, status);
        loadData(); // Reload orders
        showToast('وضعیت سفارش بروز شد');
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
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20 flex flex-col md:flex-row">
            
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white dark:bg-zinc-800 border-b md:border-b-0 md:border-l border-gray-200 dark:border-zinc-700 p-4">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 rounded-full bg-lux-gold flex items-center justify-center text-white font-bold text-xl">
                        A
                    </div>
                    <div>
                        <h2 className="font-bold text-lux-black dark:text-white">پنل مدیریت</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">خوش آمدید، مدیر</p>
                    </div>
                </div>

                <nav className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-lux-gold text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                    >
                        <LayoutDashboard size={20} />
                        داشبورد
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-lux-gold text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                    >
                        <Package size={20} />
                        محصولات
                    </button>
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-lux-gold text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                    >
                        <ShoppingBag size={20} />
                        سفارشات
                    </button>
                </nav>
            </aside>

            {/* Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {activeTab === 'dashboard' && (
                    <div className="animate-in fade-in duration-500">
                        <h1 className="text-2xl font-bold mb-6 text-lux-black dark:text-white">آمار کلی فروشگاه</h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'کل فروش', value: formatPrice(stats.revenue), bg: 'bg-green-500' },
                                { label: 'تعداد سفارشات', value: toPersianDigits(stats.ordersCount), bg: 'bg-blue-500' },
                                { label: 'تعداد محصولات', value: toPersianDigits(stats.productsCount), bg: 'bg-indigo-500' },
                                { label: 'تعداد کاربران', value: toPersianDigits(stats.usersCount), bg: 'bg-purple-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                                        <p className="text-2xl font-bold text-lux-black dark:text-white">{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-lg ${stat.bg} opacity-20`}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-lux-black dark:text-white">مدیریت محصولات</h1>
                            <button 
                                onClick={() => { setEditingProduct({}); setIsProductModalOpen(true); }}
                                className="bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"
                            >
                                <Plus size={16} /> افزودن محصول
                            </button>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-lux-gray dark:bg-zinc-700/50 text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4">تصویر</th>
                                            <th className="px-6 py-4">نام محصول</th>
                                            <th className="px-6 py-4">دسته‌بندی</th>
                                            <th className="px-6 py-4">قیمت</th>
                                            <th className="px-6 py-4 text-left">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                        {products.map(p => (
                                            <tr key={p.id} className="hover:bg-lux-gray dark:hover:bg-zinc-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                                                </td>
                                                <td className="px-6 py-4 font-medium text-lux-black dark:text-white">{p.name}</td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{p.category}</td>
                                                <td className="px-6 py-4 text-lux-gold">{formatPrice(p.price)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="animate-in fade-in duration-500">
                        <h1 className="text-2xl font-bold mb-6 text-lux-black dark:text-white">مدیریت سفارشات</h1>
                        <div className="space-y-4">
                            {orders.length === 0 ? (
                                <p className="text-gray-500">هیچ سفارشی ثبت نشده است.</p>
                            ) : (
                                orders.map(order => (
                                    <div key={order.id} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-zinc-700">
                                            <div>
                                                <span className="font-bold text-lg ml-3 text-lux-black dark:text-white">#{order.id}</span>
                                                <span className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status]}`}>
                                                    {statusLabels[order.status]}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-500 mb-2">اقلام سفارش:</h4>
                                                <ul className="space-y-2 text-sm text-lux-black dark:text-white">
                                                    {order.items.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between">
                                                            <span>{toPersianDigits(item.qty)} × {item.name}</span>
                                                            <span>{formatPrice(item.price * item.qty)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700 font-bold text-lux-gold">
                                                    مجموع: {formatPrice(order.total)}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-500 mb-2">آدرس ارسال:</h4>
                                                <p className="text-sm text-lux-black dark:text-white bg-gray-50 dark:bg-zinc-700 p-3 rounded">{order.shippingAddress}</p>
                                                
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-bold text-gray-500 mb-2">تغییر وضعیت:</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(Object.keys(statusLabels) as Order['status'][]).map(s => (
                                                            <button 
                                                                key={s}
                                                                onClick={() => handleUpdateOrderStatus(order.id, s)}
                                                                disabled={order.status === s}
                                                                className={`px-3 py-1 text-xs border rounded transition-colors ${order.status === s ? 'bg-lux-gold text-white border-lux-gold' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-lux-gold hover:text-lux-gold'}`}
                                                            >
                                                                {statusLabels[s]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-lux-black dark:text-white">{editingProduct.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
                            <button onClick={() => setIsProductModalOpen(false)}><X className="text-lux-black dark:text-white" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">نام محصول</label>
                                    <input 
                                        type="text" 
                                        value={editingProduct.name || ''} 
                                        onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">قیمت (تومان)</label>
                                    <input 
                                        type="number" 
                                        value={editingProduct.price || ''} 
                                        onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">دسته‌بندی</label>
                                    <select 
                                        value={editingProduct.category || 'suits'} 
                                        onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                    >
                                        <option value="suits">کت و شلوار</option>
                                        <option value="shirts">پیراهن</option>
                                        <option value="blazers">بلیزر</option>
                                        <option value="accessories">اکسسوری</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">تصویر (URL)</label>
                                    <input 
                                        type="text" 
                                        value={editingProduct.image || ''} 
                                        onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dir-ltr"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">توضیح کوتاه</label>
                                <input 
                                    type="text" 
                                    value={editingProduct.short || ''} 
                                    onChange={e => setEditingProduct({...editingProduct, short: e.target.value})}
                                    className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">توضیحات کامل</label>
                                <textarea 
                                    rows={4}
                                    value={editingProduct.description || ''} 
                                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                                    className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-zinc-700 flex justify-end gap-2 bg-gray-50 dark:bg-zinc-900">
                            <button 
                                onClick={() => setIsProductModalOpen(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
                            >
                                انصراف
                            </button>
                            <button 
                                onClick={handleSaveProduct}
                                className="px-6 py-2 bg-lux-gold text-white rounded hover:bg-lux-gold-dark font-bold flex items-center gap-2"
                            >
                                <Save size={18} /> ذخیره
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
