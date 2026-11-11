import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingDown, Bell, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [deals, setDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/deals?limit=8').catch(() => []),
      api.get('/categories').catch(() => [])
    ])
      .then(([dealsData, catsData]) => {
        setDeals(Array.isArray(dealsData) ? dealsData : []);
        setCategories(Array.isArray(catsData) ? catsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-700/50 border border-indigo-400/30 text-indigo-200 text-xs font-medium backdrop-blur-sm">
            <Sparkles size={14} className="text-yellow-400" />
            <span>AI-Driven Price Comparison & Deal Intelligence</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance leading-tight">
            Stop Overpaying. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-indigo-200">
              Find the Real Lowest Price.
            </span>
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
            Compare prices across Amazon, Flipkart, Croma, and Reliance Digital. Track 90-day price histories and get notified the second prices drop.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-8 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search iPhones, MacBooks, Sony Headphones, Smartwatches..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 bg-white shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-300 transition"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 font-semibold rounded-xl text-white shadow-lg shadow-indigo-500/30 transition flex items-center justify-center gap-2"
            >
              <span>Compare</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Popular Categories Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 text-xs">
            <span className="text-indigo-200">Popular:</span>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => navigate(`/search?category_id=${cat.category_id}`)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition border border-white/10"
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <TrendingDown size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Historical Price Intelligence</h3>
              <p className="text-sm text-gray-600 mt-1">
                We compare prices with 30-day and 90-day moving averages so you know if a discount is genuine or artificial.
              </p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Net Cost Calculator</h3>
              <p className="text-sm text-gray-600 mt-1">
                Accounts for bank coupons, delivery fees, and cashback to calculate the true final price out of your pocket.
              </p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Automated Price Drop Alerts</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set your target price and our database trigger will instantly flag when prices meet your threshold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Deals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔥 Top Deals Right Now</h2>
            <p className="text-sm text-gray-500 mt-1">Verified deals below 90-day market averages</p>
          </div>
          <button
            onClick={() => navigate('/deals')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>View All Deals</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">No active deals found. Run the seed data or search for products.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {deals.map((deal) => (
              <ProductCard key={deal.product_id} product={deal} showDiscount={true} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
