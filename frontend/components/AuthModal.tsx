import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';

const AuthModal: React.FC = () => {
    const { isAuthModalOpen, setAuthModalOpen, login, register } = useGlobal();
    const [view, setView] = useState<'login' | 'register' | '2fa'>('login');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!isAuthModalOpen) {
            setView('login');
            setEmail('');
            setPassword('');
            setName('');
            setTwoFactorCode('');
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
            if (view === '2fa') {
                if (!twoFactorCode || twoFactorCode.length !== 6) {
                    throw new Error('کد تایید باید ۶ رقم باشد');
                }
                await login(email, password, twoFactorCode);
            } else {
                if (!email || !password || (view === 'register' && !name)) {
                    throw new Error('لطفاً تمام فیلدها را پر کنید');
                }

                if (view === 'login') {
                    await login(email, password);
                } else {
                    await register(name, email, password);
                }
            }
            // If successful, modal closes via context state change triggered by login/register
        } catch (err: any) {
            if (err.message === '2FA_REQUIRED') {
                setView('2fa');
                setError('');
            } else {
                setError(err.message || 'خطایی رخ داد');
            }
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
                    {view === '2fa' && (
                        <>
                            <ShieldCheck className="text-lux-gold" />
                            تایید دو مرحله‌ای
                        </>
                    )}
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
                    
                    {view !== '2fa' && (
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
                    )}

                    {view === '2fa' && (
                        <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-2">
                                    <ShieldCheck size={24} />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">کد ۶ رقمی برنامه احراز هویت خود را وارد کنید.</p>
                            </div>
                            
                            <input 
                                type="text" 
                                placeholder="------" 
                                value={twoFactorCode}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                                    setTwoFactorCode(val);
                                }}
                                className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none text-center text-2xl tracking-[0.5em] font-mono placeholder-gray-300"
                                dir="ltr"
                                disabled={loading}
                                autoFocus
                            />


                        </div>
                    )}
                    
                    {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (view === 'login' ? <LogIn size={18} /> : (view === 'register' ? <UserPlus size={18} /> : <ShieldCheck size={18} />))}
                        {loading ? 'لطفا صبر کنید...' : (view === 'login' ? 'ورود' : (view === 'register' ? 'ثبت نام' : 'تایید و ورود'))}
                    </button>
                </form>

                {view !== '2fa' && (
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
                )}
                
                {view === '2fa' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700 flex justify-center text-sm">
                        <button onClick={() => setView('login')} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-lux-gold">
                            <ArrowLeft size={14} /> بازگشت به ورود
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
