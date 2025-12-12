import React from 'react';
import { MapPin, Phone, Smartphone, Instagram, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
    const navigate = useNavigate();

    const handleScrollToSection = (sectionId: string) => {
        if (window.location.hash !== '#/') {
            navigate('/', { state: { scrollTo: sectionId } });
        } else {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <footer className="bg-lux-black text-white py-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
                    
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="font-logo text-xl tracking-widest font-bold text-white mb-4 block">
                            REZA <span className="text-lux-gold">Formal</span>
                        </Link>
                        <p className="text-gray-400 text-xs leading-relaxed font-light mb-6">
                            جایی که کلاس، اصالت و جدیدترین ترندهای دنیای مد مردانه در قالب یک مجموعه منتخب ارائه می‌شوند. ما متعهد به ارائه بهترین کیفیت و خدمات به شما هستیم.
                        </p>
                        
                        <div className="mb-6">
                            <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-3 font-bold">نماد اعتماد</h4>
                             <a 
                                href="#" 
                                onClick={(e) => e.preventDefault()}
                                className="inline-block w-16 h-16 bg-white/5 border border-gray-700 rounded-xl flex items-center justify-center hover:border-lux-gold transition-colors group"
                                title="اینماد الکترونیکی"
                            >
                                <ShieldCheck className="text-gray-600 group-hover:text-lux-gold transition-colors" size={28} />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">محصولات</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><Link to="/catalog" className="hover:text-white transition-colors">همه محصولات</Link></li>
                            <li><Link to="/catalog?category=suits" className="hover:text-white transition-colors">کت و شلوار</Link></li>
                            <li><Link to="/catalog?category=shirts" className="hover:text-white transition-colors">پیراهن</Link></li>
                            <li><Link to="/catalog?category=blazers" className="hover:text-white transition-colors">کت و پالتو</Link></li>
                            <li><Link to="/catalog?category=accessories" className="hover:text-white transition-colors">اکسسوری</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">دسترسی سریع</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                             <li><Link to="/catalog" className="hover:text-white transition-colors">فروشگاه</Link></li>
                             <li><Link to="/about" className="hover:text-white transition-colors">درباره ما</Link></li>
                             <li>
                                <Link to="/bespoke" className="hover:text-white transition-colors text-right">
                                    آتلیه دوخت
                                </Link>
                             </li>
                             <li><Link to="/wishlist" className="hover:text-white transition-colors">علاقه‌مندی‌ها</Link></li>
                             <li><Link to="/profile" className="hover:text-white transition-colors">حساب کاربری</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">اطلاعات تماس</h4>
                        <ul className="space-y-3 text-xs text-gray-400 font-light">
                            <li>
                                <a 
                                    href="https://maps.app.goo.gl/fNavZWw1fwAEMyME9?g_st=atm" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex items-start gap-2 hover:text-white transition-colors"
                                >
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-lux-gold" />
                                    <span className="max-w-[200px] leading-relaxed">تهران، خیابان میرداماد، مرکز خرید آریان، طبقه همکف، واحد ۳۵</span>
                                </a>
                            </li>
                            <li>
                                <a href="tel:02122902908" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Phone size={16} className="text-lux-gold" /> 
                                    <span dir="ltr" className="text-sm">021-22902908</span>
                                </a>
                            </li>
                            <li>
                                <a href="tel:09124104337" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Smartphone size={16} className="text-lux-gold" />
                                    <span dir="ltr" className="text-sm">09124104337</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="https://www.instagram.com/rezafashionhouse/" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    <Instagram size={16} className="text-lux-gold" />
                                    <span dir="ltr">@rezafashionhouse</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-light">
                    <p>&copy; ۲۰۲۵ REZA Formal. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;