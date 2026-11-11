import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Bell,
  Trash2,
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../api';
import { useAuth, useToast } from '../App';

function formatINR(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToast = useToast();

  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'alerts' | 'simulator'
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin price drop simulator form
  const [simListingId, setSimListingId] = useState('1');
  const [simNewPrice, setSimNewPrice] = useState('119999');
  const [simulating, setSimulating] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/watchlist').catch(() => []),
      api.get('/alerts').catch(() => [])
    ])
      .then(([watchData, alertData]) => {
        setWatchlist(Array.isArray(watchData) ? watchData : []);
        setAlerts(Array.isArray(alertData) ? alertData : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRemoveWatch = async (productId) => {
    try {
      await api.delete(`/watchlist/${productId}`);
      setWatchlist((prev) => prev.filter((p) => p.product_id !== productId));
      addToast('Removed from watchlist', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to remove', 'error');
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
      addToast('Alert deleted', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to delete alert', 'error');
    }
  };

  const handleSimulateDrop = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await api.post('/simulate/price-update', {
        listing_id: Number(simListingId),
        new_price: Number(simNewPrice),
      });
      addToast(res.message || 'Price updated! Database alert trigger activated.', 'success');
      // Reload alerts to see if any triggered
      loadData();
    } catch (err) {
      addToast(err.message || 'Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Welcome back, {user?.name}
            </h1>
            {user?.role === 'ADMIN' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                ADMIN
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registered Email: <span className="text-gray-800 font-medium">{user?.email}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-gray-500 block">Watchlist</span>
            <span className="text-lg font-bold text-indigo-700">{watchlist.length}</span>
          </div>
          <div className="bg-purple-50 border border-purple-100 px-4 py-2.5 rounded-2xl text-center">
            <span className="text-gray-500 block">Active Alerts</span>
            <span className="text-lg font-bold text-purple-700">
              {alerts.filter((a) => a.alert_status === 'ACTIVE').length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'watchlist'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Heart size={16} />
          <span>My Watchlist ({watchlist.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Bell size={16} />
          <span>Price Drop Alerts ({alerts.length})</span>
        </button>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'simulator'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Zap size={16} />
            <span>Admin Trigger Simulator</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : activeTab === 'watchlist' ? (
        /* Watchlist Tab */
        <div className="space-y-4">
          {watchlist.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
              <Heart size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-800">Your watchlist is empty</p>
              <p className="text-xs text-gray-500 mt-1">
                Browse products and click "Add to Watchlist" to monitor price changes.
              </p>
              <button
                onClick={() => navigate('/search')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Product</th>
                      <th className="py-3.5 px-4">Brand</th>
                      <th className="py-3.5 px-4">Current Best Price</th>
                      <th className="py-3.5 px-4">Added Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {watchlist.map((item) => (
                      <tr key={item.product_id} className="hover:bg-gray-50/80 transition">
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-600">{item.brand}</td>
                        <td className="py-4 px-4 font-bold text-gray-900">
                          {formatINR(item.best_price)}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">{item.added_date}</td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/product/${item.product_id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                          >
                            <span>Compare</span>
                            <ExternalLink size={12} />
                          </button>
                          <button
                            onClick={() => handleRemoveWatch(item.product_id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                            title="Remove from watchlist"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'alerts' ? (
        /* Alerts Tab */
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200">
              <Bell size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-800">No active price alerts</p>
              <p className="text-xs text-gray-500 mt-1">
                Open any product and set a target price to receive automatic notifications when the price drops.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Product</th>
                      <th className="py-3.5 px-4">Target Price</th>
                      <th className="py-3.5 px-4">Current Best Price</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Triggered Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alerts.map((alt) => (
                      <tr key={alt.alert_id} className="hover:bg-gray-50/80 transition">
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          {alt.product_name}
                        </td>
                        <td className="py-4 px-4 font-bold text-indigo-700">
                          {formatINR(alt.target_price)}
                        </td>
                        <td className="py-4 px-4 font-semibold text-gray-800">
                          {formatINR(alt.best_price)}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {alt.alert_status === 'TRIGGERED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <CheckCircle2 size={12} />
                              <span>TRIGGERED</span>
                            </span>
                          ) : alt.alert_status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Clock size={12} />
                              <span>ACTIVE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">
                              <span>DISABLED</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-500">
                          {alt.triggered_date || '—'}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/product/${alt.product_id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium"
                          >
                            <span>View</span>
                            <ExternalLink size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alt.alert_id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                            title="Delete alert"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Admin Simulator Tab */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">
              <Zap size={14} />
              <span>Database Trigger Live Verification</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Simulate Real-Time E-Commerce Price Drop
            </h2>
            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
              When an e-commerce platform updates a listing price, MySQL executes trigger{' '}
              <code className="text-purple-700 font-mono font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                trg_check_price_alerts
              </code>
              . If the new price drops below any user's target price, that user's alert status
              automatically shifts from <span className="font-semibold text-emerald-700">ACTIVE</span> to{' '}
              <span className="font-semibold text-amber-700">TRIGGERED</span> with the current timestamp!
            </p>
          </div>

          <form onSubmit={handleSimulateDrop} className="max-w-lg space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Listing ID to Update
              </label>
              <input
                type="number"
                value={simListingId}
                onChange={(e) => setSimListingId(e.target.value)}
                placeholder="1"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Listing #1 corresponds to Apple iPhone 15 Pro Max on Amazon.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Dropped Price (₹)
              </label>
              <input
                type="number"
                value={simNewPrice}
                onChange={(e) => setSimNewPrice(e.target.value)}
                placeholder="119999"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                Tip: Enter a price below ₹125,000 to trigger alert #1.
              </span>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              <Zap size={16} />
              <span>{simulating ? 'Executing Trigger...' : 'Simulate Price Drop'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
