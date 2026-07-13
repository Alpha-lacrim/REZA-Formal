import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Banknote, CheckCircle, Loader2, MapPin, Minus, Plus, RefreshCw, Tag, Trash2, Truck } from 'lucide-react';
import { cartLineKey, useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import { Address, CheckoutOptions, CheckoutQuote, CheckoutRequest, CheckoutResult, PaymentMethod } from '../types';
import { formatPrice, toPersianDigits } from '../utils';
import ImageLoader from '../components/ImageLoader';
import SEO from '../components/SEO';

const supportedManualMethods = new Set(['cod', 'bank_transfer', 'manual']);
const paymentLabel = (method: PaymentMethod) => ({
    cod: 'پرداخت در محل',
    bank_transfer: 'واریز بانکی پس از ثبت سفارش',
    manual: 'پرداخت با هماهنگی فروشگاه',
}[method] || method);

const makeIdempotencyKey = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const CartPage: React.FC = () => {
    const {
        cartLines,
        updateQty,
        removeFromCart,
        user,
        setAuthModalOpen,
        clearCart,
        showToast,
        products,
        refreshProducts,
        catalogSource,
    } = useGlobal();
    const navigate = useNavigate();
    const idempotencyKey = useRef(makeIdempotencyKey());
    const [options, setOptions] = useState<CheckoutOptions | null>(null);
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState('new');
    const [shippingMethodId, setShippingMethodId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [address, setAddress] = useState<Address>({
        recipientName: user?.name || '',
        phone: user?.phone || '',
        province: '',
        city: '',
        postalCode: '',
        addressLine: user?.address || '',
        label: 'منزل',
    });
    const [saveAddress, setSaveAddress] = useState(true);
    const [couponInput, setCouponInput] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [customerNote, setCustomerNote] = useState('');
    const [quote, setQuote] = useState<CheckoutQuote | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<CheckoutResult | null>(null);

    const items = useMemo(() => cartLines.flatMap(line => {
        const product = products.find(item => item.id === line.productId);
        if (!product) return [];
        const variant = line.variantId ? product.variants?.find(item => item.id === line.variantId) : undefined;
        return [{ line, product, variant, key: cartLineKey(line), price: variant?.price ?? product.price }];
    }), [cartLines, products]);
    const localSubtotal = items.reduce((sum, item) => sum + item.price * item.line.quantity, 0);
    const manualPaymentMethods = (options?.paymentMethods || []).filter(method => supportedManualMethods.has(method));

    useEffect(() => {
        void (async () => {
            setOptionsLoading(true);
            try {
                const checkoutOptions = await api.getCheckoutOptions();
                setOptions(checkoutOptions);
                setShippingMethodId(checkoutOptions.defaultShippingMethodId || checkoutOptions.shippingMethods[0]?.id || '');
                const availableMethods = checkoutOptions.paymentMethods.filter(method => supportedManualMethods.has(method));
                const defaultMethod = checkoutOptions.defaultPaymentMethod && availableMethods.includes(checkoutOptions.defaultPaymentMethod)
                    ? checkoutOptions.defaultPaymentMethod
                    : availableMethods[0] || '';
                setPaymentMethod(defaultMethod);
            } catch (loadError: any) {
                setError(loadError?.message || 'روش‌های ارسال و پرداخت از سرور دریافت نشد');
            } finally {
                setOptionsLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!user) return;
        setAddress(current => ({
            ...current,
            recipientName: current.recipientName || user.name,
            phone: current.phone || user.phone || '',
            addressLine: current.addressLine || user.address || '',
        }));
        void api.getAddresses().then(savedAddresses => {
            setAddresses(savedAddresses);
            const defaultAddress = savedAddresses.find(item => item.isDefault) || savedAddresses[0];
            if (defaultAddress?.id) setSelectedAddressId(defaultAddress.id);
        }).catch(() => undefined);
    }, [user?.id]);

    const checkoutItems = (): CheckoutRequest['items'] => cartLines.map(line => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
    }));

    const buildRequest = (activeCoupon = couponCode): CheckoutRequest => ({
        items: checkoutItems(),
        idempotencyKey: idempotencyKey.current,
        addressId: selectedAddressId !== 'new' ? selectedAddressId : undefined,
        shippingAddress: selectedAddressId === 'new' ? address : undefined,
        shippingMethodId: shippingMethodId || undefined,
        paymentMethod: paymentMethod || 'cod',
        couponCode: activeCoupon || undefined,
        customerNote: customerNote.trim() || undefined,
        quoteId: quote?.id,
    });

    const requestQuote = async (activeCoupon = couponCode) => {
        if (!cartLines.length || !paymentMethod || (options?.shippingMethods.length && !shippingMethodId)) return;
        setQuoteLoading(true);
        setError('');
        try {
            setQuote(await api.quoteCheckout(buildRequest(activeCoupon)));
        } catch (quoteError: any) {
            setQuote(null);
            setError(quoteError?.message || 'محاسبه مبلغ سفارش انجام نشد');
        } finally {
            setQuoteLoading(false);
        }
    };

    useEffect(() => {
        if (!options || !paymentMethod || cartLines.length === 0) return;
        const timer = window.setTimeout(() => void requestQuote(), 350);
        return () => window.clearTimeout(timer);
    }, [cartLines, shippingMethodId, paymentMethod, options, user?.id]);

    const chooseSavedAddress = (id: string) => {
        setSelectedAddressId(id);
        const saved = addresses.find(item => item.id === id);
        if (saved) setAddress(saved);
    };

    const validateAddress = () => {
        if (selectedAddressId !== 'new') return true;
        return Boolean(
            address.recipientName.trim()
            && address.phone.trim()
            && address.province.trim()
            && address.city.trim()
            && address.postalCode.trim()
            && address.addressLine.trim(),
        );
    };

    const handleCheckout = async () => {
        setError('');
        if (!user) {
            setAuthModalOpen(true);
            showToast('برای ثبت سفارش لطفاً وارد شوید');
            return;
        }
        if (catalogSource !== 'server') {
            setError('ارتباط با فروشگاه برقرار نیست؛ ثبت سفارش با اطلاعات آفلاین امکان‌پذیر نیست');
            return;
        }
        if (!validateAddress()) {
            setError('لطفاً همه بخش‌های آدرس تحویل را کامل کنید');
            return;
        }
        if (!shippingMethodId && options?.shippingMethods.length) {
            setError('روش ارسال را انتخاب کنید');
            return;
        }
        if (!paymentMethod || !supportedManualMethods.has(paymentMethod)) {
            setError('روش پرداخت قابل استفاده‌ای ارائه نشده است');
            return;
        }
        if (!quote) {
            setError('پیش‌فاکتور سرور آماده نیست؛ دوباره محاسبه کنید');
            return;
        }

        setCheckoutLoading(true);
        try {
            let finalAddressId = selectedAddressId !== 'new' ? selectedAddressId : undefined;
            if (!finalAddressId && saveAddress) {
                try {
                    const saved = await api.createAddress(address);
                    finalAddressId = saved.id;
                    if (saved.id) setAddresses(previous => [...previous, saved]);
                } catch {
                    // Address persistence is optional; checkout can use its snapshot directly.
                }
            }
            const request = buildRequest();
            if (finalAddressId) {
                request.addressId = finalAddressId;
                request.shippingAddress = undefined;
            }
            const checkoutResult = await api.createCheckout(request);
            setResult(checkoutResult);
            clearCart();
            await refreshProducts();
            showToast('سفارش با موفقیت ثبت شد');
        } catch (checkoutError: any) {
            const message = checkoutError?.message || 'ثبت سفارش انجام نشد';
            setError(message);
            showToast(message);
        } finally {
            setCheckoutLoading(false);
        }
    };

    if (result) {
        return (
            <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-28 px-4">
                <SEO title="تأیید سفارش" />
                <main className="max-w-xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm p-8 text-center">
                    <CheckCircle size={72} className="mx-auto text-green-500 mb-5" />
                    <h1 className="text-3xl font-bold text-lux-black dark:text-white mb-3">سفارش شما ثبت شد</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">وضعیت سفارش و مراحل ارسال از حساب کاربری قابل پیگیری است.</p>
                    <dl className="text-sm bg-gray-50 dark:bg-zinc-900 rounded-lg p-4 space-y-3 mb-7">
                        <div className="flex justify-between"><dt className="text-gray-500">شناسه سفارش</dt><dd dir="ltr" className="font-bold dark:text-white">{result.order.id}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">مبلغ نهایی</dt><dd className="font-bold text-lux-gold">{formatPrice(result.order.total)}</dd></div>
                        <div className="flex justify-between"><dt className="text-gray-500">روش پرداخت</dt><dd className="dark:text-white">{paymentLabel(result.order.paymentMethod || paymentMethod || 'cod')}</dd></div>
                    </dl>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link to="/profile" className="flex-1 py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-bold">پیگیری سفارش</Link>
                        <Link to="/catalog" className="flex-1 py-3 border border-gray-300 dark:border-zinc-600 dark:text-white rounded-lg font-bold">ادامه خرید</Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO title="سبد خرید" />
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden">
                <div className="relative mx-auto max-w-4xl px-4 z-10"><h1 className="font-serif text-3xl md:text-5xl mb-2">سبد خرید</h1><p className="text-white/80 text-sm">قیمت، تخفیف و ارسال توسط سرور محاسبه می‌شود</p></div>
                <div className="absolute inset-x-0 top-1/2 h-32 bg-lux-gold/20 blur-3xl" />
            </header>
            <div className="bg-lux-black px-4 pb-4">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md text-sm"><ArrowLeft size={14} /> بازگشت</button>
            </div>

            <main className="container max-w-6xl mx-auto px-4 py-12">
                {cartLines.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xl text-gray-500 dark:text-gray-400 mb-6">سبد خرید شما خالی است.</p>
                        <Link to="/catalog" className="inline-block px-6 py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg">بازگشت به فروشگاه</Link>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-[1fr_390px] gap-8 items-start">
                        <div className="space-y-6">
                            {catalogSource !== 'server' && (
                                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 flex gap-2 text-sm"><AlertCircle size={18} className="shrink-0" />کالاها از نسخه آفلاین نمایش داده شده‌اند. تا اتصال دوباره سرور، ثبت سفارش غیرفعال است.</div>
                            )}
                            <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 divide-y divide-gray-100 dark:divide-zinc-700">
                                {items.map(({ line, product, variant, key, price }) => (
                                    <article key={key} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                                        <div className="w-24 h-32 shrink-0 rounded overflow-hidden bg-gray-100"><ImageLoader src={variant?.image || product.image} alt={product.name} className="w-full h-full" loading="lazy" /></div>
                                        <div className="flex-1">
                                            <h2 className="font-serif text-lg font-bold text-lux-black dark:text-white">{product.name}</h2>
                                            {variant && <p className="text-sm text-gray-500 mt-1">{[variant.size && `سایز ${variant.size}`, variant.color && `رنگ ${variant.color}`].filter(Boolean).join('، ') || variant.name || variant.sku}</p>}
                                            <p className="font-semibold text-lux-gold mt-2">{formatPrice(price)}</p>
                                            {(variant?.stock ?? product.stock ?? 99) < 5 && <p className="text-xs text-orange-500 mt-1">تنها {toPersianDigits(variant?.stock ?? product.stock)} عدد باقی مانده</p>}
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-5">
                                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-900 rounded-lg p-1 border border-gray-200 dark:border-zinc-700">
                                                <button onClick={() => updateQty(key, -1)} className="p-1 dark:text-white" aria-label="کاهش تعداد"><Minus size={16} /></button>
                                                <span className="w-8 text-center font-bold dark:text-white">{toPersianDigits(line.quantity)}</span>
                                                <button onClick={() => updateQty(key, 1)} className="p-1 dark:text-white" aria-label="افزایش تعداد"><Plus size={16} /></button>
                                            </div>
                                            <button onClick={() => removeFromCart(key)} className="text-gray-400 hover:text-red-500" aria-label="حذف کالا"><Trash2 size={20} /></button>
                                        </div>
                                    </article>
                                ))}
                            </section>

                            <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
                                <h2 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><MapPin size={20} /> آدرس تحویل</h2>
                                {user ? (
                                    <div className="space-y-4">
                                        {addresses.length > 0 && (
                                            <label className="block text-sm text-gray-600 dark:text-gray-300">آدرس‌های ذخیره‌شده
                                                <select value={selectedAddressId} onChange={event => chooseSavedAddress(event.target.value)} className="mt-2 w-full p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white">
                                                    {addresses.map(item => <option key={item.id} value={item.id}>{item.label || item.city} — {item.addressLine}</option>)}
                                                    <option value="new">آدرس جدید</option>
                                                </select>
                                            </label>
                                        )}
                                        {selectedAddressId === 'new' && (
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <input value={address.recipientName} onChange={event => setAddress({ ...address, recipientName: event.target.value })} placeholder="نام تحویل‌گیرنده" className="p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <input dir="ltr" value={address.phone} onChange={event => setAddress({ ...address, phone: event.target.value })} placeholder="شماره تماس" className="p-3 border rounded-lg text-left dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <input value={address.province} onChange={event => setAddress({ ...address, province: event.target.value })} placeholder="استان" className="p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <input value={address.city} onChange={event => setAddress({ ...address, city: event.target.value })} placeholder="شهر" className="p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <input dir="ltr" value={address.postalCode} onChange={event => setAddress({ ...address, postalCode: event.target.value })} placeholder="کد پستی" className="p-3 border rounded-lg text-left dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <input value={address.label || ''} onChange={event => setAddress({ ...address, label: event.target.value })} placeholder="عنوان آدرس، مانند منزل" className="p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <textarea value={address.addressLine} onChange={event => setAddress({ ...address, addressLine: event.target.value })} placeholder="نشانی کامل، پلاک و واحد" rows={3} className="sm:col-span-2 p-3 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
                                                <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} className="accent-lux-gold" /> ذخیره این آدرس در حساب کاربری</label>
                                            </div>
                                        )}
                                    </div>
                                ) : <p className="text-sm text-amber-700 dark:text-amber-300">برای انتخاب یا ثبت آدرس وارد حساب کاربری شوید.</p>}
                            </section>

                            <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
                                <h2 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Truck size={20} /> روش ارسال</h2>
                                {optionsLoading ? <Loader2 className="animate-spin text-lux-gold" /> : options?.shippingMethods.length ? (
                                    <div className="space-y-3">{options.shippingMethods.map(method => (
                                        <label key={method.id} className={`block p-4 border rounded-lg cursor-pointer ${shippingMethodId === method.id ? 'border-lux-gold bg-lux-gold/5' : 'border-gray-200 dark:border-zinc-600'}`}>
                                            <span className="flex items-center gap-3"><input type="radio" name="shipping" checked={shippingMethodId === method.id} onChange={() => setShippingMethodId(method.id)} className="accent-lux-gold" /><strong className="dark:text-white">{method.name}</strong><span className="mr-auto text-lux-gold">{formatPrice(method.price)}</span></span>
                                            {method.description && <span className="block text-xs text-gray-500 mt-2 mr-7">{method.description}</span>}
                                        </label>
                                    ))}</div>
                                ) : <p className="text-sm text-red-500">روش ارسال فعالی ارائه نشده است.</p>}
                            </section>

                            <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
                                <h2 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Banknote size={20} /> روش پرداخت</h2>
                                {manualPaymentMethods.length ? <div className="space-y-3">{manualPaymentMethods.map(method => (
                                    <label key={method} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${paymentMethod === method ? 'border-lux-gold bg-lux-gold/5' : 'border-gray-200 dark:border-zinc-600'}`}>
                                        <input type="radio" name="payment" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="accent-lux-gold" />
                                        <span className="dark:text-white font-medium">{paymentLabel(method)}</span>
                                    </label>
                                ))}</div> : !optionsLoading && <p className="text-sm text-red-500">در حال حاضر روش پرداخت دستی یا پرداخت در محل فعال نیست.</p>}
                            </section>
                        </div>

                        <aside className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-200 dark:border-zinc-700 sticky top-24">
                            <h2 className="font-bold text-lg dark:text-white mb-5 border-b pb-4 border-gray-200 dark:border-zinc-700">خلاصه سفارش</h2>
                            <div className="flex gap-2 mb-5">
                                <div className="relative flex-1"><Tag size={15} className="absolute right-3 top-3 text-gray-400" /><input value={couponInput} onChange={event => setCouponInput(event.target.value.toUpperCase())} placeholder="کد تخفیف" className="w-full py-2 pr-9 pl-2 border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" /></div>
                                <button onClick={() => { const code = couponInput.trim(); setCouponCode(code); void requestQuote(code); }} disabled={quoteLoading} className="px-3 bg-gray-100 dark:bg-zinc-700 dark:text-white rounded-lg text-sm">اعمال</button>
                            </div>
                            <div className="space-y-3 text-sm mb-5">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>جمع کالاها</span><span>{formatPrice(quote?.subtotal ?? localSubtotal)}</span></div>
                                {quote && <>
                                    {quote.discountTotal > 0 && <div className="flex justify-between text-green-600"><span>تخفیف</span><span>− {formatPrice(quote.discountTotal)}</span></div>}
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>ارسال</span><span>{quote.shippingTotal > 0 ? formatPrice(quote.shippingTotal) : 'رایگان'}</span></div>
                                    {quote.taxTotal > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>مالیات</span><span>{formatPrice(quote.taxTotal)}</span></div>}
                                </>}
                                <div className="flex justify-between text-xl font-bold text-lux-black dark:text-white border-t border-gray-100 dark:border-zinc-700 pt-4"><span>مبلغ نهایی</span><span>{quote ? formatPrice(quote.total) : '—'}</span></div>
                            </div>
                            <label className="block text-sm text-gray-500 mb-5">یادداشت سفارش (اختیاری)<textarea value={customerNote} onChange={event => setCustomerNote(event.target.value)} rows={2} className="mt-2 w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" /></label>
                            {quoteLoading && <p className="mb-4 text-xs text-gray-500 flex gap-2"><Loader2 size={15} className="animate-spin" /> در حال دریافت پیش‌فاکتور سرور</p>}
                            {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 text-sm rounded flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" />{error}</div>}
                            {!quote && !quoteLoading && <button onClick={() => void requestQuote()} className="mb-3 w-full py-3 border border-lux-gold text-lux-gold rounded-lg font-bold flex justify-center gap-2"><RefreshCw size={18} /> محاسبه دوباره</button>}
                            <button onClick={handleCheckout} disabled={checkoutLoading || quoteLoading || catalogSource !== 'server' || !quote || !manualPaymentMethods.length} className="w-full py-4 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-lg font-bold rounded-lg flex justify-center items-center gap-2 disabled:opacity-50">
                                {checkoutLoading ? <><Loader2 size={20} className="animate-spin" /> در حال ثبت</> : 'ثبت نهایی سفارش'}
                            </button>
                            <p className="text-[11px] leading-5 text-gray-400 mt-3">با ثبت سفارش، شرایط فروش و سیاست مرجوعی را می‌پذیرید. مبلغ نهایی فقط از پیش‌فاکتور سرور خوانده می‌شود.</p>
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CartPage;
