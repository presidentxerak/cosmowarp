/**
 * Cosmorare Fiat Gateway — EUR/USD/GBP On/Off Ramp
 *
 * This module provides the INTERFACE for fiat payments.
 * In production, it connects to payment processors (Stripe, PayPal).
 * Currently: self-contained simulation with real exchange rate tracking.
 *
 * ─── Architecture ────────────────────────────────────────────
 *
 * 1. PRICE DISPLAY — Shows artwork prices in both Ω and fiat
 * 2. BUY FLOW — User pays in fiat → system credits Ω → transfers artwork
 * 3. SELL FLOW — User lists in fiat → buyer pays → seller receives fiat
 * 4. EXCHANGE RATE — Configurable rate (Ω per EUR/USD)
 *
 * ─── Production Integration Points ──────────────────────────
 *
 * When ready for production, replace the simulate* methods with:
 * - Stripe Payment Intents (card payments)
 * - PayPal Orders API (PayPal/Venmo)
 * - SEPA Direct Debit (EU bank transfers)
 * - Apple Pay / Google Pay (mobile)
 *
 * ─── Compliance Requirements ─────────────────────────────────
 *
 * For production deployment:
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
  warpsPerUnit: number;           // How many Ω per 1 unit of fiat
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
  platformFeePercent: number;     // Cosmorare platform fee (default 2.5%)
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
  | 'internal';       // Internal Ω transfer (no fiat)

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

const RATES_KEY = 'cosmorare_fiat_rates';
const FIAT_TX_KEY = 'cosmorare_fiat_tx';
const FIAT_LISTINGS_KEY = 'cosmorare_fiat_listings';

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

// Default exchange rates (configurable by admin)
const DEFAULT_RATES: ExchangeRate[] = [
  { currency: 'EUR', warpsPerUnit: 100, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'USD', warpsPerUnit: 92, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'GBP', warpsPerUnit: 115, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'JPY', warpsPerUnit: 0.62, lastUpdated: Date.now(), source: 'manual' },
  { currency: 'CHF', warpsPerUnit: 105, lastUpdated: Date.now(), source: 'manual' },
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
    storage.setItem('cosmorare_fiat_currency', currency);
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
   * Format a price in both Ω and fiat for display.
   */
  formatDualPrice(warps: number, currency: FiatCurrency = this._preferredCurrency): string {
    const fiat = this.warpsToFiat(warps, currency);
    const symbol = getCurrencySymbol(currency);
    return `${warps.toLocaleString()} Ω (${symbol}${fiat.toFixed(2)})`;
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
   * In production, this would:
   * 1. Create a Stripe PaymentIntent
   * 2. Return a checkout URL
   * 3. Wait for webhook confirmation
   * 4. Execute the on-chain transfer
   *
   * Currently: simulates the full flow instantly.
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
      status: 'completed',  // Simulated: instant completion
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
      completedAt: Date.now(),
      platformFeePercent: DEFAULT_PLATFORM_FEE,
      platformFeeAmount: fees.platformFee,
      processorFeeAmount: fees.processorFee,
      sellerReceives: fees.sellerReceives,
    };

    this.transactions.push(tx);
    this.saveTransactions();

    return tx;
  }

  /**
   * Create a fiat sell/withdrawal (user converts Ω to fiat).
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
      status: 'completed',
      warpAmount: params.warpAmount,
      fromAddress: params.sellerAddress,
      toAddress: 'FIAT_GATEWAY',
      fiatAmount,
      fiatCurrency: params.currency,
      exchangeRate: rate.warpsPerUnit,
      paymentMethod: params.paymentMethod,
      timestamp: Date.now(),
      completedAt: Date.now(),
      platformFeePercent: DEFAULT_PLATFORM_FEE,
      platformFeeAmount: fees.platformFee,
      processorFeeAmount: fees.processorFee,
      sellerReceives: fees.sellerReceives,
    };

    this.transactions.push(tx);
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
