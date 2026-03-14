/**
 * Shared exchange rates & fee configuration — single source of truth.
 * Used by: api/rates.ts, api/payments/create.ts, api/payouts/create.ts
 */

// ─── Exchange Rates (Warps per 1 unit of fiat) ────────────
// Anchor: 1 CW = €0.01 | Forex-aligned rates (EUR base)
// EUR/USD≈1.10 | GBP/USD≈1.29 | USD/JPY≈150 | USD/CHF≈0.89
export const DEFAULT_RATES: Record<string, number> = {
  EUR: 100,    // Anchor: 1€ = 100 CW
  USD: 91,     // $1 = 91 CW  (100/1.10)
  GBP: 117,    // £1 = 117 CW (91×1.29)
  JPY: 0.61,   // ¥1 = 0.61 CW (91/150)
  CHF: 103,    // CHF1 = 103 CW (91/0.89)
};

// ─── ETH Reference ──────────────────────────────────────────
// 1 ETH = ETH_USD × USD_RATE = 2500 × 91 = 227,500 CW
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
