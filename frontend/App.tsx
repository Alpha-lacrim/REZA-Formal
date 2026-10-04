import { AppStateProvider, useAuth, useToast } from './state/AppState';
import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MiniCart from './components/MiniCart';
import AuthModal from './components/AuthModal';
import ChatWidget from './components/ChatWidget';
import HomePage from './pages/HomePage';
import PageLoader from './components/PageLoader';
import NotFoundPage from './pages/NotFoundPage';

const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const UserPanel = lazy(() => import('./pages/UserPanel'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const BespokePage = lazy(() => import('./pages/BespokePage'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));

const Toast = () => {
    const { toastMessage } = useToast();
    return (
        <div role="status" aria-live="polite" aria-atomic="true">
            {toastMessage && <div className="fixed bottom-4 right-4 max-w-[calc(100vw-2rem)] z-[10000] bg-lux-black text-white px-6 py-3 rounded-lg shadow-lg">{toastMessage}</div>}
        </div>
    );
};

const RouteFocus = () => {
    const { pathname } = useLocation();
    const previousPath = useRef(pathname);
    useEffect(() => {
        if (previousPath.current === pathname) return;
        previousPath.current = pathname;
        window.scrollTo(0, 0);
        document.getElementById('page-content')?.focus({ preventScroll: true });
    }, [pathname]);
    return null;
};

const ProtectedRoute: React.FC<{ adminOnly?: boolean; children: React.ReactElement }> = ({ adminOnly = false, children }) => {
    const { user, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return <PageLoader />;
    }

    if (!user || (adminOnly && user.role !== 'admin')) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AppContent = () => {
    return (
        <HashRouter>
            <div className="flex flex-col min-h-screen">
                <a href="#page-content" className="skip-link" onClick={event => {
                    event.preventDefault();
                    const content = document.getElementById('page-content');
                    content?.focus(); content?.scrollIntoView();
                }}>رفتن به محتوای اصلی</a>
                <Navbar />
                <div id="page-content" tabIndex={-1} className="flex-1 min-w-0" aria-label="محتوای صفحه">
                <RouteFocus />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/catalog" element={<CatalogPage />} />
                        <Route path="/product/:id" element={<ProductPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><UserPanel /></ProtectedRoute>} />
                        <Route path="/wishlist" element={<WishlistPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/bespoke" element={<BespokePage />} />
                        <Route path="/policies/:policyId" element={<PolicyPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
                </div>
                <Footer />
                <MiniCart />
                <ChatWidget />
                <AuthModal />
                <Toast />
            </div>
        </HashRouter>
    );
};

const App = () => <AppStateProvider><AppContent /></AppStateProvider>;

export default App;
