
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { products } from '../data';

const CatalogPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const categoryParam = searchParams.get('category') || '';
    
    const [fabricFilter, setFabricFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('');

    const fabrics = Array.from(new Set(products.map(p => p.fabric).filter(Boolean)));

    const filteredProducts = products.filter(p => {
        if (categoryParam && p.category !== categoryParam) return false;
        if (fabricFilter && p.fabric !== fabricFilter) return false;
        if (priceFilter) {
            const [min, max] = priceFilter.split('-').map(Number);
            if (p.price < min || p.price > max) return false;
        }
        return true;
    });

    const categoryTitles: { [key: string]: string } = {
        'suits': 'کت و شلوار',
        'shirts': 'پیراهن',
        'blazers': 'بلیزر',
        'accessories': 'اکسسوری',
    };

    const pageTitle = categoryTitles[categoryParam] || 'تمامی محصولات';

    // Auto-scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden shadow-md">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-2">
                        {pageTitle}
                    </h1>
                    <p className="text-white/80 text-sm">مجموعه‌ای منتخب از بهترین‌ها</p>
                </div>
                {/* Decorative Box */}
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-32"></div>
            </header>
            
            <div className="bg-lux-black px-4 pb-4 shadow-md -mt-1 pt-1 z-20 relative">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 bg-lux-gold text-white px-4 py-2 rounded-lg shadow hover:bg-lux-gold-dark transition-colors text-sm font-medium">
                    <ArrowLeft size={16} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-7xl mx-auto px-4 py-12">
                <div className="mb-8 flex flex-wrap items-center gap-6 bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-lux-black dark:text-gray-300">جنس پارچه:</label>
                        <select 
                            value={fabricFilter} 
                            onChange={e => setFabricFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-lux-black focus:outline-none focus:border-lux-gold focus:ring-1 focus:ring-lux-gold dark:bg-zinc-700 dark:border-zinc-600 dark:text-white transition-shadow w-full sm:w-auto"
                        >
                            <option value="">همه</option>
                            {fabrics.map(f => <option key={f} value={f as string}>{f}</option>)}
                        </select>
                    </div>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-lux-black dark:text-gray-300">قیمت:</label>
                        <select 
                            value={priceFilter} 
                            onChange={e => setPriceFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-lux-black focus:outline-none focus:border-lux-gold focus:ring-1 focus:ring-lux-gold dark:bg-zinc-700 dark:border-zinc-600 dark:text-white transition-shadow w-full sm:w-auto"
                        >
                            <option value="">همه</option>
                            <option value="0-14000000">کمتر از ۱۴ میلیون</option>
                            <option value="14000000-20000000">۱۴ تا ۲۰ میلیون</option>
                            <option value="20000000-999999999">بیش از ۲۰ میلیون</option>
                        </select>
                    </div>
                </div>

                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                        <p className="text-lg">محصولی با این مشخصات یافت نشد.</p>
                        <button onClick={() => { setFabricFilter(''); setPriceFilter(''); }} className="mt-4 text-lux-gold hover:underline">
                            حذف فیلترها
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CatalogPage;
