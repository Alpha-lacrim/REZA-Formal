import React, { useEffect } from 'react';
import { useGlobal } from '../contexts/GlobalContext';
import SEO from '../components/SEO';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ArrowLeft, HeartOff } from 'lucide-react';

const WishlistPage: React.FC = () => {
    const { wishlist, products: contextProducts } = useGlobal();
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const resolveProduct = (id: string) => {
        return contextProducts.find(p => p.id === id);
    };

    const wishlistItems = wishlist
        .map(id => resolveProduct(id))
        .filter(item => item !== undefined && item !== null);

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO title="Wishlist" />
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-2">علاقه‌مندی‌ها</h1>
                    <p className="text-white/80 text-sm">لیست محصولات مورد علاقه شما</p>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-32 bg-pink-900/40 rounded-md -z-0 blur-xl"></div>
            </header>
            
            <div className="bg-lux-black px-4 pb-4">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md hover:brightness-95 text-xs md:text-sm">
                    <ArrowLeft size={14} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-7xl mx-auto px-4 py-12">
                {wishlistItems.length === 0 ? (
                    <div className="text-center py-20">
                        <HeartOff size={64} className="mx-auto text-gray-300 mb-6" />
                        <p className="text-xl text-gray-500 dark:text-gray-400 mb-6">لیست علاقه‌مندی‌های شما خالی است.</p>
                        <Link to="/" className="inline-block px-8 py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-bold">
                            مشاهده محصولات
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {wishlistItems.map((p) => (
                            <ProductCard key={p!.id} product={p!} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default WishlistPage;
