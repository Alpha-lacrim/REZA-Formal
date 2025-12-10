
import React from 'react';
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
    return (
        <GlobalProvider>
            <AppContent />
        </GlobalProvider>
    );
};

export default App;
