import React, { useRef, useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Ruler, Globe, Truck, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { useGlobal } from '../contexts/GlobalContext';

const Hero = () => {
    const navigate = useNavigate();
    const { siteSettings } = useGlobal();

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className="relative h-screen flex items-center justify-center overflow-hidden bg-zinc-900">
            <div className="absolute inset-0 z-0">
                 <ImageLoader 
                    src={siteSettings?.heroImage || "/images/utilities/hero.jpg"}
                    alt="Luxury Suit Man" 
                    className="w-full h-full object-cover opacity-40" 
                    dataUtility 
                />
            </div>
            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-in fade-in duration-1000">
                <p className="text-lux-gold text-sm md:text-base tracking-[0.3em] uppercase mb-4">از ۱۹۸۴ تا امروز • تهران</p>
                <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white mb-8 leading-tight">
                    Refining the <br/><span className='italic text-lux-gold'>Gentleman</span>
                </h1>
                <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-light">
                     در رضا فرمال، وقار و ظرافت هنر دوخت ایتالیا و ترکیه را تجربه کنید.
                </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <button 
                        onClick={() => scrollToSection('suits')} 
                        className="bg-lux-gold text-white px-10 py-4 text-sm uppercase tracking-widest hover:bg-white hover:text-lux-black transition-all duration-300 border border-lux-gold btn-ripple interactive focus-ring"
                    >
                        مشاهده کلکسیون
                    </button>
                    <button 
                        onClick={() => navigate('/bespoke')} 
                        className="bg-transparent text-white px-10 py-4 text-sm uppercase tracking-widest border border-white hover:bg-white hover:text-lux-black transition-all duration-300 btn-ripple interactive focus-ring"
                    >
                        رزرو وقت مشاوره
                    </button>
                </div>
            </div>
        </header>
    );
};

const FeatureBar = () => (
    <section className="py-16 bg-lux-body dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="p-6 border-b-2 md:border-b-0 md:border-l-2 border-lux-gold/40 flex flex-col items-center">
                    <Ruler className="text-lux-gold mb-4" size={32} />
                    <h3 className="font-serif text-xl mb-2 text-lux-black dark:text-white">دوخت دقیق و استادانه</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-light text-sm leading-relaxed">دوخت و فرم‌دهی دقیق با روش‌های اصیل برای تناسب کامل بدن.</p>
                </div>
                <div className="p-6 border-b-2 md:border-b-0 md:border-l-2 border-lux-gold/40 flex flex-col items-center">
                    <Globe className="text-lux-gold mb-4" size={32} />
                    <h3 className="font-serif text-xl mb-2 text-lux-black dark:text-white">پارچه‌های ایتالیایی و ترکی</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-light text-sm leading-relaxed">تهیه‌شده از بهترین کارخانجات پارچه‌بافی</p>
                </div>
                <div className="p-6 border-b-2 md:border-b-0 border-lux-gold/40 flex flex-col items-center">
                    <Truck className="text-lux-gold mb-4" size={32} />
                    <h3 className="font-serif text-xl mb-2 text-lux-black dark:text-white">ارسال به سراسر کشور</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-light text-sm leading-relaxed">ارسال رایگان و سریع برای همه سفارش‌های خصوصی</p>
                </div>
            </div>
        </div>
    </section>
);

interface IntroSectionProps {
    id?: string;
    image: string;
    subtitle: string;
    title: string;
    description: string;
    reverse?: boolean;
    buttonText?: string;
    linkTo?: string;
}

const IntroSection: React.FC<IntroSectionProps> = ({ id, image, subtitle, title, description, reverse = false, buttonText, linkTo }) => {
    const navigate = useNavigate();
    
    return (
        <section id={id} className={`flex flex-col md:flex-row h-auto md:h-[600px] overflow-hidden scroll-mt-24 ${reverse ? 'md:flex-row-reverse' : ''}`}>
            <div className="w-full md:w-5/12 relative h-[400px] md:h-[600px] group overflow-hidden">
                <ImageLoader src={image} alt={title} className="w-full h-full transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
            </div>
            <div className="w-full md:w-7/12 bg-lux-black text-white flex items-center justify-center p-12 lg:p-24 relative">
                 <div className="max-w-md text-center z-10">
                    <h4 className="text-lux-gold uppercase tracking-[0.2em] text-sm mb-4 font-bold">{subtitle}</h4>
                    <h2 className="font-serif text-3xl lg:text-5xl mb-6 leading-tight">{title}</h2>
                    <div className="w-20 h-0.5 bg-lux-gold/50 mx-auto mb-8"></div>
                    <p className="text-gray-400 font-light mb-10 leading-loose text-justify text-sm md:text-base">
                        {description}
                    </p>
                    {buttonText && (
                         <button 
                            onClick={() => linkTo ? navigate(linkTo) : null}
                            className="bg-lux-gold text-white px-10 py-3 text-xs uppercase tracking-widest hover:bg-white hover:text-lux-black transition-all duration-300 border border-lux-gold"
                         >
                            {buttonText}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

const ProductCarousel = ({ category }: { category: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { products } = useGlobal();
    const items = products.filter(p => p.category === category);

    const scroll = (direction: 'next' | 'prev') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 340; 
            if (direction === 'next') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    return (
        <div className="relative group px-0 md:px-4 py-8">
            
            {items.length > 2 && (
                <>
                    <button 
                        onClick={() => scroll('prev')}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-zinc-800 p-3 rounded-full shadow-lg text-lux-black dark:text-white hover:bg-lux-gold hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-gray-100 dark:border-zinc-700"
                    >
                        <ChevronRight size={24} />
                    </button>

                    <button 
                        onClick={() => scroll('next')}
                        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-zinc-800 p-3 rounded-full shadow-lg text-lux-black dark:text-white hover:bg-lux-gold hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:block border border-gray-100 dark:border-zinc-700"
                    >
                        <ChevronLeft size={24} />
                    </button>
                </>
            )}

            <div 
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto snap-x snap-mandatory py-4 px-4 md:px-2 hide-scroll"
            >
                {items.map(p => (
                    <div key={p.id} className="min-w-[85vw] sm:min-w-[45vw] md:min-w-[300px] lg:min-w-[320px] snap-center">
                        <ProductCard product={p} className="h-full shadow-md hover:shadow-xl" />
                    </div>
                ))}
                
                <div className="min-w-[150px] snap-center flex items-center justify-center">
                     <Link to={`/catalog?category=${category}`} className="flex flex-col items-center justify-center gap-2 text-lux-gold hover:text-lux-black dark:hover:text-white transition-colors group/link p-4">
                        <span className="w-14 h-14 rounded-full border border-lux-gold flex items-center justify-center group-hover/link:bg-lux-gold group-hover/link:text-white transition-all">
                             <ArrowLeft className="mr-1" size={24} />
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap">مشاهده همه</span>
                     </Link>
                </div>
            </div>
        </div>
    );
};

const HomePage: React.FC = () => {
    const location = useLocation();
    const { siteSettings } = useGlobal();

    useEffect(() => {
        if (location.state && location.state.scrollTo) {
            const sectionId = location.state.scrollTo;
            const element = document.getElementById(sectionId);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const schema = {
        "@context": "https://schema.org",
        "@type": "MensClothingStore",
        "name": "REZA Formal",
        "description": "لوکس‌ترین فروشگاه کت و شلوار و اکسسوری مردانه در تهران.",
        "image": "https://rezaformal.com/images/utilities/hero.jpg",
        "telephone": "02122902908",
        "url": "https://rezaformal.com",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "خیابان میرداماد، مرکز خرید آریان، طبقه همکف، واحد ۳۵",
            "addressLocality": "Tehran",
            "addressCountry": "IR"
        },
        "priceRange": "$$$",
        "openingHours": "Mo-Su 10:00-22:00"
    };

    return (
        <main>
            <SEO 
                title="خانه"
                description="رضا فرمال، ارائه دهنده برترین پوشاک مردانه، کت و شلوار دامادی و اکسسوری‌های لوکس با دوخت سفارشی در تهران."
                image="https://rezaformal.com/images/utilities/hero.jpg"
                schema={schema}
            />
            <Hero />
            <FeatureBar />
            
            <IntroSection 
                id="suits"
                image={siteSettings?.suitsSectionImage || "/images/suit/midnight.jpg"}
                subtitle="آتلیه کت و شلوار"
                title="کمال در دوخت و طراحی"
                description="کت و شلوارهای ما با بهره‌گیری از بهترین پارچه‌های پشمی و دوخت‌های مدرن، وقار و اعتماد به نفس را برای شما به ارمغان می‌آورند. هر دوخت داستانی از اصالت را روایت می‌کند."
                buttonText="مشاهده کلکسیون"
                linkTo="/catalog?category=suits"
                reverse={false}
            />
            <section className="py-12 bg-lux-body dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <div className="container max-w-7xl mx-auto px-4">
                    <h3 className="text-center mb-10">
                        <span className="text-2xl md:text-3xl font-serif font-bold text-lux-black dark:text-white border-b-2 border-lux-gold pb-3 px-2 inline-block">
                            برگزیده‌های فصل
                        </span>
                    </h3>
                    <ProductCarousel category="suits" />
                </div>
            </section>

            <IntroSection 
                id="shirts"
                image={siteSettings?.shirtsSectionImage || "/images/shirts/s3.jpg"}
                subtitle="کلکسیون پیراهن"
                title="لطافت و کیفیت بی‌نظیر"
                description="پیراهن‌های ما با پارچه‌های صد در صد پنبه و دوخت‌های ظریف، راحتی و استایل را در هم آمیخته‌اند. انتخابی ایده‌آل برای تکمیل استایل رسمی شما در هر موقعیت."
                reverse={true}
                buttonText="مشاهده پیراهن‌ها"
                linkTo="/catalog?category=shirts"
            />
            <section className="py-12 bg-lux-body dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <div className="container max-w-7xl mx-auto px-4">
                    <h3 className="text-center mb-10">
                        <span className="text-2xl md:text-3xl font-serif font-bold text-lux-black dark:text-white border-b-2 border-lux-gold pb-3 px-2 inline-block">
                            جدیدترین طرح‌ها
                        </span>
                    </h3>
                    <ProductCarousel category="shirts" />
                </div>
            </section>

            <IntroSection 
                id="blazer"
                image={siteSettings?.blazersSectionImage || "/images/blazer/s1_b1.jpg"}
                subtitle="کلکسیون بلیزر"
                title="استایل نیمه‌رسمی متمایز"
                description="با بلیزرهای تک‌دوخت ما، در هر جمعی متمایز باشید. ترکیبی از راحتی و جذابیت برای موقعیت‌های کژوال و نیمه‌رسمی که شخصیت شما را برجسته می‌کند."
                buttonText="مشاهده بلیزرها"
                linkTo="/catalog?category=blazers"
                reverse={false}
            />
            <section className="py-12 bg-lux-body dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <div className="container max-w-7xl mx-auto px-4">
                     <h3 className="text-center mb-10">
                        <span className="text-2xl md:text-3xl font-serif font-bold text-lux-black dark:text-white border-b-2 border-lux-gold pb-3 px-2 inline-block">
                            مجموعه بلیزر
                        </span>
                    </h3>
                    <ProductCarousel category="blazers" />
                </div>
            </section>

            <IntroSection 
                id="accessories"
                image={siteSettings?.accessoriesSectionImage || "/images/accessories/suit-accessories-cover.jpg"}
                subtitle="اکسسوری"
                title="جزئیات تعیین‌کننده"
                description="اکسسوری‌های دست‌ساز ما، از کراوات‌های ابریشمی تا دکمه‌سردست‌های خاص، امضای نهایی استایل منحصر به فرد شما هستند. زیبایی در جزئیات است."
                reverse={true}
                buttonText="مشاهده اکسسوری‌ها"
                linkTo="/catalog?category=accessories"
            />
            <section className="py-12 bg-lux-body dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                <div className="container max-w-7xl mx-auto px-4">
                     <h3 className="text-center mb-10">
                        <span className="text-2xl md:text-3xl font-serif font-bold text-lux-black dark:text-white border-b-2 border-lux-gold pb-3 px-2 inline-block">
                            اکسسوری‌های لوکس
                        </span>
                    </h3>
                    <ProductCarousel category="accessories" />
                </div>
            </section>

             <IntroSection 
                id="bespoke"
                image={siteSettings?.bespokeSectionImage || "/images/utilities/bespoke.webp"}
                subtitle="آتلیه دوخت"
                title="ظرافت و زیبایی در پوشش"
                description="خدمات سفارشی ما نهایت زیبایی و ظرافت در پوشش است. با مشاوره خصوصی و انتخاب پارچه‌ها، لباسی کاملاً اختصاصی برای شما طراحی می‌شود."
                buttonText="درخواست دوخت سفارشی"
                linkTo="/bespoke"
                reverse={false}
            />

            <section className="bg-lux-gray dark:bg-zinc-900 py-20 border-t border-gray-200 dark:border-zinc-700">
                <div className="max-w-xl mx-auto px-4 text-center">
                    <h3 className="font-serif text-2xl mb-2 text-lux-black dark:text-white">عضو باشگاه مشتریان ما شوید</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 font-light">برای اطلاع از محصولات جدید و رویدادهای خصوصی ثبت‌نام کنید.</p>
                    <form className="flex flex-row gap-2 items-center" onSubmit={(e) => e.preventDefault()}>
                        <div className="flex-1 relative" style={{ minWidth: 0 }}>
                            <input type="email" placeholder="آدرس ایمیل شما" className="w-full bg-white text-lux-black dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 px-4 py-3 focus:outline-none focus:border-lux-gold text-sm placeholder-gray-400 font-light text-start dark:text-white" />
                        </div>
                        <button type="submit" className="bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black px-6 py-3 text-xs uppercase tracking-widest hover:opacity-90 transition-colors">
                            ثبت‌ نام
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
};

export default HomePage;
