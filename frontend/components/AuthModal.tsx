import { useActions, useOverlays } from '../state/AppState';
import { errorMessage, ApiError } from '../services/api';
import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';


const AuthModal: React.FC = () => {
    const { isAuthModalOpen } = useOverlays();
    const { setAuthModalOpen, login, register } = useActions();
    const [view, setView] = useState<'login' | 'register'>('login');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!isAuthModalOpen) {
            setView('login');
            setEmail('');
            setPassword('');
            setName('');
            setError('');
            setLoading(false);
        }
    }, [isAuthModalOpen]);


    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            if (!email || !password || (view === 'register' && !name)) {
                throw new ApiError(0, 'لطفاً تمام فیلدها را پر کنید', {}, 'validation_error');
            }

            if (view === 'login') {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
            // If successful, modal closes via context state change triggered by login/register
        } catch (err: unknown) {
            setError(errorMessage(err, 'خطایی رخ داد'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setAuthModalOpen(false)}>
            <div className="bg-white dark:bg-zinc-800 rounded-lg w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-bold mb-6 text-lux-black dark:text-white flex items-center gap-2">
                    {view === 'login' && 'ورود به حساب'}
                    {view === 'register' && 'ایجاد حساب کاربری'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {view === 'register' && (
                        <input 
                            type="text" 
                            placeholder="نام و نام خانوادگی" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none placeholder-gray-400"
                            disabled={loading}
                        />
                    )}
                    
                        <>
                            <input 
                                type="email" 
                                placeholder="ایمیل" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none text-left dir-ltr placeholder-gray-400" 
                                dir="ltr"
                                disabled={loading}
                            />
                            <input 
                                type="password" 
                                placeholder="رمز عبور" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none text-left dir-ltr placeholder-gray-400"
                                dir="ltr"
                                disabled={loading}
                            />
                        </>

                    {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (view === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />)}
                        {loading ? 'لطفا صبر کنید...' : (view === 'login' ? 'ورود' : 'ثبت نام')}
                    </button>
                </form>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700 flex justify-between items-center text-sm">
                        <button 
                            onClick={() => {
                                setView(view === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-lux-gold hover:underline"
                            disabled={loading}
                        >
                            {view === 'login' ? 'حساب ندارید؟ ثبت نام' : 'حساب دارید؟ ورود'}
                        </button>
                        {view === 'register' && (
                            <button onClick={() => setView('login')} className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                برگشت <ArrowLeft size={14} />
                            </button>
                        )}
                    </div>
            </div>
        </div>
    );
};

export default AuthModal;
