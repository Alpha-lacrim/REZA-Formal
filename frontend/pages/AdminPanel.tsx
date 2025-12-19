import React, { useState, useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import { db } from '../services/db';
import { Product, Order, ContactMessage, SiteSettings, User } from '../types';
import { toPersianDigits, formatPrice } from '../utils';
import { 
    LayoutDashboard, Package, ShoppingBag, Plus, Trash2, Edit2, X, Save, 
    Search, ChevronLeft, ChevronRight, AlertCircle, MessageSquare, 
    Settings as SettingsIcon, Upload, ArrowUpDown, Eye, Printer, 
    Calendar, User as UserIcon, Phone, Filter, TrendingUp, DollarSign, 
    Users, Activity, CheckCircle2, Clock, Ban, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 8;

const AdminPanel: React.FC = () => {
    const { user, products, refreshProducts, showToast, siteSettings, updateSiteSettings, theme } = useGlobal();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'messages' | 'settings'>('dashboard');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [stats, setStats] = useState({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Search & Pagination & Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc' | 'name-asc'>('default');

    // Order Filters
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');

    // Modals
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
    
    // NEW: We need to store the raw FILE object to send to Django
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    const [newImageUrl, setNewImageUrl] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; productId: string | null }>({
        isOpen: false,
        productId: null
    });

    // Settings State
    const [settingsForm, setSettingsForm] = useState<SiteSettings>({
        aboutTitle: '',
        aboutDescription: '',
        aboutImage: '',
        heroImage: '',
        suitsSectionImage: '',
        shirtsSectionImage: '',
        blazersSectionImage: '',
        accessoriesSectionImage: '',
        bespokeSectionImage: ''
    });
    // Hold raw File objects for settings uploads so we can send FormData
    const [settingsFiles, setSettingsFiles] = useState<Partial<Record<keyof SiteSettings, File>>>({});

    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/');
            return;
        }
        if (user && user.role === 'admin') {
            loadData();
        }
    }, [activeTab, user]);

    useEffect(() => {
        if (siteSettings) {
            setSettingsForm(siteSettings);
        }
    }, [siteSettings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab, sortBy, filterStatus, filterDateStart, filterDateEnd]);

    const loadData = async () => {
        try {
            const s = await api.adminGetStats();
            setStats(s);
        } catch (e) {
            try {
                const localStats = await db.getStats();
                setStats(localStats as any);
            } catch {
                setStats({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 });
            }
        }
        if (activeTab === 'orders') {
            try {
                const o = await api.adminGetOrders();
                const u = await api.adminGetUsers();
                setOrders(o);
                setUsers(u);
            } catch (e) {
                try {
                    const o = await db.getOrders();
                    const u = await db.getUsers();
                    setOrders(o);
                    setUsers(u as any);
                } catch {
                    setOrders([]);
                    setUsers([]);
                }
            }
        } else if (activeTab === 'messages') {
            try {
                const m = await api.adminGetMessages();
                setMessages(m);
            } catch (e) {
                try {
                    const m = await db.getMessages();
                    setMessages(m as any);
                } catch {
                    setMessages([]);
                }
            }
        }
    };

    // ... (Keep existing handlers: handleSaveProduct, handleFileUpload, etc. - logic is unchanged, just UI updates below)
    const handleSaveProduct = async () => {
        if (!editingProduct.name || !editingProduct.price) {
            showToast('لطفا نام و قیمت را وارد کنید');
            return;
        }

        const formData = new FormData();
        
        if (editingProduct.id) {
            formData.append('id', editingProduct.id);
        }

        formData.append('name', editingProduct.name);
        formData.append('price', String(editingProduct.price));
        formData.append('category', editingProduct.category || 'accessories');
        formData.append('description', editingProduct.description || '');
        formData.append('currency', 'Toman');
        formData.append('short', editingProduct.short || '');
        formData.append('fabric', editingProduct.fabric || '');
        formData.append('stock', String(editingProduct.stock || 0));

        if (editingProduct.images && editingProduct.images.length > 0) {
            formData.append('images', JSON.stringify(editingProduct.images));
        }

        if (selectedFile) {
            formData.append('image', selectedFile); 
        }

        try {
            await api.adminSaveProduct(formData);
            await refreshProducts();
            setIsProductModalOpen(false);
            setEditingProduct({});
            setSelectedFile(null);
            setNewImageUrl('');
            showToast('محصول با موفقیت ذخیره شد');
        } catch (e: any) {
            console.error('Save failed:', e);
            showToast('خطا در ذخیره محصول');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const mainFile = files[0];
            setSelectedFile(mainFile);
            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setEditingProduct(prev => ({
                        ...prev,
                        images: [...(prev.images || []), result],
                        image: result 
                    }));
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleDeleteProduct = (id: string) => {
        setDeleteConfirmation({ isOpen: true, productId: id });
    };

    const confirmDeleteProduct = async () => {
        if (deleteConfirmation.productId) {
            try {
                await api.adminDeleteProduct(deleteConfirmation.productId);
                await refreshProducts();
                showToast('محصول حذف شد');
            } catch (e) {
                // Fallback to local db delete
                try {
                    await db.deleteProduct(deleteConfirmation.productId as string);
                    await refreshProducts();
                    showToast('محصول (محلی) حذف شد');
                } catch (err) {
                    showToast('خطا در حذف محصول');
                }
            }
            setDeleteConfirmation({ isOpen: false, productId: null });
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
        try {
            await api.adminUpdateOrderStatus(orderId, status);
            const updatedOrders = await api.adminGetOrders();
            setOrders(updatedOrders);
            if (viewingOrder && viewingOrder.id === orderId) {
                setViewingOrder(updatedOrders.find(o => o.id === orderId) || null);
            }
            showToast('وضعیت سفارش بروز شد');
        } catch (e) {
            // Fallback to local db
            try {
                await db.updateOrderStatus(orderId, status);
                const updatedOrders = await db.getOrders();
                setOrders(updatedOrders as any);
                if (viewingOrder && viewingOrder.id === orderId) {
                    setViewingOrder(updatedOrders.find(o => o.id === orderId) || null);
                }
                showToast('وضعیت سفارش بروز شد (محلی)');
            } catch (err) {
                showToast('خطا در بروزرسانی وضعیت سفارش');
            }
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const fieldMap: Record<string, string> = {
                aboutTitle: 'about_title',
                aboutDescription: 'about_description',
                aboutImage: 'about_image',
                heroImage: 'hero_image',
                suitsSectionImage: 'suits_section_image',
                shirtsSectionImage: 'shirts_section_image',
                blazersSectionImage: 'blazers_section_image',
                accessoriesSectionImage: 'accessories_section_image',
                bespokeSectionImage: 'bespoke_section_image'
            };

            const hasFiles = Object.keys(settingsFiles).length > 0;
            if (hasFiles) {
                const fd = new FormData();
                Object.entries(settingsForm).forEach(([k, v]) => {
                    const key = fieldMap[k] || k;
                    if (v !== undefined && v !== null) fd.append(key, String(v));
                });
                Object.entries(settingsFiles).forEach(([k, f]) => {
                    const key = fieldMap[k] || k;
                    if (f) fd.append(key, f as File);
                });
                await updateSiteSettings(fd as any);
            } else {
                const payload: any = {};
                Object.entries(settingsForm).forEach(([k, v]) => {
                    const key = fieldMap[k] || k;
                    payload[key] = v;
                });
                await updateSiteSettings(payload as any);
            }
            showToast('تنظیمات ذخیره شد');
        } catch (err) {
            console.error('Settings save failed', err);
            try {
                await db.saveSettings(settingsForm);
                showToast('تنظیمات بصورت محلی ذخیره شد');
            } catch (e) {
                console.error('Local settings save failed', e);
                showToast('خطا در ذخیره تنظیمات');
            }
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.adminMarkMessageRead(id);
            const updatedMessages = await api.adminGetMessages();
            setMessages(updatedMessages);
            const s = await api.adminGetStats();
            setStats(s);
        } catch (e) {
            try {
                await db.markMessageAsRead(id);
                const updatedMessages = await db.getMessages();
                setMessages(updatedMessages as any);
                const s = await db.getStats();
                setStats(s as any);
            } catch (err) {
                showToast('خطا در علامت‌گذاری پیام');
            }
        }
    };

    const handleAddImageUrl = () => {
        if (newImageUrl) {
            const currentImages = editingProduct.images || [];
            setEditingProduct({
                ...editingProduct,
                images: [...currentImages, newImageUrl]
            });
            setNewImageUrl('');
        }
    };

    const handleRemoveImage = (index: number) => {
        const currentImages = editingProduct.images || [];
        setEditingProduct({
            ...editingProduct,
            images: currentImages.filter((_, i) => i !== index)
        });
    };

    const handleSettingsFileUpload = (field: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSettingsFiles(prev => ({ ...prev, [field]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettingsForm(prev => ({ ...prev, [field]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrintOrder = () => {
        window.print();
    };

    const getCustomerDetails = (userId: string) => {
        return users.find(u => u.id === userId);
    };

    const clearOrderFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setFilterDateStart('');
        setFilterDateEnd('');
    };

    // Filter Logic
    let filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.includes(searchTerm)
    );

    if (sortBy === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') filteredProducts.sort((a, b) => b.price - a.price);
    else if (sortBy === 'stock-asc') filteredProducts.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    else if (sortBy === 'stock-desc') filteredProducts.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    else if (sortBy === 'name-asc') filteredProducts.sort((a, b) => a.name.localeCompare(b.name));

    const filteredOrders = orders.filter(o => {
        const customer = getCustomerDetails(o.userId);
        const customerName = customer ? customer.name.toLowerCase() : '';
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = o.id.toLowerCase().includes(searchLower) || o.shippingAddress.toLowerCase().includes(searchLower) || customerName.includes(searchLower);
        if (!matchesSearch) return false;
        if (filterStatus !== 'all' && o.status !== filterStatus) return false;
        const d = new Date(o.createdAt);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (filterDateStart && orderDate < filterDateStart) return false;
        if (filterDateEnd && orderDate > filterDateEnd) return false;
        return true;
    });

    const filteredMessages = messages.filter(m => 
        m.name.includes(searchTerm) || m.email.includes(searchTerm) || m.message.includes(searchTerm)
    );

    const paginationStart = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);
    const paginatedMessages = filteredMessages.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);

    const totalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

    // Styling Helpers
    const statusConfig: Record<string, { bg: string, text: string, icon: any, label: string }> = {
        'pending': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: Clock, label: 'در انتظار بررسی' },
        'processing': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Activity, label: 'در حال آماده‌سازی' },
        'shipped': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', icon: TrendingUp, label: 'ارسال شده' },
        'delivered': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2, label: 'تحویل شده' },
        'cancelled': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: Ban, label: 'لغو شده' },
    };

    const getStatusBadge = (status: string) => {
        const config = statusConfig[status] || statusConfig['pending'];
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border border-transparent`}>
                <Icon size={12} strokeWidth={2.5} />
                {config.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-950 pt-20 flex flex-col md:flex-row transition-colors duration-300">
            
            {/* Sidebar (hidden on small screens; mobile drawer used instead) */}
            <aside className="hidden md:flex md:w-72 bg-white dark:bg-zinc-900 border-b md:border-b-0 md:border-l border-gray-200 dark:border-zinc-800 p-6 shrink-0 print:hidden flex-col h-auto md:h-[calc(100vh-5rem)] sticky top-20 shadow-sm z-30">
                <div className="flex items-center gap-4 mb-10 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lux-gold to-lux-gold-dark shadow-lg shadow-lux-gold/20 flex items-center justify-center text-white font-serif font-bold text-xl ring-2 ring-white dark:ring-zinc-800">A</div>
                    <div>
                        <h2 className="font-bold text-lux-black dark:text-white text-lg tracking-tight">پنل مدیریت</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">نسخه ۲.۴.۰</p>
                    </div>
                </div>
                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
                        { id: 'products', label: 'محصولات', icon: Package },
                        { id: 'orders', label: 'سفارشات', icon: ShoppingBag },
                        { id: 'messages', label: 'پیام‌ها', icon: MessageSquare, badge: stats.messagesCount },
                        { id: 'settings', label: 'تنظیمات سایت', icon: SettingsIcon },
                    ].map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group relative overflow-hidden ${
                                activeTab === item.id 
                                ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-lux-black dark:hover:text-white'
                            }`}
                        >
                            <item.icon size={20} className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="relative z-10">{item.label}</span>
                            {item.badge ? (
                                <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === item.id ? 'bg-white text-lux-black dark:bg-lux-black dark:text-white' : 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'}`}>
                                    {toPersianDigits(item.badge)}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </nav>
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lux-gray dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                            <UserIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-lux-black dark:text-white truncate">مدیر سیستم</p>
                            <p className="text-[10px] text-gray-400 truncate">admin@reza.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile slide-over drawer */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
                    <aside className="relative ml-auto w-72 bg-white dark:bg-zinc-900 p-6 h-full overflow-y-auto shadow-xl transform translate-x-0 transition-transform duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-lux-gray dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                                    <UserIcon size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-lux-black dark:text-white">پنل مدیریت</p>
                                    <p className="text-xs text-gray-400">نسخه ۲.۴.۰</p>
                                </div>
                            </div>
                            <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"><X size={18} /></button>
                        </div>
                        <nav className="space-y-2">
                            {[
                                { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
                                { id: 'products', label: 'محصولات', icon: Package },
                                { id: 'orders', label: 'سفارشات', icon: ShoppingBag },
                                { id: 'messages', label: 'پیام‌ها', icon: MessageSquare, badge: stats.messagesCount },
                                { id: 'settings', label: 'تنظیمات سایت', icon: SettingsIcon },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveTab(item.id as any); setMobileSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-lux-black dark:hover:text-white'}`}
                                >
                                    <item.icon size={18} />
                                    <span className="relative z-10">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-full" role="main">
                {/* Mobile header: hamburger to open drawer */}
                <div className="md:hidden flex items-center justify-between mb-4">
                    <button onClick={() => setMobileSidebarOpen(true)} className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800">
                        <Menu size={20} className="text-lux-gold" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="font-bold text-lg text-lux-black dark:text-white">پنل مدیریت</h2>
                    </div>
                    <div className="w-10" />
                </div>
                {activeTab === 'dashboard' && (
                    <div className="animate-in fade-in duration-500 space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-serif font-bold text-lux-black dark:text-white">داشبورد</h1>
                            <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-2">
                                <Calendar size={16} />
                                {new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'کل فروش', value: formatPrice(stats.revenue), icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                { label: 'سفارشات', value: toPersianDigits(stats.ordersCount), icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                { label: 'محصولات', value: toPersianDigits(stats.productsCount), icon: Package, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                { label: 'پیام‌ها', value: toPersianDigits(stats.messagesCount), icon: MessageSquare, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md group-hover:bg-lux-gold group-hover:text-white transition-colors cursor-default">
                                            امروز
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                                        <h3 className="text-2xl font-bold text-lux-black dark:text-white tracking-tight">{stat.value}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Orders Preview could go here */}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 sticky top-0 z-20">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <Package className="text-lux-gold"/> مدیریت محصولات
                            </h1>
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64 group">
                                    <input 
                                        type="text" 
                                        placeholder="جستجو..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:bg-white dark:focus:bg-zinc-900 focus:border-lux-gold dark:focus:border-lux-gold outline-none transition-all"
                                    />
                                    <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-lux-gold transition-colors" size={18} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="appearance-none bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-lux-black dark:text-white pl-9 pr-4 py-2.5 rounded-xl text-sm h-full focus:border-lux-gold outline-none cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <option value="default">مرتب‌سازی</option>
                                        <option value="price-asc">قیمت: کم به زیاد</option>
                                        <option value="price-desc">قیمت: زیاد به کم</option>
                                        <option value="stock-asc">موجودی: کم</option>
                                        <option value="stock-desc">موجودی: زیاد</option>
                                    </select>
                                    <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                                <button 
                                    onClick={() => { setEditingProduct({ images: [] }); setSelectedFile(null); setIsProductModalOpen(true); }}
                                    className="bg-lux-black dark:bg-white text-white dark:text-lux-black px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-lux-black/10 dark:shadow-white/10 hover:translate-y-[-2px] transition-all"
                                >
                                    <Plus size={18} /> <span className="hidden sm:inline">افزودن</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">محصول</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">دسته‌بندی</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">موجودی</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">قیمت</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-left">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm">
                                                            <ImageLoader src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                                        </div>
                                                        <span className="font-bold text-lux-black dark:text-white">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-zinc-700">
                                                        {p.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${!p.stock ? 'bg-red-500' : p.stock < 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                        <span className={`font-mono font-bold ${!p.stock ? 'text-red-600' : 'text-lux-black dark:text-white'}`}>
                                                            {toPersianDigits(p.stock || 0)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-lux-black dark:text-white">{formatPrice(p.price)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => { setEditingProduct(p); setSelectedFile(null); setIsProductModalOpen(true); }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="ویرایش"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages(filteredProducts.length) > 1 && (
                                <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-center items-center gap-4">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 px-4 py-1 rounded-full">
                                        {toPersianDigits(currentPage)} / {toPersianDigits(totalPages(filteredProducts.length))}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages(filteredProducts.length), p + 1))}
                                        disabled={currentPage === totalPages(filteredProducts.length)}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <ShoppingBag className="text-lux-gold"/> مدیریت سفارشات
                            </h1>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
                                <div className="flex-1 w-full relative">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">جستجو</label>
                                    <input 
                                        type="text" 
                                        placeholder="شماره سفارش، نام مشتری..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:bg-white dark:focus:bg-zinc-900 focus:border-lux-gold outline-none transition-colors"
                                    />
                                    <Search className="absolute left-3 top-9 text-gray-400" size={16} />
                                </div>
                                <div className="w-full lg:w-56">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">وضعیت</label>
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:border-lux-gold outline-none cursor-pointer"
                                    >
                                        <option value="all">همه سفارش‌ها</option>
                                        <option value="pending">در انتظار بررسی</option>
                                        <option value="processing">در حال آماده‌سازی</option>
                                        <option value="shipped">ارسال شده</option>
                                        <option value="delivered">تحویل شده</option>
                                        <option value="cancelled">لغو شده</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 w-full lg:w-auto mt-auto">
                                    <button 
                                        onClick={clearOrderFilters}
                                        className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 text-sm font-bold flex items-center gap-2 transition-colors h-[42px]"
                                    >
                                        <Filter size={16} />
                                        <span className="hidden sm:inline">فیلترها</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                    <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">هیچ سفارشی یافت نشد.</p>
                                </div>
                            ) : (
                                paginatedOrders.map(order => (
                                    <div key={order.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-lux-gold/30 transition-all group">
                                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-lux-black dark:text-white font-bold text-lg">
                                                    {getCustomerDetails(order.userId)?.name?.charAt(0).toUpperCase() || <UserIcon size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-bold text-lg text-lux-black dark:text-white">{getCustomerDetails(order.userId)?.name || 'ناشناس'}</h3>
                                                        <span className="font-mono text-xs text-gray-400">#{order.id.slice(-6)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700"></span>
                                                        <span className="font-bold text-lux-gold">{formatPrice(order.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-4">
                                            <div className="flex gap-2 overflow-x-auto pb-2 hide-scroll">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="shrink-0 flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 pr-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                                        <div className="w-10 h-10 rounded bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                                            <ImageLoader src={item.image} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="text-xs">
                                                            <div className="font-bold text-lux-black dark:text-white truncate max-w-[100px]">{item.name}</div>
                                                            <div className="text-gray-500">×{toPersianDigits(item.qty)}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {order.items.length > 3 && (
                                                    <div className="shrink-0 w-12 flex items-center justify-center text-xs font-bold text-gray-400 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800">
                                                        +{toPersianDigits(order.items.length - 3)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2 overflow-x-auto hide-scroll">
                                                {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as Order['status'][]).map(s => (
                                                    <button 
                                                        key={s}
                                                        onClick={() => handleUpdateOrderStatus(order.id, s)}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                                                            order.status === s 
                                                            ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black border-lux-black dark:border-white scale-110' 
                                                            : 'border-gray-200 dark:border-zinc-700 text-gray-400 hover:border-gray-400 dark:hover:border-zinc-500'
                                                        }`}
                                                        title={statusConfig[s].label}
                                                    >
                                                        {React.createElement(statusConfig[s].icon, { size: 14 })}
                                                    </button>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => setViewingOrder(order)}
                                                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-lux-gold text-lux-black dark:text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                                            >
                                                <Eye size={16} /> جزئیات کامل
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <MessageSquare className="text-lux-gold"/> پیام‌های دریافتی
                            </h1>
                        </div>
                        <div className="space-y-4">
                            {paginatedMessages.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">صندوق پیام خالی است.</p>
                                </div>
                            ) : (
                                paginatedMessages.map(msg => (
                                    <div key={msg.id} className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border transition-all ${!msg.read ? 'border-l-4 border-l-lux-gold border-y-gray-100 dark:border-y-zinc-800 border-r-gray-100 dark:border-r-zinc-800' : 'border-gray-100 dark:border-zinc-800 opacity-80 hover:opacity-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                    {msg.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lux-black dark:text-white">{msg.name}</h3>
                                                    <p className="text-xs text-gray-500">{msg.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString('fa-IR')}</span>
                                                {!msg.read && (
                                                    <button onClick={() => handleMarkAsRead(msg.id)} className="text-lux-gold hover:underline text-xs font-bold">
                                                        نشان کردن به عنوان خوانده شده
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                            {msg.message}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <SettingsIcon className="text-lux-gold"/> تنظیمات عمومی
                            </h1>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <form onSubmit={handleSaveSettings} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-lux-black dark:text-white">عنوان صفحه "درباره ما"</label>
                                        <input
                                            type="text"
                                            value={settingsForm.aboutTitle}
                                            onChange={e => setSettingsForm({ ...settingsForm, aboutTitle: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-lux-black dark:text-white focus:border-lux-gold outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-lux-black dark:text-white">متن "درباره ما"</label>
                                        <textarea
                                            rows={5}
                                            value={settingsForm.aboutDescription}
                                            onChange={e => setSettingsForm({ ...settingsForm, aboutDescription: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-lux-black dark:text-white focus:border-lux-gold outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-lg text-lux-black dark:text-white">تصاویر سایت</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        {([
                                            { key: 'aboutImage', label: 'عکس صفحه درباره ما' },
                                            { key: 'heroImage', label: 'بنر اصلی صفحه نخست' },
                                            { key: 'suitsSectionImage', label: 'بنر بخش کت و شلوار' },
                                            { key: 'shirtsSectionImage', label: 'بنر بخش پیراهن' },
                                            { key: 'blazersSectionImage', label: 'بنر بخش کت تک' },
                                            { key: 'accessoriesSectionImage', label: 'بنر بخش اکسسوری' },
                                            { key: 'bespokeSectionImage', label: 'بنر بخش دوخت سفارشی' }
                                        ] as const).map(field => (
                                            <div key={field.key} className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                                    <div className="w-full sm:w-32 h-20 bg-gray-200 dark:bg-zinc-700 rounded-lg overflow-hidden shrink-0 shadow-inner">
                                                        {settingsForm[field.key] ? (
                                                            <ImageLoader src={settingsForm[field.key] as string} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={20}/></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 w-full">
                                                        <label className="text-sm font-bold text-lux-black dark:text-white mb-2 block">{field.label}</label>
                                                        <div className="flex gap-2">
                                                            <label className="flex-1 cursor-pointer">
                                                                <span className="flex items-center justify-center gap-2 w-full p-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                                                                    <Upload size={16}/> آپلود تصویر جدید
                                                                </span>
                                                                <input type="file" accept="image/*" className="hidden" onChange={handleSettingsFileUpload(field.key)} />
                                                            </label>
                                                            {settingsForm[field.key] && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newFiles = { ...settingsFiles };
                                                                        delete newFiles[field.key];
                                                                        setSettingsFiles(newFiles);
                                                                        setSettingsForm({ ...settingsForm, [field.key]: '' });
                                                                    }}
                                                                    className="p-2.5 text-rose-500 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end sticky bottom-0 bg-white dark:bg-zinc-900 py-4 border-t border-gray-100 dark:border-zinc-800 mt-8">
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-lux-gold text-white font-bold rounded-xl hover:bg-lux-gold-dark shadow-lg shadow-lux-gold/20 hover:shadow-xl hover:shadow-lux-gold/30 transition-all flex items-center gap-2"
                                    >
                                        <Save size={20} /> ذخیره تغییرات
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                
                {/* Product Modal */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                            <div className="p-5 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900">
                                <h3 className="font-bold text-xl text-lux-black dark:text-white flex items-center gap-2">
                                    {editingProduct.id ? <Edit2 size={20} className="text-lux-gold"/> : <Plus size={20} className="text-lux-gold"/>}
                                    {editingProduct.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}
                                </h3>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">نام محصول</label>
                                        <input 
                                            type="text" 
                                            value={editingProduct.name || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors"
                                            placeholder="نام کامل محصول..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">قیمت (تومان)</label>
                                        <input 
                                            type="number" 
                                            value={editingProduct.price || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">موجودی انبار</label>
                                        <input 
                                            type="number" 
                                            value={editingProduct.stock || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">دسته‌بندی</label>
                                        <select 
                                            value={editingProduct.category || 'suits'} 
                                            onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors cursor-pointer"
                                        >
                                            <option value="suits">کت و شلوار</option>
                                            <option value="shirts">پیراهن</option>
                                            <option value="blazers">بلیزر</option>
                                            <option value="accessories">اکسسوری</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">گالری تصاویر</label>
                                        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 border-dashed border-2">
                                            <div className="flex flex-wrap gap-4 mb-4">
                                                {(editingProduct.images || []).map((img, idx) => (
                                                    <div key={idx} className="relative w-20 h-20 group">
                                                        <img src={img} alt="" className="w-full h-full object-cover rounded-lg shadow-sm" />
                                                        <button 
                                                            onClick={() => handleRemoveImage(idx)}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-600 flex flex-col items-center justify-center text-gray-400 hover:text-lux-gold hover:border-lux-gold transition-colors cursor-pointer bg-white dark:bg-zinc-900">
                                                    <Upload size={20} />
                                                    <span className="text-[10px] mt-1">آپلود</span>
                                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={newImageUrl} 
                                                    onChange={e => setNewImageUrl(e.target.value)}
                                                    className="flex-1 p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 outline-none dir-ltr text-left"
                                                    placeholder="یا لینک تصویر را وارد کنید..."
                                                />
                                                <button onClick={handleAddImageUrl} type="button" className="bg-lux-black dark:bg-white text-white dark:text-lux-black p-2 rounded-lg hover:opacity-90">
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">توضیح کوتاه (زیر عنوان)</label>
                                        <input 
                                            type="text" 
                                            value={editingProduct.short || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, short: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">توضیحات کامل</label>
                                        <textarea 
                                            rows={4}
                                            value={editingProduct.description || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-lux-gold outline-none dark:text-white transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-900">
                                <button 
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl font-bold transition-colors"
                                >
                                    انصراف
                                </button>
                                <button 
                                    onClick={handleSaveProduct}
                                    className="px-8 py-2.5 bg-lux-gold text-white rounded-xl hover:bg-lux-gold-dark font-bold shadow-lg shadow-lux-gold/20 flex items-center gap-2 transition-all"
                                >
                                    <Save size={18} /> ذخیره تغییرات
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Delete Modal - No major visual changes needed besides button styles which are already standardized somewhat */}
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-in zoom-in duration-200 border border-gray-100 dark:border-zinc-800">
                            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 ring-8 ring-rose-50 dark:ring-rose-900/10">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="font-bold text-2xl text-lux-black dark:text-white mb-3">حذف محصول</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
                                آیا از حذف این محصول اطمینان دارید؟<br/>این عملیات غیرقابل بازگشت است و تمام اطلاعات مرتبط حذف خواهد شد.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button 
                                    onClick={() => setDeleteConfirmation({ isOpen: false, productId: null })}
                                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 font-bold transition-colors"
                                >
                                    انصراف
                                </button>
                                <button 
                                    onClick={confirmDeleteProduct}
                                    className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-bold shadow-lg shadow-rose-500/30 transition-all"
                                >
                                    بله، حذف شود
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Order Modal - Enhanced */}
                {viewingOrder && (
                    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:absolute print:inset-0 print:p-0">
                         <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:max-w-none print:h-auto print:dark:bg-white print:rounded-none animate-in slide-in-from-bottom-10 duration-300">
                            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center print:hidden bg-gray-50 dark:bg-zinc-900">
                                <h3 className="font-bold text-xl text-lux-black dark:text-white flex items-center gap-2">
                                    <ShoppingBag className="text-lux-gold"/> جزئیات سفارش <span className="font-mono text-gray-400">#{viewingOrder.id.slice(-6)}</span>
                                </h3>
                                <div className="flex gap-3">
                                    <button onClick={handlePrintOrder} className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md rounded-xl transition-all" title="چاپ">
                                        <Printer size={20} />
                                    </button>
                                    <button onClick={() => setViewingOrder(null)} className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md rounded-xl transition-all" aria-label="بستن">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-8 overflow-y-auto print:overflow-visible text-lux-black dark:text-white print:text-black">
                                {/* Print Header */}
                                <div className="hidden print:flex justify-between items-end mb-8 border-b-2 border-black pb-4">
                                    <div>
                                        <h1 className="text-4xl font-serif font-bold mb-2">REZA Formal</h1>
                                        <p className="text-sm text-gray-600">خیابان میرداماد، مرکز خرید آریان</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-bold mb-1">فاکتور فروش</h2>
                                        <p className="text-sm font-mono">#{viewingOrder.id}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('fa-IR')}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-2">
                                    {/* Customer Card */}
                                    <div className="md:col-span-2 bg-gray-50 dark:bg-zinc-800/30 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 print:bg-transparent print:border print:border-black">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <UserIcon size={14}/> اطلاعات مشتری
                                        </h4>
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-700 flex items-center justify-center text-2xl font-bold shadow-sm print:hidden">
                                                {getCustomerDetails(viewingOrder.userId)?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-lg">{getCustomerDetails(viewingOrder.userId)?.name || 'ناشناس'}</span>
                                                    <span dir="ltr" className="font-mono text-gray-600 dark:text-gray-400">{getCustomerDetails(viewingOrder.userId)?.phone}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-light leading-relaxed">
                                                    {viewingOrder.shippingAddress}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Meta */}
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 print:border-black">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">وضعیت سفارش</span>
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(viewingOrder.status)}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 print:border-black">
                                            <span className="text-xs font-bold text-gray-400 block mb-1">تاریخ ثبت</span>
                                            <span className="font-bold text-lg">{new Date(viewingOrder.createdAt).toLocaleDateString('fa-IR')}</span>
                                            <span className="text-xs text-gray-400 mr-2">{new Date(viewingOrder.createdAt).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden print:border-black">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-zinc-800 print:bg-gray-200">
                                            <tr>
                                                <th className="px-6 py-4 text-right font-bold text-gray-600 dark:text-gray-300">شرح محصول</th>
                                                <th className="px-6 py-4 text-center font-bold text-gray-600 dark:text-gray-300 w-24">تعداد</th>
                                                <th className="px-6 py-4 text-left font-bold text-gray-600 dark:text-gray-300 w-40">قیمت واحد</th>
                                                <th className="px-6 py-4 text-left font-bold text-gray-600 dark:text-gray-300 w-40">قیمت کل</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 print:divide-black">
                                            {viewingOrder.items.map((item, idx) => (
                                                <tr key={idx} className="bg-white dark:bg-zinc-900">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-lux-black dark:text-white">{item.name}</div>
                                                        <div className="text-xs text-gray-500">{item.short}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-mono">{toPersianDigits(item.qty)}</td>
                                                    <td className="px-6 py-4 text-left text-gray-600 dark:text-gray-400">{formatPrice(item.price)}</td>
                                                    <td className="px-6 py-4 text-left font-bold text-lux-black dark:text-white">{formatPrice(item.price * item.qty)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-zinc-800 print:bg-gray-100">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-5 text-left font-bold text-lg text-gray-600 dark:text-gray-300">مبلغ قابل پرداخت:</td>
                                                <td className="px-6 py-5 text-left font-bold text-2xl text-lux-gold">{formatPrice(viewingOrder.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-800 hidden print:block text-center text-xs text-gray-500">
                                    <p className="font-bold mb-1">از خرید شما سپاسگزاریم.</p>
                                    <p>جهت پیگیری سفارش با شماره ۰۲۱۲۲۹۰۲۹۰۸ تماس بگیرید.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPanel;