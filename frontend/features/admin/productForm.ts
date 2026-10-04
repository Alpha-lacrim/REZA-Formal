import type { Product, ProductVariant } from '../../types';

export const MAX_IMAGES = 12;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
export type Metadata = Pick<Product, 'name' | 'category' | 'short' | 'description' | 'fabric' | 'active' | 'featured'>;
export type Pricing = { price: string; compareAtPrice: string };
export type VariantDraft = { id: string; sku: string; size: string; color: string; stock: string; price: string; active: boolean };
export const variantDraft = (v: ProductVariant): VariantDraft => ({ id: v.id, sku: v.sku, size: v.size || '', color: v.color || '', stock: String(v.stock), price: v.priceOverride == null ? '' : String(v.priceOverride), active: v.active });
export type ProductDraft = { product: Partial<Product>; metadata: Metadata; pricing: Pricing; stock: string; variants: VariantDraft[]; images: string[]; files: File[] };

export function fileError(files: File[], imageCount: number): string | undefined {
  if (files.length + imageCount > MAX_IMAGES) return 'حداکثر ۱۲ تصویر مجاز است.';
  if (files.some(file => !IMAGE_ACCEPT.split(',').includes(file.type) || !/\.(png|jpe?g|webp|gif)$/i.test(file.name))) return 'فقط PNG، JPEG، WebP و GIF ثابت مجاز است.';
  if (files.some(file => file.size > MAX_FILE_BYTES)) return 'حجم هر تصویر باید حداکثر ۱۰ مگابایت باشد.';
  if (files.reduce((size, file) => size + file.size, 0) > MAX_UPLOAD_BYTES) return 'مجموع حجم تصاویر باید حداکثر ۴۰ مگابایت باشد.';
}

export function validateProduct(draft: ProductDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const amount = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && /^\d+(\.\d{1,2})?$/.test(value);
  const stock = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value));
  if (!draft.metadata.name.trim()) errors.name = 'نام محصول الزامی است.';
  if (!amount(draft.pricing.price)) errors.price = 'قیمت معتبر و نامنفی وارد کنید.';
  if (draft.pricing.compareAtPrice && !amount(draft.pricing.compareAtPrice)) errors.compare_at_price = 'قیمت قبل از تخفیف معتبر نیست.';
  if (!draft.variants.length && !stock(draft.stock)) errors.stock = 'موجودی باید عدد صحیح و نامنفی باشد.';
  const skus = new Set<string>();
  draft.variants.forEach((variant, index) => {
    const sku = variant.sku.trim().toUpperCase();
    if (!sku || skus.has(sku)) errors[`variants.${index}.sku`] = 'SKU الزامی و برای هر تنوع یکتا است.';
    skus.add(sku);
    if (!stock(variant.stock)) errors[`variants.${index}.stock`] = 'موجودی باید عدد صحیح و نامنفی باشد.';
    if (variant.price && !amount(variant.price)) errors[`variants.${index}.price`] = 'قیمت تنوع معتبر نیست.';
  });
  const mediaError = fileError(draft.files, draft.images.length);
  if (mediaError) errors.images = mediaError;
  return errors;
}

// Only raw Files and persisted references cross this boundary; object URLs never do.
export function productPayload({ product, metadata, pricing, stock, variants, images, files }: ProductDraft): FormData {
  const form = new FormData();
  if (product.id) form.append('id', product.id);
  if (product.inventoryVersion) form.append('inventory_version', product.inventoryVersion);
  Object.entries(metadata).forEach(([key, value]) => form.append(key === 'active' ? 'is_active' : key, String(value ?? '')));
  form.set('name', metadata.name.trim());
  form.append('price', pricing.price);
  form.append('compare_at_price', pricing.compareAtPrice); // Explicit empty clears the nullable decimal.
  form.append('currency', product.currency || 'Toman');
  form.append('stock', variants.length ? String(variants.filter(v => v.active).reduce((sum, v) => sum + Number(v.stock), 0)) : stock);
  if (variants.length || product.variants?.length) form.append('variants', JSON.stringify(variants.map(v => ({ ...(v.id.startsWith('new-') ? {} : { id: v.id }), sku: v.sku.trim().toUpperCase(), size: v.size, color: v.color, stock: Number(v.stock), price: v.price === '' ? null : Number(v.price), is_active: v.active }))));
  const primary = product.primaryImage === undefined ? product.image : product.primaryImage;
  const keptPrimary = primary && images.includes(primary);
  form.append('images', JSON.stringify(files.length ? images : images.filter(image => image !== primary)));
  if (files.length) { form.append('image', files[0]); files.slice(1).forEach(file => form.append('images[]', file)); }
  else if (primary && !keptPrimary) form.append('image', '');
  return form;
}
