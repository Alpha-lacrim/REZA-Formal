import React, { useState, useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import {
    AdminCapabilities, BespokeRequest, ContactMessage, CouponSummary, Order, Payment,
    Product, ProductReview, ProductVariant, ReturnRequest, ShippingMethod, SiteSettings, User,
} from '../types';
import { toPersianDigits, formatPrice } from '../utils';
import { 
    LayoutDashboard, Package, ShoppingBag, Plus, Trash2, Edit2, X, Save, 
    Search, ChevronLeft, ChevronRight, AlertCircle, MessageSquare, 
    Settings as SettingsIcon, Upload, ArrowUpDown, Eye, Printer, 
    Calendar, User as UserIcon, Phone, Filter, TrendingUp, DollarSign, 
    Users, Activity, CheckCircle2, Clock, Ban, Menu, Tags, Truck, CreditCard,
    Star, RotateCcw, Scissors, ShieldCheck, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const ITEMS_PER_PAGE = 8;
type AdminTab = 'dashboard' | 'products' | 'orders' | 'commerce' | 'messages' | 'settings';
type CommerceSection = 'capabilities' | 'coupons' | 'shipping' | 'payments' | 'reviews' | 'returns' | 'bespoke';

const AdminPanel: React.FC = () => {
    const { user, products, refreshProducts, showToast, siteSettings, updateSiteSettings, theme } = useGlobal();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [stats, setStats] = useState({ productsCount: 0, ordersCount: 0, usersCount: 0, revenue: 0, messagesCount: 0 });
    const [orders, setOrders] = useState<Order[]>([]);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [commerceSection, setCommerceSection] = useState<CommerceSection>('capabilities');
    const [commerceLoading, setCommerceLoading] = useState(false);
    const [commerceError, setCommerceError] = useState('');
    const [capabilities, setCapabilities] = useState<AdminCapabilities | null>(null);
    const [coupons, setCoupons] = useState<CouponSummary[]>([]);
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [bespokeRequests, setBespokeRequests] = useState<BespokeRequest[]>([]);
    const [couponForm, setCouponForm] = useState<Partial<CouponSummary>>({ code: '', type: 'percent', value: 0, active: true });
    const [shippingForm, setShippingForm] = useState<Partial<ShippingMethod>>({ name: '', price: 0, currency: 'Toman', active: true });
    const [commerceAction, setCommerceAction] = useState<string | null>(null);

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
    const [clearedSettingsImages, setClearedSettingsImages] = useState<Set<keyof SiteSettings>>(new Set());

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
            showToast('خطا در دریافت آمار مدیریت');
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
                showToast('خطا در دریافت سفارش‌ها');
            }
        } else if (activeTab === 'messages') {
            try {
                const m = await api.adminGetMessages();
                setMessages(m);
            } catch (e) {
                setMessages([]);
                showToast('خطا در دریافت پیام‌ها');
            }
        }
        if (activeTab === 'commerce') await loadCommerceData();
    };

    const loadCommerceData = async () => {
        setCommerceLoading(true);
        setCommerceError('');
        const requests = await Promise.allSettled([
            api.adminGetCapabilities(), api.adminGetCoupons(), api.adminGetShippingMethods(),
            api.adminGetPayments(), api.adminGetReviews(), api.adminGetReturns(), api.adminGetBespokeRequests(),
        ]);
        if (requests[0].status === 'fulfilled') setCapabilities(requests[0].value);
        if (requests[1].status === 'fulfilled') setCoupons(requests[1].value.results);
        if (requests[2].status === 'fulfilled') setShippingMethods(requests[2].value.results);
        if (requests[3].status === 'fulfilled') setPayments(requests[3].value.results);
        if (requests[4].status === 'fulfilled') setReviews(requests[4].value.results);
        if (requests[5].status === 'fulfilled') setReturns(requests[5].value.results);
        if (requests[6].status === 'fulfilled') setBespokeRequests(requests[6].value.results);
        const failed = requests.filter(result => result.status === 'rejected').length;
        if (failed) setCommerceError(`${toPersianDigits(failed)} بخش در دسترس نیست. پس از فعال‌سازی API دوباره تلاش کنید.`);
        setCommerceLoading(false);
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
        if (editingProduct.compareAtPrice !== undefined) formData.append('compare_at_price', String(editingProduct.compareAtPrice));
        formData.append('is_active', String(editingProduct.active !== false));
        formData.append('featured', String(Boolean(editingProduct.featured)));
        formData.append('category', editingProduct.category || 'suits');
        formData.append('description', editingProduct.description || '');
        formData.append('currency', 'Toman');
        formData.append('short', editingProduct.short || '');
        formData.append('fabric', editingProduct.fabric || '');
        formData.append('stock', String(editingProduct.stock || 0));

        if (editingProduct.variants) {
            const variants = editingProduct.variants.map(variant => {
                const payload = {
                    sku: variant.sku, size: variant.size || '', color: variant.color || '',
                    price: variant.priceOverride ?? null,
                    stock: variant.stock, is_active: variant.active,
                };
                return variant.id && !variant.id.startsWith('new-') ? { id: variant.id, ...payload } : payload;
            });
            formData.append('variants', JSON.stringify(variants));
        }

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
                showToast('خطا در حذف محصول');
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
            showToast('خطا در بروزرسانی وضعیت سفارش');
        }
    };

    const handleUpdateTracking = async (order: Order) => {
        const trackingCode = window.prompt('کد رهگیری یا مرجع ارسال را وارد کنید', order.trackingCode || '');
        if (trackingCode === null) return;
        try {
            const updated = await api.adminUpdateOrder(order.id, { trackingCode: trackingCode.trim() });
            setOrders(current => current.map(item => item.id === updated.id ? updated : item));
            if (viewingOrder?.id === updated.id) setViewingOrder(updated);
            showToast('کد رهگیری ذخیره شد');
        } catch (error: any) {
            showToast(error?.message || 'ذخیره کد رهگیری انجام نشد');
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

            const hasImageChanges = Object.keys(settingsFiles).length > 0 || clearedSettingsImages.size > 0;
            const textSettings = {
                about_title: settingsForm.aboutTitle || '',
                about_description: settingsForm.aboutDescription || '',
            };
            if (hasImageChanges) {
                const fd = new FormData();
                Object.entries(textSettings).forEach(([key, value]) => {
                    fd.append(key, value);
                });
                Object.entries(settingsFiles).forEach(([k, f]) => {
                    const key = fieldMap[k] || k;
                    if (f) fd.append(key, f as File);
                });
                clearedSettingsImages.forEach(field => {
                    fd.append(`clear_${fieldMap[field]}`, 'true');
                });
                await updateSiteSettings(fd as any);
            } else {
                await updateSiteSettings(textSettings as any);
            }
            setSettingsFiles({});
            setClearedSettingsImages(new Set());
            showToast('تنظیمات ذخیره شد');
        } catch (err) {
            console.error('Settings save failed', err);
            showToast('خطا در ذخیره تنظیمات');
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
            showToast('خطا در علامت‌گذاری پیام');
        }
    };

    const runCommerceAction = async (key: string, action: () => Promise<unknown>, successMessage: string) => {
        setCommerceAction(key);
        try {
            await action();
            await loadCommerceData();
            showToast(successMessage);
        } catch (error: any) {
            showToast(error?.message || 'انجام عملیات ناموفق بود');
        } finally {
            setCommerceAction(null);
        }
    };

    const saveCoupon = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!couponForm.code?.trim() || !couponForm.value) return showToast('کد و مقدار تخفیف الزامی است');
        await runCommerceAction('coupon-save', () => api.adminSaveCoupon(couponForm), 'کد تخفیف ذخیره شد');
        setCouponForm({ code: '', type: 'percent', value: 0, active: true });
    };

    const saveShippingMethod = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!shippingForm.name?.trim()) return showToast('نام روش ارسال الزامی است');
        await runCommerceAction('shipping-save', () => api.adminSaveShippingMethod(shippingForm), 'روش ارسال ذخیره شد');
        setShippingForm({ name: '', price: 0, currency: 'Toman', active: true });
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

    const addVariant = () => {
        const variant: ProductVariant = {
            id: `new-${Date.now()}`, sku: '', size: '', color: '', attributes: {},
            price: editingProduct.price || 0, priceOverride: null, currency: 'Toman', stock: 0, active: true,
        };
        setEditingProduct(current => ({ ...current, variants: [...(current.variants || []), variant] }));
    };

    const updateVariant = (index: number, changes: Partial<ProductVariant>) => {
        setEditingProduct(current => ({
            ...current,
            variants: (current.variants || []).map((variant, variantIndex) => variantIndex === index ? { ...variant, ...changes } : variant),
        }));
    };

    const removeVariant = (index: number) => {
        setEditingProduct(current => ({ ...current, variants: (current.variants || []).filter((_, variantIndex) => variantIndex !== index) }));
    };

    const handleSettingsFileUpload = (field: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSettingsFiles(prev => ({ ...prev, [field]: file }));
            setClearedSettingsImages(prev => {
                const next = new Set(prev);
                next.delete(field);
                return next;
            });
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
        const customerName = (o.customer?.name || customer?.name || '').toLowerCase();
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

    const fallbackTransitions: Record<Order['status'], Order['status'][]> = {
        pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
        shipped: ['delivered'], delivered: [], cancelled: [],
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
            <style>{`.admin-commerce-input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;outline:none}.admin-commerce-input:focus{border-color:#c5a059}.dark .admin-commerce-input{border-color:#3f3f46;background:#27272a;color:#fff}`}</style>
            <SEO title="Admin panel" />
            
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
                    <button onClick={() => setActiveTab('commerce')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'commerce' ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                        <Tags size={20} /> عملیات فروشگاه
                        {((stats.pendingReviewsCount || 0) + (stats.pendingReturnsCount || 0) + (stats.pendingBespokeCount || 0)) > 0 && <span className="mr-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{toPersianDigits((stats.pendingReviewsCount || 0) + (stats.pendingReturnsCount || 0) + (stats.pendingBespokeCount || 0))}</span>}
                    </button>
                </nav>
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lux-gray dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                            <UserIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-lux-black dark:text-white truncate">{user?.name || 'مدیر'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{user?.email || ''}</p>
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
                            <button onClick={() => { setActiveTab('commerce'); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold ${activeTab === 'commerce' ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}><Tags size={18} /> عملیات فروشگاه</button>
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
                                    onClick={() => { setEditingProduct({ images: [], variants: [], category: 'suits', active: true, featured: false }); setSelectedFile(null); setIsProductModalOpen(true); }}
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
                                                    {(order.customer?.name || getCustomerDetails(order.userId)?.name)?.charAt(0).toUpperCase() || <UserIcon size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-bold text-lg text-lux-black dark:text-white">{order.customer?.name || getCustomerDetails(order.userId)?.name || 'ناشناس'}</h3>
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

                                        {(order.trackingCode || order.trackingUrl) && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800"><Truck size={15} /><span>کد رهگیری: <b dir="ltr">{order.trackingCode || '—'}</b></span>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mr-auto font-bold underline">مشاهده رهگیری</a>}</div>}

                                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                            <div className="flex items-center gap-2 overflow-x-auto hide-scroll">
                                                {(order.allowedTransitions || fallbackTransitions[order.status]).map(s => (
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
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => void handleUpdateTracking(order)} className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-lux-gold text-lux-black dark:text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors"><Truck size={15} /> کد رهگیری</button>
                                                <button
                                                    onClick={() => setViewingOrder(order)}
                                                    className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-lux-gold text-lux-black dark:text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                                                >
                                                    <Eye size={16} /> جزئیات کامل
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'commerce' && (
                    <div className="animate-in fade-in space-y-6 duration-500" dir="rtl">
                        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between">
                            <div><h1 className="flex items-center gap-2 text-xl font-bold text-lux-black dark:text-white"><Tags className="text-lux-gold" /> عملیات فروشگاه</h1><p className="mt-1 text-xs text-gray-500">مدیریت ارسال، تخفیف، پرداخت، بازخورد و خدمات مشتریان</p></div>
                            <button onClick={() => void loadCommerceData()} disabled={commerceLoading} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-lux-gold dark:border-zinc-700 dark:text-gray-300 disabled:opacity-50"><RefreshCw size={16} className={commerceLoading ? 'animate-spin' : ''} /> به‌روزرسانی</button>
                        </div>

                        {commerceError && <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle size={18} /> {commerceError}</div>}
                        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                            {([
                                ['capabilities', 'آمادگی', ShieldCheck], ['coupons', 'تخفیف‌ها', Tags], ['shipping', 'ارسال', Truck],
                                ['payments', 'پرداخت‌ها', CreditCard], ['reviews', 'دیدگاه‌ها', Star], ['returns', 'مرجوعی‌ها', RotateCcw],
                                ['bespoke', 'سفارشی‌دوزی', Scissors],
                            ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setCommerceSection(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${commerceSection === id ? 'bg-lux-black text-white dark:bg-lux-gold dark:text-black' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><Icon size={16} /> {label}</button>)}
                        </div>

                        {commerceLoading ? <div className="flex items-center justify-center gap-2 rounded-2xl bg-white py-20 text-gray-500 dark:bg-zinc-900"><Loader2 className="animate-spin text-lux-gold" /> در حال دریافت اطلاعات...</div> : (
                            <>
                                {commerceSection === 'capabilities' && (
                                    <section className="space-y-5">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            {capabilities ? Object.entries({
                                                'پرداخت آنلاین': capabilities.onlinePayments, 'پرداخت در محل': capabilities.cashOnDelivery,
                                                'کد تخفیف': capabilities.coupons, 'دیدگاه محصول': capabilities.reviews,
                                                'مرجوعی': capabilities.returns, 'علاقه‌مندی': capabilities.wishlist,
                                                'سبد ذخیره‌شده': capabilities.savedCart, 'سفارشی‌دوزی': capabilities.bespokeRequests,
                                                'خبرنامه': capabilities.newsletter, 'مدیریت انبار': capabilities.canManageInventory,
                                                'مدیریت تبلیغات': capabilities.canManagePromotions, 'مدیریت کاربران': capabilities.canManageUsers,
                                            }).map(([label, enabled]) => <div key={label} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><span className="text-sm font-bold text-gray-700 dark:text-gray-200">{label}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{enabled ? 'فعال' : 'غیرفعال'}</span></div>) : <p className="rounded-2xl bg-white p-8 text-center text-gray-500 dark:bg-zinc-900">اطلاعات قابلیت‌ها در دسترس نیست.</p>}
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><h3 className="mb-3 font-bold dark:text-white">درگاه‌های پرداخت پیکربندی‌شده</h3>{capabilities?.paymentProviders?.length ? <div className="flex flex-wrap gap-2">{capabilities.paymentProviders.map(provider => <span key={provider} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{provider}</span>)}</div> : <p className="text-sm leading-7 text-gray-500">درگاه آنلاین فعالی گزارش نشده است. تا زمان تنظیم و تأیید درگاه، فقط روش‌های واقعی اعلام‌شده در تسویه‌حساب نمایش داده می‌شوند.</p>}</div>
                                    </section>
                                )}

                                {commerceSection === 'coupons' && (
                                    <div className="grid gap-6 lg:grid-cols-5">
                                        <form onSubmit={saveCoupon} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                                            <h2 className="font-bold dark:text-white">{couponForm.id ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}</h2>
                                            <input className="admin-commerce-input uppercase" dir="ltr" placeholder="WELCOME10" value={couponForm.code || ''} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} required />
                                            <div className="grid grid-cols-2 gap-2"><select className="admin-commerce-input" value={couponForm.type || 'percent'} onChange={e => setCouponForm({ ...couponForm, type: e.target.value as CouponSummary['type'] })}><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select><input className="admin-commerce-input" type="number" min="0" placeholder="مقدار" value={couponForm.value || ''} onChange={e => setCouponForm({ ...couponForm, value: Number(e.target.value) })} required /></div>
                                            <input className="admin-commerce-input" type="number" min="0" placeholder="حداقل مبلغ سفارش" value={couponForm.minimumOrderAmount || ''} onChange={e => setCouponForm({ ...couponForm, minimumOrderAmount: Number(e.target.value) || undefined })} />
                                            <input className="admin-commerce-input" type="number" min="0" placeholder="سقف دفعات استفاده" value={couponForm.usageLimit || ''} onChange={e => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) || undefined })} />
                                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={couponForm.active !== false} onChange={e => setCouponForm({ ...couponForm, active: e.target.checked })} /> فعال</label>
                                            <div className="flex gap-2"><button disabled={commerceAction === 'coupon-save'} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lux-gold py-2.5 font-bold text-white disabled:opacity-50"><Save size={16} /> ذخیره</button>{couponForm.id && <button type="button" onClick={() => setCouponForm({ code: '', type: 'percent', value: 0, active: true })} className="rounded-xl border px-3 dark:border-zinc-700 dark:text-white">انصراف</button>}</div>
                                        </form>
                                        <div className="space-y-3 lg:col-span-3">{coupons.length ? coupons.map(coupon => <div key={coupon.id || coupon.code} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between gap-3"><div><code className="rounded bg-gray-100 px-2 py-1 font-bold text-lux-black dark:bg-zinc-800 dark:text-white">{coupon.code}</code><p className="mt-2 text-sm text-gray-500">{coupon.type === 'percent' ? `${toPersianDigits(coupon.value)} درصد` : formatPrice(coupon.value)} · استفاده {toPersianDigits(coupon.usageCount || 0)}{coupon.usageLimit ? ` از ${toPersianDigits(coupon.usageLimit)}` : ''}</p></div><span className={`rounded-full px-2 py-1 text-xs ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{coupon.active ? 'فعال' : 'غیرفعال'}</span></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setCouponForm({ ...coupon })} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ویرایش</button>{coupon.id && <button onClick={() => void runCommerceAction(`coupon-${coupon.id}`, () => api.adminDeleteCoupon(coupon.id!), 'کد تخفیف حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button>}</div></div>) : <CommerceEmpty text="کد تخفیفی ثبت نشده است." />}</div>
                                    </div>
                                )}

                                {commerceSection === 'shipping' && (
                                    <div className="grid gap-6 lg:grid-cols-5">
                                        <form onSubmit={saveShippingMethod} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"><h2 className="font-bold dark:text-white">{shippingForm.id ? 'ویرایش روش ارسال' : 'روش ارسال جدید'}</h2><input className="admin-commerce-input" placeholder="نام روش ارسال" value={shippingForm.name || ''} onChange={e => setShippingForm({ ...shippingForm, name: e.target.value })} required /><textarea className="admin-commerce-input" placeholder="توضیحات" value={shippingForm.description || ''} onChange={e => setShippingForm({ ...shippingForm, description: e.target.value })} /><input className="admin-commerce-input" type="number" min="0" placeholder="هزینه (تومان)" value={shippingForm.price || ''} onChange={e => setShippingForm({ ...shippingForm, price: Number(e.target.value) })} /><div className="grid grid-cols-2 gap-2"><input className="admin-commerce-input" type="number" min="0" placeholder="حداقل روز" value={shippingForm.estimatedDaysMin || ''} onChange={e => setShippingForm({ ...shippingForm, estimatedDaysMin: Number(e.target.value) || undefined })} /><input className="admin-commerce-input" type="number" min="0" placeholder="حداکثر روز" value={shippingForm.estimatedDaysMax || ''} onChange={e => setShippingForm({ ...shippingForm, estimatedDaysMax: Number(e.target.value) || undefined })} /></div><input className="admin-commerce-input" type="number" min="0" placeholder="ارسال رایگان از مبلغ" value={shippingForm.freeAbove || ''} onChange={e => setShippingForm({ ...shippingForm, freeAbove: Number(e.target.value) || undefined })} /><label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={shippingForm.active !== false} onChange={e => setShippingForm({ ...shippingForm, active: e.target.checked })} /> فعال</label><div className="flex gap-2"><button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lux-gold py-2.5 font-bold text-white"><Save size={16} /> ذخیره</button>{shippingForm.id && <button type="button" onClick={() => setShippingForm({ name: '', price: 0, currency: 'Toman', active: true })} className="rounded-xl border px-3 dark:border-zinc-700 dark:text-white">انصراف</button>}</div></form>
                                        <div className="space-y-3 lg:col-span-3">{shippingMethods.length ? shippingMethods.map(method => <div key={method.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between"><div><h3 className="font-bold dark:text-white">{method.name}</h3><p className="mt-1 text-sm text-gray-500">{formatPrice(method.price)}{method.estimatedDaysMin ? ` · ${toPersianDigits(method.estimatedDaysMin)} تا ${toPersianDigits(method.estimatedDaysMax || method.estimatedDaysMin)} روز کاری` : ''}</p></div><span className={`rounded-full px-2 py-1 text-xs ${method.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{method.active ? 'فعال' : 'غیرفعال'}</span></div><p className="mt-2 text-xs text-gray-500">{method.description}</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShippingForm({ ...method })} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ویرایش</button><button onClick={() => void runCommerceAction(`shipping-${method.id}`, () => api.adminDeleteShippingMethod(method.id), 'روش ارسال حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button></div></div>) : <CommerceEmpty text="روش ارسالی ثبت نشده است." />}</div>
                                    </div>
                                )}

                                {commerceSection === 'payments' && <CommerceList empty={payments.length === 0} emptyText="رکورد پرداختی ثبت نشده است.">{payments.map(payment => <div key={payment.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold dark:text-white">پرداخت سفارش #{toPersianDigits(payment.orderId)}</h3><p className="mt-1 text-sm text-gray-500">{payment.provider || payment.method} · {formatPrice(payment.amount)}</p>{payment.transactionId && <p className="mt-1 text-xs text-gray-400" dir="ltr">{payment.transactionId}</p>}</div><select value={payment.status} onChange={e => void runCommerceAction(`payment-${payment.id}`, () => api.adminUpdatePayment(payment.id, { status: e.target.value as Payment['status'] }), 'وضعیت پرداخت به‌روزرسانی شد')} className="admin-commerce-input max-w-48"><option value="unpaid">پرداخت نشده</option><option value="pending">در انتظار</option><option value="paid">پرداخت شده</option><option value="failed">ناموفق</option><option value="cancelled">لغو شده</option><option value="partially_refunded">بازپرداخت جزئی</option><option value="refunded">بازپرداخت شده</option></select></div>{payment.failureReason && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{payment.failureReason}</p>}</div>)}</CommerceList>}

                                {commerceSection === 'reviews' && <CommerceList empty={reviews.length === 0} emptyText="دیدگاهی برای بررسی وجود ندارد.">{reviews.map(review => <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">{review.title || 'دیدگاه محصول'} · {review.userName}</h3><p className="mt-1 text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p></div><span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{review.status === 'approved' ? 'تأییدشده' : review.status === 'rejected' ? 'ردشده' : 'در انتظار'}</span></div><p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{review.body}</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => void runCommerceAction(`review-a-${review.id}`, () => api.adminUpdateReview(review.id, { status: 'approved' }), 'دیدگاه تأیید شد')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">تأیید</button><button onClick={() => void runCommerceAction(`review-r-${review.id}`, () => api.adminUpdateReview(review.id, { status: 'rejected' }), 'دیدگاه رد شد')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">رد</button><button onClick={() => window.confirm('دیدگاه حذف شود؟') && void runCommerceAction(`review-d-${review.id}`, () => api.adminDeleteReview(review.id), 'دیدگاه حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button></div></div>)}</CommerceList>}

                                {commerceSection === 'returns' && <CommerceList empty={returns.length === 0} emptyText="درخواست مرجوعی وجود ندارد.">{returns.map(item => <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">مرجوعی سفارش #{toPersianDigits(item.orderId)}</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><b>دلیل:</b> {item.reason}</p><p className="mt-1 text-xs text-gray-500">{item.details}</p>{item.adminNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">یادداشت: {item.adminNote}</p>}</div><select value={item.status} onChange={e => void runCommerceAction(`return-${item.id}`, () => api.adminUpdateReturn(item.id, { status: e.target.value as ReturnRequest['status'] }), 'وضعیت مرجوعی به‌روزرسانی شد')} className="admin-commerce-input max-w-44"><option value="requested">در انتظار</option><option value="approved">تأیید</option><option value="rejected">رد</option><option value="received">دریافت شده</option><option value="refunded">بازپرداخت</option><option value="cancelled">لغو</option></select></div><div className="mt-4 flex justify-end"><button onClick={() => { const note = window.prompt('یادداشت مدیر', item.adminNote || ''); if (note !== null) void runCommerceAction(`return-note-${item.id}`, () => api.adminUpdateReturn(item.id, { adminNote: note }), 'یادداشت ذخیره شد'); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ثبت یادداشت</button></div></div>)}</CommerceList>}

                                {commerceSection === 'bespoke' && <CommerceList empty={bespokeRequests.length === 0} emptyText="درخواست سفارشی‌دوزی وجود ندارد.">{bespokeRequests.map((request, index) => <div key={request.id || index} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">{request.name} · {request.garmentType}</h3><p className="mt-1 text-sm text-gray-500" dir="ltr">{request.phone} {request.email ? `· ${request.email}` : ''}</p>{request.preferredDate && <p className="mt-1 text-xs text-gray-500">تاریخ ترجیحی: {request.preferredDate}</p>}<p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{request.description}</p></div>{request.id && <select value={request.status || 'new'} onChange={e => void runCommerceAction(`bespoke-${request.id}`, () => api.adminUpdateBespokeRequest(request.id!, { status: e.target.value as BespokeRequest['status'] }), 'وضعیت درخواست به‌روزرسانی شد')} className="admin-commerce-input max-w-44"><option value="new">جدید</option><option value="contacted">تماس گرفته شد</option><option value="scheduled">وقت تعیین شد</option><option value="completed">تکمیل شد</option><option value="cancelled">لغو شد</option></select>}</div></div>)}</CommerceList>}
                            </>
                        )}
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
                                                                        setClearedSettingsImages(prev => new Set(prev).add(field.key));
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
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">قیمت قبل از تخفیف (اختیاری)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingProduct.compareAtPrice ?? ''}
                                            onChange={e => setEditingProduct({ ...editingProduct, compareAtPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
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
                                    <div className="md:col-span-2 flex flex-wrap gap-6 rounded-xl bg-gray-50 p-4 dark:bg-zinc-800">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"><input type="checkbox" checked={editingProduct.active !== false} onChange={e => setEditingProduct({ ...editingProduct, active: e.target.checked })} /> قابل نمایش و فروش</label>
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"><input type="checkbox" checked={Boolean(editingProduct.featured)} onChange={e => setEditingProduct({ ...editingProduct, featured: e.target.checked })} /> محصول ویژه</label>
                                    </div>
                                    <div className="md:col-span-2 space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-zinc-700">
                                        <div className="flex items-center justify-between gap-3">
                                            <div><label className="text-sm font-bold text-gray-700 dark:text-gray-300">تنوع اندازه و رنگ</label><p className="mt-1 text-xs text-gray-500">موجودی هر ترکیب جداگانه کنترل می‌شود؛ موجودی اصلی برای کالای بدون تنوع باقی می‌ماند.</p></div>
                                            <button type="button" onClick={addVariant} className="flex shrink-0 items-center gap-1 rounded-lg bg-lux-black px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-lux-black"><Plus size={14} /> افزودن تنوع</button>
                                        </div>
                                        {(editingProduct.variants || []).length === 0 ? <p className="rounded-xl bg-gray-50 py-5 text-center text-xs text-gray-500 dark:bg-zinc-800">برای این محصول تنوعی ثبت نشده است.</p> : (
                                            <div className="space-y-3">{(editingProduct.variants || []).map((variant, index) => (
                                                <div key={variant.id || index} className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 dark:bg-zinc-800 md:grid-cols-6">
                                                    <input className="rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" dir="ltr" placeholder="SKU *" value={variant.sku} onChange={e => updateVariant(index, { sku: e.target.value.toUpperCase() })} required />
                                                    <input className="rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" placeholder="اندازه" value={variant.size || ''} onChange={e => updateVariant(index, { size: e.target.value })} />
                                                    <input className="rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" placeholder="رنگ" value={variant.color || ''} onChange={e => updateVariant(index, { color: e.target.value })} />
                                                    <input className="rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" type="number" min="0" placeholder="موجودی" value={variant.stock} onChange={e => updateVariant(index, { stock: Number(e.target.value) })} />
                                                    <input className="rounded-lg border border-gray-200 bg-white p-2 text-xs outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" type="number" min="0" placeholder="قیمت اختیاری" value={variant.priceOverride ?? ''} onChange={e => updateVariant(index, { priceOverride: e.target.value === '' ? null : Number(e.target.value) })} />
                                                    <div className="flex items-center justify-between gap-2"><label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={variant.active} onChange={e => updateVariant(index, { active: e.target.checked })} /> فعال</label><button type="button" onClick={() => removeVariant(index)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button></div>
                                                </div>
                                            ))}</div>
                                        )}
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
                                                {(viewingOrder.customer?.name || getCustomerDetails(viewingOrder.userId)?.name)?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-lg">{viewingOrder.customer?.name || getCustomerDetails(viewingOrder.userId)?.name || 'ناشناس'}</span>
                                                    <span dir="ltr" className="font-mono text-gray-600 dark:text-gray-400">{viewingOrder.customer?.phone || getCustomerDetails(viewingOrder.userId)?.phone}</span>
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

                                <div className="mb-8 grid gap-3 text-sm md:grid-cols-3">
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800"><span className="block text-xs font-bold text-gray-400">پرداخت</span><b>{viewingOrder.paymentMethod || '—'} · {viewingOrder.paymentStatus}</b></div>
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800"><span className="block text-xs font-bold text-gray-400">روش ارسال</span><b>{viewingOrder.shippingMethod?.name || '—'}</b></div>
                                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800"><span className="block text-xs font-bold text-gray-400">کد رهگیری</span><b dir="ltr">{viewingOrder.trackingCode || 'ثبت نشده'}</b></div>
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

const CommerceEmpty: React.FC<{ text: string }> = ({ text }) => <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900">{text}</div>;
const CommerceList: React.FC<{ empty: boolean; emptyText: string; children: React.ReactNode }> = ({ empty, emptyText, children }) => empty ? <CommerceEmpty text={emptyText} /> : <div className="space-y-3">{children}</div>;

export default AdminPanel;
