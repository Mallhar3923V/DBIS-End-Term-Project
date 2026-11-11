import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, ArrowUpDown, Filter } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function DealsPage() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount'); // discount or price

  useEffect(() => {
    setLoading(true);
    api.get('/deals?limit=50')
      .then((data) => {
        setDeals(Array.isArray(data) ? data : []);
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedDeals = [...deals].sort((a, b) => {
    if (sortBy === 'discount') {
      return (b.discount_pct || 0) - (a.discount_pct || 0);
    }
    return (a.current_price || 0) - (b.current_price || 0);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-3xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
            <Flame size={14} className="text-yellow-300" />
            <span>Curated Deal Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Top Cross-Platform Deals
          </h1>
          <p className="text-white/90 text-sm max-w-xl">
            Every product listed here is verified by our system to be selling below its 90-day moving average.
          </p>
        </div>

        {/* Sort selector */}
        <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-xl border border-white/20 flex items-center gap-1 text-xs font-medium">
          <span className="px-2 text-white/80">Sort By:</span>
          <button
            onClick={() => setSortBy('discount')}
            className={`px-3 py-1.5 rounded-lg transition ${
              sortBy === 'discount' ? 'bg-white text-gray-900 font-bold' : 'text-white hover:bg-white/10'
            }`}
          >
            Highest Discount
          </button>
          <button
            onClick={() => setSortBy('price')}
            className={`px-3 py-1.5 rounded-lg transition ${
              sortBy === 'price' ? 'bg-white text-gray-900 font-bold' : 'text-white hover:bg-white/10'
            }`}
          >
            Lowest Price
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sortedDeals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500">No deals currently detected below market averages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedDeals.map((deal) => (
            <ProductCard key={deal.product_id} product={deal} showDiscount={true} />
          ))}
        </div>
      )}
    </div>
  );
}
