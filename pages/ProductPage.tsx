
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { products } from '../data';
import { useGlobal } from '../contexts/GlobalContext';
import { formatPrice } from '../utils';

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useGlobal();
    const product = products.find(p => p.id === id);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!product) {
        return (
            <div className="pt-32 text-center">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">محصول یافت نشد</h2>
                <button onClick={() => navigate('/')} className="text-lux-gold underline">بازگشت به صفحه اصلی</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
             <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden">
                <div className="relative mx-auto w-full max-w-4xl px-4 z-10">
                    <h1 className="font-serif text-3xl md:text-5xl mb-2">جزئیات محصول</h1>
                </div>
                 <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-[120%] h-32 bg-lux-gold/20 rounded-md -z-0 blur-xl"></div>
            </header>

            <div className="bg-lux-black px-4 pb-4">
                 <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md hover:brightness-95 text-xs md:text-sm">
                    <ArrowLeft size={14} />
                    <span>بازگشت</span>
                 </button>
            </div>

            <main className="container max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
                    <div className="relative rounded-lg overflow-hidden h-[400px] md:h-[600px] bg-gray-100 dark:bg-zinc-800">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                    </div>
                    
                    <div className="flex flex-col justify-center">
                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl mb-4 text-lux-black dark:text-white">{product.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">{product.short}</p>
                        
                        <div className="text-2xl font-bold text-lux-gold mb-8">{formatPrice(product.price)}</div>
                        
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-10 text-justify">
                            {product.description}
                        </p>

                        <button 
                            onClick={() => addToCart(product.id)}
                            className="w-full md:w-auto px-8 py-4 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-lg font-bold rounded-lg hover:opacity-90 transition-opacity"
                        >
                            افزودن به سبد خرید
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProductPage;
