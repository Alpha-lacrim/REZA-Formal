import { useActions } from '../../state/AppState';
import React, { useState } from 'react';

import api from '../../services/api';
import { MessageSquare } from 'lucide-react';
import { Pagination, QueryStatus, useAdminPage } from './shared';

export default function Messages() {
const { showToast } = useActions();
const [currentPage, setCurrentPage] = useState(1);
const query = useAdminPage('messages', {page: currentPage, page_size: 8}, api.adminGetMessagePage);
const paginatedMessages = query.data?.results || [];
const loadData = query.invalidate;
    const handleMarkAsRead = async (id: string) => {
        try {
            await api.adminMarkMessageRead(id);
            await loadData();
        } catch (e) {
            showToast('خطا در علامت‌گذاری پیام');
        }
    };

return <>
<QueryStatus query={query} />
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <MessageSquare className="text-lux-gold"/> پیام‌های دریافتی
                            </h1>
                        </div>
                        <div className="space-y-4">
                            {paginatedMessages.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">صندوق پیام خالی است.</p>
                                </div>
                            ) : (
                                paginatedMessages.map(msg => (
                                    <div key={msg.id} className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border transition-all ${!msg.read ? 'border-l-4 border-l-lux-gold border-y-gray-100 dark:border-y-zinc-800 border-r-gray-100 dark:border-r-zinc-800' : 'border-gray-100 dark:border-zinc-800 opacity-80 hover:opacity-100'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                    {msg.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lux-black dark:text-white">{msg.name}</h3>
                                                    <p className="text-xs text-gray-500">{msg.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString('fa-IR')}</span>
                                                {!msg.read && (
                                                    <button onClick={() => handleMarkAsRead(msg.id)} className="text-lux-gold hover:underline text-xs font-bold">
                                                        نشان کردن به عنوان خوانده شده
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                                            {msg.message}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
<Pagination page={query.data} current={currentPage} onChange={setCurrentPage} busy={query.isFetching} />
</>;
}
