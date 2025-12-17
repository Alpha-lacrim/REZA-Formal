import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scissors, Ruler, UserCheck, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import ImageLoader from '../components/ImageLoader';
import SEO from '../components/SEO';

const BespokePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useGlobal();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Form, 3: Success

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        date: '',
        type: 'suit', // suit, shirt, coat
        desc: ''
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setStep(3);
            showToast('درخواست شما با موفقیت ثبت شد');
        }, 1500);
    };

    const processSteps = [
        { icon: <UserCheck size={32} />, title: "مشاوره استایل", desc: "دیدار با طراحان ما برای انتخاب پارچه و مدل مناسب شخصیت شما." },
        { icon: <Ruler size={32} />, title: "اندازه‌گیری دقیق", desc: "ثبت بیش از ۳۰ اندازه مختلف بدن برای ایجاد الگوی اختصاصی." },
        { icon: <Scissors size={32} />, title: "دوخت و پرو", desc: "دوخت استادانه و انجام پروهای میانی برای رفع ایرادات جزئی." },
        { icon: <CheckCircle size={32} />, title: "تحویل نهایی", desc: "تحویل لباس آماده شده با بالاترین استانداردهای کیفی." }
    ];

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO 
                title="آتلیه دوخت سفارشی" 
                description="خدمات دوخت سفارشی (Bespoke) رضا فرمال. تجربه پوشیدن کت و شلواری که تنها برای شما ساخته شده است."
                image="https://picsum.photos/1200/800?random=bespoke"
            />
            
            {/* Header */}
            <header className="relative text-center bg-lux-black text-white py-12 overflow-hidden">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-4">آتلیه دوخت سفارشی</h1>
                    <p className="text-white/80 text-sm md:text-base font-light tracking-wide">اوج هنر خیاطی، برازنده قامت شما</p>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-40 bg-lux-gold/10 rounded-full blur-3xl"></div>
            </header>

            <div className="bg-lux-black px-4 pb-4">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md hover:brightness-95 text-xs md:text-sm">
                    <ArrowLeft size={14} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-6xl mx-auto px-4 py-12">
                
                {/* Intro Section */}
                <div className="flex flex-col lg:flex-row gap-12 items-center mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-full lg:w-1/2 h-[400px] rounded-xl overflow-hidden shadow-2xl relative group">
                        <ImageLoader 
                            src="https://picsum.photos/800/600?random=tailor" 
                            alt="Master Tailor" 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                            loading="eager"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-6 right-6 text-white">
                            <p className="text-lux-gold uppercase text-xs font-bold mb-1">تجربه اختصاصی</p>
                            <h3 className="font-serif text-2xl">هنر دست دوزندگان ماهر</h3>
                        </div>
                    </div>
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-3xl font-serif font-bold text-lux-black dark:text-white mb-6">
                            چرا دوخت سفارشی؟
                        </h2>
                        <div className="text-gray-600 dark:text-gray-300 leading-8 text-justify text-lg font-light mb-8">
                            لباس سفارشی (Bespoke) فراتر از یک پوشش ساده است؛ این بازتابی از شخصیت، جایگاه و سلیقه منحصر به فرد شماست. در رضا فرمال، ما با ترکیب سنت‌های دیرینه خیاطی ایتالیایی و تکنیک‌های مدرن، لباسی را خلق می‌کنیم که مانند پوست دوم بر تن شما می‌نشیند. انتخاب پارچه از میان برندهای معتبر جهانی نظیر Loro Piana و Zegna تنها شروع این سفر جذاب است.
                        </div>
                        <button 
                            onClick={() => document.getElementById('reservation-form')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-all btn-ripple"
                        >
                            رزرو وقت مشاوره
                        </button>
                    </div>
                </div>

                {/* Process Steps */}
                <div className="mb-20">
                    <h3 className="text-center text-2xl font-serif font-bold text-lux-black dark:text-white mb-12 relative inline-block w-full">
                        <span className="bg-lux-body dark:bg-zinc-900 px-4 relative z-10">مراحل کار</span>
                        <span className="absolute top-1/2 left-0 w-full h-px bg-gray-200 dark:bg-zinc-700 -z-0"></span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {processSteps.map((step, idx) => (
                            <div key={idx} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 text-center hover:-translate-y-2 transition-transform duration-300 group">
                                <div className="w-16 h-16 mx-auto bg-gray-50 dark:bg-zinc-700 rounded-full flex items-center justify-center text-lux-gold mb-4 group-hover:bg-lux-gold group-hover:text-white transition-colors">
                                    {step.icon}
                                </div>
                                <h4 className="font-bold text-lg mb-2 text-lux-black dark:text-white">{step.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reservation Form */}
                <div id="reservation-form" className="max-w-4xl mx-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="bg-lux-black p-8 text-white flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-lux-gold/10 opacity-20" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}></div>
                            <div className="relative z-10">
                                <h3 className="font-serif text-3xl mb-4">رزرو وقت</h3>
                                <p className="text-gray-300 font-light mb-8 leading-relaxed">
                                    جهت دریافت مشاوره حضوری و اندازه‌گیری، لطفاً فرم مقابل را تکمیل نمایید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.
                                </p>
                                <ul className="space-y-4 text-sm">
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="text-lux-gold" size={20} />
                                        <span>مشاوره رایگان استایل</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="text-lux-gold" size={20} />
                                        <span>تنوع بیش از ۱۰۰۰ مدل پارچه</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <CheckCircle className="text-lux-gold" size={20} />
                                        <span>گارانتی مادام‌العمر دوخت</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-8">
                            {step === 3 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10 animate-in zoom-in">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                                        <CheckCircle size={40} />
                                    </div>
                                    <h4 className="text-2xl font-bold text-lux-black dark:text-white mb-2">درخواست ثبت شد</h4>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                                        با تشکر از انتخاب شما. همکاران ما به زودی با شماره تماس ثبت شده تماس خواهند گرفت.
                                    </p>
                                    <button 
                                        onClick={() => navigate('/')}
                                        className="text-lux-gold hover:underline font-bold"
                                    >
                                        بازگشت به صفحه اصلی
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نام و نام خانوادگی</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none transition-colors"
                                            placeholder="مثال: علی محمدی"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">شماره تماس</label>
                                        <input 
                                            type="tel" 
                                            required
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none transition-colors text-left dir-ltr"
                                            placeholder="0912..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع سفارش</label>
                                            <select 
                                                value={formData.type}
                                                onChange={e => setFormData({...formData, type: e.target.value})}
                                                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none"
                                            >
                                                <option value="suit">کت و شلوار</option>
                                                <option value="shirt">پیراهن</option>
                                                <option value="coat">پالتو</option>
                                                <option value="wedding">دامادی</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">تاریخ پیشنهادی</label>
                                            <div className="relative">
                                                <input 
                                                    type="date" 
                                                    value={formData.date}
                                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none"
                                                />
                                                <Calendar className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">توضیحات تکمیلی (اختیاری)</label>
                                        <textarea 
                                            rows={3}
                                            value={formData.desc}
                                            onChange={e => setFormData({...formData, desc: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none transition-colors"
                                            placeholder="ساعت مناسب تماس یا توضیحات خاص..."
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-lux-gold text-white py-4 rounded-lg font-bold hover:bg-lux-gold-dark transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex justify-center items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : 'ثبت درخواست'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default BespokePage;