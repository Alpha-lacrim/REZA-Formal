import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, Loader2, Ruler, Scissors, UserCheck } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import ImageLoader from '../components/ImageLoader';
import SEO from '../components/SEO';

const BespokePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast, user, siteSettings } = useGlobal();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [error, setError] = useState('');
    const [requestId, setRequestId] = useState('');
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        date: '',
        type: 'suit',
        desc: '',
    });

    useEffect(() => window.scrollTo(0, 0), []);
    useEffect(() => {
        if (!user) return;
        setFormData(current => ({
            ...current,
            name: current.name || user.name,
            phone: current.phone || user.phone || '',
            email: current.email || user.email,
        }));
    }, [user]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await api.submitBespokeRequest({
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || undefined,
                preferredDate: formData.date || undefined,
                garmentType: formData.type,
                description: formData.desc.trim() || undefined,
            });
            setRequestId(result.id || '');
            setStep(3);
            showToast('درخواست شما با موفقیت ثبت شد');
        } catch (submissionError: any) {
            const message = submissionError?.message || 'ثبت درخواست انجام نشد؛ لطفاً دوباره تلاش کنید';
            setError(message);
            showToast(message);
        } finally {
            setLoading(false);
        }
    };

    const processSteps = [
        { icon: <UserCheck size={30} />, title: 'مشاوره استایل', desc: 'انتخاب مدل و پارچه متناسب با نیاز و سلیقه شما.' },
        { icon: <Ruler size={30} />, title: 'اندازه‌گیری دقیق', desc: 'ثبت اندازه‌ها برای ساخت الگوی اختصاصی لباس.' },
        { icon: <Scissors size={30} />, title: 'دوخت و پرو', desc: 'دوخت تخصصی و انجام پروهای لازم پیش از تحویل.' },
        { icon: <CheckCircle size={30} />, title: 'تحویل نهایی', desc: 'بازبینی کیفیت و تحویل سفارش آماده‌شده.' },
    ];

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO title="آتلیه دوخت اختصاصی" description="ثبت درخواست واقعی مشاوره و دوخت اختصاصی REZA Formal" />
            <header className="relative text-center bg-lux-black text-white py-10 overflow-hidden">
                <div className="relative mx-auto max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-3">آتلیه دوخت اختصاصی</h1>
                    <p className="text-white/75 text-sm md:text-base">لباسی که دقیقاً برای شما طراحی و دوخته می‌شود</p>
                </div>
                <div className="absolute inset-x-0 top-1/2 h-32 bg-lux-gold/20 blur-3xl" />
            </header>
            <div className="bg-lux-black px-4 pb-4">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md text-sm">
                    <ArrowLeft size={14} /> بازگشت
                </button>
            </div>

            <main className="container max-w-6xl mx-auto px-4 py-12">
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch mb-16">
                    <div className="relative min-h-[420px] rounded-xl overflow-hidden bg-zinc-800">
                        <ImageLoader
                            src={siteSettings?.bespokeSectionImage || '/images/utilities/bespoke.webp'}
                            alt="آتلیه دوخت اختصاصی"
                            className="absolute inset-0 w-full h-full"
                            loading="eager"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 p-8 text-white">
                            <h2 className="font-serif text-3xl mb-3">تجربه پوشاک شخصی‌دوز</h2>
                            <p className="text-white/80 leading-7">پس از ثبت فرم، تیم آتلیه برای هماهنگی مشاوره و زمان مراجعه با شما تماس می‌گیرد.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm p-6 md:p-8">
                        {step === 1 && (
                            <div className="h-full flex flex-col justify-center">
                                <h2 className="text-2xl font-bold text-lux-black dark:text-white mb-6">مراحل سفارش</h2>
                                <div className="space-y-5 mb-8">
                                    {processSteps.map((item, index) => (
                                        <div key={item.title} className="flex gap-4">
                                            <div className="w-12 h-12 shrink-0 rounded-full bg-lux-gold/10 text-lux-gold flex items-center justify-center">{item.icon}</div>
                                            <div>
                                                <h3 className="font-bold dark:text-white">{index + 1}. {item.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setStep(2)} className="w-full bg-lux-gold text-white py-4 rounded-lg font-bold hover:brightness-95">ثبت درخواست مشاوره</button>
                            </div>
                        )}

                        {step === 3 ? (
                            <div className="h-full flex flex-col justify-center items-center text-center py-10">
                                <CheckCircle size={72} className="text-green-500 mb-5" />
                                <h2 className="text-2xl font-bold text-lux-black dark:text-white mb-3">درخواست ثبت شد</h2>
                                <p className="text-gray-500 dark:text-gray-400 leading-7">همکاران آتلیه برای هماهنگی با شما تماس خواهند گرفت.</p>
                                {requestId && <p className="mt-3 text-sm text-gray-400">شناسه پیگیری: <span dir="ltr">{requestId}</span></p>}
                                <button onClick={() => navigate('/')} className="mt-8 text-lux-gold hover:underline font-bold">بازگشت به صفحه اصلی</button>
                            </div>
                        ) : step === 2 ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-lux-black dark:text-white">اطلاعات درخواست</h2>
                                    <button type="button" onClick={() => setStep(1)} className="text-sm text-lux-gold">مشاهده مراحل</button>
                                </div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    نام و نام خانوادگی
                                    <input required value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} className="mt-2 w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none focus:border-lux-gold" />
                                </label>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        شماره تماس
                                        <input dir="ltr" type="tel" required value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value })} placeholder="0912..." className="mt-2 w-full p-3 text-left border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none focus:border-lux-gold" />
                                    </label>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        ایمیل (اختیاری)
                                        <input dir="ltr" type="email" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })} className="mt-2 w-full p-3 text-left border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none focus:border-lux-gold" />
                                    </label>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        نوع سفارش
                                        <select value={formData.type} onChange={event => setFormData({ ...formData, type: event.target.value })} className="mt-2 w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none">
                                            <option value="suit">کت و شلوار</option>
                                            <option value="shirt">پیراهن</option>
                                            <option value="coat">پالتو</option>
                                            <option value="wedding">لباس دامادی</option>
                                        </select>
                                    </label>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        تاریخ پیشنهادی
                                        <span className="relative block mt-2">
                                            <input type="date" value={formData.date} onChange={event => setFormData({ ...formData, date: event.target.value })} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none" />
                                            <Calendar className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
                                        </span>
                                    </label>
                                </div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    توضیحات تکمیلی
                                    <textarea rows={3} value={formData.desc} onChange={event => setFormData({ ...formData, desc: event.target.value })} placeholder="زمان مناسب تماس یا جزئیات موردنظر شما" className="mt-2 w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none focus:border-lux-gold" />
                                </label>
                                {error && <p role="alert" className="p-3 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 text-sm">{error}</p>}
                                <button type="submit" disabled={loading} className="w-full bg-lux-gold text-white py-4 rounded-lg font-bold hover:brightness-95 disabled:opacity-60 flex justify-center items-center gap-2">
                                    {loading ? <><Loader2 className="animate-spin" size={20} /> در حال ثبت</> : 'ثبت درخواست'}
                                </button>
                            </form>
                        ) : null}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default BespokePage;
