import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

function formatINR(val) {
  if (val == null) return '';
  return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold">{formatINR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PriceHistoryChart({ data, historyByStore }) {
  const source = data || historyByStore;
  if (!source || Object.keys(source).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No price history available
      </div>
    );
  }

  // data is { "StoreName": [ { date, price }, … ], … }
  // Merge into unified timeline: [ { date, StoreName: price, ... } ]
  const dateMap = {};
  const storeNames = Object.keys(source);

  storeNames.forEach((store) => {
    (source[store] || []).forEach((entry) => {
      const d = entry.date;
      if (!dateMap[d]) dateMap[d] = { date: d };
      dateMap[d][store] = entry.price;
    });
  });

  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No price history available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#d1d5db' }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
          iconSize={8}
        />
        {storeNames.map((store, i) => (
          <Line
            key={store}
            type="monotone"
            dataKey={store}
            name={store}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
