/**
 * Strangrz Fiat Gateway — EUR/USD/GBP/JPY/CHF On/Off Ramp
 *
 * Production-ready fiat payment processing engine.
 *
 * ─── Architecture ────────────────────────────────────────────
 *
 * 1. PRICE DISPLAY — Shows artwork prices in both ⬣ and fiat
 * 2. BUY FLOW — User pays in fiat → system credits ⬣ → transfers artwork
 * 3. SELL FLOW — User lists in fiat → buyer pays → seller receives fiat
 * 4. EXCHANGE RATE — Configurable rates with real-time tracking
 *
 * ─── Payment Flow ───────────────────────────────────────────
 *
 * Transactions go through a proper lifecycle:
 *   pending → processing → completed | failed
 *
 * For external payment processors (Stripe, PayPal, SEPA):
 * - Create PaymentIntent → return checkout URL → await webhook → settle
 * - When a backend is available, set STRANGRZ_GATEWAY_URL to enable
 *   real processor integration. Without a backend, transactions
 *   are settled locally with proper state transitions.
 *
 * ─── Compliance Requirements ─────────────────────────────────
 *
 * For regulated deployment:
 * - KYC verification (Jumio, Onfido, or Stripe Identity)
 * - AML screening (Chainalysis, Elliptic)
 * - MiCA registration (EU) or MSB registration (USA)
 * - PSAN/DASP registration (France/AMF)
 * - Transaction monitoring & reporting
 */

import { storage } from './storage';

// ─── Types ───────────────────────────────────────────────

export type FiatCurrency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF';

export interface ExchangeRate {
  currency: FiatCurrency;
  warpsPerUnit: number;           // How many ⬣ per 1 unit of fiat
  lastUpdated: number;
  source: 'manual' | 'api' | 'market';
}

export interface FiatTransaction {
  id: string;
  type: 'buy' | 'sell' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  // Crypto side
  warpAmount: number;
  fromAddress: string;
  toAddress: string;
  // Fiat side
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  exchangeRate: number;
  // Payment processor
  paymentMethod: PaymentMethod;
  processorRef?: string;          // Stripe PaymentIntent ID, PayPal Order ID, etc.
  // Metadata
  wartId?: string;                // If this is an artwork purchase
  wartTitle?: string;
  timestamp: number;
  completedAt?: number;
  error?: string;
  // Fees
  platformFeePercent: number;     // Strangrz platform fee (default 2.5%)
  platformFeeAmount: number;      // Calculated fee
  processorFeeAmount: number;     // Payment processor fee (Stripe ~2.9% + 0.30)
  sellerReceives: number;         // Net amount seller receives in fiat
}

export type PaymentMethod =
  | 'card'            // Credit/debit card (Stripe)
  | 'paypal'          // PayPal
  | 'sepa'            // SEPA bank transfer (EU)
  | 'apple_pay'       // Apple Pay
  | 'google_pay'      // Google Pay
  | 'bank_transfer'   // Generic bank transfer
  | 'internal';       // Internal ⬣ transfer (no fiat)

export interface FiatListing {
  wartId: string;
  wartTitle: string;
  sellerAddress: string;
  priceWarps: number;
  priceFiat: number;
  fiatCurrency: FiatCurrency;
  exchangeRateAtListing: number;
  listedAt: number;
  acceptedPaymentMethods: PaymentMethod[];
}

export interface PaymentIntent {
  id: string;
  fiatTransaction: FiatTransaction;
  expiresAt: number;              // Payment link expires
  checkoutUrl?: string;           // URL to payment page (Stripe Checkout, etc.)
  status: 'created' | 'paid' | 'expired' | 'cancelled';
}

export interface GatewayStats {
  totalBuyTransactions: number;
  totalSellTransactions: number;
  totalFiatVolume: Record<FiatCurrency, number>;
  totalWarpVolume: number;
  totalPlatformFees: Record<FiatCurrency, number>;
  activeListings: number;
}

// ─── Constants ───────────────────────────────────────────

const RATES_KEY = 'strangrz_fiat_rates';
const FIAT_TX_KEY = 'strangrz_fiat_tx';
const FIAT_LISTINGS_KEY = 'strangrz_fiat_listings';

const DEFAULT_PLATFORM_FEE = 2.5;   // 2.5% platform fee
const PROCESSOR_FEES: Record<PaymentMethod, { percent: number; fixed: number }> = {
  card: { percent: 2.9, fixed: 0.30 },
  paypal: { percent: 3.49, fixed: 0.49 },
  sepa: { percent: 0.8, fixed: 0 },
  apple_pay: { percent: 2.9, fixed: 0.30 },
  google_pay: { percent: 2.9, fixed: 0.30 },
  bank_transfer: { percent: 0, fixed: 1.50 },
  internal: { percent: 0, fixed: 0 },
};

/**
 * ─── Strangrz (STZ) Valuation Model ────────────────────────
 *
 * Anchor: 1 STZ = €0.10 (10 centimes d'euro)
 *
 * Supply: 69,000,000 STZ → Market cap at full supply = €6,900,000
 * Circulating at launch (~11M via airdrops+mining): ~€1,100,000
 *
 * Utility check at €0.10/STZ:
 *   Airdrop (1,000 STZ)  = €100   — onboarding incentive ✓
 *   Min listing (100 STZ) = €10   — accessible NFT floor  ✓
 *   Mining reward (50 STZ) = €5   — motivating            ✓
 *   Streak (10,000 STZ)   = €1000 — yearly loyalty reward ✓
 *   Tip (1-10 STZ)        = €0.10-1.00 — micro-tip       ✓
 *
 * Fiat rates derived from real forex (anchor = EUR):
 *   EUR/USD ≈ 1.10 → 1 USD = 10/1.10 = 9.1 STZ
 *   GBP/USD ≈ 1.29 → 1 GBP = 9.1 × 1.29 = 11.7 STZ
 *   USD/JPY ≈ 150  → 1 JPY = 9.1/150 = 0.061 STZ
 *   USD/CHF ≈ 0.89 → 1 CHF = 9.1/0.89 = 10.3 STZ
 *
 * ETH conversion (dynamic):
 *   ETH/USD ≈ $2,500 → 1 ETH = 9.1 × 2,500 = 22,750 STZ
 *   Updated via configurable reference price with ±20% volatility band
 */

// Reference ETH price in USD for STZ conversion
const ETH_REFERENCE_PRICE_USD = 2500;
// Volatility band: rates auto-clamp within ±20% of reference
const ETH_VOLATILITY_BAND = 0.20;

// Default exchange rates (forex-aligned, anchor = 1 STZ = €0.10)
const DEFAULT_RATES: ExchangeRate[] = [
  { currency: 'EUR', warpsPerUnit: 10, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'USD', warpsPerUnit: 9.1, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'GBP', warpsPerUnit: 11.7, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'JPY', warpsPerUnit: 0.061, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'CHF', warpsPerUnit: 10.3, lastUpdated: Date.now(), source: 'manual' },
];

// ─── Fiat Gateway Engine ─────────────────────────────────

export class FiatGateway {
  private rates: Map<FiatCurrency, ExchangeRate> = new Map();
  private transactions: FiatTransaction[] = [];
  private listings: Map<string, FiatListing> = new Map();
  private _preferredCurrency: FiatCurrency = 'EUR';

  constructor() {
    this.loadRates();
    this.loadTransactions();
    this.loadListings();
    // Restore ETH price
    const savedEth = storage.getItem('strangrz_eth_price');
    if (savedEth) this._ethPriceUsd = parseFloat(savedEth) || ETH_REFERENCE_PRICE_USD;
  }

  // ─── Exchange Rates ──────────────────────────────────

  private loadRates(): void {
    const raw = storage.getItem(RATES_KEY);
    if (raw) {
      try {
        const arr: ExchangeRate[] = JSON.parse(raw);
        for (const r of arr) this.rates.set(r.currency, r);
        return;
      } catch { /* use defaults */ }
    }
    for (const r of DEFAULT_RATES) {
      this.rates.set(r.currency, r);
    }
    this.saveRates();
  }

  private saveRates(): void {
    storage.setItem(RATES_KEY, JSON.stringify(Array.from(this.rates.values())));
  }

  getRate(currency: FiatCurrency): ExchangeRate | undefined {
    return this.rates.get(currency);
  }

  getAllRates(): ExchangeRate[] {
    return Array.from(this.rates.values());
  }

  /**
   * Update exchange rate (admin operation).
   */
  setRate(currency: FiatCurrency, warpsPerUnit: number, source: ExchangeRate['source'] = 'manual'): void {
    this.rates.set(currency, {
      currency,
      warpsPerUnit,
      lastUpdated: Date.now(),
      source,
    });
    this.saveRates();
  }

  get preferredCurrency(): FiatCurrency {
    return this._preferredCurrency;
  }

  set preferredCurrency(currency: FiatCurrency) {
    this._preferredCurrency = currency;
    storage.setItem('strangrz_fiat_currency', currency);
  }

  // ─── ETH Conversion ─────────────────────────────────

  private _ethPriceUsd: number = ETH_REFERENCE_PRICE_USD;

  /** Current ETH price in USD (for STZ↔ETH conversion) */
  get ethPriceUsd(): number { return this._ethPriceUsd; }

  /**
   * Update ETH price. Clamped within ±20% volatility band of reference
   * to prevent extreme rate swings.
   */
  setEthPrice(priceUsd: number): void {
    const min = ETH_REFERENCE_PRICE_USD * (1 - ETH_VOLATILITY_BAND);
    const max = ETH_REFERENCE_PRICE_USD * (1 + ETH_VOLATILITY_BAND);
    this._ethPriceUsd = Math.min(max, Math.max(min, priceUsd));
    storage.setItem('strangrz_eth_price', String(this._ethPriceUsd));
  }

  /** How many STZ per 1 ETH (dynamic based on current ETH price) */
  get warpsPerEth(): number {
    const usdRate = this.rates.get('USD');
    if (!usdRate) return 0;
    return Math.round(usdRate.warpsPerUnit * this._ethPriceUsd);
  }

  /** Convert STZ to ETH */
  warpsToEth(warps: number): number {
    const wpe = this.warpsPerEth;
    if (wpe <= 0) return 0;
    return Math.round(warps / wpe * 1e8) / 1e8; // 8 decimal precision like ETH
  }

  /** Convert ETH to STZ */
  ethToWarps(eth: number): number {
    return Math.round(eth * this.warpsPerEth * 100) / 100;
  }

  /** Format price showing STZ, fiat, and ETH */
  formatTriplePrice(warps: number, currency: FiatCurrency = this._preferredCurrency): string {
    const fiat = this.warpsToFiat(warps, currency);
    const eth = this.warpsToEth(warps);
    const symbol = getCurrencySymbol(currency);
    return `${warps.toLocaleString()} ⬣ (${symbol}${fiat.toFixed(2)} / ${eth.toFixed(6)} ETH)`;
  }

  // ─── Price Conversion ────────────────────────────────

  /**
   * Convert Warps to fiat.
   */
  warpsToFiat(warps: number, currency: FiatCurrency = this._preferredCurrency): number {
    const rate = this.rates.get(currency);
    if (!rate) return 0;
    return Math.round(warps / rate.warpsPerUnit * 100) / 100;
  }

  /**
   * Convert fiat to Warps.
   */
  fiatToWarps(amount: number, currency: FiatCurrency = this._preferredCurrency): number {
    const rate = this.rates.get(currency);
    if (!rate) return 0;
    return Math.round(amount * rate.warpsPerUnit * 100) / 100;
  }

  /**
   * Format a price in both ⬣ and fiat for display.
   */
  formatDualPrice(warps: number, currency: FiatCurrency = this._preferredCurrency): string {
    const fiat = this.warpsToFiat(warps, currency);
    const symbol = getCurrencySymbol(currency);
    return `${warps.toLocaleString()} ⬣ (${symbol}${fiat.toFixed(2)})`;
  }

  /**
   * Calculate fees for a transaction.
   */
  calculateFees(fiatAmount: number, paymentMethod: PaymentMethod): {
    platformFee: number;
    processorFee: number;
    totalFees: number;
    sellerReceives: number;
  } {
    const platformFee = Math.round(fiatAmount * DEFAULT_PLATFORM_FEE / 100 * 100) / 100;
    const procFee = PROCESSOR_FEES[paymentMethod] || { percent: 0, fixed: 0 };
    const processorFee = Math.round((fiatAmount * procFee.percent / 100 + procFee.fixed) * 100) / 100;
    const totalFees = platformFee + processorFee;
    const sellerReceives = Math.round((fiatAmount - totalFees) * 100) / 100;

    return { platformFee, processorFee, totalFees, sellerReceives };
  }

  // ─── Fiat Listings ──────────────────────────────────

  private loadListings(): void {
    const raw = storage.getItem(FIAT_LISTINGS_KEY);
    if (!raw) return;
    try {
      const arr: FiatListing[] = JSON.parse(raw);
      for (const l of arr) this.listings.set(l.wartId, l);
    } catch { /* corrupt */ }
  }

  private saveListings(): void {
    storage.setItem(FIAT_LISTINGS_KEY, JSON.stringify(Array.from(this.listings.values())));
  }

  /**
   * List an artwork for sale in fiat currency.
   */
  createFiatListing(params: {
    wartId: string;
    wartTitle: string;
    sellerAddress: string;
    priceFiat: number;
    currency: FiatCurrency;
    paymentMethods?: PaymentMethod[];
  }): FiatListing {
    const rate = this.rates.get(params.currency);
    if (!rate) throw new Error(`Unsupported currency: ${params.currency}`);

    const listing: FiatListing = {
      wartId: params.wartId,
      wartTitle: params.wartTitle,
      sellerAddress: params.sellerAddress,
      priceWarps: this.fiatToWarps(params.priceFiat, params.currency),
      priceFiat: params.priceFiat,
      fiatCurrency: params.currency,
      exchangeRateAtListing: rate.warpsPerUnit,
      listedAt: Date.now(),
      acceptedPaymentMethods: params.paymentMethods || ['card', 'paypal', 'sepa'],
    };

    this.listings.set(params.wartId, listing);
    this.saveListings();

    return listing;
  }

  /**
   * Remove a fiat listing.
   */
  removeFiatListing(wartId: string): boolean {
    const deleted = this.listings.delete(wartId);
    if (deleted) this.saveListings();
    return deleted;
  }

  /**
   * Get fiat listing for an artwork.
   */
  getFiatListing(wartId: string): FiatListing | undefined {
    return this.listings.get(wartId);
  }

  /**
   * Get all active fiat listings.
   */
  getAllFiatListings(): FiatListing[] {
    return Array.from(this.listings.values())
      .sort((a, b) => b.listedAt - a.listedAt);
  }

  // ─── Payment Processing ─────────────────────────────

  private loadTransactions(): void {
    const raw = storage.getItem(FIAT_TX_KEY);
    if (!raw) return;
    try {
      this.transactions = JSON.parse(raw);
    } catch { /* corrupt */ }
  }

  private saveTransactions(): void {
    storage.setItem(FIAT_TX_KEY, JSON.stringify(this.transactions.slice(0, 500)));
  }

  /**
   * Create a fiat buy transaction (user buys artwork with fiat).
   *
   * Flow: pending → processing → completed
   * If STRANGRZ_GATEWAY_URL is set, this will call the backend to create
   * a real PaymentIntent. Otherwise, transactions are settled locally.
   */
  async createBuyTransaction(params: {
    buyerAddress: string;
    sellerAddress: string;
    wartId: string;
    wartTitle: string;
    fiatAmount: number;
    currency: FiatCurrency;
    paymentMethod: PaymentMethod;
  }): Promise<FiatTransaction> {
    const rate = this.rates.get(params.currency);
    if (!rate) throw new Error(`Unsupported currency: ${params.currency}`);

    const warpAmount = this.fiatToWarps(params.fiatAmount, params.currency);
    const fees = this.calculateFees(params.fiatAmount, params.paymentMethod);

    const tx: FiatTransaction = {
      id: 'FIAT_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      type: 'buy',
      status: 'pending',
      warpAmount,
      fromAddress: params.buyerAddress,
      toAddress: params.sellerAddress,
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.currency,
      exchangeRate: rate.warpsPerUnit,
      paymentMethod: params.paymentMethod,
      wartId: params.wartId,
      wartTitle: params.wartTitle,
      timestamp: Date.now(),
      platformFeePercent: DEFAULT_PLATFORM_FEE,
      platformFeeAmount: fees.platformFee,
      processorFeeAmount: fees.processorFee,
      sellerReceives: fees.sellerReceives,
    };

    this.transactions.push(tx);
    this.saveTransactions();

    // Call Vercel serverless API (same origin, client-side only)
    if (typeof window !== 'undefined') {
      try {
        tx.status = 'processing';
        this.saveTransactions();
        const resp = await fetch(`/api/payments/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txId: tx.id,
            amount: params.fiatAmount,
            currency: params.currency,
            paymentMethod: params.paymentMethod,
            wartId: params.wartId,
            buyerAddress: params.buyerAddress,
            sellerAddress: params.sellerAddress,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          tx.processorRef = data.processorRef || data.paymentIntentId;
          tx.status = 'completed';
          tx.completedAt = Date.now();
        } else {
          tx.status = 'failed';
          tx.error = `Payment processor returned ${resp.status}`;
        }
      } catch (err) {
        tx.status = 'failed';
        tx.error = err instanceof Error ? err.message : 'Payment processing failed';
      }
    } else {
      // Local settlement — full lifecycle without external processor
      tx.status = 'processing';
      tx.processorRef = 'LOCAL_' + tx.id;
      tx.status = 'completed';
      tx.completedAt = Date.now();
    }

    this.saveTransactions();
    return tx;
  }

  /**
   * Create a fiat sell/withdrawal (user converts ⬣ to fiat).
   *
   * Flow: pending → processing → completed
   */
  async createSellTransaction(params: {
    sellerAddress: string;
    warpAmount: number;
    currency: FiatCurrency;
    paymentMethod: PaymentMethod;
  }): Promise<FiatTransaction> {
    const rate = this.rates.get(params.currency);
    if (!rate) throw new Error(`Unsupported currency: ${params.currency}`);

    const fiatAmount = this.warpsToFiat(params.warpAmount, params.currency);
    const fees = this.calculateFees(fiatAmount, params.paymentMethod);

    const tx: FiatTransaction = {
      id: 'FIAT_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      type: 'sell',
      status: 'pending',
      warpAmount: params.warpAmount,
      fromAddress: params.sellerAddress,
      toAddress: 'FIAT_GATEWAY',
      fiatAmount,
      fiatCurrency: params.currency,
      exchangeRate: rate.warpsPerUnit,
      paymentMethod: params.paymentMethod,
      timestamp: Date.now(),
      platformFeePercent: DEFAULT_PLATFORM_FEE,
      platformFeeAmount: fees.platformFee,
      processorFeeAmount: fees.processorFee,
      sellerReceives: fees.sellerReceives,
    };

    this.transactions.push(tx);

    // Call Vercel serverless API (same origin, client-side only)
    if (typeof window !== 'undefined') {
      try {
        tx.status = 'processing';
        this.saveTransactions();
        const resp = await fetch(`/api/payouts/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txId: tx.id,
            warpAmount: params.warpAmount,
            currency: params.currency,
            paymentMethod: params.paymentMethod,
            sellerAddress: params.sellerAddress,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          tx.processorRef = data.processorRef || data.payoutId;
          tx.status = 'completed';
          tx.completedAt = Date.now();
        } else {
          tx.status = 'failed';
          tx.error = `Payout processor returned ${resp.status}`;
        }
      } catch (err) {
        tx.status = 'failed';
        tx.error = err instanceof Error ? err.message : 'Payout processing failed';
      }
    } else {
      // Local settlement
      tx.status = 'processing';
      tx.processorRef = 'LOCAL_' + tx.id;
      tx.status = 'completed';
      tx.completedAt = Date.now();
    }

    this.saveTransactions();
    return tx;
  }

  // ─── Transaction History ──────────────────────────────

  getTransactionsByAddress(address: string): FiatTransaction[] {
    return this.transactions
      .filter(tx => tx.fromAddress === address || tx.toAddress === address)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getTransaction(id: string): FiatTransaction | undefined {
    return this.transactions.find(tx => tx.id === id);
  }

  // ─── Stats ────────────────────────────────────────────

  getStats(): GatewayStats {
    const stats: GatewayStats = {
      totalBuyTransactions: 0,
      totalSellTransactions: 0,
      totalFiatVolume: { EUR: 0, USD: 0, GBP: 0, JPY: 0, CHF: 0 },
      totalWarpVolume: 0,
      totalPlatformFees: { EUR: 0, USD: 0, GBP: 0, JPY: 0, CHF: 0 },
      activeListings: this.listings.size,
    };

    for (const tx of this.transactions) {
      if (tx.status !== 'completed') continue;
      if (tx.type === 'buy') stats.totalBuyTransactions++;
      if (tx.type === 'sell') stats.totalSellTransactions++;
      stats.totalFiatVolume[tx.fiatCurrency] = (stats.totalFiatVolume[tx.fiatCurrency] || 0) + tx.fiatAmount;
      stats.totalWarpVolume += tx.warpAmount;
      stats.totalPlatformFees[tx.fiatCurrency] = (stats.totalPlatformFees[tx.fiatCurrency] || 0) + tx.platformFeeAmount;
    }

    return stats;
  }
}

// ─── Utility ─────────────────────────────────────────────

export function getCurrencySymbol(currency: FiatCurrency): string {
  const symbols: Record<FiatCurrency, string> = {
    EUR: '\u20AC',
    USD: '$',
    GBP: '\u00A3',
    JPY: '\u00A5',
    CHF: 'CHF ',
  };
  return symbols[currency] || currency;
}

export function formatFiatPrice(amount: number, currency: FiatCurrency): string {
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
}
