import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Heart, Info, Loader2, Minus, Plus, ShoppingBag, Star, X } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import api from '../services/api';
import { Product, ProductReview } from '../types';
import { formatPrice, toPersianDigits } from '../utils';
import ImageLoader from '../components/ImageLoader';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';

const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 16 }) => (
    <span className="inline-flex text-yellow-400" aria-label={`امتیاز ${rating} از ۵`}>
        {[1, 2, 3, 4, 5].map(value => (
            <Star key={value} size={size} className={value <= Math.round(rating) ? 'fill-current' : 'text-gray-300 dark:text-zinc-600'} />
        ))}
    </span>
);

const ProductPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart, toggleWishlist, isInWishlist, products, user, setAuthModalOpen, showToast } = useGlobal();
    const contextProduct = products.find(item => item.id === id);
    const [detail, setDetail] = useState<Product | null>(null);
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });

    const product = detail || contextProduct;

    useEffect(() => {
        window.scrollTo(0, 0);
        setDetail(contextProduct || null);
        setLoadingProduct(true);
        setActiveTab('desc');
        setQuantity(1);
        void (async () => {
            if (!id) return;
            try {
                setDetail(await api.getProduct(id));
            } catch {
                // The already-loaded catalog item remains a valid read-only fallback.
            } finally {
                setLoadingProduct(false);
            }
        })();
    }, [id, contextProduct?.id]);

    useEffect(() => {
        if (!product) return;
        const initialVariant = product.variants?.find(variant => variant.active && variant.stock > 0)
            || product.variants?.find(variant => variant.active);
        setSelectedVariantId(initialVariant?.id || '');
        setSelectedImage(initialVariant?.image || product.images?.[0] || product.image || '');
        setQuantity(1);
    }, [product?.id, product?.variants]);

    const loadReviews = async () => {
        if (!id) return;
        setReviewsLoading(true);
        try {
            const page = await api.getProductReviews(id);
            setReviews(page.results);
        } catch (error: any) {
            showToast(error?.message || 'دریافت نظرها انجام نشد');
        } finally {
            setReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (id) void loadReviews();
    }, [id]);

    const selectedVariant = product?.variants?.find(variant => variant.id === selectedVariantId);
    const images = useMemo(() => {
        if (!product) return [];
        return Array.from(new Set([
            selectedVariant?.image,
            ...(product.images || []),
            product.image,
        ].filter((image): image is string => Boolean(image))));
    }, [product, selectedVariant?.image]);

    if (loadingProduct && !product) {
        return <div className="min-h-screen pt-36 flex justify-center dark:bg-zinc-900"><Loader2 className="animate-spin text-lux-gold" size={32} /></div>;
    }

    if (!product) {
        return (
            <div className="min-h-screen pt-32 text-center dark:bg-zinc-900 dark:text-white">
                <SEO title="محصول یافت نشد" />
                <h2 className="text-2xl font-bold mb-4">محصول یافت نشد</h2>
                <button onClick={() => navigate('/catalog')} className="text-lux-gold underline">بازگشت به فروشگاه</button>
            </div>
        );
    }

    const selectableVariants = (product.variants || []).filter(
        variant => variant.active && Boolean(variant.size || variant.color || variant.name),
    );
    const hasVariants = selectableVariants.length > 0;
    const trackedStock = selectedVariant ? selectedVariant.stock : product.stock;
    const maxStock = trackedStock === undefined || trackedStock === null ? 99 : Math.max(0, trackedStock);
    const stockStatus = maxStock > 5 ? 'in_stock' : maxStock > 0 ? 'low_stock' : 'out_of_stock';
    const displayedPrice = selectedVariant?.price ?? product.price;
    const displayedComparePrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
    const relatedProducts = products.filter(item => item.category === product.category && item.id !== product.id).slice(0, 4);
    const realAttributes = [
        product.fabric ? ['پارچه', product.fabric] : null,
        selectedVariant?.size ? ['سایز', selectedVariant.size] : null,
        selectedVariant?.color ? ['رنگ', selectedVariant.color] : null,
        ...Object.entries(selectedVariant?.attributes || {}),
    ].filter((item): item is [string, string] => Boolean(item));

    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: images,
        description: product.description,
        sku: selectedVariant?.sku || product.id,
        brand: { '@type': 'Brand', name: 'REZA Formal' },
        offers: {
            '@type': 'Offer',
            url: window.location.href,
            priceCurrency: 'IRR',
            price: displayedPrice * 10,
            availability: stockStatus === 'out_of_stock' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
        },
    };
    if (product.rating !== undefined && product.reviewCount && product.reviewCount > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
        };
    }

    const submitReview = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            setAuthModalOpen(true);
            showToast('برای ثبت نظر وارد حساب کاربری شوید');
            return;
        }
        if (!reviewForm.body.trim()) return;
        setReviewSubmitting(true);
        try {
            await api.createProductReview(product.id, {
                rating: reviewForm.rating,
                title: reviewForm.title.trim() || undefined,
                body: reviewForm.body.trim(),
            });
            setReviewForm({ rating: 5, title: '', body: '' });
            showToast('نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود');
            await loadReviews();
        } catch (error: any) {
            showToast(error?.message || 'ثبت نظر انجام نشد');
        } finally {
            setReviewSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-lux-body dark:bg-zinc-900 pt-20">
            <SEO title={product.name} description={product.short} image={product.image} schema={schema} type="product" />
            <header className="relative text-center bg-lux-black text-white py-8 overflow-hidden">
                <div className="relative mx-auto max-w-4xl px-4 z-10"><h1 className="font-serif text-3xl md:text-5xl">جزئیات محصول</h1></div>
                <div className="absolute inset-x-0 top-1/2 h-32 bg-lux-gold/20 blur-3xl" />
            </header>
            <div className="bg-lux-black px-4 pb-4">
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 bg-lux-gold text-white px-3 py-1 rounded shadow-md text-sm"><ArrowLeft size={14} /> بازگشت</button>
            </div>

            <main className="container max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-20">
                    <div className="flex flex-col gap-4">
                        <div className="relative rounded-lg overflow-hidden h-[400px] md:h-[500px] bg-gray-100 dark:bg-zinc-800">
                            <ImageLoader src={selectedImage || product.image} alt={product.name} className="w-full h-full" loading="eager" />
                            <button onClick={() => toggleWishlist(product.id)} className="absolute top-4 left-4 bg-white/85 dark:bg-black/60 p-3 rounded-full" aria-label="تغییر علاقه‌مندی">
                                <Heart size={24} className={isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-white'} />
                            </button>
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {images.map(image => (
                                    <button key={image} onClick={() => setSelectedImage(image)} className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === image ? 'border-lux-gold' : 'border-transparent'}`}>
                                        <ImageLoader src={image} alt="" className="w-full h-full" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <div className="mb-3">
                            {stockStatus === 'in_stock' && <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded"><CheckCircle size={12} /> موجود در انبار</span>}
                            {stockStatus === 'low_stock' && <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded"><Info size={12} /> موجودی محدود: {toPersianDigits(maxStock)} عدد</span>}
                            {stockStatus === 'out_of_stock' && <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded"><X size={12} /> ناموجود</span>}
                        </div>
                        <h1 className="font-serif text-3xl md:text-5xl mb-4 text-lux-black dark:text-white">{product.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-5">{product.short}</p>
                        <div className="flex flex-wrap items-center gap-4 mb-7">
                            <div>
                                <div className="text-3xl font-bold text-lux-gold">{formatPrice(displayedPrice)}</div>
                                {displayedComparePrice && displayedComparePrice > displayedPrice && <div className="text-sm text-gray-400 line-through">{formatPrice(displayedComparePrice)}</div>}
                            </div>
                            {product.rating !== undefined && product.reviewCount !== undefined && product.reviewCount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-500"><Stars rating={product.rating} /><span>{toPersianDigits(product.rating.toFixed(1))} از {toPersianDigits(product.reviewCount)} نظر</span></div>
                            )}
                        </div>

                        {hasVariants && (
                            <div className="mb-6">
                                <h2 className="font-bold text-sm text-lux-black dark:text-white mb-3">انتخاب گزینه</h2>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectableVariants.map(variant => (
                                        <button
                                            key={variant.id}
                                            onClick={() => {
                                                setSelectedVariantId(variant.id);
                                                if (variant.image) setSelectedImage(variant.image);
                                                setQuantity(1);
                                            }}
                                            disabled={variant.stock <= 0}
                                            className={`p-3 border rounded-lg text-sm text-right disabled:opacity-40 ${selectedVariantId === variant.id ? 'border-lux-gold bg-lux-gold/5' : 'border-gray-200 dark:border-zinc-700 dark:text-white'}`}
                                        >
                                            <span className="block font-bold">{[variant.size, variant.color].filter(Boolean).join(' / ') || variant.name || variant.sku}</span>
                                            <span className="block text-xs text-gray-500 mt-1">{variant.stock > 0 ? `${toPersianDigits(variant.stock)} عدد` : 'ناموجود'} · {formatPrice(variant.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {realAttributes.length > 0 && (
                            <dl className="grid grid-cols-2 gap-2 border-y border-gray-100 dark:border-zinc-700 py-5 mb-6 text-sm">
                                {realAttributes.map(([label, value]) => (
                                    <div key={`${label}-${value}`} className="flex gap-1 text-gray-600 dark:text-gray-300"><dt className="font-bold">{label}:</dt><dd>{value}</dd></div>
                                ))}
                            </dl>
                        )}

                        {stockStatus !== 'out_of_stock' && (
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-sm font-bold dark:text-white">تعداد:</span>
                                <div className="flex items-center border border-gray-300 dark:border-zinc-600 rounded-lg overflow-hidden">
                                    <button onClick={() => setQuantity(value => Math.max(1, value - 1))} disabled={quantity <= 1} className="p-3 bg-gray-50 dark:bg-zinc-800 disabled:opacity-40"><Minus size={16} className="dark:text-white" /></button>
                                    <span className="px-4 font-bold dark:text-white">{toPersianDigits(quantity)}</span>
                                    <button onClick={() => setQuantity(value => Math.min(maxStock, value + 1))} disabled={quantity >= maxStock} className="p-3 bg-gray-50 dark:bg-zinc-800 disabled:opacity-40"><Plus size={16} className="dark:text-white" /></button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => addToCart(product.id, quantity, selectedVariant?.id)} disabled={stockStatus === 'out_of_stock' || (hasVariants && !selectedVariant)} className="w-full md:w-auto px-8 py-4 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-lg font-bold rounded-lg flex items-center justify-center gap-3 disabled:opacity-50">
                            <ShoppingBag size={20} /> {stockStatus === 'out_of_stock' ? 'ناموجود' : 'افزودن به سبد خرید'}
                        </button>
                    </div>
                </div>

                <section className="mb-20">
                    <div className="flex border-b border-gray-200 dark:border-zinc-700 mb-6">
                        <button onClick={() => setActiveTab('desc')} className={`pb-4 px-6 text-lg border-b-2 ${activeTab === 'desc' ? 'border-lux-gold text-lux-gold' : 'border-transparent text-gray-500'}`}>توضیحات</button>
                        <button onClick={() => setActiveTab('reviews')} className={`pb-4 px-6 text-lg border-b-2 ${activeTab === 'reviews' ? 'border-lux-gold text-lux-gold' : 'border-transparent text-gray-500'}`}>نظرهای کاربران {product.reviewCount ? `(${toPersianDigits(product.reviewCount)})` : ''}</button>
                    </div>
                    {activeTab === 'desc' ? (
                        <div className="prose dark:prose-invert max-w-none text-justify text-gray-700 dark:text-gray-300 leading-8 whitespace-pre-line">{product.description || 'توضیح بیشتری برای این محصول ثبت نشده است.'}</div>
                    ) : (
                        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
                            <div className="space-y-4">
                                {reviewsLoading ? <Loader2 className="animate-spin text-lux-gold" /> : reviews.length === 0 ? (
                                    <p className="p-6 bg-white dark:bg-zinc-800 rounded-lg text-gray-500">هنوز نظر تأییدشده‌ای برای این محصول ثبت نشده است.</p>
                                ) : reviews.map(review => (
                                    <article key={review.id} className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-gray-100 dark:border-zinc-700">
                                        <div className="flex flex-wrap justify-between gap-3 mb-3">
                                            <div><strong className="dark:text-white">{review.userName}</strong>{review.verifiedPurchase && <span className="mr-2 text-xs text-green-600">خریدار تأییدشده</span>}</div>
                                            <Stars rating={review.rating} size={14} />
                                        </div>
                                        {review.title && <h3 className="font-bold dark:text-white mb-2">{review.title}</h3>}
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-7">{review.body}</p>
                                        <time className="block text-xs text-gray-400 mt-3">{new Date(review.createdAt).toLocaleDateString('fa-IR')}</time>
                                    </article>
                                ))}
                            </div>
                            <form onSubmit={submitReview} className="bg-white dark:bg-zinc-800 p-5 rounded-lg border border-gray-100 dark:border-zinc-700 h-fit space-y-4">
                                <h3 className="font-bold text-lg dark:text-white">نظر شما</h3>
                                {!user && <p className="text-sm text-gray-500">برای ثبت نظر باید وارد حساب کاربری شوید.</p>}
                                <label className="block text-sm dark:text-gray-300">امتیاز
                                    <select value={reviewForm.rating} onChange={event => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })} className="mt-2 w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600">
                                        {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{toPersianDigits(value)} از ۵</option>)}
                                    </select>
                                </label>
                                <label className="block text-sm dark:text-gray-300">عنوان (اختیاری)<input value={reviewForm.title} onChange={event => setReviewForm({ ...reviewForm, title: event.target.value })} className="mt-2 w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600" /></label>
                                <label className="block text-sm dark:text-gray-300">متن نظر<textarea required rows={4} value={reviewForm.body} onChange={event => setReviewForm({ ...reviewForm, body: event.target.value })} className="mt-2 w-full p-2 border rounded dark:bg-zinc-700 dark:border-zinc-600" /></label>
                                <button type="submit" disabled={reviewSubmitting} className="w-full py-3 bg-lux-gold text-white rounded font-bold disabled:opacity-60">{reviewSubmitting ? 'در حال ثبت...' : user ? 'ثبت نظر' : 'ورود و ثبت نظر'}</button>
                            </form>
                        </div>
                    )}
                </section>

                {relatedProducts.length > 0 && (
                    <section className="border-t border-gray-200 dark:border-zinc-700 pt-12">
                        <h2 className="text-2xl font-serif font-bold text-lux-black dark:text-white mb-8">محصولات مشابه</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{relatedProducts.map(item => <ProductCard key={item.id} product={item} />)}</div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default ProductPage;
