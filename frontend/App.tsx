import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Navigate, Routes, Route } from 'react-router-dom';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MiniCart from './components/MiniCart';
import AuthModal from './components/AuthModal';
import ChatWidget from './components/ChatWidget';
import HomePage from './pages/HomePage';
import PageLoader from './components/PageLoader';

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
    const { toastMessage } = useGlobal();
    if (!toastMessage) return null;
    return (
        <div className="fixed bottom-4 right-4 z-[10000] bg-lux-black text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 fade-in duration-300">
            {toastMessage}
        </div>
    );
};

const ProtectedRoute: React.FC<{ adminOnly?: boolean; children: React.ReactElement }> = ({ adminOnly = false, children }) => {
    const { user, isAuthLoading } = useGlobal();

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
                <Navbar />
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
                    </Routes>
                </Suspense>
                <Footer />
                <MiniCart />
                <ChatWidget />
                <AuthModal />
                <Toast />
            </div>
        </HashRouter>
    );
};

const App = () => {
    const [isBooting, setIsBooting] = useState(true);

    useEffect(() => {
        // Wait for utility images marked with data-utility-image to load.
        // Since we are using placeholder images, we can shorten this or rely on a timeout
        // But keeping logic for robustness.
        const imgs = Array.from(document.querySelectorAll('img[data-utility-image]')) as HTMLImageElement[];

        if (imgs.length === 0) {
            const t = setTimeout(() => setIsBooting(false), 350);
            return () => clearTimeout(t);
        }

        const loaders = imgs.map(img => new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            const onLoad = () => { resolve(); img.removeEventListener('load', onLoad); };
            const onErr = () => { resolve(); img.removeEventListener('error', onErr); };
            img.addEventListener('load', onLoad);
            img.addEventListener('error', onErr);
            setTimeout(() => resolve(), 3000); // fallback
        }));

        Promise.all(loaders).then(() => setIsBooting(false));
    }, []);

    return (
        <GlobalProvider>
            <PageLoader isVisible={isBooting} />
            <AppContent />
        </GlobalProvider>
    );
};

export default App;
