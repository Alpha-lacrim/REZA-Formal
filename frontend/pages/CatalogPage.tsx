import { useCatalogPage, useProductFacets } from '../state/AppState';
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

import SEO from '../components/SEO';

const CatalogPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const categoryParam = searchParams.get('category') || '';
    
    const [fabricFilter, setFabricFilter] = useState('');
    const [priceFilter, setPriceFilter] = useState('');

    const [page, setPage] = useState(1);
    const [ordering, setOrdering] = useState('default');
    const [min, max] = priceFilter.split('-');
    const catalog = useCatalogPage({ category: categoryParam, fabric: fabricFilter,
        price_min: min, price_max: max, ordering, page, page_size: 24 });
    const fabrics = useProductFacets(categoryParam).data || [];
    const filteredProducts = catalog.data?.results || [];
    useEffect(() => { setPage(1); }, [categoryParam, fabricFilter, priceFilter, ordering]);

    const categoryTitles: { [key: string]: string } = {
        'suits': 'کت و شلوار',
        'shirts': 'پیراهن',
        'blazers': 'بلیزر',
        'accessories': 'اکسسوری',
    };

    const pageTitle = categoryTitles[categoryParam] || 'تمامی محصولات';

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO 
                title={pageTitle} 
                description={`خرید آنلاین ${pageTitle} با بهترین کیفیت و قیمت. مشاهده جدیدترین مدل‌های ${pageTitle} در فروشگاه رضا فرمال.`} 
            />
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden shadow-md">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-2">
                        {pageTitle}
                    </h1>
                    <p className="text-white/80 text-sm">مجموعه‌ای منتخب از بهترین‌ها</p>
                </div>
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
                    <label className="text-sm">مرتب‌سازی
                        <select aria-label="مرتب‌سازی محصولات" value={ordering} onChange={event => setOrdering(event.target.value)} className="mx-2 p-2 bg-white dark:bg-zinc-700 border rounded">
                            <option value="default">پیش‌فرض</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option>
                        </select>
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-lux-black dark:text-gray-300">جنس پارچه:</label>
                        <select 
                            value={fabricFilter} 
                            onChange={e => setFabricFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-lux-black focus:outline-none focus:border-lux-gold focus:ring-1 focus:ring-lux-gold dark:bg-zinc-700 dark:border-zinc-600 dark:text-white transition-shadow w-full sm:w-auto"
                        >
                            <option value="">همه</option>
                            {fabrics.map(f => <option key={f as string} value={f as string}>{f}</option>)}
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

                {catalog.isFetching ? <p role="status">در حال دریافت محصولات…</p> : catalog.isError ? <button onClick={() => void catalog.refetch()}>دریافت محصولات ناموفق بود؛ تلاش دوباره</button> : filteredProducts.length > 0 ? (
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
                <nav aria-label="صفحه‌بندی محصولات" className="flex justify-center items-center gap-4 mt-8">
                    <button disabled={page <= 1 || catalog.isFetching} onClick={() => setPage(value => value - 1)}>قبلی</button>
                    <span>{page} / {catalog.data?.totalPages || 1} ({catalog.data?.count || 0})</span>
                    <button disabled={!catalog.data?.next || catalog.isFetching} onClick={() => setPage(value => value + 1)}>بعدی</button>
                </nav>
            </main>
        </div>
    );
};

export default CatalogPage;
