import React from 'react';

const BADGE_STYLES = {
  ALL_TIME_LOW: 'bg-red-100 text-red-800 border-red-300',
  GREAT_DEAL: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  GOOD_DEAL: 'bg-blue-100 text-blue-800 border-blue-300',
  FAIR_PRICE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  OVERPRICED: 'bg-orange-100 text-orange-800 border-orange-300',
};

const BADGE_LABELS = {
  ALL_TIME_LOW: '🔥 All-Time Low',
  GREAT_DEAL: '🎉 Great Deal',
  GOOD_DEAL: '👍 Good Deal',
  FAIR_PRICE: '⚖️ Fair Price',
  OVERPRICED: '⚠️ Overpriced',
};

export default function DealBadge({ badge, rating, className = '' }) {
  const value = badge || rating;
  if (!value) return null;

  const key = value.toUpperCase().replace(/ /g, '_');
  const style = BADGE_STYLES[key] || 'bg-gray-100 text-gray-800 border-gray-300';
  const label = BADGE_LABELS[key] || value;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {label}
    </span>
  );
}
