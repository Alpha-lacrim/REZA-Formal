import React, { useState, useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import { db } from '../services/db';
import { Product, Order, ContactMessage, SiteSettings, User } from '../types';
import { toPersianDigits, formatPrice } from '../utils';
import { LayoutDashboard, Package, ShoppingBag, Plus, Trash2, Edit2, X, Check, Save, Search, ChevronLeft, ChevronRight, AlertCircle, MessageSquare, Settings as SettingsIcon, Upload, ArrowUpDown, Eye, Printer, Calendar, User as UserIcon, Phone, Filter, Mail, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 8;

const AdminPanel: React.FC = () => {
    const { user, products, refreshProducts, showToast, siteSettings, updateSiteSettings } = useGlobal();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'messages' | 'settings'>('dashboard');
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
            setStats({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 });
        }
        if (activeTab === 'orders') {
            try {
                const o = await api.adminGetOrders();
                const u = await api.adminGetUsers();
                setOrders(o);
                setUsers(u);
            } catch (e) {
                setOrders([]);
                setUsers([]);
            }
        } else if (activeTab === 'messages') {
            try {
                const m = await api.adminGetMessages();
                setMessages(m);
            } catch (e) {
                setMessages([]);
            }
        }
    };

    // ------------------------------------------------------------------
    // FIXED: Simplified Save Logic
    // ------------------------------------------------------------------
        const handleSaveProduct = async () => {
            if (!editingProduct.name || !editingProduct.price) {
                showToast('لطفا نام و قیمت را وارد کنید');
                return;
            }

            console.log("Saving product...", "File:", selectedFile); // Debug log

            // 1. Create FormData manually
            const formData = new FormData();
            
            // Add ID if editing
            if (editingProduct.id) {
                formData.append('id', editingProduct.id);
            }

            // Add normal text fields
            formData.append('name', editingProduct.name);
            formData.append('price', String(editingProduct.price));
            formData.append('category', editingProduct.category || 'accessories');
            formData.append('description', editingProduct.description || '');
            formData.append('currency', 'Toman');
            formData.append('short', editingProduct.short || '');
            formData.append('fabric', editingProduct.fabric || '');
            formData.append('stock', String(editingProduct.stock || 0));

            // Add images array (as JSON string)
            if (editingProduct.images && editingProduct.images.length > 0) {
                formData.append('images', JSON.stringify(editingProduct.images));
            }

            // 2. CRITICAL: Append the File object explicitly
            // This ensures it is sent as binary data, not a string
            if (selectedFile) {
                formData.append('image', selectedFile); 
            }

            try {
                // 3. Pass formData to API. 
                // api.ts checks "if (product instanceof FormData)" and will skip its own conversion.
                await api.adminSaveProduct(formData);
                
                await refreshProducts();
                setIsProductModalOpen(false);
                setEditingProduct({});
                setSelectedFile(null);
                setNewImageUrl('');
                showToast('محصول با موفقیت ذخیره شد');
            } catch (e: any) {
                console.error('Save failed:', e);
                if (e && e.data) {
                    // Log the actual server error to console
                    console.log("Server Error Data:", e.data);
                    try {
                        const msg = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
                        showToast(`خطا از سرور: ${msg}`);
                    } catch {
                        showToast('خطا در ذخیره محصول در سرور');
                    }
                } else {
                    showToast('خطا در ارتباط با سرور');
                }
            }
        };
    // ------------------------------------------------------------------
    // FIXED: File Upload Logic
    // ------------------------------------------------------------------
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // 1. Save the raw file to state (so we can send it to Django later)
            const mainFile = files[0];
            setSelectedFile(mainFile);

            // 2. Create a preview for the UI
            Array.from(files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setEditingProduct(prev => ({
                        ...prev,
                        // Update the preview list
                        images: [...(prev.images || []), result],
                        // Update the main image preview
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
                showToast('خطا در حذف محصول');
            }
            setDeleteConfirmation({ isOpen: false, productId: null });
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
        await api.adminUpdateOrderStatus(orderId, status);
        const updatedOrders = await api.adminGetOrders();
        setOrders(updatedOrders);
        if (viewingOrder && viewingOrder.id === orderId) {
            setViewingOrder(updatedOrders.find(o => o.id === orderId) || null);
        }
        showToast('وضعیت سفارش بروز شد');
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Map frontend camelCase keys to backend snake_case field names
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
                // Send JSON with backend field names
                const payload: any = {};
                Object.entries(settingsForm).forEach(([k, v]) => {
                    const key = fieldMap[k] || k;
                    payload[key] = v;
                });
                await updateSiteSettings(payload as any);
            }
            showToast('تنظیمات ذخیره شد');
        } catch (err) {
            showToast('خطا در ذخیره تنظیمات');
        }
    };

    const handleMarkAsRead = async (id: string) => {
        await api.adminMarkMessageRead(id);
        const updatedMessages = await api.adminGetMessages();
        setMessages(updatedMessages);
        const s = await api.adminGetStats();
        setStats(s);
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
            // store raw File for upload
            setSettingsFiles(prev => ({ ...prev, [field]: file }));
            // preview for UI
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

    const renderImageSetting = (label: string, field: keyof SiteSettings) => (
        <div className="mb-6 border-b border-gray-100 dark:border-zinc-700 pb-6 last:border-0">
            <label className="block text-sm font-bold mb-2 text-lux-black dark:text-gray-300">{label}</label>
            <div className="flex gap-4 items-start flex-col sm:flex-row">
                <div className="w-full sm:w-24 h-40 sm:h-24 shrink-0 bg-gray-100 dark:bg-zinc-700 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-600">
                     <ImageLoader src={settingsForm[field] as string} alt={label} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-2 w-full">
                    <input 
                        type="text" 
                        value={settingsForm[field] as string}
                        onChange={e => setSettingsForm({...settingsForm, [field]: e.target.value})}
                        className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dir-ltr text-left text-sm"
                        placeholder="https://..."
                    />
                    <div className="flex items-center gap-2">
                         <label className="bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 px-3 py-1.5 rounded cursor-pointer text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 transition-colors">
                            <Upload size={14} />
                            <span>آپلود تصویر</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleSettingsFileUpload(field)} />
                        </label>
                        <span className="text-[10px] text-gray-400">حداکثر حجم پیشنهادی: ۱ مگابایت</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Filter Logic
    let filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.includes(searchTerm)
    );

    // Sort Logic
    if (sortBy === 'price-asc') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'stock-asc') {
        filteredProducts.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    } else if (sortBy === 'stock-desc') {
        filteredProducts.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else if (sortBy === 'name-asc') {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    }

    const filteredOrders = orders.filter(o => {
        const customer = getCustomerDetails(o.userId);
        const customerName = customer ? customer.name.toLowerCase() : '';
        const searchLower = searchTerm.toLowerCase();
        
        const matchesSearch = 
            o.id.toLowerCase().includes(searchLower) || 
            o.shippingAddress.toLowerCase().includes(searchLower) ||
            customerName.includes(searchLower);
        if (!matchesSearch) return false;

        if (filterStatus !== 'all' && o.status !== filterStatus) return false;

        const d = new Date(o.createdAt);
        const orderDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        if (filterDateStart && orderDate < filterDateStart) return false;
        if (filterDateEnd && orderDate > filterDateEnd) return false;

        return true;
    });

    const filteredMessages = messages.filter(m => 
        m.name.includes(searchTerm) || 
        m.email.includes(searchTerm) ||
        m.message.includes(searchTerm)
    );

    const paginationStart = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProducts = filteredProducts.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);
    const paginatedMessages = filteredMessages.slice(paginationStart, paginationStart + ITEMS_PER_PAGE);

    const totalPages = (total: number) => Math.ceil(total / ITEMS_PER_PAGE);

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
            <aside className="w-full md:w-64 bg-white dark:bg-zinc-800 border-b md:border-b-0 md:border-l border-gray-200 dark:border-zinc-700 p-4 shrink-0 print:hidden" role="navigation" aria-label="منوی مدیریت">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 rounded-full bg-lux-gold flex items-center justify-center text-white font-bold text-xl" aria-hidden="true">A</div>
                    <div>
                        <h2 className="font-bold text-lux-black dark:text-white">پنل مدیریت</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">خوش آمدید، مدیر</p>
                    </div>
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
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-lux-gold focus:outline-none ${activeTab === item.id ? 'bg-lux-gold text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                            aria-current={activeTab === item.id ? 'page' : undefined}
                        >
                            <item.icon size={20} />
                            {item.label}
                            {item.badge ? (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full mr-auto">
                                    {toPersianDigits(item.badge)}
                                </span>
                            ) : null}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto" role="main">
                {activeTab === 'dashboard' && (
                    <div className="animate-in fade-in duration-500">
                        <h1 className="text-2xl font-bold mb-6 text-lux-black dark:text-white">آمار کلی فروشگاه</h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'کل فروش', value: formatPrice(stats.revenue), bg: 'bg-green-500' },
                                { label: 'تعداد سفارشات', value: toPersianDigits(stats.ordersCount), bg: 'bg-blue-500' },
                                { label: 'تعداد محصولات', value: toPersianDigits(stats.productsCount), bg: 'bg-indigo-500' },
                                { label: 'پیام‌های خوانده نشده', value: toPersianDigits(stats.messagesCount), bg: 'bg-pink-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                                        <p className="text-2xl font-bold text-lux-black dark:text-white">{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-lg ${stat.bg} opacity-20`} aria-hidden="true"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <h1 className="text-2xl font-bold text-lux-black dark:text-white">مدیریت محصولات</h1>
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="جستجو در محصولات..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm focus:border-lux-gold outline-none"
                                    />
                                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="appearance-none bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 text-lux-black dark:text-white pl-10 pr-8 py-2 rounded-lg text-sm h-full focus:border-lux-gold outline-none cursor-pointer"
                                    >
                                        <option value="default">پیش‌فرض</option>
                                        <option value="price-asc">قیمت: کم به زیاد</option>
                                        <option value="price-desc">قیمت: زیاد به کم</option>
                                        <option value="stock-asc">موجودی: کم به زیاد</option>
                                        <option value="stock-desc">موجودی: زیاد به کم</option>
                                        <option value="name-asc">نام: الف تا ی</option>
                                    </select>
                                    <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                                <button 
                                    onClick={() => { setEditingProduct({ images: [] }); setSelectedFile(null); setIsProductModalOpen(true); }}
                                    className="bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold whitespace-nowrap focus:ring-2 focus:ring-offset-2 focus:ring-lux-gold"
                                >
                                    <Plus size={16} /> <span className="hidden sm:inline">افزودن محصول</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-lux-gray dark:bg-zinc-700/50 text-gray-500 dark:text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-4">تصویر</th>
                                            <th scope="col" className="px-6 py-4">نام محصول</th>
                                            <th scope="col" className="px-6 py-4">دسته‌بندی</th>
                                            <th scope="col" className="px-6 py-4">موجودی</th>
                                            <th scope="col" className="px-6 py-4">قیمت</th>
                                            <th scope="col" className="px-6 py-4 text-left">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                        {paginatedProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-lux-gray dark:hover:bg-zinc-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="w-10 h-10 rounded overflow-hidden bg-gray-100">
                                                        <ImageLoader src={p.image} alt="" className="w-10 h-10" loading="lazy" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-lux-black dark:text-white">{p.name}</td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{p.category}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${!p.stock ? 'bg-red-100 text-red-700' : p.stock < 5 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                        {toPersianDigits(p.stock || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-lux-gold">{formatPrice(p.price)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => { setEditingProduct(p); setSelectedFile(null); setIsProductModalOpen(true); }}
                                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
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
                            
                            {/* Pagination Controls */}
                            {totalPages(filteredProducts.length) > 1 && (
                                <div className="p-4 border-t border-gray-100 dark:border-zinc-700 flex justify-center items-center gap-4">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages(filteredProducts.length))}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages(filteredProducts.length), p + 1))}
                                        disabled={currentPage === totalPages(filteredProducts.length)}
                                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Orders, Messages, Settings tabs follow same pattern... */}
                {activeTab === 'orders' && (
                    <div className="animate-in fade-in duration-500">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <h1 className="text-2xl font-bold text-lux-black dark:text-white">مدیریت سفارشات</h1>
                        </div>
                        {/* Order Filters */}
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 mb-6 shadow-sm">
                            <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
                                <div className="flex-1 w-full relative">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">جستجو</label>
                                    <input 
                                        type="text" 
                                        placeholder="نام مشتری، کد سفارش، آدرس..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-sm focus:border-lux-gold outline-none"
                                    />
                                    <Search className="absolute left-3 top-8 text-gray-400" size={16} />
                                </div>
                                <div className="w-full lg:w-48">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">وضعیت سفارش</label>
                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-900 text-sm focus:border-lux-gold outline-none"
                                    >
                                        <option value="all">همه وضعیت‌ها</option>
                                        {Object.entries(statusLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 w-full lg:w-auto">
                                    <button 
                                        onClick={clearOrderFilters}
                                        className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 text-sm font-bold flex items-center gap-2 h-[38px] mt-auto"
                                    >
                                        <Filter size={16} />
                                        <span>پاک کردن</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">سفارشی یافت نشد.</div>
                            ) : (
                                paginatedOrders.map(order => (
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
                                                    {order.items.slice(0, 3).map((item, idx) => (
                                                        <li key={idx} className="flex justify-between">
                                                            <span>{toPersianDigits(item.qty)} × {item.name}</span>
                                                            <span>{formatPrice(item.price * item.qty)}</span>
                                                        </li>
                                                    ))}
                                                    {order.items.length > 3 && (
                                                        <li className="text-xs text-gray-400">و {toPersianDigits(order.items.length - 3)} محصول دیگر...</li>
                                                    )}
                                                </ul>
                                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-700 font-bold text-lux-gold">
                                                    مجموع: {formatPrice(order.total)}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-500 mb-2">اطلاعات خریدار:</h4>
                                                <div className="mb-2 text-sm">
                                                    <div className="font-bold text-lux-black dark:text-white mb-1">{getCustomerDetails(order.userId)?.name || 'ناشناس'}</div>
                                                    <p className="text-gray-500 dark:text-gray-400 line-clamp-2 text-xs bg-gray-50 dark:bg-zinc-900 p-2 rounded">{order.shippingAddress}</p>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
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
                                                    <button 
                                                        onClick={() => setViewingOrder(order)}
                                                        className="px-4 py-1 bg-lux-black dark:bg-white text-white dark:text-lux-black text-xs font-bold rounded flex items-center gap-1 hover:opacity-90"
                                                    >
                                                        <Eye size={14} /> مشاهده جزئیات
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                
                {/* Product Modal */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-lux-black dark:text-white">{editingProduct.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h3>
                                <button onClick={() => setIsProductModalOpen(false)} aria-label="بستن"><X className="text-lux-black dark:text-white" /></button>
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
                                        <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">موجودی انبار</label>
                                        <input 
                                            type="number" 
                                            value={editingProduct.stock || ''} 
                                            onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
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
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold mb-1 text-lux-black dark:text-gray-300">تصاویر محصول</label>
                                        
                                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                                            {(editingProduct.images || []).map((img, idx) => (
                                                <div key={idx} className="relative w-16 h-16 shrink-0 group">
                                                    <img src={img} alt="" className="w-full h-full object-cover rounded border border-gray-300 dark:border-zinc-600" />
                                                    <button 
                                                        onClick={() => handleRemoveImage(idx)}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                 <input 
                                                    type="text" 
                                                    value={newImageUrl} 
                                                    onChange={e => setNewImageUrl(e.target.value)}
                                                    className="w-full p-2 border border-gray-300 bg-white text-lux-black rounded focus:border-lux-gold outline-none dark:bg-zinc-700 dark:border-zinc-600 dark:text-white dir-ltr text-left text-sm"
                                                    placeholder="URL تصویر را وارد کنید..."
                                                />
                                            </div>
                                            <button 
                                                onClick={handleAddImageUrl}
                                                type="button"
                                                className="bg-gray-100 dark:bg-zinc-700 px-3 py-2 rounded border border-gray-300 dark:border-zinc-600 hover:bg-gray-200"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <label className="bg-lux-gold text-white px-3 py-2 rounded cursor-pointer hover:bg-lux-gold-dark flex items-center justify-center">
                                                <Upload size={16} />
                                                <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                                            </label>
                                        </div>
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
                
                {/* Delete Confirmation Modal */}
                {deleteConfirmation.isOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in duration-200">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            <h3 className="font-bold text-xl text-lux-black dark:text-white mb-2">حذف محصول</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
                                آیا از حذف این محصول اطمینان دارید؟<br/>این عملیات غیرقابل بازگشت است.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button 
                                    onClick={() => setDeleteConfirmation({ isOpen: false, productId: null })}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 font-bold text-sm"
                                >
                                    انصراف
                                </button>
                                <button 
                                    onClick={confirmDeleteProduct}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold text-sm shadow-lg shadow-red-500/20"
                                >
                                    حذف محصول
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Order Modal */}
                {viewingOrder && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:absolute print:inset-0 print:p-0">
                         <div className="bg-white dark:bg-zinc-800 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:shadow-none print:max-w-none print:h-auto print:dark:bg-white print:rounded-none">
                            <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center print:hidden">
                                <h3 className="font-bold text-lg text-lux-black dark:text-white">جزئیات سفارش #{viewingOrder.id}</h3>
                                <div className="flex gap-2">
                                    <button onClick={handlePrintOrder} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded" title="چاپ">
                                        <Printer size={20} />
                                    </button>
                                    <button onClick={() => setViewingOrder(null)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded" aria-label="بستن">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-8 overflow-y-auto print:overflow-visible text-lux-black dark:text-white print:text-black">
                                <div className="hidden print:flex justify-between items-center mb-8 border-b pb-4">
                                    <h1 className="text-3xl font-bold">REZA Formal</h1>
                                    <div className="text-right">
                                        <p className="text-sm">فاکتور فروش</p>
                                        <p className="text-xs text-gray-500">تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
                                    </div>
                                </div>
                                {(() => {
                                    const customer = getCustomerDetails(viewingOrder.userId);
                                    return (
                                        <div className="bg-gray-50 dark:bg-zinc-700/30 p-4 rounded-xl mb-8 border border-gray-100 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4 print:border-none print:p-0 print:mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-full bg-lux-gold text-white flex items-center justify-center text-2xl font-bold shadow-sm print:hidden">
                                                    {customer?.name ? customer.name.charAt(0).toUpperCase() : <UserIcon size={32} />}
                                                </div>
                                                <div className="text-center sm:text-right">
                                                    <h2 className="text-2xl font-bold text-lux-black dark:text-white mb-1">{customer?.name || 'کاربر ناشناس'}</h2>
                                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-base text-gray-600 dark:text-gray-300">
                                                        <Phone size={16} className="text-lux-gold" />
                                                        <span dir="ltr" className="font-mono font-bold">{customer?.phone || 'شماره تماس ثبت نشده'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {customer?.email && (
                                                <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-600 print:hidden">
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div>
                                        <h4 className="text-lux-gold font-bold mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                                            <Calendar size={14} /> اطلاعات سفارش
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">شماره سفارش:</span>
                                                <span className="font-mono font-bold">{viewingOrder.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">تاریخ ثبت:</span>
                                                <span>{new Date(viewingOrder.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">وضعیت:</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[viewingOrder.status]}`}>{statusLabels[viewingOrder.status]}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-lux-gold font-bold mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                                            <UserIcon size={14} /> اطلاعات مشتری
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">نام مشتری:</span>
                                                <span className="font-bold">
                                                    {getCustomerDetails(viewingOrder.userId)?.name || 'نامشخص'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">شماره تماس:</span>
                                                <span dir="ltr">{getCustomerDetails(viewingOrder.userId)?.phone || '---'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400 block mb-1">آدرس ارسال:</span>
                                                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-700 p-2 rounded text-xs leading-relaxed">
                                                    {viewingOrder.shippingAddress}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lux-gold font-bold mb-4 uppercase text-xs tracking-wider flex items-center gap-2">
                                        <ShoppingBag size={14} /> اقلام سفارش
                                    </h4>
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-zinc-700 border-b border-gray-200 dark:border-zinc-600">
                                            <tr>
                                                <th className="px-4 py-3 text-right">محصول</th>
                                                <th className="px-4 py-3 text-center">تعداد</th>
                                                <th className="px-4 py-3 text-left">قیمت واحد</th>
                                                <th className="px-4 py-3 text-left">قیمت کل</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                            {viewingOrder.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold">{item.name}</div>
                                                        <div className="text-xs text-gray-500">{item.short}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{toPersianDigits(item.qty)}</td>
                                                    <td className="px-4 py-3 text-left">{formatPrice(item.price)}</td>
                                                    <td className="px-4 py-3 text-left font-bold">{formatPrice(item.price * item.qty)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t-2 border-gray-200 dark:border-zinc-600">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-4 text-left font-bold text-lg">مبلغ کل قابل پرداخت:</td>
                                                <td className="px-4 py-4 text-left font-bold text-xl text-lux-gold">{formatPrice(viewingOrder.total)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-700 hidden print:block text-center text-xs text-gray-500">
                                    <p>از خرید شما سپاسگزاریم.</p>
                                    <p>REZA Formal - تهران، خیابان میرداماد، مرکز خرید آریان</p>
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
