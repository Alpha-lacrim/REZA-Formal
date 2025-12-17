import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, ArrowLeft, Loader2, ShieldCheck, Mail, Smartphone } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';

const AuthModal: React.FC = () => {
    const { isAuthModalOpen, setAuthModalOpen, login, loginWithGoogle, register, sendOtp, showToast } = useGlobal();
    const [view, setView] = useState<'login' | 'register' | '2fa'>('login');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    
    // Timer for "Resend Code"
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (!isAuthModalOpen) {
            setView('login');
            setEmail('');
            setPassword('');
            setName('');
            setTwoFactorCode('');
            setError('');
            setLoading(false);
            setGoogleLoading(false);
            setCooldown(0);
        }
    }, [isAuthModalOpen]);

    useEffect(() => {
        let timer: any;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    if (!isAuthModalOpen) return null;

    const handleSendCode = async (method: 'email' | 'sms') => {
        if (cooldown > 0) return;
        setLoading(true);
        try {
            const token = await sendOtp(email);
            if (method === 'email') {
                showToast(`کد تایید به ایمیل ارسال شد: ${token}`);
            } else {
                showToast(`کد تایید به شماره همراه ارسال شد: ${token}`);
            }
            setCooldown(60);
        } catch (err: any) {
            setError(err.message || 'خطا در ارسال کد');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            // Pass the currently entered email if any, to simulate that specific user
            await loginWithGoogle(email || undefined);
        } catch (err: any) {
            setError('خطا در ورود با گوگل');
        } finally {
            setGoogleLoading(false);
        }
    };

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
                // Automatically send Code via Email when entering 2FA view
                setTimeout(() => handleSendCode('email'), 100);
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
                
                {view === 'login' && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded border border-yellow-200 dark:border-yellow-700">
                        <span className="font-bold">حساب مدیر آزمایشی:</span><br/>
                        ایمیل: admin@reza.com<br/>
                        رمز: admin
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {view === 'register' && (
                        <input 
                            type="text" 
                            placeholder="نام و نام خانوادگی" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none placeholder-gray-400"
                            disabled={loading || googleLoading}
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
                                disabled={loading || googleLoading}
                            />
                            <input 
                                type="password" 
                                placeholder="رمز عبور" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 bg-white text-lux-black rounded-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-white focus:border-lux-gold outline-none text-left dir-ltr placeholder-gray-400"
                                dir="ltr"
                                disabled={loading || googleLoading}
                            />
                        </>
                    )}

                    {view === '2fa' && (
                        <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                            <div className="text-center mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-2">
                                    <ShieldCheck size={24} />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">کد تایید ارسال شده را وارد کنید.</p>
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

                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => handleSendCode('email')}
                                    disabled={cooldown > 0 || loading}
                                    className="text-xs py-2 px-2 border border-gray-200 dark:border-zinc-700 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-300"
                                >
                                    <Mail size={14} />
                                    {cooldown > 0 ? `صبر کنید...` : 'ارسال به ایمیل'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleSendCode('sms')}
                                    disabled={cooldown > 0 || loading}
                                    className="text-xs py-2 px-2 border border-gray-200 dark:border-zinc-700 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-300"
                                >
                                    <Smartphone size={14} />
                                    {cooldown > 0 ? `صبر کنید...` : 'ارسال به موبایل'}
                                </button>
                             </div>
                             
                             {cooldown > 0 && (
                                <p className="text-center text-[10px] text-gray-400 mt-1">
                                    ارسال مجدد تا {cooldown} ثانیه دیگر
                                </p>
                             )}
                        </div>
                    )}
                    
                    {error && <p className="text-red-500 text-sm animate-pulse">{error}</p>}

                    <button 
                        type="submit" 
                        disabled={loading || googleLoading}
                        className="w-full py-3 bg-lux-black dark:bg-lux-gold text-white dark:text-lux-black rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (view === 'login' ? <LogIn size={18} /> : (view === 'register' ? <UserPlus size={18} /> : <ShieldCheck size={18} />))}
                        {loading ? 'لطفا صبر کنید...' : (view === 'login' ? 'ورود' : (view === 'register' ? 'ثبت نام' : 'تایید و ورود'))}
                    </button>
                </form>

                {view !== '2fa' && (
                    <div className="mt-4">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-zinc-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500">یا</span>
                            </div>
                        </div>

                        <button 
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading || googleLoading}
                            className="w-full py-3 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-700 dark:text-white rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-zinc-600 flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                        >
                            {googleLoading ? (
                                <Loader2 size={18} className="animate-spin text-gray-500" />
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                            )}
                            {view === 'login' ? 'ورود با گوگل' : 'ثبت نام با گوگل'}
                        </button>
                    </div>
                )}

                {view !== '2fa' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-700 flex justify-between items-center text-sm">
                        <button 
                            onClick={() => {
                                setView(view === 'login' ? 'register' : 'login');
                                setError('');
                            }}
                            className="text-lux-gold hover:underline"
                            disabled={loading || googleLoading}
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