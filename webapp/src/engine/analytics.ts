/**
 * Strangrz Analytics — Platform metrics, creator analytics, admin dashboard
 *
 * Computes metrics from local data (warts, transactions, profiles).
 * Admin dashboard: DAU, volume, top sellers. Creator: views, sales over time.
 */

import type { Wart } from './warts';
import type { Transaction } from './wallet';

// ─── Types ────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  totalWarts: number;
  totalListedWarts: number;
  totalTransactions: number;
  totalVolume: number;        // total STZ transacted
  dailyActiveUsers: number;
  dailyTransactions: number;
  dailyVolume: number;
}

export interface DailyDataPoint {
  date: string;       // YYYY-MM-DD
  value: number;
}

export interface CreatorAnalytics {
  address: string;
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  followerGrowth: DailyDataPoint[];
  salesOverTime: DailyDataPoint[];
  revenueOverTime: DailyDataPoint[];
  topArtworks: Array<{ wartId: string; title: string; sales: number; revenue: number }>;
}

// ─── Platform Metrics ─────────────────────────────────────

/** Compute platform-wide metrics from warts and transactions */
export function computePlatformMetrics(
  warts: Wart[],
  transactions: Transaction[],
  totalUsers: number,
): PlatformMetrics {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const recentTxs = transactions.filter(t => t.timestamp > dayAgo);
  const uniqueAddresses = new Set<string>();
  for (const tx of recentTxs) {
    uniqueAddresses.add(tx.from);
    if (tx.to) uniqueAddresses.add(tx.to);
  }

  const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const dailyVolume = recentTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    totalUsers,
    totalWarts: warts.length,
    totalListedWarts: warts.filter(w => w.listed).length,
    totalTransactions: transactions.length,
    totalVolume: Math.round(totalVolume),
    dailyActiveUsers: uniqueAddresses.size,
    dailyTransactions: recentTxs.length,
    dailyVolume: Math.round(dailyVolume),
  };
}

// ─── Creator Analytics ────────────────────────────────────

/** Compute analytics for a specific creator */
export function computeCreatorAnalytics(
  address: string,
  allWarts: Wart[],
  _allTransactions: Transaction[],
): CreatorAnalytics {
  const myWarts = allWarts.filter(w => w.creator === address);

  // Aggregate sales by wart
  const wartSales = new Map<string, { title: string; sales: number; revenue: number }>();
  let totalSales = 0;
  let totalRevenue = 0;

  for (const wart of myWarts) {
    let sales = 0;
    let revenue = 0;
    for (const h of wart.history || []) {
      if (h.price > 0) {
        sales++;
        revenue += h.price;
      }
    }
    totalSales += sales;
    totalRevenue += revenue;
    if (sales > 0) {
      wartSales.set(wart.id, { title: wart.title, sales, revenue });
    }
  }

  // Sales over time (daily buckets, last 30 days)
  const salesOverTime = aggregateDaily(
    myWarts.flatMap(w => (w.history || []).filter(h => h.price > 0).map(h => ({ ts: h.timestamp, val: 1 }))),
    30,
  );

  const revenueOverTime = aggregateDaily(
    myWarts.flatMap(w => (w.history || []).filter(h => h.price > 0).map(h => ({ ts: h.timestamp, val: h.price }))),
    30,
  );

  // Top artworks by revenue
  const topArtworks = [...wartSales.entries()]
    .map(([wartId, data]) => ({ wartId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    address,
    totalViews: 0, // would need view tracking
    totalSales,
    totalRevenue: Math.round(totalRevenue),
    followerGrowth: [], // would need historical data
    salesOverTime,
    revenueOverTime,
    topArtworks,
  };
}

// ─── Daily Aggregation ────────────────────────────────────

function aggregateDaily(
  events: Array<{ ts: number; val: number }>,
  days: number,
): DailyDataPoint[] {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();

  // Initialize all days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(startMs + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  // Fill in actual data
  for (const { ts, val } of events) {
    if (ts < startMs) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + val);
  }

  return [...buckets.entries()]
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── CSV Export ───────────────────────────────────────────

/** Export data points as CSV string */
export function exportCSV(data: DailyDataPoint[], label = 'value'): string {
  const header = `date,${label}`;
  const rows = data.map(d => `${d.date},${d.value}`);
  return [header, ...rows].join('\n');
}

/** Trigger CSV download in browser */
export function downloadCSV(data: DailyDataPoint[], filename: string, label = 'value'): void {
  const csv = exportCSV(data, label);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
