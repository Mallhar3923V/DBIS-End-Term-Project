import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Store } from 'lucide-react';
import DealBadge from './DealBadge';

function formatINR(val) {
  if (val == null) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function Stars({ rating, size = 14 }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={
            i < full
              ? 'fill-yellow-400 text-yellow-400'
              : i === full && half
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-gray-300'
          }
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{rating}</span>
    </span>
  );
}

export default function ProductCard({ product, showDiscount = false }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const id = product.product_id || product.id;
    if (id) navigate(`/product/${id}`);
  };

  const minPrice = product.min_price ?? product.current_price ?? product.price;
  const maxPrice = product.max_price;
  const discount = product.discount_pct ?? product.discount_percentage;

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-700 transition-colors">
              {product.name || product.product_name}
            </h3>
            {product.brand && (
              <p className="text-xs text-gray-500 mt-0.5">{product.brand || product.brand_name}</p>
            )}
            {product.brand_name && !product.brand && (
              <p className="text-xs text-gray-500 mt-0.5">{product.brand_name}</p>
            )}
          </div>
          {showDiscount && discount != null && discount > 0 && (
            <span className="shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              -{Math.round(discount)}%
            </span>
          )}
        </div>

        {/* Deal badge */}
        {product.deal_badge && (
          <div className="mb-2">
            <DealBadge badge={product.deal_badge} />
          </div>
        )}

        {/* Rating */}
        {product.rating && (
          <div className="mb-3">
            <Stars rating={product.rating} />
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-lg font-bold text-indigo-700">{formatINR(minPrice)}</span>
              {maxPrice != null && maxPrice !== minPrice && (
                <span className="text-sm text-gray-400 ml-1">– {formatINR(maxPrice)}</span>
              )}
              {product.avg_price != null && discount > 0 && (
                <span className="block text-xs text-gray-400 line-through">
                  {formatINR(product.avg_price)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {product.store_count != null && (
                <>
                  <Store size={13} />
                  <span>
                    {product.store_count} store{product.store_count !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {product.store_name && (
                <>
                  <Store size={13} />
                  <span>{product.store_name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
