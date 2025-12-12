
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { GlobalProvider, useGlobal } from './contexts/GlobalContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MiniCart from './components/MiniCart';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import AdminPanel from './pages/AdminPanel';
import UserPanel from './pages/UserPanel';
import PageLoader from './components/PageLoader';

const Toast = () => {
    const { toastMessage } = useGlobal();
    if (!toastMessage) return null;
    return (
        <div className="fixed bottom-4 right-4 z-[10000] bg-lux-black text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 fade-in duration-300">
            {toastMessage}
        </div>
    );
};

const AppContent = () => {
    return (
        <HashRouter>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/profile" element={<UserPanel />} />
                </Routes>
                <Footer />
                <MiniCart />
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
        const imgs = Array.from(document.querySelectorAll('img[data-utility-image]')) as HTMLImageElement[];

        if (imgs.length === 0) {
            // give a small fade-in if none are present
            const t = setTimeout(() => setIsBooting(false), 350);
            return () => clearTimeout(t);
        }

        const loaders = imgs.map(img => new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            const onLoad = () => { resolve(); img.removeEventListener('load', onLoad); };
            const onErr = () => { resolve(); img.removeEventListener('error', onErr); };
            img.addEventListener('load', onLoad);
            img.addEventListener('error', onErr);
            // fallback timeout
            setTimeout(() => resolve(), 3000);
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
