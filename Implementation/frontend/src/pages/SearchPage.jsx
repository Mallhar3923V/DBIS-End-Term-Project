import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, RotateCcw, SlidersHorizontal } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category_id') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load filter options on mount
  useEffect(() => {
    Promise.all([
      api.get('/categories').catch(() => []),
      api.get('/brands').catch(() => [])
    ]).then(([cats, bnds]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setBrands(Array.isArray(bnds) ? bnds : []);
    });
  }, []);

  // Fetch products whenever search params change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchParams.get('keyword')) params.set('keyword', searchParams.get('keyword'));
    if (searchParams.get('category_id')) params.set('category_id', searchParams.get('category_id'));
    if (searchParams.get('brand')) params.set('brand', searchParams.get('brand'));
    if (searchParams.get('min_price')) params.set('min_price', searchParams.get('min_price'));
    if (searchParams.get('max_price')) params.set('max_price', searchParams.get('max_price'));

    api.get(`/products?${params.toString()}`)
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const applyFilters = (e) => {
    if (e) e.preventDefault();
    const newParams = new URLSearchParams();
    if (keyword.trim()) newParams.set('keyword', keyword.trim());
    if (selectedCategory) newParams.set('category_id', selectedCategory);
    if (selectedBrand) newParams.set('brand', selectedBrand);
    if (minPrice) newParams.set('min_price', minPrice);
    if (maxPrice) newParams.set('max_price', maxPrice);
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setKeyword('');
    setSelectedCategory('');
    setSelectedBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compare Products</h1>
        <p className="text-sm text-gray-500 mt-1">Search our cross-platform catalogue and compare live prices</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={applyFilters} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by product name..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min ₹"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-1/2 px-2.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Max ₹"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-1/2 px-2.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing <strong className="text-gray-900">{products.length}</strong> products</span>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-lg font-medium text-gray-800">No products found matching your search</p>
          <p className="text-sm text-gray-500 mt-1">Try relaxing your filters or searching for another keyword.</p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p.product_id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
