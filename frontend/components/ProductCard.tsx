import { useActions } from '../state/AppState';
import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import ImageLoader from './ImageLoader';
import { Product } from '../types';
import { formatPrice, toPersianDigits } from '../utils';


const ProductCard: React.FC<{ product: Product; className?: string; headingLevel?: 'h2' | 'h3' }> = ({ product, className = '', headingLevel: Heading = 'h2' }) => {
    const { addToCart } = useActions();
    const defaultVariant = product.variants?.find(variant => variant.active && variant.stock > 0);
    const hasVariants = Boolean(product.variants?.length);
    const isOutOfStock = hasVariants ? !defaultVariant : product.stock !== undefined && product.stock <= 0;
    const displayedPrice = defaultVariant?.price ?? product.price;

    return (
        <article className={`product-card bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-lg transition-all duration-300 interactive card-elevate ${className}`}>
            <Link to={`/product/${product.id}`} className="block h-64 md:h-80 overflow-hidden bg-gray-200 dark:bg-zinc-700 relative group">
                <ImageLoader src={product.image} alt={product.name} className="w-full h-full" loading="lazy" />
                {product.compareAtPrice && product.compareAtPrice > displayedPrice && (
                    <span className="absolute top-3 right-3 bg-lux-gold text-white text-xs font-bold px-2 py-1 rounded">پیشنهاد ویژه</span>
                )}
            </Link>
            <div className="p-4">
                <Heading className="font-serif text-lg text-lux-black dark:text-gray-100 mb-1"><Link to={`/product/${encodeURIComponent(product.id)}`}><bdi>{product.name}</bdi></Link></Heading>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">{product.short}</p>
                {product.rating !== undefined && product.reviewCount !== undefined && product.reviewCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3" aria-label={`امتیاز ${product.rating} از ۵`}>
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        <span>{toPersianDigits(product.rating.toFixed(1))}</span>
                        <span>({toPersianDigits(product.reviewCount)} نظر)</span>
                    </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <strong className="text-lux-black dark:text-lux-gold">{formatPrice(displayedPrice)}</strong>
                        {product.compareAtPrice && product.compareAtPrice > displayedPrice && (
                            <div className="text-xs text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</div>
                        )}
                    </div>
                    <button
                        aria-label={`${isOutOfStock ? 'ناموجود' : hasVariants ? 'افزودن گزینه موجود' : 'افزودن'} ${product.name}${defaultVariant && (defaultVariant.size || defaultVariant.color || defaultVariant.name) ? `؛ ${[defaultVariant.size, defaultVariant.color, defaultVariant.name].filter(Boolean).join('، ')}` : ''}`}
                        onClick={() => addToCart(product.id, 1, defaultVariant?.id, product)}
                        disabled={isOutOfStock}
                        className="px-4 py-2 rounded-lg bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-sm font-semibold hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {isOutOfStock ? 'ناموجود' : hasVariants ? 'افزودن گزینه موجود' : 'افزودن'}
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
