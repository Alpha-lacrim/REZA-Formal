import React from 'react';
import { Product } from '../types';
import { formatPrice } from '../utils';
import { useGlobal } from '../contexts/GlobalContext';
import { Link } from 'react-router-dom';

const ProductCard: React.FC<{ product: Product, className?: string }> = ({ product, className = "" }) => {
    const { addToCart } = useGlobal();

    return (
        <article className={`product-card bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}>
            <Link to={`/product/${product.id}`} className="block h-64 md:h-80 overflow-hidden bg-gray-200 dark:bg-zinc-700 relative group">
                <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                />
            </Link>
            <div className="p-4">
                <h3 className="font-serif text-lg text-lux-black dark:text-gray-100 mb-1">{product.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{product.short}</p>
                <div className="flex items-center justify-between">
                    <strong className="text-lux-black dark:text-lux-gold">{formatPrice(product.price)}</strong>
                    <button 
                        onClick={() => addToCart(product.id)}
                        className="px-4 py-2 rounded-lg bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black text-sm font-semibold hover:-translate-y-1 transition-transform"
                    >
                        افزودن
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;