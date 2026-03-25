/**
 * Strangrz Currency Engine — Multi-currency support with live rates
 *
 * Features:
 * - User preferred currency (persisted)
 * - Live rate updates from API (15-min cache)
 * - Historical rate tracking
 * - Display formatting per locale
 */

import { storage } from './storage';
import { DEFAULT_EXCHANGE_RATES } from '../config/constants';
import type { FiatCurrency } from './fiatgateway';

// ─── Types ────────────────────────────────────────────────

export interface CurrencyRate {
  currency: FiatCurrency;
  warpsPerUnit: number;
  lastUpdated: number;
  source: 'default' | 'api' | 'manual';
}

export interface RateSnapshot {
  rates: Record<string, number>;
  timestamp: number;
}

// ─── Storage Keys ─────────────────────────────────────────

const PREF_CURRENCY_KEY = 'strangrz_preferred_currency';
const RATES_CACHE_KEY = 'strangrz_rates_cache';
const RATE_HISTORY_KEY = 'strangrz_rate_history';
const RATE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── Preferred Currency ───────────────────────────────────

export function getPreferredCurrency(): FiatCurrency {
  return (storage.getItem(PREF_CURRENCY_KEY) as FiatCurrency) || 'EUR';
}

export function setPreferredCurrency(currency: FiatCurrency): void {
  storage.setItem(PREF_CURRENCY_KEY, currency);
}

// ─── Rate Cache ───────────────────────────────────────────

function getCachedRates(): Record<string, CurrencyRate> | null {
  try {
    const raw = storage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as { rates: Record<string, CurrencyRate>; fetchedAt: number };
    if (Date.now() - cache.fetchedAt > RATE_CACHE_TTL) return null;
    return cache.rates;
  } catch { return null; }
}

function setCachedRates(rates: Record<string, CurrencyRate>): void {
  storage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
}

// ─── Current Rates ────────────────────────────────────────

/** Get current exchange rates (cached or default) */
export function getCurrentRates(): Record<FiatCurrency, number> {
  const cached = getCachedRates();
  if (cached) {
    const result: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(cached)) {
      result[currency] = rate.warpsPerUnit;
    }
    return result as Record<FiatCurrency, number>;
  }
  return { ...DEFAULT_EXCHANGE_RATES } as Record<FiatCurrency, number>;
}

/** Fetch live rates from the API and cache them */
export async function refreshRates(): Promise<Record<FiatCurrency, number>> {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (!apiUrl) return getCurrentRates();

  try {
    const resp = await fetch(`${apiUrl}/api/rates`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return getCurrentRates();

    const data = await resp.json() as { rates: Record<string, number> };
    if (!data.rates) return getCurrentRates();

    const rates: Record<string, CurrencyRate> = {};
    for (const [currency, warpsPerUnit] of Object.entries(data.rates)) {
      rates[currency] = {
        currency: currency as FiatCurrency,
        warpsPerUnit,
        lastUpdated: Date.now(),
        source: 'api',
      };
    }
    setCachedRates(rates);
    recordRateSnapshot(data.rates);

    return data.rates as Record<FiatCurrency, number>;
  } catch {
    return getCurrentRates();
  }
}

// ─── Conversion ───────────────────────────────────────────

/** Convert STZ to fiat */
export function stzToFiat(stzAmount: number, currency?: FiatCurrency): number {
  const curr = currency || getPreferredCurrency();
  const rates = getCurrentRates();
  const rate = rates[curr] || DEFAULT_EXCHANGE_RATES.EUR;
  return Math.round(stzAmount / rate * 100) / 100;
}

/** Convert fiat to STZ */
export function fiatToStz(fiatAmount: number, currency?: FiatCurrency): number {
  const curr = currency || getPreferredCurrency();
  const rates = getCurrentRates();
  const rate = rates[curr] || DEFAULT_EXCHANGE_RATES.EUR;
  return Math.round(fiatAmount * rate * 100) / 100;
}

/** Format a price in the user's preferred currency */
export function formatPrice(stzAmount: number, currency?: FiatCurrency): string {
  const curr = currency || getPreferredCurrency();
  const fiat = stzToFiat(stzAmount, curr);
  const symbols: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', CHF: 'CHF ',
  };
  const symbol = symbols[curr] || curr + ' ';
  // JPY has no decimals
  if (curr === 'JPY') return `${symbol}${Math.round(fiat)}`;
  return `${symbol}${fiat.toFixed(2)}`;
}

/** Format with both STZ and fiat */
export function formatDualPrice(stzAmount: number, currency?: FiatCurrency): string {
  const fiatStr = formatPrice(stzAmount, currency);
  return `${stzAmount} STZ (${fiatStr})`;
}

// ─── Rate History ─────────────────────────────────────────

const MAX_RATE_HISTORY = 96; // 96 snapshots × 15min = 24 hours

function recordRateSnapshot(rates: Record<string, number>): void {
  try {
    const raw = storage.getItem(RATE_HISTORY_KEY);
    const history: RateSnapshot[] = raw ? JSON.parse(raw) : [];
    history.push({ rates, timestamp: Date.now() });
    storage.setItem(RATE_HISTORY_KEY, JSON.stringify(history.slice(-MAX_RATE_HISTORY)));
  } catch { /* ignore */ }
}

/** Get rate history for charting */
export function getRateHistory(): RateSnapshot[] {
  try {
    const raw = storage.getItem(RATE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Supported Currencies ─────────────────────────────────

export const SUPPORTED_CURRENCIES: Array<{ code: FiatCurrency; name: string; symbol: string }> = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];
