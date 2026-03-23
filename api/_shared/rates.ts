/**
 * Shared exchange rates & fee configuration — single source of truth.
 * Used by: api/rates.ts, api/payments/create.ts, api/payouts/create.ts
 */

// ─── Exchange Rates (STZ per 1 unit of fiat) ─────────────
// Anchor: 1 STZ = €0.10 | Forex-aligned rates (EUR base)
// EUR/USD≈1.10 | GBP/USD≈1.29 | USD/JPY≈150 | USD/CHF≈0.89
export const DEFAULT_RATES: Record<string, number> = {
  EUR: 10,      // Anchor: 1€ = 10 STZ
  USD: 9.1,     // $1 = 9.1 STZ  (10/1.10)
  GBP: 11.7,    // £1 = 11.7 STZ (9.1×1.29)
  JPY: 0.061,   // ¥1 = 0.061 STZ (9.1/150)
  CHF: 10.3,    // CHF1 = 10.3 STZ (9.1/0.89)
};

// ─── ETH Reference ──────────────────────────────────────────
// Fallback: 1 ETH = ETH_USD × USD_RATE = 2500 × 9.1 = 22,750 STZ
export const ETH_REFERENCE_PRICE_USD = 2500;
export const ETH_VOLATILITY_BAND = 0.20; // ±20% clamp

// Cache for live ETH price (refreshed every 5 minutes)
let cachedEthPrice: { usd: number; fetchedAt: number } | null = null;
const ETH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch live ETH price from CoinGecko (free, no API key required).
 * Returns USD price, or falls back to ETH_REFERENCE_PRICE_USD.
 * Caches result for 5 minutes to avoid rate limits.
 */
export async function getEthPriceUSD(): Promise<number> {
  // Return cached value if fresh
  if (cachedEthPrice && Date.now() - cachedEthPrice.fetchedAt < ETH_CACHE_TTL_MS) {
    return cachedEthPrice.usd;
  }

  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await resp.json() as { ethereum?: { usd?: number } };
    const livePrice = data?.ethereum?.usd;

    if (livePrice && livePrice > 0) {
      // Clamp to volatility band around reference (sanity check)
      const lower = ETH_REFERENCE_PRICE_USD * (1 - ETH_VOLATILITY_BAND);
      const upper = ETH_REFERENCE_PRICE_USD * (1 + ETH_VOLATILITY_BAND);
      const clampedPrice = Math.max(lower, Math.min(upper, livePrice));

      cachedEthPrice = { usd: clampedPrice, fetchedAt: Date.now() };
      return clampedPrice;
    }
  } catch {
    // Oracle unavailable — use fallback
  }

  return cachedEthPrice?.usd || ETH_REFERENCE_PRICE_USD;
}

/**
 * Convert ETH amount to STZ using live oracle price.
 */
export async function ethToSTZ(ethAmount: number): Promise<number> {
  const ethUsd = await getEthPriceUSD();
  const usdRate = DEFAULT_RATES['USD'] || 9.1;
  return Math.round(ethAmount * ethUsd * usdRate * 100) / 100;
}

// ─── Fee Structure ─────────────────────────────────────────
// Platform fee: charged to buyer on top of listed price.
// Differs by market: 10% on primary (1st sale), 5% on secondary (resale).
// Seller receives 100% of listed price (no seller commission).
export const PRIMARY_MARKET_FEE_PERCENT = 10;   // 10% buyer fee — 1st market (first sale)
export const SECONDARY_MARKET_FEE_PERCENT = 5;  // 5% buyer fee — 2nd market (resale)
export const SELLER_COMMISSION_PERCENT = 0;      // No seller commission — seller gets 100%

export const PROCESSOR_FEES: Record<string, { percent: number; fixed: number }> = {
  card: { percent: 2.9, fixed: 0.30 },
  paypal: { percent: 3.49, fixed: 0.49 },
  sepa: { percent: 0.8, fixed: 0 },
  apple_pay: { percent: 2.9, fixed: 0.30 },
  google_pay: { percent: 2.9, fixed: 0.30 },
  bank_transfer: { percent: 0, fixed: 1.50 },
};

export function calculateFees(amount: number, method: string, isResale = false) {
  const feePercent = isResale ? SECONDARY_MARKET_FEE_PERCENT : PRIMARY_MARKET_FEE_PERCENT;
  const platformFee = Math.round(amount * feePercent / 100 * 100) / 100;
  const proc = PROCESSOR_FEES[method] || { percent: 0, fixed: 0 };
  const processorFee = Math.round((amount * proc.percent / 100 + proc.fixed) * 100) / 100;
  return { platformFee, processorFee, total: platformFee + processorFee };
}

// ─── Transaction ID generation (collision-safe) ────────────
export function generateTxId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('');
  return `${prefix}_${timestamp}_${random}`;
}
