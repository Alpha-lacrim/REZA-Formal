import { products as seedProducts } from '../data';
import { Product } from '../types';

const PRODUCTS_KEY = 'reza_db_products_v1';
const MAX_DATA_URL_LENGTH = 100_000;
const RETIRED_LOCAL_BACKEND_KEYS = [
    'reza_db_users_v1',
    'reza_db_orders_v1',
    'reza_db_messages_v1',
    'reza_db_settings_v1',
];

function sanitizeStoredProducts(products: unknown): Product[] {
    if (!Array.isArray(products)) return [];

    return products.filter(Boolean).map((raw: any) => {
        const images = (Array.isArray(raw.images) ? raw.images : [])
            .filter((image: unknown): image is string => typeof image === 'string')
            .filter(image => !image.startsWith('data:image/') || image.length <= MAX_DATA_URL_LENGTH);
        const primaryImage = typeof raw.image === 'string' &&
            (!raw.image.startsWith('data:image/') || raw.image.length <= MAX_DATA_URL_LENGTH)
            ? raw.image
            : (images[0] || '');

        return { ...raw, image: primaryImage, images } as Product;
    });
}

class LocalCatalogFallback {
    constructor() {
        // Older browser-only builds stored fake accounts (including plaintext
        // passwords) and admin data locally. The Django API supersedes them.
        RETIRED_LOCAL_BACKEND_KEYS.forEach(key => localStorage.removeItem(key));

        if (!localStorage.getItem(PRODUCTS_KEY)) {
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(seedProducts));
        }
    }

    async getProducts(): Promise<Product[]> {
        try {
            const stored = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
            const products = sanitizeStoredProducts(stored);
            localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
            return products.length > 0 ? products : seedProducts;
        } catch {
            return seedProducts;
        }
    }
}

export const db = new LocalCatalogFallback();
