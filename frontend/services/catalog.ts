import type { Product, ProductVariant } from '../types';
import { request } from './http/client';
import { invalidResponse, isRecord } from './http/errors';
import { toNumber, toBoolean, optionalTimestamp, parseJsonList, parseStringRecord } from './normalization';

const stringFields = ["sku","name","size","color","currency","image","name_fa","short","short_fa","description","description_fa","category","fabric","inventory_version","inventoryVersion"] as const;
const numberFields = ["price","priceOverride","price_override","compareAtPrice","compare_at_price","stock","rating","reviewCount","review_count"] as const;
const booleanFields = ["active","is_active","featured","is_featured"] as const;
const idFields = ["id","productId","product_id","product"] as const;
const dateFields = ["createdAt","created_at","updatedAt","updated_at"] as const;

// Raw decimal/date/boolean values differ from the normalized UI model.
// Both documented snake_case and retained camelCase aliases are checked here.
type CatalogDto = Partial<Record<typeof stringFields[number], string | null>>
  & Partial<Record<typeof numberFields[number], number | string | null>>
  & Partial<Record<typeof booleanFields[number], boolean | 'true' | 'false' | 0 | 1 | null>>
  & Partial<Record<typeof idFields[number], string | number | null>>
  & Partial<Record<typeof dateFields[number], string | number | null>>
  & { images?: unknown; attributes?: unknown; variants?: unknown[] };

function isCatalogDto(value: unknown): value is CatalogDto {
  if (!isRecord(value) || !['string', 'number'].includes(typeof value.id) || !String(value.id)) return false;
  const present = (key: string) => value[key] !== undefined && value[key] !== null;
  return stringFields.every(key => !present(key) || typeof value[key] === 'string')
    && numberFields.every(key => !present(key) || (
      (typeof value[key] === 'number' || (typeof value[key] === 'string' && value[key].trim() !== ''))
      && Number.isFinite(Number(value[key]))))
    && booleanFields.every(key => !present(key) || [true, false, 'true', 'false', 0, 1].some(item => item === value[key]))
    && idFields.every(key => !present(key) || ['string', 'number'].includes(typeof value[key]))
    && dateFields.every(key => !present(key) || ['string', 'number'].includes(typeof value[key]))
    && (value.variants === undefined || Array.isArray(value.variants))
    && (value.images === undefined || value.images === null || typeof value.images === 'string'
      || (Array.isArray(value.images) && value.images.every(item => typeof item === 'string')));
}

export function normalizeVariant(value: unknown, fallbackCurrency = 'Toman'): ProductVariant {
  if (!isCatalogDto(value)) return invalidResponse();
  const raw = value;
  return {
    id: String(raw?.id ?? ''),
    productId: raw?.productId === undefined && raw?.product_id === undefined && raw?.product === undefined
      ? undefined
      : String(raw?.productId ?? raw?.product_id ?? raw?.product),
    sku: raw?.sku ?? '',
    name: raw?.name || undefined,
    size: raw?.size || undefined,
    color: raw?.color || undefined,
    attributes: parseStringRecord(raw?.attributes),
    price: toNumber(raw?.price),
    priceOverride: raw?.priceOverride === undefined && raw?.price_override === undefined
      ? undefined
      : (raw?.priceOverride ?? raw?.price_override) === null
        ? null
        : toNumber(raw?.priceOverride ?? raw?.price_override),
    compareAtPrice: (raw?.compareAtPrice ?? raw?.compare_at_price) === null
      || (raw?.compareAtPrice === undefined && raw?.compare_at_price === undefined)
      ? undefined
      : toNumber(raw?.compareAtPrice ?? raw?.compare_at_price),
    currency: raw?.currency || fallbackCurrency,
    stock: toNumber(raw?.stock),
    active: toBoolean(raw?.active ?? raw?.is_active, true),
    image: raw?.image || undefined,
    createdAt: optionalTimestamp(raw?.createdAt ?? raw?.created_at),
    updatedAt: optionalTimestamp(raw?.updatedAt ?? raw?.updated_at),
  };
}

export function normalizeProduct(value: unknown): Product {
  if (!isCatalogDto(value)) return invalidResponse();
  const raw = value;
  const images = parseJsonList(raw?.images);
  const image = raw?.image || images[0] || '';
  const currency = raw?.currency || 'Toman';
  const variants = Array.isArray(raw?.variants)
    ? raw.variants.map((variant: unknown) => normalizeVariant(variant, currency))
    : undefined;
  const explicitStock = raw?.stock === null || raw?.stock === undefined ? undefined : toNumber(raw.stock);

  return {
    id: String(raw?.id ?? ''),
    name: raw?.name ?? '',
    name_fa: raw?.name_fa ?? undefined,
    price: toNumber(raw?.price),
    compareAtPrice: (raw?.compareAtPrice ?? raw?.compare_at_price) === null
      || (raw?.compareAtPrice === undefined && raw?.compare_at_price === undefined)
      ? undefined
      : toNumber(raw?.compareAtPrice ?? raw?.compare_at_price),
    currency,
    image,
    primaryImage: raw.image || null,
    images: images.length > 0 ? images : (image ? [image] : []),
    short: raw?.short ?? '',
    short_fa: raw?.short_fa ?? undefined,
    description: raw?.description ?? '',
    description_fa: raw?.description_fa ?? undefined,
    category: raw?.category ?? '',
    fabric: raw?.fabric || undefined,
    stock: explicitStock ?? (variants ? variants.reduce((sum: number, variant: ProductVariant) => sum + variant.stock, 0) : undefined),
    inventoryVersion: raw?.inventory_version ?? raw?.inventoryVersion ?? undefined,
    variants,
    rating: raw?.rating === null || raw?.rating === undefined ? undefined : toNumber(raw.rating),
    reviewCount: raw?.reviewCount === undefined && raw?.review_count === undefined
      ? undefined
      : toNumber(raw?.reviewCount ?? raw?.review_count),
    active: raw?.active === undefined && raw?.is_active === undefined
      ? undefined
      : toBoolean(raw?.active ?? raw?.is_active),
    featured: raw?.featured === undefined && raw?.is_featured === undefined
      ? undefined
      : toBoolean(raw?.featured ?? raw?.is_featured),
  };
}


export const catalogApi = {
  async getProducts(signal?: AbortSignal): Promise<Product[]> {
    const raw = await request('/api/products/', { signal });
    const items = Array.isArray(raw) ? raw : isRecord(raw) ? raw.results : undefined;
    if (!Array.isArray(items)) return invalidResponse();
    return items.map(normalizeProduct);
  },
  async getProduct(id: string, signal?: AbortSignal): Promise<Product> {
    return normalizeProduct(await request(`/api/products/${encodeURIComponent(id)}/`, { signal }));
  },
};
