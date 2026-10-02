import { useActions } from '../../state/AppState';
import { errorMessage } from '../../services/api';
import React, { useState } from 'react';
import ImageLoader from '../../components/ImageLoader';

import api from '../../services/api';
import { Product } from '../../types';
import { toPersianDigits, formatPrice } from '../../utils';
import { Package, Plus, Trash2, Edit2, Search, AlertCircle, ArrowUpDown } from 'lucide-react';
import { Pagination, QueryStatus, useAdminPage } from './shared';
import { Dialog } from './Dialog';
import ProductEditor from './ProductEditor';

export default function Products() {

const { refreshProducts, showToast } = useActions();
const [searchTerm, setSearchTerm] = useState('');
const [sortBy, setSortBy] = useState('default');
const [currentPage, setCurrentPage] = useState(1);
const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean; productId: string | null}>({isOpen: false, productId: null});
const [deleting, setDeleting] = useState(false);
const query = useAdminPage('products', {page: currentPage, page_size: 8, search: searchTerm, ordering: sortBy}, api.adminGetProductPage);
const paginatedProducts = query.data?.results || [];
const handleDeleteProduct = (id: string) => setDeleteConfirmation({isOpen: true, productId: id});
const confirmDeleteProduct = async () => {
 if (!deleteConfirmation.productId || deleting) return;
 setDeleting(true);
 try { await api.adminDeleteProduct(deleteConfirmation.productId); await query.invalidate(); await refreshProducts(); setDeleteConfirmation({isOpen: false, productId: null}); }
 catch (error) { showToast(errorMessage(error, 'حذف محصول انجام نشد')); }
 finally { setDeleting(false); }
};

return <>
<QueryStatus query={query} />
                    <div className="animate-in fade-in duration-500 space-y-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 sticky top-0 z-20">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <Package className="text-lux-gold"/> مدیریت محصولات
                            </h1>
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64 group">
                                    <input
                                        aria-label="جستجوی محصولات" type="search"
                                        placeholder="جستجو..."
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:bg-white dark:focus:bg-zinc-900 focus:border-lux-gold dark:focus:border-lux-gold outline-none transition-all"
                                    />
                                    <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-lux-gold transition-colors" size={18} />
                                </div>
                                <div className="relative">
                                    <select aria-label="مرتب‌سازی محصولات"
                                        value={sortBy}
                                        onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                                        className="appearance-none bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-lux-black dark:text-white pl-9 pr-4 py-2.5 rounded-xl text-sm h-full focus:border-lux-gold outline-none cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <option value="default">مرتب‌سازی</option>
                                        <option value="price-asc">قیمت: کم به زیاد</option>
                                        <option value="price-desc">قیمت: زیاد به کم</option>
                                        <option value="stock-asc">موجودی: کم</option>
                                        <option value="stock-desc">موجودی: زیاد</option>
                                    </select>
                                    <ArrowUpDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                                <button
                                    aria-label="افزودن" onClick={() => { setEditingProduct({}); }}
                                    className="bg-lux-black dark:bg-white text-white dark:text-lux-black px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-lux-black/10 dark:shadow-white/10 hover:translate-y-[-2px] transition-all"
                                >
                                    <Plus size={18} /> <span className="hidden sm:inline">افزودن</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">محصول</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">دسته‌بندی</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">موجودی</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">قیمت</th>
                                            <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-left">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                        {paginatedProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm">
                                                            <ImageLoader src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                                        </div>
                                                        <span className="font-bold text-lux-black dark:text-white">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-zinc-700">
                                                        {p.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${!p.stock ? 'bg-red-500' : p.stock < 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                        <span className={`font-mono font-bold ${!p.stock ? 'text-red-600' : 'text-lux-black dark:text-white'}`}>
                                                            {toPersianDigits(p.stock || 0)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-lux-black dark:text-white">{formatPrice(p.price)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                                        <button
                                                            aria-label={`ویرایش ${p.name}`}
                                                            onClick={() => { setEditingProduct(p); }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                            title="ویرایش"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            aria-label={`حذف ${p.name}`} onClick={() => handleDeleteProduct(p.id)}
                                                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

<Pagination page={query.data} current={currentPage} onChange={setCurrentPage} busy={query.isFetching} />
                        </div>
                    </div>
{editingProduct && <ProductEditor product={editingProduct} onClose={() => setEditingProduct(null)} onSaved={async () => { setEditingProduct(null); await query.invalidate(); await refreshProducts(); }} />}
                {deleteConfirmation.isOpen && (
                    <Dialog title="حذف محصول" size="confirm" onClose={() => setDeleteConfirmation({ isOpen: false, productId: null })} busy={deleting}>
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-in zoom-in duration-200 border border-gray-100 dark:border-zinc-800">
                            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 ring-8 ring-rose-50 dark:ring-rose-900/10">
                                <AlertCircle size={40} />
                            </div>
                            <h3 className="font-bold text-2xl text-lux-black dark:text-white mb-3">حذف محصول</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
                                آیا از حذف این محصول اطمینان دارید؟<br/>این عملیات غیرقابل بازگشت است و تمام اطلاعات مرتبط حذف خواهد شد.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    disabled={deleting} onClick={() => setDeleteConfirmation({ isOpen: false, productId: null })}
                                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 font-bold transition-colors"
                                >
                                    انصراف
                                </button>
                                <button
                                    disabled={deleting} onClick={confirmDeleteProduct}
                                    className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 font-bold shadow-lg shadow-rose-500/30 transition-all"
                                >
                                    بله، حذف شود
                                </button>
                            </div>
                        </div>
                    </Dialog>
)}
</>;
}
