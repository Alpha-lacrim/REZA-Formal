
import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ShoppingBag, User, Moon, Sun, Search, ArrowRight, ChevronLeft, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { useGlobal } from '../contexts/GlobalContext';
import { toPersianDigits, formatPrice } from '../utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
    const { 
        cart, toggleCart, 
        theme, toggleTheme, 
        user, setAuthModalOpen, logout,
        products 
    } = useGlobal();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    const userMenuRef = useRef<HTMLDivElement>(null);

    const cartCount = (Object.values(cart) as number[]).reduce((a: number, b: number) => a + b, 0);

    const navLinks = [
        { label: 'کت و شلوار', id: 'suits' },
        { label: 'پیراهن', id: 'shirts' },
        { label: 'بلیزر', id: 'blazer' },
        { label: 'اکسسوری', id: 'accessories' },
        { label: 'دوخت سفارشی', id: 'bespoke' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSectionClick = (sectionId: string) => {
        setIsMobileMenuOpen(false);
        if (location.pathname !== '/') {
            navigate('/', { state: { scrollTo: sectionId } });
        } else {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    const searchResults = searchQuery.length > 1 
        ? products.filter(p => 
            p.name.includes(searchQuery) || 
            p.short?.includes(searchQuery) || 
            p.category.includes(searchQuery)
          ).slice(0, 5)
        : [];

    return (
        <>
            <nav className="fixed top-0 left-0 w-full z-40 transition-all duration-300 bg-lux-body/95 dark:bg-lux-black/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        
                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center justify-between w-full px-2">
                            <button onClick={() => setIsMobileMenuOpen(true)} className="text-lux-black dark:text-white hover:text-lux-gold focus:outline-none">
                                <Menu size={24} />
                            </button>
                            <Link to="/" className="font-logo text-2xl tracking-widest font-bold text-lux-black dark:text-white">
                                REZA <span className="text-lux-gold">Formal</span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsSearchOpen(true)} className="text-lux-black dark:text-white p-1">
                                    <Search size={20} />
                                </button>
                                <button onClick={() => toggleCart(true)} className="relative text-lux-black dark:text-white p-1">
                                    <ShoppingBag size={20} />
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-lux-gold text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                                            {toPersianDigits(cartCount)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Desktop Logo */}
                        <div className="hidden md:flex flex-shrink-0 items-center">
                            <Link to="/" className="font-logo text-3xl tracking-widest font-bold text-lux-black dark:text-white">
                                REZA <span className="text-lux-gold">Formal</span>
                            </Link>
                        </div>

                        {/* Desktop Links */}
                        <div className="hidden md:flex gap-6 items-center">
                            {navLinks.map((link) => (
                                <button 
                                    key={link.id} 
                                    onClick={() => handleSectionClick(link.id)}
                                    className="text-sm lg:text-base uppercase tracking-widest hover-underline-animation whitespace-nowrap dark:text-gray-300 bg-transparent border-none cursor-pointer"
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>

                        {/* Desktop Icons */}
                        <div className="hidden md:flex items-center gap-6 text-lux-black dark:text-white">
                            <button onClick={() => setIsSearchOpen(true)} className="hover:text-lux-gold transition-colors">
                                <Search size={20} />
                            </button>
                            <button onClick={toggleTheme} className="hover:text-lux-gold transition-colors">
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            
                            {/* User Auth/Profile Menu */}
                            <div className="relative" ref={userMenuRef}>
                                <button 
                                    onClick={() => user ? setIsUserDropdownOpen(!isUserDropdownOpen) : setAuthModalOpen(true)} 
                                    className="flex items-center gap-2 px-3 py-1 text-sm border border-transparent hover:border-lux-gold rounded transition-colors hover:text-lux-gold"
                                >
                                    <User size={20} />
                                    <span className="whitespace-nowrap max-w-[100px] truncate">{user ? user.name : 'ورود / ثبت‌نام'}</span>
                                </button>

                                {user && isUserDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-100 dark:border-zinc-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
                                            <p className="text-sm font-bold text-lux-black dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        
                                        {user.role === 'admin' && (
                                            <Link 
                                                to="/admin" 
                                                onClick={() => setIsUserDropdownOpen(false)}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-lux-black dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                            >
                                                <LayoutDashboard size={16} />
                                                پنل مدیریت
                                            </Link>
                                        )}
                                        
                                        <Link 
                                            to="/profile" 
                                            onClick={() => setIsUserDropdownOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-lux-black dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                        >
                                            <Settings size={16} />
                                            پروفایل کاربری
                                        </Link>
                                        
                                        <button 
                                            onClick={() => { logout(); setIsUserDropdownOpen(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-right"
                                        >
                                            <LogOut size={16} />
                                            خروج
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => toggleCart(true)} className="relative hover:text-lux-gold transition-colors">
                                <ShoppingBag size={20} />
                                <span className={`absolute -top-2 -right-2 bg-lux-gold text-white text-xs rounded-full h-4 w-4 flex items-center justify-center transition-opacity duration-300 ${cartCount > 0 ? 'opacity-100' : 'opacity-0'}`}>
                                    {toPersianDigits(cartCount)}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Mobile Side Drawer */}
            <div className={`fixed top-0 right-0 h-screen w-64 bg-lux-body dark:bg-zinc-900 border-l border-gray-100 dark:border-gray-800 shadow-lg z-[51] transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="px-4 pt-4 pb-6 space-y-1 h-full overflow-auto text-lux-black dark:text-white">
                    <div className="flex items-center justify-between mb-6">
                        <div className="font-logo text-xl font-bold">منو</div>
                        <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
                    </div>
                    {navLinks.map((link) => (
                        <button 
                            key={link.id} 
                            onClick={() => handleSectionClick(link.id)}
                            className="block w-full text-right px-3 py-3 text-lg font-medium border-b border-gray-100 dark:border-gray-700 hover:text-lux-gold"
                        >
                            {link.label}
                        </button>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                         {user ? (
                             <>
                                {user.role === 'admin' && (
                                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-right px-3 py-3 hover:text-lux-gold font-bold text-lux-gold">
                                        پنل مدیریت
                                    </Link>
                                )}
                                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-right px-3 py-3 hover:text-lux-gold">
                                    پروفایل کاربری
                                </Link>
                                <button onClick={() => { setIsMobileMenuOpen(false); logout(); }} className="w-full text-right px-3 py-3 text-red-500 hover:text-red-600">
                                    خروج
                                </button>
                             </>
                         ) : (
                            <button onClick={() => { setIsMobileMenuOpen(false); setAuthModalOpen(true); }} className="w-full text-right px-3 py-3 hover:text-lux-gold">
                                ورود / ثبت‌نام
                            </button>
                         )}
                        
                        <button onClick={toggleTheme} className="w-full text-right px-3 py-3 hover:text-lux-gold flex items-center gap-2 mt-2">
                            {theme === 'dark' ? 'حالت روز' : 'حالت شب'}
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Overlay */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-[60] bg-lux-body dark:bg-zinc-900 animate-in fade-in duration-200 flex flex-col">
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-4 bg-lux-body dark:bg-zinc-900">
                        <button 
                            onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} 
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-lux-black dark:text-white"
                        >
                            <ArrowRight size={24} />
                        </button>
                        <div className="flex-1 relative">
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder="جستجو در محصولات..." 
                                className="w-full text-lg md:text-xl bg-transparent border-none outline-none text-lux-black dark:text-white placeholder-gray-400 font-light"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchQuery && (
                             <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-lux-black dark:hover:text-white">
                                <X size={20} />
                             </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
                        {!searchQuery ? (
                            <div className="text-center text-gray-400 mt-20">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p>نام محصول یا دسته بندی مورد نظر را تایپ کنید</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">نتایج جستجو</h3>
                                {searchResults.map(product => (
                                    <Link 
                                        key={product.id} 
                                        to={`/product/${product.id}`}
                                        onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                                        className="flex items-center gap-4 p-3 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors group"
                                    >
                                        <div className="w-16 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-serif text-lux-black dark:text-white group-hover:text-lux-gold transition-colors">{product.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
                                        </div>
                                        <div className="text-sm font-bold text-lux-black dark:text-white">
                                            {formatPrice(product.price)}
                                        </div>
                                        <ChevronLeft size={16} className="text-gray-300 group-hover:text-lux-gold" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 mt-10">
                                <p>محصولی یافت نشد.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
