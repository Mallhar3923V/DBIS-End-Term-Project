import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bell,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  CheckCircle,
  Copy,
  Info,
  Truck,
  Star,
  Sparkles
} from 'lucide-react';
import api from '../api';
import { useAuth, useToast } from '../App';
import DealBadge from '../components/DealBadge';
import PriceHistoryChart from '../components/PriceHistoryChart';

function formatINR(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToast = useToast();

  const [productData, setProductData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyDays, setHistoryDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [isWatched, setIsWatched] = useState(false);

  // Price alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [submittingAlert, setSubmittingAlert] = useState(false);

  // Load product details
  useEffect(() => {
    setLoading(true);
    api.get(`/products/${id}`)
      .then((data) => {
        setProductData(data);
        if (data.stores && data.stores.length > 0) {
          const minPrice = Math.min(...data.stores.map((s) => s.current_price));
          setTargetPrice(Math.round(minPrice * 0.95));
        }
      })
      .catch((err) => {
        addToast(err.message || 'Product not found', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, addToast]);

  // Load price history
  useEffect(() => {
    api.get(`/products/${id}/price-history?days=${historyDays}`)
      .then((data) => {
        setHistoryData(data || []);
      })
      .catch(() => setHistoryData([]));
  }, [id, historyDays]);

  // Check if watched
  useEffect(() => {
    if (user) {
      api.get('/watchlist')
        .then((items) => {
          if (Array.isArray(items)) {
            const match = items.some((item) => Number(item.product_id) === Number(id));
            setIsWatched(match);
          }
        })
        .catch(() => {});
    }
  }, [user, id]);

  const toggleWatchlist = async () => {
    if (!user) {
      addToast('Please login to add products to your watchlist', 'info');
      navigate('/login');
      return;
    }
    try {
      if (isWatched) {
        await api.delete(`/watchlist/${id}`);
        setIsWatched(false);
        addToast('Removed from watchlist', 'info');
      } else {
        await api.post(`/watchlist/${id}`);
        setIsWatched(true);
        addToast('Added to watchlist! We will track its price for you.', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update watchlist', 'error');
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please login to set price alerts', 'info');
      navigate('/login');
      return;
    }
    if (!targetPrice || Number(targetPrice) <= 0) {
      addToast('Please enter a valid target price', 'error');
      return;
    }
    setSubmittingAlert(true);
    try {
      await api.post('/alerts', {
        product_id: Number(id),
        target_price: Number(targetPrice),
      });
      addToast(`Price alert set for ${formatINR(targetPrice)}!`, 'success');
      setShowAlertModal(false);
    } catch (err) {
      addToast(err.message || 'Failed to set price alert', 'error');
    } finally {
      setSubmittingAlert(false);
    }
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    addToast(`Coupon code "${code}" copied to clipboard!`, 'success');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 mt-4 text-sm">Loading product comparison & intelligence data...</p>
      </div>
    );
  }

  if (!productData || !productData.product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-xl font-bold text-gray-800">Product not found</p>
        <button
          onClick={() => navigate('/search')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
        >
          Back to Search
        </button>
      </div>
    );
  }

  const { product, specs = [], stores = [], deal_intelligence = [] } = productData;
  const bestListing = stores.length > 0 ? stores[0] : null;
  const dealInfo = deal_intelligence.length > 0 ? deal_intelligence[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Product Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
              <span>{product.brand}</span>
              <span>•</span>
              <span>{product.category_name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-snug">
              {product.product_name}
            </h1>
            <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={toggleWatchlist}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                isWatched
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Heart size={16} className={isWatched ? 'fill-rose-500 text-rose-500' : ''} />
              <span>{isWatched ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>
            <button
              onClick={() => setShowAlertModal(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Bell size={16} />
              <span>Set Price Alert</span>
            </button>
          </div>
        </div>

        {/* Deal Intelligence Evaluation Banner */}
        {dealInfo && (
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Deal Intelligence
                  </span>
                  <DealBadge rating={dealInfo.deal_rating} />
                </div>
                <p className="text-sm text-gray-700 mt-0.5">
                  Current best price is{' '}
                  <strong className="text-gray-900">{formatINR(dealInfo.current_price)}</strong> on{' '}
                  <span className="font-semibold text-indigo-700">{dealInfo.store_name}</span>.
                  {dealInfo.savings_pct_vs_30d_avg > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      {' '}
                      Save {dealInfo.savings_pct_vs_30d_avg}% compared to 30-day average price!
                    </span>
                  ) : (
                    <span> Price is steady with market trends.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-indigo-100/50">
              <div>
                <span className="text-gray-500 block">30D Average</span>
                <span className="font-semibold text-gray-800">{formatINR(dealInfo.avg_30d)}</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <span className="text-gray-500 block">90D Average</span>
                <span className="font-semibold text-gray-800">{formatINR(dealInfo.avg_90d)}</span>
              </div>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <span className="text-gray-500 block">All-Time Low</span>
                <span className="font-semibold text-emerald-700">{formatINR(dealInfo.all_time_low)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Store Comparison Table (Ground Truth Requirement) */}
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Live Multi-Store Price Comparison</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranked from lowest total price (including delivery fees & discounts)
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            {stores.length} Stores Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold text-xs border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-6">Store</th>
                <th className="py-3.5 px-4">Base Price</th>
                <th className="py-3.5 px-4">Delivery</th>
                <th className="py-3.5 px-4 font-bold text-gray-900">Total Cost</th>
                <th className="py-3.5 px-4">Seller & Rating</th>
                <th className="py-3.5 px-4">Active Offers</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stores.map((s, idx) => {
                const isBest = idx === 0 && s.availability === 'IN_STOCK';
                return (
                  <tr
                    key={s.listing_id}
                    className={`hover:bg-gray-50/80 transition ${
                      isBest ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Store Name */}
                    <td className="py-4 px-6 font-semibold text-gray-900 flex items-center gap-2">
                      <span>{s.store_name}</span>
                      {isBest && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                          Best Price
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 font-semibold text-gray-800">
                      {formatINR(s.current_price)}
                    </td>

                    {/* Delivery */}
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {s.delivery_charge > 0 ? (
                        <span className="flex items-center gap-1">
                          <Truck size={14} className="text-gray-400" />
                          <span>+{formatINR(s.delivery_charge)}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">FREE</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4">
                      <span className="text-base font-bold text-gray-900">
                        {formatINR(s.total_price)}
                      </span>
                    </td>

                    {/* Seller & Rating */}
                    <td className="py-4 px-4 text-xs text-gray-600">
                      <div>{s.seller_name || 'Verified Seller'}</div>
                      {s.avg_rating && (
                        <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-700">{s.avg_rating}</span>
                          <span>({s.review_count?.toLocaleString()} reviews)</span>
                        </div>
                      )}
                    </td>

                    {/* Offers */}
                    <td className="py-4 px-4 text-xs">
                      {s.offers && s.offers.length > 0 ? (
                        <div className="space-y-1">
                          {s.offers.map((off) => (
                            <div key={off.offer_id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium border border-purple-200">
                              <span>{off.offer_type}</span>
                              {off.coupon_code && (
                                <button
                                  onClick={() => copyCouponCode(off.coupon_code)}
                                  className="ml-1 font-bold underline hover:text-purple-900 flex items-center gap-0.5"
                                  title="Click to copy coupon code"
                                >
                                  {off.coupon_code}
                                  <Copy size={10} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Direct link */}
                    <td className="py-4 px-6 text-right">
                      {s.availability === 'IN_STOCK' ? (
                        <a
                          href={s.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                        >
                          <span>Buy Now</span>
                          <ExternalLink size={13} />
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                          Out of Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Price History Visualization */}
      <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Historical Price Trend</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Track how prices fluctuated over time across stores
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  historyDays === d
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Last {d} Days
              </button>
            ))}
          </div>
        </div>

        <PriceHistoryChart historyByStore={historyData} />
      </section>

      {/* Technical Specifications */}
      {specs.length > 0 && (
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {specs.map((sp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-gray-100 text-sm"
              >
                <span className="text-gray-500 font-medium">{sp.spec_name}</span>
                <span className="text-gray-900 font-semibold">{sp.spec_value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Set Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <Bell size={20} />
                <h3 className="font-bold text-gray-900 text-lg">Set Price Drop Alert</h3>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Enter your desired price. When any store listing drops below this threshold, our automated database alert trigger will notify you.
            </p>

            <form onSubmit={handleCreateAlert} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Price (₹)
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 120000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Current lowest price: {formatINR(bestListing?.current_price)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAlert}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingAlert ? 'Setting Alert...' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
