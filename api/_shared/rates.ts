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
// 1 ETH = ETH_USD × USD_RATE = 2500 × 9.1 = 22,750 STZ
export const ETH_REFERENCE_PRICE_USD = 2500;
export const ETH_VOLATILITY_BAND = 0.20; // ±20% clamp

// ─── Fee Structure ─────────────────────────────────────────
export const PLATFORM_FEE_PERCENT = 2.5;

export const PROCESSOR_FEES: Record<string, { percent: number; fixed: number }> = {
  card: { percent: 2.9, fixed: 0.30 },
  paypal: { percent: 3.49, fixed: 0.49 },
  sepa: { percent: 0.8, fixed: 0 },
  apple_pay: { percent: 2.9, fixed: 0.30 },
  google_pay: { percent: 2.9, fixed: 0.30 },
  bank_transfer: { percent: 0, fixed: 1.50 },
};

export function calculateFees(amount: number, method: string) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100 * 100) / 100;
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
