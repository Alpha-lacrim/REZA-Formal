import React from 'react';
import { MapPin, Phone, Smartphone, Instagram, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="bg-lux-black text-white py-12 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Grid: 1 column on mobile, 5 columns on desktop. Reduced gap for compactness. */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-6 mb-8">
                    
                    {/* Column 1: Logo & About */}
                    <div className="col-span-1">
                        <Link to="/" className="font-logo text-xl tracking-widest font-bold text-white mb-4 block">
                            REZA <span className="text-lux-gold">Formal</span>
                        </Link>
                        <p className="text-gray-400 text-xs leading-relaxed font-light">
                            جایی که کلاس، اصالت و جدیدترین ترندهای دنیای مد مردانه در قالب یک مجموعه منتخب ارائه می‌شوند.
                        </p>
                    </div>

                    {/* Column 2: Enamad Placeholder */}
                    {/* order-last moves it to bottom on mobile. md:order-none restores DOM order (2nd) on desktop. */}
                    <div className="order-last md:order-none">
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">نماد اعتماد</h4>
                         <a 
                            href="#" 
                            onClick={(e) => e.preventDefault()}
                            className="block w-20 h-20 bg-white/5 border border-gray-700 rounded-xl flex items-center justify-center hover:border-lux-gold transition-colors group"
                            title="اینماد الکترونیکی"
                        >
                            <ShieldCheck className="text-gray-600 group-hover:text-lux-gold transition-colors" size={32} />
                        </a>
                    </div>

                    {/* Column 3: Products */}
                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">محصولات</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><Link to="/#suits" className="hover:text-white transition-colors">کت و شلوار</Link></li>
                            <li><Link to="/#shirts" className="hover:text-white transition-colors">پیراهن</Link></li>
                            <li><Link to="/#blazer" className="hover:text-white transition-colors">کت و پالتو</Link></li>
                            <li><Link to="/#accessories" className="hover:text-white transition-colors">اکسسوری</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Store */}
                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">فروشگاه</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li><a href="#" className="hover:text-white transition-colors">درباره ما</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">آتلیه دوخت</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">اطلاعات تماس</a></li>
                        </ul>
                    </div>

                    {/* Column 5: Contact */}
                    <div>
                        <h4 className="text-lux-gold uppercase tracking-widest text-xs mb-4 font-bold">تماس با ما</h4>
                        <ul className="space-y-2 text-xs text-gray-400 font-light">
                            <li>
                                <a 
                                    href="https://maps.app.goo.gl/fNavZWw1fwAEMyME9?g_st=atm" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex items-start gap-2 hover:text-white transition-colors"
                                >
                                    <MapPin size={14} className="mt-0.5 shrink-0" />
                                    <span className="max-w-[200px]">تهران، خیابان میرداماد، مرکز خرید آریان، طبقه همکف، واحد ۳۵</span>
                                </a>
                            </li>
                            <li>
                                <a href="tel:02122902908" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Phone size={14} /> 
                                    <span dir="ltr">021-22902908</span>
                                </a>
                            </li>
                            <li>
                                <a href="tel:09124104337" className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Smartphone size={14} />
                                    <span dir="ltr">09124104337</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="https://www.instagram.com/rezafashionhouse/" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex items-center gap-2 hover:text-white transition-colors"
                                >
                                    <Instagram size={14} />
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