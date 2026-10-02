import { useActions } from '../../state/AppState';
import { errorMessage } from '../../services/api';
import React, { useState } from 'react';
import ImageLoader from '../../components/ImageLoader';

import api from '../../services/api';
import { Order } from '../../types';
import { toPersianDigits, formatPrice } from '../../utils';
import { ShoppingBag, X, Search, Eye, Printer, Calendar, User as UserIcon, Filter, TrendingUp, Activity, CheckCircle2, Clock, Ban, Truck } from 'lucide-react';
import { Pagination, QueryStatus, useAdminPage } from './shared';
import { Dialog } from './Dialog';

export default function Orders() {
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [pending, setPending] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

const { refreshProducts, showToast } = useActions();
const query = useAdminPage('orders', { page: currentPage, page_size: 8, search: searchTerm, status: filterStatus, date_start: filterDateStart, date_end: filterDateEnd }, api.adminGetOrderPage);
const paginatedOrders = query.data?.results || [];
const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
 if (pending) return;
 setPending(id);
 try { const updated = await api.adminUpdateOrderStatus(id, status); if (viewingOrder?.id === id) setViewingOrder(updated); await query.invalidate(); await refreshProducts(); showToast('وضعیت سفارش بروز شد'); }
 catch (error) { showToast(errorMessage(error, 'خطا در بروزرسانی وضعیت سفارش')); }
 finally { setPending(null); }
};
    const handleUpdateTracking = async (order: Order) => {
        const trackingCode = window.prompt('کد رهگیری یا مرجع ارسال را وارد کنید', order.trackingCode || '');
        if (trackingCode === null) return;
        try {
            const updated = await api.adminUpdateOrder(order.id, { trackingCode: trackingCode.trim() });
            await query.invalidate();
            if (viewingOrder?.id === updated.id) setViewingOrder(updated);
            showToast('کد رهگیری ذخیره شد');
        } catch (error: unknown) {
            showToast(errorMessage(error, 'ذخیره کد رهگیری انجام نشد'));
        }
    };
    const handlePrintOrder = () => {
        window.print();
    };
    const clearOrderFilters = () => { setCurrentPage(1);
        setSearchTerm('');
        setFilterStatus('all');
        setFilterDateStart('');
        setFilterDateEnd('');
    };
    const statusConfig: Record<string, { bg: string, text: string, icon: React.ElementType, label: string }> = {
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

return <>
<QueryStatus query={query} />
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
                                        aria-label="جستجوی سفارشات" type="search"
                                        placeholder="شماره سفارش، نام مشتری..."
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:bg-white dark:focus:bg-zinc-900 focus:border-lux-gold outline-none transition-colors"
                                    />
                                    <Search className="absolute left-3 top-9 text-gray-400" size={16} />
                                </div>
                                <div className="w-full lg:w-56">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block tracking-wider">وضعیت</label>
                                    <select aria-label="وضعیت سفارش"
                                        value={filterStatus}
                                        onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
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
                            {paginatedOrders.length === 0 ? (
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
                                                    {(order.customer?.name)?.charAt(0).toUpperCase() || <UserIcon size={20}/>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-bold text-lg text-lux-black dark:text-white">{order.customer?.name || 'ناشناس'}</h3>
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
                                                        key={s} disabled={pending !== null} aria-label={statusConfig[s].label}
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
<Pagination page={query.data} current={currentPage} onChange={setCurrentPage} busy={query.isFetching} />
                {viewingOrder && (
                    <Dialog title="جزئیات سفارش" size="order" onClose={() => setViewingOrder(null)}>
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
                                                {(viewingOrder.customer?.name)?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-lg">{viewingOrder.customer?.name || 'ناشناس'}</span>
                                                    <span dir="ltr" className="font-mono text-gray-600 dark:text-gray-400">{viewingOrder.customer?.phone}</span>
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
                    </Dialog>
                )}

</>;
}
