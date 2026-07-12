import React, { useEffect } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useGlobal } from '../contexts/GlobalContext';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const AboutPage: React.FC = () => {
    const { siteSettings } = useGlobal();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (!siteSettings) return null;

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO 
                title={siteSettings.aboutTitle || 'درباره ما'} 
                description="داستان رضا فرمال؛ ۴۰ سال تجربه در صنعت پوشاک آقایان و ارائه دهنده خدمات دوخت سفارشی و محصولات لوکس." 
                image={siteSettings.aboutImage}
            />
            <header className="relative text-center bg-lux-black text-white py-12 overflow-hidden">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-4">درباره ما</h1>
                    <div className="w-20 h-0.5 bg-lux-gold mx-auto"></div>
                </div>
                 <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-40 bg-lux-gold/10 rounded-full blur-3xl"></div>
            </header>
            
            <div className="bg-lux-black px-4 pb-4">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md hover:brightness-95 text-xs md:text-sm">
                    <ArrowLeft size={14} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-5xl mx-auto px-4 py-16">
                <div className="flex flex-col lg:flex-row gap-12 items-center">
                    <div className="w-full lg:w-1/2 h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl relative group">
                        <ImageLoader 
                            src={siteSettings.aboutImage || '/images/utilities/bespoke.webp'}
                            alt="About Reza Formal" 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                            loading="eager"
                        />
                         <div className="absolute inset-0 bg-lux-gold/10 mix-blend-overlay"></div>
                    </div>
                    
                    <div className="w-full lg:w-1/2">
                        <h2 className="text-3xl font-serif font-bold text-lux-black dark:text-white mb-6">
                            {siteSettings.aboutTitle || 'داستان ما'}
                        </h2>
                        <div className="text-gray-600 dark:text-gray-300 leading-8 text-justify whitespace-pre-line text-lg font-light">
                            {siteSettings.aboutDescription}
                        </div>
                        
                        <div className="mt-8 flex gap-8 border-t border-gray-200 dark:border-zinc-700 pt-8">
                            <div>
                                <span className="block text-3xl font-bold text-lux-gold">۱۹۸۴</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">تاسیس</span>
                            </div>
                            <div>
                                <span className="block text-3xl font-bold text-lux-gold">۱۵+</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">کشور مقصد صادرات</span>
                            </div>
                            <div>
                                <span className="block text-3xl font-bold text-lux-gold">۱۰۰٪</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">رضایت مشتریان</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AboutPage;
