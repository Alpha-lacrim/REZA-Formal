import { useActions, useAuth } from '../state/AppState';
import { errorMessage } from '../services/api';
import React, { useEffect, useRef, useState } from 'react';
import CollectionPager from '../components/CollectionPager';
import {
    ChevronDown, ChevronUp, CreditCard, ExternalLink, Loader2, LogOut,
    MapPin, Package, Plus, RotateCcw, Save, Trash2, Truck, User as UserIcon, XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImageLoader from '../components/ImageLoader';
import SEO from '../components/SEO';
import { Dialog } from '../components/Dialog';
import { TextField, TextAreaField } from '../components/FormField';

import api from '../services/api';
import { Address, Order, ReturnRequest } from '../types';
import { formatPrice, toPersianDigits } from '../utils';

type PanelTab = 'orders' | 'addresses' | 'returns' | 'profile';

const emptyAddress = (): Address => ({
    label: '', recipientName: '', phone: '', province: '', city: '', postalCode: '', addressLine: '', isDefault: false,
});

const statusLabels: Record<string, string> = {
    pending: 'در انتظار بررسی', processing: 'در حال آماده‌سازی', shipped: 'ارسال شده',
    delivered: 'تحویل شده', cancelled: 'لغو شده',
};
const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800', processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-rose-100 text-rose-800',
};
const paymentLabels: Record<string, string> = {
    cod: 'پرداخت هنگام تحویل', online: 'پرداخت آنلاین', bank_transfer: 'واریز بانکی',
    unpaid: 'پرداخت نشده', pending: 'در انتظار پرداخت', authorized: 'تأیید اولیه', paid: 'پرداخت شده',
    failed: 'ناموفق', cancelled: 'لغو شده', partially_refunded: 'بازپرداخت جزئی', refunded: 'بازپرداخت شده',
};
const returnLabels: Record<string, string> = {
    requested: 'در انتظار بررسی', approved: 'تأیید شده', rejected: 'رد شده', received: 'دریافت شده',
    refunded: 'بازپرداخت شده', cancelled: 'لغو شده',
};

const UserPanel: React.FC = () => {
    const { user } = useAuth();
    const { updateUserProfile, logout, showToast, cancelUserOrder } = useActions();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<PanelTab>('orders');
    const [orderPage, setOrderPage] = useState(1);
    const [returnPage, setReturnPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const loadVersion = useRef(0);
    const [orders, setOrders] = useState<Order[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [profileAddress, setProfileAddress] = useState('');
    const [addressForm, setAddressForm] = useState<Address>(emptyAddress());
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [returnOrder, setReturnOrder] = useState<Order | null>(null);
    const [returnItems, setReturnItems] = useState<string[]>([]);
    const [returnReason, setReturnReason] = useState('');
    const [returnDetails, setReturnDetails] = useState('');
    const [returnError, setReturnError] = useState('');

    const loadAccount = async (signal?: AbortSignal) => {
        const version = ++loadVersion.current;
        setLoading(true);
        setLoadError('');
        try {
            if (activeTab === 'orders') {
                const page = await api.myOrdersPage(orderPage, signal);
                if (version !== loadVersion.current || signal?.aborted) return;
                setOrders(page.results); setTotalPages(page.totalPages || 1); setExpandedOrderId(null);
            } else if (activeTab === 'returns') {
                const page = await api.getReturnsPage(returnPage, signal);
                if (version !== loadVersion.current || signal?.aborted) return;
                setReturns(page.results); setTotalPages(page.totalPages || 1);
            } else if (activeTab === 'addresses') {
                const saved = await api.getAddresses();
                if (version === loadVersion.current && !signal?.aborted) setAddresses(saved);
            }
        } catch (error: unknown) {
            if (version === loadVersion.current && !signal?.aborted) setLoadError(errorMessage(error, 'دریافت اطلاعات حساب کاربری ناموفق بود'));
        } finally {
            if (version === loadVersion.current && !signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        setName(user.name);
        setProfileAddress(user.address || '');
        const controller = new AbortController();
        void loadAccount(controller.signal);
        return () => { controller.abort(); loadVersion.current++; };
    }, [user?.id, activeTab, orderPage, returnPage]);

    const toggleOrder = (order: Order) => {
        if (expandedOrderId === order.id) {
            setExpandedOrderId(null);
            return;
        }
        setExpandedOrderId(order.id);
    };

    const canCancel = (order: Order) => order.allowedTransitions
        ? order.allowedTransitions.includes('cancelled')
        : order.status === 'pending';

    const handleCancelOrder = async (orderId: string) => {
        if (!window.confirm('آیا از لغو این سفارش اطمینان دارید؟')) return;
        setActionLoading(`cancel-${orderId}`);
        try {
            await cancelUserOrder(orderId);
            await loadAccount();
            showToast('سفارش لغو شد');
        } catch (error: unknown) {
            showToast(errorMessage(error, 'لغو سفارش ناموفق بود'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        setActionLoading('profile');
        try {
            await updateUserProfile({ name, address: profileAddress });
            showToast('اطلاعات حساب به‌روزرسانی شد');
        } catch (error: unknown) {
            showToast(errorMessage(error, 'به‌روزرسانی اطلاعات ناموفق بود'));
        } finally {
            setActionLoading(null);
        }
    };

    const resetAddressForm = () => {
        setAddressForm(emptyAddress());
        setEditingAddressId(null);
    };

    const handleAddressSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!addressForm.recipientName || !addressForm.phone || !addressForm.city || !addressForm.addressLine || !addressForm.postalCode) {
            showToast('نام گیرنده، تلفن، شهر، کدپستی و نشانی الزامی است');
            return;
        }
        setActionLoading('address');
        try {
            if (editingAddressId) await api.updateAddress(editingAddressId, addressForm);
            else await api.createAddress(addressForm);
            setAddresses(await api.getAddresses());
            resetAddressForm();
            showToast('نشانی ذخیره شد');
        } catch (error: unknown) {
            showToast(errorMessage(error, 'ذخیره نشانی ناموفق بود'));
        } finally {
            setActionLoading(null);
        }
    };

    const editAddress = (address: Address) => {
        setEditingAddressId(address.id || null);
        setAddressForm({ ...address });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteAddress = async (address: Address) => {
        if (!address.id || !window.confirm('این نشانی حذف شود؟')) return;
        setActionLoading(`address-${address.id}`);
        try {
            await api.deleteAddress(address.id);
            setAddresses(current => current.filter(item => item.id !== address.id));
            if (editingAddressId === address.id) resetAddressForm();
            showToast('نشانی حذف شد');
        } catch (error: unknown) {
            showToast(errorMessage(error, 'حذف نشانی ناموفق بود'));
        } finally {
            setActionLoading(null);
        }
    };

    const openReturnForm = (order: Order) => {
        setReturnOrder(order);
        setReturnItems(order.items.map(item => item.id).filter((id): id is string => Boolean(id)));
        setReturnReason('');
        setReturnDetails(''); setReturnError('');
    };

    const submitReturn = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!returnOrder || !returnReason.trim() || returnItems.length === 0) {
            setReturnError('حداقل یک کالا و دلیل مرجوعی را انتخاب کنید');
            return;
        }
        setActionLoading('return');
        try {
            await api.createReturn({ orderId: returnOrder.id, itemIds: returnItems, reason: returnReason, details: returnDetails });
            setReturnPage(1);
            setReturnOrder(null);
            setActiveTab('returns');
            showToast('درخواست مرجوعی ثبت شد');
        } catch (error: unknown) {
            setReturnError(errorMessage(error, 'ثبت درخواست مرجوعی ناموفق بود'));
        } finally {
            setActionLoading(null);
        }
    };

    const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-lux-black outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-800 dark:text-white';

    return (
        <div className="min-h-screen bg-lux-body pb-12 pt-24 dark:bg-zinc-950" dir="rtl">
            <SEO title="حساب کاربری" />
            <div className="container mx-auto max-w-6xl px-4">
                <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lux-black text-xl font-bold text-white dark:bg-lux-gold dark:text-black">{user?.name?.charAt(0)}</div>
                        <div><h1 className="text-xl font-bold text-lux-black dark:text-white">{user?.name}</h1><p dir="ltr" className="text-sm text-gray-500">{user?.email}</p></div>
                    </div>
                    <button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"><LogOut size={17} /> خروج از حساب</button>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
                    {([
                        ['orders', 'سفارش‌ها', Package], ['addresses', 'نشانی‌ها', MapPin],
                        ['returns', 'مرجوعی‌ها', RotateCcw], ['profile', 'مشخصات', UserIcon],
                    ] as const).map(([id, label, Icon]) => (
                        <button key={id} aria-pressed={activeTab === id} onClick={() => setActiveTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${activeTab === id ? 'bg-lux-black text-white dark:bg-lux-gold dark:text-black' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}>
                            <Icon size={18} /> {label}
                        </button>
                    ))}
                </div>

                {loading ? <div role="status" className="flex items-center justify-center gap-2 py-24 text-gray-500"><Loader2 className="animate-spin" /> در حال دریافت اطلاعات...</div> : null}
                {loadError && <p role="alert" className="mb-4 text-red-700 dark:text-red-300">{loadError} <button onClick={() => void loadAccount()} className="underline">تلاش دوباره</button></p>}

                {!loading && !loadError && activeTab === 'orders' && (
                    <section className="space-y-4">
                        {orders.length === 0 ? <EmptyState icon={Package} text="هنوز سفارشی ثبت نکرده‌اید." /> : orders.map(order => (
                            <article key={order.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                                <button aria-expanded={expandedOrderId === order.id} aria-controls={`order-${order.id}`} onClick={() => void toggleOrder(order)} className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-right">
                                    <div><p className="font-bold text-lux-black dark:text-white">سفارش #{toPersianDigits(order.id)}</p><p className="mt-1 text-xs text-gray-500">{new Date(order.createdAt).toLocaleString('fa-IR')}</p></div>
                                    <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>{statusLabels[order.status] || order.status}</span><strong className="text-lux-gold">{formatPrice(order.total)}</strong>{expandedOrderId === order.id ? <ChevronUp /> : <ChevronDown />}</div>
                                </button>
                                {expandedOrderId === order.id && (
                                    <div id={`order-${order.id}`} className="border-t border-gray-100 p-5 dark:border-zinc-800">
                                        {actionLoading === `order-${order.id}` ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-lux-gold" /></div> : (
                                            <div className="space-y-5">
                                                <ul className="space-y-3">{order.items.map((item, index) => <li key={item.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3 dark:bg-zinc-800"><div className="flex items-center gap-3"><ImageLoader src={item.image || ''} alt={item.name} className="h-12 w-12 rounded-lg object-cover" /><div><p className="text-sm font-bold dark:text-white">{item.name}</p><p className="text-xs text-gray-500">{[item.size, item.color].filter(Boolean).join(' · ')} × {toPersianDigits(item.qty)}</p></div></div><span className="text-sm font-bold dark:text-white">{formatPrice(item.total || item.price * item.qty)}</span></li>)}</ul>
                                                <div className="grid gap-3 text-sm md:grid-cols-2">
                                                    <Info icon={CreditCard} title="پرداخت" text={`${paymentLabels[order.paymentMethod || ''] || order.paymentMethod || '—'} · ${paymentLabels[order.paymentStatus] || order.paymentStatus}`} />
                                                    <Info icon={Truck} title="ارسال" text={order.shippingMethod?.name || 'روش ارسال ثبت‌شده'} />
                                                    <Info icon={MapPin} title="نشانی تحویل" text={order.shippingAddress || '—'} />
                                                    <Info icon={Package} title="مبلغ" text={`کالا ${formatPrice(order.subtotal)}، تخفیف ${formatPrice(order.discountTotal)}، ارسال ${formatPrice(order.shippingTotal)}`} />
                                                </div>
                                                {(order.trackingCode || order.trackingUrl) && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800"><Truck size={18} /><span>کد رهگیری: <b dir="ltr">{order.trackingCode || '—'}</b></span>{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mr-auto flex items-center gap-1 font-bold underline">پیگیری مرسوله <ExternalLink size={14} /></a>}</div>}
                                                {order.events && order.events.length > 0 && <div><h3 className="mb-2 text-sm font-bold dark:text-white">روند سفارش</h3><ol className="space-y-2 border-r-2 border-lux-gold/30 pr-4">{order.events.map((event, index) => <li key={event.id || index} className="text-xs text-gray-600 dark:text-gray-300"><b>{event.message || statusLabels[event.status || ''] || event.type}</b><span className="mr-2 text-gray-400">{new Date(event.createdAt).toLocaleString('fa-IR')}</span></li>)}</ol></div>}
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {order.status === 'delivered' && <button onClick={() => openReturnForm(order)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold dark:border-zinc-700 dark:text-white"><RotateCcw size={16} /> درخواست مرجوعی</button>}
                                                    {canCancel(order) && <button disabled={actionLoading === `cancel-${order.id}`} onClick={() => void handleCancelOrder(order.id)} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><XCircle size={16} /> لغو سفارش</button>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                    </section>
                )}

                {!loading && activeTab === 'addresses' && (
                    <div className="grid gap-6 lg:grid-cols-5">
                        <form onSubmit={handleAddressSubmit} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                            <h2 className="flex items-center gap-2 font-bold dark:text-white"><Plus size={18} /> {editingAddressId ? 'ویرایش نشانی' : 'نشانی جدید'}</h2>
                            <TextField label="عنوان نشانی (اختیاری)" className={inputClass} placeholder="عنوان (خانه، محل کار...)" value={addressForm.label || ''} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })} />
                            <TextField label="نام گیرنده" autoComplete="shipping name" className={inputClass} required placeholder="نام گیرنده" value={addressForm.recipientName} onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })} />
                            <TextField label="شماره تماس" type="tel" autoComplete="shipping tel" className={inputClass} required dir="ltr" placeholder="شماره تماس" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} />
                            <div className="grid grid-cols-2 gap-2"><TextField label="استان" autoComplete="shipping address-level1" className={inputClass} required placeholder="استان" value={addressForm.province} onChange={e => setAddressForm({ ...addressForm, province: e.target.value })} /><TextField label="شهر" autoComplete="shipping address-level2" className={inputClass} required placeholder="شهر" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
                            <TextField label="کد پستی" inputMode="numeric" autoComplete="shipping postal-code" className={inputClass} required dir="ltr" placeholder="کد پستی" value={addressForm.postalCode} onChange={e => setAddressForm({ ...addressForm, postalCode: e.target.value })} />
                            <TextAreaField label="نشانی کامل" autoComplete="shipping street-address" className={inputClass} required rows={3} placeholder="نشانی کامل" value={addressForm.addressLine} onChange={e => setAddressForm({ ...addressForm, addressLine: e.target.value })} />
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={Boolean(addressForm.isDefault)} onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })} /> نشانی پیش‌فرض</label>
                            <div className="flex gap-2"><button disabled={actionLoading === 'address'} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lux-gold px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={17} /> ذخیره</button>{editingAddressId && <button type="button" onClick={resetAddressForm} className="rounded-xl border px-4 dark:border-zinc-700 dark:text-white">انصراف</button>}</div>
                        </form>
                        <div className="space-y-3 lg:col-span-3">{addresses.length === 0 ? <EmptyState icon={MapPin} text="نشانی ذخیره‌شده‌ای ندارید." /> : addresses.map(address => <div key={address.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="mb-2 flex items-center gap-2"><h3 className="font-bold dark:text-white">{address.label || 'نشانی'}</h3>{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">پیش‌فرض</span>}</div><p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{address.province}، {address.city}، {address.addressLine}</p><p className="text-xs text-gray-500"><bdi>{address.recipientName}</bdi> · <bdi dir="ltr">{address.phone}</bdi> · کدپستی <bdi dir="ltr">{address.postalCode}</bdi></p><div className="mt-4 flex justify-end gap-2"><button onClick={() => editAddress(address)} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ویرایش</button><button disabled={actionLoading === `address-${address.id}`} onClick={() => void deleteAddress(address)} className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600"><Trash2 size={14} /> حذف</button></div></div>)}</div>
                    </div>
                )}

                {!loading && !loadError && activeTab === 'returns' && (
                    <section className="space-y-3">{returns.length === 0 ? <EmptyState icon={RotateCcw} text="درخواست مرجوعی ثبت نشده است." /> : returns.map(item => <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold dark:text-white">مرجوعی سفارش #{toPersianDigits(item.orderId)}</h3><p className="mt-1 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('fa-IR')}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{returnLabels[item.status] || item.status}</span></div><p className="mt-4 text-sm text-gray-700 dark:text-gray-200"><b>دلیل:</b> {item.reason}</p>{item.details && <p className="mt-1 text-sm text-gray-500">{item.details}</p>}{item.adminNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><b>پاسخ فروشگاه:</b> {item.adminNote}</p>}{item.refundAmount !== undefined && <p className="mt-3 text-sm font-bold text-emerald-600">مبلغ بازپرداخت: {formatPrice(item.refundAmount)}</p>}</article>)}</section>
                )}

                {!loading && (activeTab === 'orders' || activeTab === 'returns') && <CollectionPager page={activeTab === 'orders' ? orderPage : returnPage} totalPages={totalPages} busy={loading} onPage={activeTab === 'orders' ? setOrderPage : setReturnPage} />}
                {!loading && activeTab === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="mx-auto max-w-xl space-y-4 rounded-2xl border border-gray-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-lg font-bold dark:text-white">مشخصات حساب</h2><label className="block text-sm font-bold text-gray-600 dark:text-gray-300">نام و نام خانوادگی<input className={`${inputClass} mt-2`} value={name} onChange={e => setName(e.target.value)} required /></label><label className="block text-sm font-bold text-gray-600 dark:text-gray-300">نشانی متنی قدیمی<textarea className={`${inputClass} mt-2`} rows={3} value={profileAddress} onChange={e => setProfileAddress(e.target.value)} /></label><p className="text-xs leading-6 text-gray-500">برای انتخاب دقیق نشانی در خریدهای بعدی، از بخش «نشانی‌ها» استفاده کنید.</p><button disabled={actionLoading === 'profile'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-lux-gold py-3 font-bold text-white disabled:opacity-50"><Save size={17} /> ذخیره تغییرات</button></form>
                )}
            </div>

            {returnOrder && <Dialog title="درخواست مرجوعی" size="compact" busy={actionLoading === "return"} onClose={() => setReturnOrder(null)}><form onSubmit={submitReturn} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold dark:text-white">مرجوعی سفارش #{toPersianDigits(returnOrder.id)}</h2><button aria-label="بستن مرجوعی" disabled={actionLoading === "return"} type="button" onClick={() => setReturnOrder(null)} className="text-gray-500"><XCircle /></button></div><p className="mb-3 text-sm text-gray-500">کالاهای موردنظر را انتخاب کنید:</p>{returnError && <p role="alert" className="mb-3 text-red-700 dark:text-red-300">{returnError}</p>}<div className="mb-4 space-y-2">{returnOrder.items.map((item, index) => { const id = item.id || ''; return <label key={id || index} className={`flex items-center gap-3 rounded-xl border p-3 dark:border-zinc-700 ${!id ? 'opacity-50' : ''}`}><input type="checkbox" disabled={!id} checked={Boolean(id && returnItems.includes(id))} onChange={e => setReturnItems(current => e.target.checked ? [...current, id] : current.filter(value => value !== id))} /><span className="text-sm font-bold dark:text-white">{item.name} × {toPersianDigits(item.qty)}</span></label>; })}</div><label htmlFor="return-reason" className="block text-sm dark:text-white">دلیل مرجوعی</label><select id="return-reason" className={inputClass} value={returnReason} onChange={e => setReturnReason(e.target.value)} required><option value="">دلیل مرجوعی</option><option value="size_issue">نامناسب بودن اندازه</option><option value="damaged">آسیب‌دیدگی کالا</option><option value="wrong_item">ارسال کالای اشتباه</option><option value="not_as_described">مغایرت با توضیحات</option><option value="other">سایر</option></select><TextAreaField label="توضیحات تکمیلی" className={`${inputClass} mt-3`} rows={4} placeholder="توضیحات تکمیلی" value={returnDetails} onChange={e => setReturnDetails(e.target.value)} /><button disabled={actionLoading === 'return'} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-lux-black py-3 font-bold text-white dark:bg-lux-gold dark:text-black disabled:opacity-50"><RotateCcw size={17} /> ثبت درخواست</button></form></Dialog>}
        </div>
    );
};

const Info: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => <div className="rounded-xl bg-gray-50 p-3 dark:bg-zinc-800"><div className="mb-1 flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200"><Icon size={15} /> {title}</div><p className="leading-6 text-gray-500 dark:text-gray-400">{text}</p></div>;
const EmptyState: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-500 dark:border-zinc-700 dark:bg-zinc-900"><Icon size={42} className="mx-auto mb-3 text-gray-300" /><p>{text}</p></div>;

export default UserPanel;
