import { useAdminData } from '../state/admin';
import { useAuth, useTheme } from '../state/AppState';
import React, { useState } from 'react';

import { toPersianDigits } from '../utils';
import { LayoutDashboard, Package, ShoppingBag, X, MessageSquare, Settings as SettingsIcon, User as UserIcon, Menu, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import Dashboard from '../features/admin/Dashboard';
import Products from '../features/admin/Products';
import Orders from '../features/admin/Orders';
import Commerce from '../features/admin/Commerce';
import Messages from '../features/admin/Messages';
import SiteSettingsFeature from '../features/admin/SiteSettingsFeature';
import { Dialog } from '../features/admin/Dialog';
type AdminTab = 'dashboard' | 'products' | 'orders' | 'commerce' | 'messages' | 'settings';

const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
const { stats, adminError, loadData } = useAdminData('shell');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    return (
        <div dir="rtl" className="min-h-screen bg-lux-body dark:bg-zinc-950 pt-20 flex flex-col md:flex-row transition-colors duration-300">
            <style>{`.admin-commerce-input{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;background:#fff;padding:.625rem .75rem;font-size:.875rem;outline:none}.admin-commerce-input:focus{border-color:#c5a059}.dark .admin-commerce-input{border-color:#3f3f46;background:#27272a;color:#fff}`}</style>
            <SEO title="پنل مدیریت" noIndex />
            
            {/* Sidebar (hidden on small screens; mobile drawer used instead) */}
            <aside className="hidden md:flex md:w-72 bg-white dark:bg-zinc-900 border-b md:border-b-0 md:border-l border-gray-200 dark:border-zinc-800 p-6 shrink-0 print:hidden flex-col h-auto md:h-[calc(100vh-5rem)] sticky top-20 shadow-sm z-30">
                <div className="flex items-center gap-4 mb-10 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lux-gold to-lux-gold-dark shadow-lg shadow-lux-gold/20 flex items-center justify-center text-white font-serif font-bold text-xl ring-2 ring-white dark:ring-zinc-800">A</div>
                    <div>
                        <h2 className="font-bold text-lux-black dark:text-white text-lg tracking-tight">پنل مدیریت</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">نسخه ۲.۴.۰</p>
                    </div>
                </div>
                <nav aria-label="بخش‌های مدیریت" className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
                        { id: 'products', label: 'محصولات', icon: Package },
                        { id: 'orders', label: 'سفارشات', icon: ShoppingBag },
                        { id: 'messages', label: 'پیام‌ها', icon: MessageSquare, badge: stats.messagesCount },
                        { id: 'settings', label: 'تنظیمات سایت', icon: SettingsIcon },
                    ].map(item => (
                        <button 
                            key={item.id}
                            aria-pressed={activeTab === item.id} onClick={() => setActiveTab(item.id as AdminTab)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group relative overflow-hidden ${
                                activeTab === item.id 
                                ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-lux-black dark:hover:text-white'
                            }`}
                        >
                            <item.icon size={20} className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="relative z-10">{item.label}</span>
                            {item.badge ? (
                                <span className={`mr-auto text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === item.id ? 'bg-white text-lux-black dark:bg-lux-black dark:text-white' : 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'}`}>
                                    {toPersianDigits(item.badge)}
                                </span>
                            ) : null}
                        </button>
                    ))}
                    <button onClick={() => setActiveTab('commerce')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'commerce' ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                        <Tags size={20} /> عملیات فروشگاه
                        {((stats.pendingReviewsCount || 0) + (stats.pendingReturnsCount || 0) + (stats.pendingBespokeCount || 0)) > 0 && <span className="mr-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{toPersianDigits((stats.pendingReviewsCount || 0) + (stats.pendingReturnsCount || 0) + (stats.pendingBespokeCount || 0))}</span>}
                    </button>
                </nav>
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lux-gray dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                            <UserIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-lux-black dark:text-white truncate">{user?.name || 'مدیر'}</p>
                            <p className="text-[10px] text-gray-400 truncate">{user?.email || ''}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile slide-over drawer */}
            {mobileSidebarOpen && (
                <Dialog title="منوی مدیریت" size="drawer" onClose={() => setMobileSidebarOpen(false)}>
                    <aside className="relative ml-auto w-72 bg-white dark:bg-zinc-900 p-6 h-full overflow-y-auto shadow-xl transform translate-x-0 transition-transform duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-lux-gray dark:bg-zinc-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                                    <UserIcon size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-lux-black dark:text-white">پنل مدیریت</p>
                                    <p className="text-xs text-gray-400">نسخه ۲.۴.۰</p>
                                </div>
                            </div>
                            <button aria-label="بستن منوی مدیریت" onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800"><X size={18} /></button>
                        </div>
                        <nav aria-label="بخش‌های مدیریت" className="space-y-2">
                            {[
                                { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
                                { id: 'products', label: 'محصولات', icon: Package },
                                { id: 'orders', label: 'سفارشات', icon: ShoppingBag },
                                { id: 'messages', label: 'پیام‌ها', icon: MessageSquare, badge: stats.messagesCount },
                                { id: 'settings', label: 'تنظیمات سایت', icon: SettingsIcon },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setActiveTab(item.id as AdminTab); setMobileSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-lux-black dark:hover:text-white'}`}
                                >
                                    <item.icon size={18} />
                                    <span className="relative z-10">{item.label}</span>
                                </button>
                            ))}
                            <button onClick={() => { setActiveTab('commerce'); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold ${activeTab === 'commerce' ? 'bg-lux-black dark:bg-white text-white dark:text-lux-black' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}><Tags size={18} /> عملیات فروشگاه</button>
                        </nav>
                    </aside>
                </Dialog>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto h-full">
                {adminError && <div role="alert" className="mb-4 rounded-lg border border-red-300 p-3 text-red-700">
                    دریافت اطلاعات مدیریت انجام نشد. <button onClick={() => void loadData()} className="underline">تلاش دوباره</button>
                </div>}
                {/* Mobile header: hamburger to open drawer */}
                <div className="md:hidden flex items-center justify-between mb-4">
                    <button aria-label="باز کردن منوی مدیریت" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen(true)} className="p-2.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800">
                        <Menu size={20} className="text-lux-gold" />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="font-bold text-lg text-lux-black dark:text-white">پنل مدیریت</h2>
                    </div>
                    <div className="w-10" />
                </div>

{activeTab === 'dashboard' && <Dashboard />}
{activeTab === 'products' && <Products />}
{activeTab === 'orders' && <Orders />}
{activeTab === 'commerce' && <Commerce />}
{activeTab === 'messages' && <Messages />}
{activeTab === 'settings' && <SiteSettingsFeature />}
</main></div>);
};
export default AdminPanel;
