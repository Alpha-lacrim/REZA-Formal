import { useAdminData } from '../../state/admin';
import React from 'react';

import { toPersianDigits, formatPrice } from '../../utils';
import { Package, ShoppingBag, MessageSquare, Calendar, DollarSign } from 'lucide-react';

export default function Dashboard() {
const { stats } = useAdminData('dashboard');
return <>
                    <div className="animate-in fade-in duration-500 space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-3xl font-serif font-bold text-lux-black dark:text-white">داشبورد</h1>
                            <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm flex items-center gap-2">
                                <Calendar size={16} />
                                {new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'کل فروش', value: formatPrice(stats.revenue), icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                                { label: 'سفارشات', value: toPersianDigits(stats.ordersCount), icon: ShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                { label: 'محصولات', value: toPersianDigits(stats.productsCount), icon: Package, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                { label: 'پیام‌ها', value: toPersianDigits(stats.messagesCount), icon: MessageSquare, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md transition-all duration-300 group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md group-hover:bg-lux-gold group-hover:text-white transition-colors cursor-default">
                                            امروز
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                                        <h3 className="text-2xl font-bold text-lux-black dark:text-white tracking-tight">{stat.value}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Orders Preview could go here */}
                    </div>

</>;
}
