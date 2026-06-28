import React, { useEffect, useState } from 'react';
import ImageLoader from '../components/ImageLoader';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Star, ShoppingBag, CheckCircle, Info, X, Minus, Plus } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import { formatPrice, toPersianDigits } from '../utils';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart, toggleWishlist, isInWishlist, products: contextProducts } = useGlobal();
    const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState('');
    
    // Fallback to static seed if not found in context
    const { products } = useGlobal();
    const product = contextProducts.find(p => p.id === id) || products.find(p => p.id === id);
    const relatedProducts = products.filter(p => p.category === product?.category && p.id !== product?.id).slice(0, 4);

    const images = product?.images && product.images.length > 0 ? product.images : (product?.image ? [product.image] : []);

    useEffect(() => {
        window.scrollTo(0, 0);
        setActiveTab('desc');
        setQuantity(1);
        if (images.length > 0) setSelectedImage(images[0]);
    }, [id, product]);

    if (!product) {
        return (
            <div className="pt-32 text-center">
                <SEO title="محصول یافت نشد" />
                <h2 className="text-2xl font-bold mb-4 dark:text-white">محصول یافت نشد</h2>
                <button onClick={() => navigate('/')} className="text-lux-gold underline">بازگشت به صفحه اصلی</button>
            </div>
        );
    }

    const inWishlist = isInWishlist(product.id);
    const trackedStock = product.stock;
    const maxStock = trackedStock === undefined || trackedStock === null ? 99 : trackedStock;
    const stockStatus = trackedStock === undefined || trackedStock === null
        ? 'in_stock'
        : trackedStock > 5 ? 'in_stock' : trackedStock > 0 ? 'low_stock' : 'out_of_stock';

    const handleIncrement = () => {
        if (quantity < maxStock) setQuantity(q => q + 1);
    };

    const handleDecrement = () => {
        if (quantity > 1) setQuantity(q => q - 1);
    };

    // SEO Schema
    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": images,
        "description": product.description,
        "sku": product.id,
        "brand": {
            "@type": "Brand",
            "name": "REZA Formal"
        },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "IRR", 
            "price": product.price * 10, // Assuming price is in Tomans, convert to Rials for Schema standard
            "availability": stockStatus !== 'out_of_stock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
        }
    };

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
             <SEO 
                title={product.name} 
                description={product.short} 
                image={product.image}
                schema={schema}
                type="product"
            />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-20">
                    {/* Image Gallery */}
                    <div className="flex flex-col gap-4">
                        <div className="relative rounded-lg overflow-hidden h-[400px] md:h-[500px] bg-gray-100 dark:bg-zinc-800">
                            <ImageLoader src={selectedImage || product.image} alt={product.name} className="w-full h-full" loading="eager" />
                            <button 
                                onClick={() => toggleWishlist(product.id)}
                                className="absolute top-4 left-4 bg-white/80 dark:bg-black/50 p-3 rounded-full hover:bg-white dark:hover:bg-black transition-colors"
                            >
                                <Heart size={24} className={inWishlist ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-white"} />
                            </button>
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setSelectedImage(img)}
                                        className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === img ? 'border-lux-gold' : 'border-transparent hover:border-gray-300'}`}
                                    >
                                        <ImageLoader src={img} alt="" className="w-full h-full" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <div className="mb-2">
                             {stockStatus === 'in_stock' && <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded"><CheckCircle size={12}/> موجود در انبار</span>}
                             {stockStatus === 'low_stock' && <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded"><Info size={12}/> موجودی محدود: {toPersianDigits(maxStock)} عدد</span>}
                             {stockStatus === 'out_of_stock' && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded"><X size={12}/> ناموجود</span>}
                        </div>

                        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl mb-4 text-lux-black dark:text-white">{product.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">{product.short}</p>
                        
                        <div className="flex items-center gap-4 mb-8">
                             <div className="text-3xl font-bold text-lux-gold">{formatPrice(product.price)}</div>
                             <div className="flex items-center text-yellow-500 text-sm">
                                <Star className="fill-current" size={16}/>
                                <Star className="fill-current" size={16}/>
                                <Star className="fill-current" size={16}/>
                                <Star className="fill-current" size={16}/>
                                <Star className="fill-current opacity-50" size={16}/>
                                <span className="mr-2 text-gray-400">(۴.۲)</span>
                             </div>
                        </div>
                        
                        <div className="border-t border-b border-gray-100 dark:border-zinc-700 py-6 mb-8">
                            <h4 className="font-bold text-sm mb-2 text-lux-black dark:text-white">ویژگی‌های محصول:</h4>
                            <ul className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>• پارچه: {product.fabric || 'استاندارد'}</li>
                                <li>• دوخت: صنعتی با دقت بالا</li>
                                <li>• سایزبندی: ۴۶ تا ۵۶</li>
                                <li>• کشور مبدا پارچه: ترکیه</li>
                            </ul>
                        </div>

                        {stockStatus !== 'out_of_stock' && (
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-sm font-bold text-lux-black dark:text-white">تعداد:</span>
                                <div className="flex items-center border border-gray-300 dark:border-zinc-600 rounded-lg overflow-hidden">
                                    <button 
                                        onClick={handleDecrement}
                                        disabled={quantity <= 1}
                                        className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        <Minus size={16} className="text-lux-black dark:text-white" />
                                    </button>
                                    <div className="px-4 py-2 font-bold text-lux-black dark:text-white min-w-[3rem] text-center">
                                        {toPersianDigits(quantity)}
                                    </div>
                                    <button 
                                        onClick={handleIncrement}
                                        disabled={quantity >= maxStock}
                                        className="p-3 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        <Plus size={16} className="text-lux-black dark:text-white" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => addToCart(product.id, quantity)}
                            disabled={stockStatus === 'out_of_stock'}
                            className="w-full md:w-auto px-8 py-4 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-lg font-bold rounded-lg hover:opacity-90 transition-opacity btn-ripple interactive focus-ring flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ShoppingBag size={20} />
                            {stockStatus === 'out_of_stock' ? 'ناموجود' : 'افزودن به سبد خرید'}
                        </button>
                    </div>
                </div>

                <div className="mb-20">
                    <div className="flex border-b border-gray-200 dark:border-zinc-700 mb-6">
                        <button 
                            onClick={() => setActiveTab('desc')}
                            className={`pb-4 px-6 text-lg font-medium transition-colors border-b-2 ${activeTab === 'desc' ? 'border-lux-gold text-lux-gold' : 'border-transparent text-gray-500 hover:text-lux-black dark:hover:text-white'}`}
                        >
                            توضیحات
                        </button>
                        <button 
                            onClick={() => setActiveTab('reviews')}
                            className={`pb-4 px-6 text-lg font-medium transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-lux-gold text-lux-gold' : 'border-transparent text-gray-500 hover:text-lux-black dark:hover:text-white'}`}
                        >
                            نظرات کاربران
                        </button>
                    </div>

                    <div className="animate-in fade-in duration-300">
                        {activeTab === 'desc' ? (
                            <div className="prose dark:prose-invert max-w-none text-justify text-gray-700 dark:text-gray-300 leading-relaxed">
                                <p>{product.description}</p>
                                <p>این محصول با بهره‌گیری از تکنولوژی‌های روز دنیا و هنر دست دوزندگان ماهر، ترکیبی از راحتی و زیبایی را برای شما به ارمغان می‌آورد. پارچه‌های استفاده شده در این محصول از الیاف طبیعی بوده و ضد حساسیت می‌باشند.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-lg border border-gray-100 dark:border-zinc-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-600 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300">A</div>
                                            <div>
                                                <div className="font-bold text-lux-black dark:text-white text-sm">امیرحسین رضایی</div>
                                                <div className="text-xs text-gray-400">۲ روز پیش</div>
                                            </div>
                                        </div>
                                        <div className="flex text-yellow-500 text-xs">
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">کیفیت دوخت بسیار عالی بود و دقیقا مشابه عکس بود. ممنون از بسته‌بندی شیک شما.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-lg border border-gray-100 dark:border-zinc-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-zinc-600 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300">S</div>
                                            <div>
                                                <div className="font-bold text-lux-black dark:text-white text-sm">سارا محمدی</div>
                                                <div className="text-xs text-gray-400">۱ هفته پیش</div>
                                            </div>
                                        </div>
                                        <div className="flex text-yellow-500 text-xs">
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="fill-current" size={14}/>
                                            <Star className="text-gray-300" size={14}/>
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">جنس پارچه خوبه ولی کمی سایزش بزرگتر از استاندارد بود. پیشنهاد می‌کنم به جدول سایز دقت کنید.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {relatedProducts.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-zinc-700 pt-12">
                         <h3 className="text-2xl font-serif font-bold text-lux-black dark:text-white mb-8">محصولات مشابه</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
                         </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default ProductPage;
