import React, { useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';

const ChatWidget: React.FC = () => {
    const { sendMessage } = useGlobal();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sendMessage(name, email, message);
            setName('');
            setEmail('');
            setMessage('');
            setIsSent(true);
            setTimeout(() => {
                setIsSent(false);
                setIsOpen(false);
            }, 2000);
        } catch (error) {
            // Error handled by global toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl border border-gray-100 dark:border-zinc-700 w-80 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-lux-black dark:bg-zinc-900 p-4 flex justify-between items-center text-white">
                        <span className="font-bold text-sm">پیام به پشتیبانی</span>
                        <button onClick={() => setIsOpen(false)} className="hover:text-lux-gold transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    
                    <div className="p-4">
                        {isSent ? (
                            <div className="py-8 text-center text-green-500 animate-in zoom-in duration-300">
                                <p className="font-bold mb-2">پیام ارسال شد!</p>
                                <p className="text-xs text-gray-500">به زودی با شما تماس می‌گیریم.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <input 
                                    type="text" 
                                    placeholder="نام شما" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded bg-white text-lux-black dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none"
                                    required
                                />
                                <input 
                                    type="email" 
                                    placeholder="ایمیل" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-300 rounded bg-white text-lux-black dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none dir-ltr text-left"
                                    required
                                />
                                <textarea 
                                    placeholder="چطور می‌توانیم کمک کنیم؟" 
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows={3}
                                    className="w-full text-sm p-2 border border-gray-300 rounded bg-white text-lux-black dark:bg-zinc-700 dark:border-zinc-600 dark:text-white focus:border-lux-gold outline-none resize-none"
                                    required
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full bg-lux-gold text-white text-sm font-bold py-2 rounded hover:bg-lux-gold-dark transition-colors flex justify-center items-center gap-2"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    ارسال پیام
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-lux-gold hover:bg-lux-gold-dark text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 btn-ripple"
                aria-label="پشتیبانی"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>
        </div>
    );
};

export default ChatWidget;