import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import api from './api';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ProductPage from './pages/ProductPage';
import DealsPage from './pages/DealsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

/* ─── Auth Context ─── */
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/* ─── Toast Context ─── */
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all animate-slide-in ${
            t.type === 'success'
              ? 'bg-emerald-600'
              : t.type === 'error'
              ? 'bg-red-600'
              : 'bg-indigo-600'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── App ─── */
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast helpers
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading }}>
      <ToastContext.Provider value={addToast}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <footer className="bg-gray-900 text-gray-400 text-center py-6 text-sm">
            © {new Date().getFullYear()} PriceWise — Smart Shopping Companion. All rights reserved.
          </footer>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        {/* global animation keyframes */}
        <style>{`
          @keyframes slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .animate-slide-in { animation: slide-in 0.25s ease-out; }
        `}</style>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}
