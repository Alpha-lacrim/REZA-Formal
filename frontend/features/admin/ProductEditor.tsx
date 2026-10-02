import { useEffect, useRef, useState, type InputHTMLAttributes, type FormEvent } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import api, { ApiError, errorMessage } from '../../services/api';
import type { Product } from '../../types';
import { useRuntime } from '../../state/AppState';
import { Dialog } from './Dialog';
import { fileError, IMAGE_ACCEPT, productPayload, validateProduct, variantDraft, type Metadata, type Pricing, type VariantDraft } from './productForm';

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white p-3 outline-none focus:border-lux-gold dark:border-zinc-700 dark:bg-zinc-800 dark:text-white';
function Field({ label, error, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-bold">{label}</label><input id={id} {...props} className={inputClass} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />{error && <p id={`${id}-error`} className="text-sm text-rose-600">{error}</p>}</div>;
}

export default function ProductEditor({ product, onClose, onSaved }: { product: Partial<Product>; onClose: () => void; onSaved: () => Promise<void> }) {
  const { queries } = useRuntime();
  const [metadata, setMetadata] = useState<Metadata>({ name: product.name || '', category: product.category || 'suits', short: product.short || '', description: product.description || '', fabric: product.fabric || '', active: product.active !== false, featured: Boolean(product.featured) });
  const [pricing, setPricing] = useState<Pricing>({ price: product.price == null ? '' : String(product.price), compareAtPrice: product.compareAtPrice == null ? '' : String(product.compareAtPrice) });
  const [stock, setStock] = useState(String(product.stock || 0));
  const [variants, setVariants] = useState<VariantDraft[]>((product.variants || []).map(variantDraft));
  const [images, setImages] = useState<string[]>(Array.from(new Set([product.image, ...(product.images || [])].filter((image): image is string => Boolean(image)))));
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const urls = files.map(file => URL.createObjectURL(file)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  useEffect(() => { if (Object.keys(errors).length) errorRef.current?.focus(); }, [errors]);
  const updateVariant = (index: number, change: Partial<VariantDraft>) => setVariants(current => current.map((variant, i) => i === index ? { ...variant, ...change } : variant));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    const draft = { product, metadata, pricing, stock, variants, images, files };
    const validation = validateProduct(draft);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    savingRef.current = true; setSaving(true);
    try { await api.adminSaveProduct(productPayload(draft)); await onSaved(); }
    catch (error) {
      if (error instanceof ApiError && error.status === 409) void queries.invalidateQueries({ queryKey: ['admin'] });
      setErrors(error instanceof ApiError && error.status === 409
        ? { server: 'موجودی تغییر کرده است؛ فرم را ببندید و محصول را دوباره باز کنید.' }
        : { server: errorMessage(error, 'ذخیره محصول انجام نشد. دوباره تلاش کنید.'), ...(error instanceof ApiError ? Object.fromEntries(Object.entries(error.fields).map(([key, messages]) => [key, messages.join(' ')])) : {}) });
    } finally { savingRef.current = false; setSaving(false); }
  }
  return <Dialog title={product.id ? 'ویرایش محصول' : 'افزودن محصول جدید'} onClose={onClose} busy={saving}>
    <form onSubmit={save} noValidate className="flex max-h-[90vh] flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-xl font-bold">{product.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h2><button type="button" aria-label="بستن" disabled={saving} onClick={onClose}><X size={20} /></button></header>
      <div className="overflow-y-auto p-6">
        {Object.keys(errors).length > 0 && <div role="alert" ref={errorRef} tabIndex={-1} className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-800"><p>ذخیره انجام نشد؛ موارد زیر را بررسی کنید.</p><ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{message}</li>)}</ul></div>}
        <fieldset disabled={saving} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <legend className="sr-only">اطلاعات محصول</legend>
          <Field id="product-name" label="نام محصول" placeholder="نام کامل محصول..." value={metadata.name} onChange={e => setMetadata({ ...metadata, name: e.target.value })} error={errors.name} required />
          <Field id="product-price" label="قیمت (تومان)" type="number" min="0" step="0.01" value={pricing.price} onChange={e => setPricing({ ...pricing, price: e.target.value })} error={errors.price} required />
          <Field id="product-stock" label="موجودی انبار" type="number" min="0" step="1" disabled={variants.length > 0} value={variants.length ? variants.filter(v => v.active).reduce((sum, v) => sum + Number(v.stock || 0), 0) : stock} onChange={e => setStock(e.target.value)} error={errors.stock} />
          <Field id="product-compare" label="قیمت قبل از تخفیف (اختیاری)" type="number" min="0" step="0.01" value={pricing.compareAtPrice} onChange={e => setPricing({ ...pricing, compareAtPrice: e.target.value })} error={errors.compare_at_price} />
          <div className="space-y-2"><label htmlFor="product-category" className="text-sm font-bold">دسته‌بندی</label><select id="product-category" className={inputClass} value={metadata.category} onChange={e => setMetadata({ ...metadata, category: e.target.value })}><option value="suits">کت و شلوار</option><option value="shirts">پیراهن</option><option value="blazers">بلیزر</option><option value="accessories">اکسسوری</option></select></div>
          <Field id="product-fabric" label="پارچه" value={metadata.fabric} onChange={e => setMetadata({ ...metadata, fabric: e.target.value })} />
          <div className="flex gap-6 md:col-span-2"><label><input type="checkbox" checked={metadata.active} onChange={e => setMetadata({ ...metadata, active: e.target.checked })} /> قابل نمایش و فروش</label><label><input type="checkbox" checked={metadata.featured} onChange={e => setMetadata({ ...metadata, featured: e.target.checked })} /> محصول ویژه</label></div>
          <section className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-zinc-700 md:col-span-2" aria-label="تنوع اندازه و رنگ">
            <div className="flex items-center justify-between"><h3 className="font-bold">تنوع اندازه و رنگ</h3><button type="button" onClick={() => setVariants(current => [...current, { id: `new-${crypto.randomUUID()}`, sku: '', size: '', color: '', stock: '0', price: '', active: true }])} className="flex items-center gap-1 rounded-lg bg-lux-black p-2 text-white dark:bg-white dark:text-lux-black"><Plus size={14} /> افزودن تنوع</button></div>
            <p className="text-xs text-gray-500">موجودی محصول از مجموع تنوع‌های فعال محاسبه می‌شود. برای توقف فروش تنوع ثبت‌شده، گزینه فعال را بردارید؛ سوابق آن حفظ می‌شود.</p>
            {variants.map((variant, index) => <fieldset key={variant.id} className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 dark:bg-zinc-800 md:grid-cols-3"><legend>تنوع {index + 1}</legend>
              {(['sku', 'size', 'color', 'stock', 'price'] as const).map(key => <Field key={key} id={`variant-${index}-${key}`} label={{ sku: 'SKU', size: 'اندازه', color: 'رنگ', stock: 'موجودی', price: 'قیمت اختیاری' }[key]} type={key === 'stock' || key === 'price' ? 'number' : 'text'} min="0" step={key === 'price' ? '0.01' : '1'} value={variant[key]} onChange={e => updateVariant(index, { [key]: e.target.value })} error={errors[`variants.${index}.${key}`]} />)}
              <div className="flex items-center justify-between"><label><input type="checkbox" checked={variant.active} onChange={e => updateVariant(index, { active: e.target.checked })} /> فعال</label>{variant.id.startsWith('new-') && <button type="button" aria-label={`حذف تنوع ${index + 1}`} onClick={() => setVariants(current => current.filter((_, i) => i !== index))}><Trash2 size={18} /></button>}</div>
            </fieldset>)}
          </section>
          <section className="space-y-3 rounded-xl border-2 border-dashed border-gray-200 p-4 dark:border-zinc-700 md:col-span-2" aria-label="گالری تصاویر">
            <h3 className="font-bold">گالری تصاویر</h3><p id="image-help" className="text-xs text-gray-500">حداکثر ۱۲ تصویر ثابت؛ هر فایل ۱۰ و مجموع ۴۰ مگابایت. PNG، JPEG، WebP یا GIF؛ حداکثر ۸۰۰۰ پیکسل در هر ضلع و ۲۰ میلیون پیکسل. اولین فایل جدید تصویر اصلی می‌شود.</p>
            <div className="flex flex-wrap gap-4">{images.map((src, index) => <div key={src} className="relative"><img src={src} alt={`تصویر ذخیره‌شده ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" /><button type="button" aria-label={`حذف تصویر ذخیره‌شده ${index + 1}`} onClick={() => setImages(current => current.filter(image => image !== src))} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"><X size={12} /></button></div>)}
              {previews.map((src, index) => <div key={src} className="relative"><img src={src} alt={files[index]?.name || ''} className="h-20 w-20 rounded-lg object-cover" /><button type="button" aria-label={`حذف تصویر انتخاب‌شده ${index + 1}`} onClick={() => setFiles(current => current.filter((_, i) => i !== index))} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"><X size={12} /></button></div>)}</div>
            <label htmlFor="product-images" className="block font-bold">آپلود تصاویر</label><input id="product-images" type="file" accept={IMAGE_ACCEPT} multiple aria-describedby="image-help" onChange={event => { const next = [...files, ...Array.from(event.target.files || [])]; const error = fileError(next, images.length); if (error) setErrors({ images: error }); else { setFiles(next); setErrors({}); } event.target.value = ''; }} />
          </section>
          <div className="md:col-span-2"><Field id="product-short" label="توضیح کوتاه (زیر عنوان)" value={metadata.short} onChange={e => setMetadata({ ...metadata, short: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><label htmlFor="product-description" className="font-bold">توضیحات کامل</label><textarea id="product-description" rows={4} className={inputClass} value={metadata.description} onChange={e => setMetadata({ ...metadata, description: e.target.value })} /></div>
        </fieldset>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {saving && <span role="status">در حال ارسال تصاویر و ذخیره محصول…</span>}
        <button type="button" disabled={saving} onClick={onClose} className="rounded-xl px-6 py-2.5 font-bold">انصراف</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-lux-gold px-8 py-2.5 font-bold text-white disabled:opacity-50"><Save size={18} /> ذخیره تغییرات</button>
      </footer>
    </form>
  </Dialog>;
}
