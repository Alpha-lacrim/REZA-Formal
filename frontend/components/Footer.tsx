import React, { useState } from 'react';
import { Instagram, Loader2, Mail, MapPin, Phone, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useGlobal } from '../contexts/GlobalContext';

const Footer: React.FC = () => {
    const { showToast } = useGlobal();
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [subscribed, setSubscribed] = useState(false);

    const subscribe = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim()) return;
        setSubmitting(true);
        try {
            await api.subscribeNewsletter(email.trim());
            setSubscribed(true);
            setEmail('');
            showToast('عضویت در خبرنامه با موفقیت ثبت شد');
        } catch (error: any) {
            showToast(error?.message || 'ثبت عضویت خبرنامه انجام نشد');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <footer className="bg-lux-black text-white py-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-10">
                    <div>
                        <Link to="/" className="font-logo text-xl tracking-widest font-bold text-white mb-4 block">
                            REZA <span className="text-lux-gold">Formal</span>
                        </Link>
                        <p className="text-gray-400 text-xs leading-7 font-light mb-5">
                            مجموعه‌ای منتخب از پوشاک رسمی مردانه با تمرکز بر کیفیت، تناسب و خدمات حرفه‌ای.
                        </p>
                        <form onSubmit={subscribe} className="space-y-2">
                            <label htmlFor="newsletter-email" className="text-xs text-gray-300 flex items-center gap-2"><Mail size={14} className="text-lux-gold" /> خبرنامه محصولات و پیشنهادها</label>
                            {subscribed ? (
                                <p className="text-xs text-green-400">عضویت شما ثبت شد.</p>
                            ) : (
                                <div className="flex">
                                    <input id="newsletter-email" dir="ltr" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="min-w-0 flex-1 rounded-r-md bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-left outline-none focus:border-lux-gold" />
                                    <button type="submit" disabled={submitting} className="rounded-l-md bg-lux-gold text-white px-3 text-xs font-bold disabled:opacity-60" aria-label="عضویت در خبرنامه">
                                        {submitting ? <Loader2 size={15} className="animate-spin" /> : 'عضویت'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">محصولات</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><Link to="/catalog" className="hover:text-white">همه محصولات</Link></li>
                            <li><Link to="/catalog?category=suits" className="hover:text-white">کت و شلوار</Link></li>
                            <li><Link to="/catalog?category=shirts" className="hover:text-white">پیراهن</Link></li>
                            <li><Link to="/catalog?category=blazers" className="hover:text-white">کت و پالتو</Link></li>
                            <li><Link to="/catalog?category=accessories" className="hover:text-white">اکسسوری</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">دسترسی سریع</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><Link to="/catalog" className="hover:text-white">فروشگاه</Link></li>
                            <li><Link to="/about" className="hover:text-white">درباره ما</Link></li>
                            <li><Link to="/bespoke" className="hover:text-white">آتلیه دوخت</Link></li>
                            <li><Link to="/wishlist" className="hover:text-white">علاقه‌مندی‌ها</Link></li>
                            <li><Link to="/profile" className="hover:text-white">حساب کاربری</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">راهنمای خرید</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><Link to="/policies/terms" className="hover:text-white">شرایط فروش</Link></li>
                            <li><Link to="/policies/payment" className="hover:text-white">روش‌های پرداخت</Link></li>
                            <li><Link to="/policies/shipping" className="hover:text-white">ارسال و تحویل</Link></li>
                            <li><Link to="/policies/returns" className="hover:text-white">مرجوعی و بازپرداخت</Link></li>
                            <li><Link to="/policies/privacy" className="hover:text-white">حریم خصوصی</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">اطلاعات تماس</h4>
                        <ul className="space-y-3 text-xs text-gray-400 font-light">
                            <li>
                                <a href="https://maps.app.goo.gl/fNavZWw1fwAEMyME9?g_st=atm" target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:text-white">
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-lux-gold" />
                                    <span className="leading-6">تهران، خیابان میرداماد، مرکز خرید آریان، طبقه همکف، واحد ۳۵</span>
                                </a>
                            </li>
                            <li><a href="tel:02122902908" className="flex items-center gap-2 hover:text-white"><Phone size={16} className="text-lux-gold" /><span dir="ltr">021-22902908</span></a></li>
                            <li><a href="tel:09124104337" className="flex items-center gap-2 hover:text-white"><Smartphone size={16} className="text-lux-gold" /><span dir="ltr">09124104337</span></a></li>
                            <li><a href="https://www.instagram.com/rezafashionhouse/" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Instagram size={16} className="text-lux-gold" /><span dir="ltr">@rezafashionhouse</span></a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-6 text-xs text-gray-500 font-light">
                    <p>&copy; ۲۰۲۶ REZA Formal. تمامی حقوق محفوظ است.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
