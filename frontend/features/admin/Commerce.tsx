import { useAdminData } from '../../state/admin';
import { useActions } from '../../state/AppState';
import { errorMessage } from '../../services/api';
import React, { useState } from 'react';

import api from '../../services/api';
import { BespokeRequest, CouponSummary, Payment, ReturnRequest, ShippingMethod } from '../../types';
import { toPersianDigits, formatPrice } from '../../utils';
import { Save, AlertCircle, Tags, Truck, CreditCard, Star, RotateCcw, Scissors, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { Pagination } from './shared';
type CommerceSection = 'capabilities' | 'coupons' | 'shipping' | 'payments' | 'reviews' | 'returns' | 'bespoke';
const CommerceEmpty: React.FC<{ text: string }> = ({ text }) => <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900">{text}</div>;
const CommerceList: React.FC<{ empty: boolean; emptyText: string; children: React.ReactNode }> = ({ empty, emptyText, children }) => empty ? <CommerceEmpty text={emptyText} /> : <div className="space-y-3">{children}</div>;

export default function Commerce() {
    const [commerceSection, setCommerceSection] = useState<CommerceSection>('capabilities');
    const [couponForm, setCouponForm] = useState<Partial<CouponSummary>>({ code: '', type: 'percent', value: 0, active: true });
    const [shippingForm, setShippingForm] = useState<Partial<ShippingMethod>>({ name: '', price: 0, currency: 'Toman', active: true });
    const [commerceAction, setCommerceAction] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const { refreshProducts, showToast } = useActions();
const { capabilities, coupons, shippingMethods, payments, reviews, returns, bespokeRequests, commerceLoading, commerceError, loadCommerceData, commercePage } = useAdminData('commerce', commerceSection, currentPage);
    const handlePaymentStatus = async (payment: Payment, status: Payment['status']) => {
        const changes: Parameters<typeof api.adminUpdatePayment>[1] = { status };
        if (status === 'partially_refunded' || status === 'refunded') {
            const amount = window.prompt('مبلغ این بازپرداخت را وارد کنید (نه مجموع بازپرداخت‌ها)');
            if (amount === null) return;
            const reference = window.prompt('مرجع یکتای انتقال وجه؛ برای تلاش مجدد همان مرجع را وارد کنید');
            if (!reference?.trim()) return;
            const reason = window.prompt('دلیل بازپرداخت');
            if (!reason?.trim()) return;
            if (!window.confirm(`بازپرداخت ${amount} ${payment.currency} با مرجع ${reference} انجام شده است؟ این ثبت، انتقال وجه انجام نمی‌دهد.`)) return;
            Object.assign(changes, { refund_amount: amount, currency: payment.currency, reference: reference.trim(), reason: reason.trim(), confirmed: true });
        }
        await runCommerceAction(`payment-${payment.id}`, () => api.adminUpdatePayment(payment.id, changes), 'وضعیت پرداخت به‌روزرسانی شد');
    };
    const runCommerceAction = async (key: string, action: () => Promise<unknown>, successMessage: string) => {
        if (commerceAction) return false;
        setCommerceAction(key);
        try {
            await action();
            await loadCommerceData();
            await refreshProducts();
            showToast(successMessage);
            return true;
        } catch (error: unknown) {
            showToast(errorMessage(error, 'انجام عملیات ناموفق بود'));
            return false;
        } finally {
            setCommerceAction(null);
        }
    };

    const saveCoupon = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!couponForm.code?.trim() || !couponForm.value) return showToast('کد و مقدار تخفیف الزامی است');
        const saved = await runCommerceAction('coupon-save', () => api.adminSaveCoupon(couponForm), 'کد تخفیف ذخیره شد');
        if (saved) setCouponForm({ code: '', type: 'percent', value: 0, active: true });
    };

    const saveShippingMethod = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!shippingForm.name?.trim()) return showToast('نام روش ارسال الزامی است');
        const saved = await runCommerceAction('shipping-save', () => api.adminSaveShippingMethod(shippingForm), 'روش ارسال ذخیره شد');
        if (saved) setShippingForm({ name: '', price: 0, currency: 'Toman', active: true });
    };


return <fieldset aria-busy={commerceAction !== null} disabled={commerceAction !== null} className="min-w-0">
                    <div className="animate-in fade-in space-y-6 duration-500" dir="rtl">
                        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between">
                            <div><h1 className="flex items-center gap-2 text-xl font-bold text-lux-black dark:text-white"><Tags className="text-lux-gold" /> عملیات فروشگاه</h1><p className="mt-1 text-xs text-gray-500">مدیریت ارسال، تخفیف، پرداخت، بازخورد و خدمات مشتریان</p></div>
                            <button onClick={() => void loadCommerceData()} disabled={commerceLoading} className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-lux-gold dark:border-zinc-700 dark:text-gray-300 disabled:opacity-50"><RefreshCw size={16} className={commerceLoading ? 'animate-spin' : ''} /> به‌روزرسانی</button>
                        </div>

                        {commerceAction && <p role="status">در حال ذخیره تغییرات…</p>}
                        {commerceError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle size={18} /> {commerceError}</div>}
                        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
                            {([
                                ['capabilities', 'آمادگی', ShieldCheck], ['coupons', 'تخفیف‌ها', Tags], ['shipping', 'ارسال', Truck],
                                ['payments', 'پرداخت‌ها', CreditCard], ['reviews', 'دیدگاه‌ها', Star], ['returns', 'مرجوعی‌ها', RotateCcw],
                                ['bespoke', 'سفارشی‌دوزی', Scissors],
                            ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => { setCommerceSection(id); setCurrentPage(1); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${commerceSection === id ? 'bg-lux-black text-white dark:bg-lux-gold dark:text-black' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}><Icon size={16} /> {label}</button>)}
                        </div>

                        {commerceLoading ? <div role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-white py-20 text-gray-500 dark:bg-zinc-900"><Loader2 className="animate-spin text-lux-gold" /> در حال دریافت اطلاعات...</div> : (
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
                                            <input className="admin-commerce-input uppercase" dir="ltr" aria-label="کد تخفیف" placeholder="WELCOME10" value={couponForm.code || ''} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} required />
                                            <div className="grid grid-cols-2 gap-2"><select aria-label="نوع تخفیف" className="admin-commerce-input" value={couponForm.type || 'percent'} onChange={e => setCouponForm({ ...couponForm, type: e.target.value as CouponSummary['type'] })}><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select><input className="admin-commerce-input" type="number" min="0" aria-label="مقدار" placeholder="مقدار" value={couponForm.value || ''} onChange={e => setCouponForm({ ...couponForm, value: Number(e.target.value) })} required /></div>
                                            <input className="admin-commerce-input" type="number" min="0" aria-label="حداقل مبلغ سفارش" placeholder="حداقل مبلغ سفارش" value={couponForm.minimumOrderAmount || ''} onChange={e => setCouponForm({ ...couponForm, minimumOrderAmount: Number(e.target.value) || undefined })} />
                                            <input className="admin-commerce-input" type="number" min="0" aria-label="سقف دفعات استفاده" placeholder="سقف دفعات استفاده" value={couponForm.usageLimit || ''} onChange={e => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) || undefined })} />
                                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={couponForm.active !== false} onChange={e => setCouponForm({ ...couponForm, active: e.target.checked })} /> فعال</label>
                                            <div className="flex gap-2"><button disabled={commerceAction === 'coupon-save'} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lux-gold py-2.5 font-bold text-white disabled:opacity-50"><Save size={16} /> ذخیره</button>{couponForm.id && <button type="button" onClick={() => setCouponForm({ code: '', type: 'percent', value: 0, active: true })} className="rounded-xl border px-3 dark:border-zinc-700 dark:text-white">انصراف</button>}</div>
                                        </form>
                                        <div className="space-y-3 lg:col-span-3">{coupons.length ? coupons.map(coupon => <div key={coupon.id || coupon.code} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between gap-3"><div><code className="rounded bg-gray-100 px-2 py-1 font-bold text-lux-black dark:bg-zinc-800 dark:text-white">{coupon.code}</code><p className="mt-2 text-sm text-gray-500">{coupon.type === 'percent' ? `${toPersianDigits(coupon.value)} درصد` : formatPrice(coupon.value)} · استفاده {toPersianDigits(coupon.usageCount || 0)}{coupon.usageLimit ? ` از ${toPersianDigits(coupon.usageLimit)}` : ''}</p></div><span className={`rounded-full px-2 py-1 text-xs ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{coupon.active ? 'فعال' : 'غیرفعال'}</span></div><div className="mt-4 flex justify-end gap-2"><button onClick={() => setCouponForm({ ...coupon })} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ویرایش</button>{coupon.id && <button onClick={() => void runCommerceAction(`coupon-${coupon.id}`, () => api.adminDeleteCoupon(coupon.id!), 'کد تخفیف حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button>}</div></div>) : <CommerceEmpty text="کد تخفیفی ثبت نشده است." />}</div>
                                    </div>
                                )}

                                {commerceSection === 'shipping' && (
                                    <div className="grid gap-6 lg:grid-cols-5">
                                        <form onSubmit={saveShippingMethod} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2"><h2 className="font-bold dark:text-white">{shippingForm.id ? 'ویرایش روش ارسال' : 'روش ارسال جدید'}</h2><input className="admin-commerce-input" aria-label="نام روش ارسال" placeholder="نام روش ارسال" value={shippingForm.name || ''} onChange={e => setShippingForm({ ...shippingForm, name: e.target.value })} required /><textarea className="admin-commerce-input" aria-label="توضیحات" placeholder="توضیحات" value={shippingForm.description || ''} onChange={e => setShippingForm({ ...shippingForm, description: e.target.value })} /><input className="admin-commerce-input" type="number" min="0" aria-label="هزینه (تومان)" placeholder="هزینه (تومان)" value={shippingForm.price || ''} onChange={e => setShippingForm({ ...shippingForm, price: Number(e.target.value) })} /><div className="grid grid-cols-2 gap-2"><input className="admin-commerce-input" type="number" min="0" aria-label="حداقل روز" placeholder="حداقل روز" value={shippingForm.estimatedDaysMin || ''} onChange={e => setShippingForm({ ...shippingForm, estimatedDaysMin: Number(e.target.value) || undefined })} /><input className="admin-commerce-input" type="number" min="0" aria-label="حداکثر روز" placeholder="حداکثر روز" value={shippingForm.estimatedDaysMax || ''} onChange={e => setShippingForm({ ...shippingForm, estimatedDaysMax: Number(e.target.value) || undefined })} /></div><input className="admin-commerce-input" type="number" min="0" aria-label="ارسال رایگان از مبلغ" placeholder="ارسال رایگان از مبلغ" value={shippingForm.freeAbove || ''} onChange={e => setShippingForm({ ...shippingForm, freeAbove: Number(e.target.value) || undefined })} /><label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={shippingForm.active !== false} onChange={e => setShippingForm({ ...shippingForm, active: e.target.checked })} /> فعال</label><div className="flex gap-2"><button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-lux-gold py-2.5 font-bold text-white"><Save size={16} /> ذخیره</button>{shippingForm.id && <button type="button" onClick={() => setShippingForm({ name: '', price: 0, currency: 'Toman', active: true })} className="rounded-xl border px-3 dark:border-zinc-700 dark:text-white">انصراف</button>}</div></form>
                                        <div className="space-y-3 lg:col-span-3">{shippingMethods.length ? shippingMethods.map(method => <div key={method.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-start justify-between"><div><h3 className="font-bold dark:text-white">{method.name}</h3><p className="mt-1 text-sm text-gray-500">{formatPrice(method.price)}{method.estimatedDaysMin ? ` · ${toPersianDigits(method.estimatedDaysMin)} تا ${toPersianDigits(method.estimatedDaysMax || method.estimatedDaysMin)} روز کاری` : ''}</p></div><span className={`rounded-full px-2 py-1 text-xs ${method.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{method.active ? 'فعال' : 'غیرفعال'}</span></div><p className="mt-2 text-xs text-gray-500">{method.description}</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShippingForm({ ...method })} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ویرایش</button><button onClick={() => void runCommerceAction(`shipping-${method.id}`, () => api.adminDeleteShippingMethod(method.id), 'روش ارسال حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button></div></div>) : <CommerceEmpty text="روش ارسالی ثبت نشده است." />}</div>
                                    </div>
                                )}

                                {commerceSection === 'payments' && <CommerceList empty={payments.length === 0} emptyText="رکورد پرداختی ثبت نشده است.">{payments.map(payment => <div key={payment.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold dark:text-white">پرداخت سفارش #{toPersianDigits(payment.orderId)}</h3><p className="mt-1 text-sm text-gray-500">{payment.provider || payment.method} · {formatPrice(payment.amount)}</p>{payment.transactionId && <p className="mt-1 text-xs text-gray-400" dir="ltr">{payment.transactionId}</p>}</div><select aria-label="وضعیت پرداخت" value={payment.status} onChange={e => void handlePaymentStatus(payment, e.target.value as Payment['status'])} className="admin-commerce-input max-w-48"><option value="unpaid">پرداخت نشده</option><option value="pending">در انتظار</option><option value="paid">پرداخت شده</option><option value="failed">ناموفق</option><option value="cancelled">لغو شده</option><option value="partially_refunded">بازپرداخت جزئی</option><option value="refunded">بازپرداخت شده</option></select></div>{payment.failureReason && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{payment.failureReason}</p>}</div>)}</CommerceList>}

                                {commerceSection === 'reviews' && <CommerceList empty={reviews.length === 0} emptyText="دیدگاهی برای بررسی وجود ندارد.">{reviews.map(review => <div key={review.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">{review.title || 'دیدگاه محصول'} · {review.userName}</h3><p className="mt-1 text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</p></div><span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{review.status === 'approved' ? 'تأییدشده' : review.status === 'rejected' ? 'ردشده' : 'در انتظار'}</span></div><p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{review.body}</p><div className="mt-4 flex justify-end gap-2"><button onClick={() => void runCommerceAction(`review-a-${review.id}`, () => api.adminUpdateReview(review.id, { status: 'approved' }), 'دیدگاه تأیید شد')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">تأیید</button><button onClick={() => void runCommerceAction(`review-r-${review.id}`, () => api.adminUpdateReview(review.id, { status: 'rejected' }), 'دیدگاه رد شد')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">رد</button><button onClick={() => window.confirm('دیدگاه حذف شود؟') && void runCommerceAction(`review-d-${review.id}`, () => api.adminDeleteReview(review.id), 'دیدگاه حذف شد')} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600">حذف</button></div></div>)}</CommerceList>}

                                {commerceSection === 'returns' && <CommerceList empty={returns.length === 0} emptyText="درخواست مرجوعی وجود ندارد.">{returns.map(item => <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">مرجوعی سفارش #{toPersianDigits(item.orderId)}</h3><p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><b>دلیل:</b> {item.reason}</p><p className="mt-1 text-xs text-gray-500">{item.details}</p>{item.adminNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">یادداشت: {item.adminNote}</p>}</div><select aria-label="وضعیت مرجوعی" value={item.status} onChange={e => void runCommerceAction(`return-${item.id}`, () => api.adminUpdateReturn(item.id, { status: e.target.value as ReturnRequest['status'] }), 'وضعیت مرجوعی به‌روزرسانی شد')} className="admin-commerce-input max-w-44"><option value="requested">در انتظار</option><option value="approved">تأیید</option><option value="rejected">رد</option><option value="received">دریافت شده</option><option value="refunded">بازپرداخت</option><option value="cancelled">لغو</option></select></div><div className="mt-4 flex justify-end"><button onClick={() => { const note = window.prompt('یادداشت مدیر', item.adminNote || ''); if (note !== null) void runCommerceAction(`return-note-${item.id}`, () => api.adminUpdateReturn(item.id, { adminNote: note }), 'یادداشت ذخیره شد'); }} className="rounded-lg border px-3 py-1.5 text-xs font-bold dark:border-zinc-700 dark:text-white">ثبت یادداشت</button></div></div>)}</CommerceList>}

                                {commerceSection === 'bespoke' && <CommerceList empty={bespokeRequests.length === 0} emptyText="درخواست سفارشی‌دوزی وجود ندارد.">{bespokeRequests.map((request, index) => <div key={request.id || index} className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold dark:text-white">{request.name} · {request.garmentType}</h3><p className="mt-1 text-sm text-gray-500" dir="ltr">{request.phone} {request.email ? `· ${request.email}` : ''}</p>{request.preferredDate && <p className="mt-1 text-xs text-gray-500">تاریخ ترجیحی: {request.preferredDate}</p>}<p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{request.description}</p></div>{request.id && <select aria-label="وضعیت درخواست" value={request.status || 'new'} onChange={e => void runCommerceAction(`bespoke-${request.id}`, () => api.adminUpdateBespokeRequest(request.id!, { status: e.target.value as BespokeRequest['status'] }), 'وضعیت درخواست به‌روزرسانی شد')} className="admin-commerce-input max-w-44"><option value="new">جدید</option><option value="contacted">تماس گرفته شد</option><option value="scheduled">وقت تعیین شد</option><option value="completed">تکمیل شد</option><option value="cancelled">لغو شد</option></select>}</div></div>)}</CommerceList>}
                            </>
                        )}
                    </div>
{commerceSection !== 'capabilities' && <Pagination page={commercePage} current={currentPage} onChange={setCurrentPage} busy={commerceLoading} />}
</fieldset>;
}
