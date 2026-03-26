import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPreferredCurrency, setPreferredCurrency,
  stzToFiat, fiatToStz, formatPrice, formatDualPrice,
  getCurrentRates, getRateHistory, SUPPORTED_CURRENCIES,
} from './currency';

describe('Currency Engine', () => {
  beforeEach(() => localStorage.clear());

  describe('Preferred currency', () => {
    it('defaults to EUR', () => {
      expect(getPreferredCurrency()).toBe('EUR');
    });

    it('persists preference', () => {
      setPreferredCurrency('USD');
      expect(getPreferredCurrency()).toBe('USD');
    });
  });

  describe('Conversion', () => {
    it('converts STZ to EUR (default rate: 10 STZ/EUR)', () => {
      expect(stzToFiat(100, 'EUR')).toBe(10); // 100 STZ / 10 = €10
    });

    it('converts STZ to USD', () => {
      expect(stzToFiat(91, 'USD')).toBe(10); // 91 STZ / 9.1 = $10
    });

    it('converts fiat to STZ', () => {
      expect(fiatToStz(10, 'EUR')).toBe(100); // €10 × 10 = 100 STZ
    });

    it('handles JPY (small rate)', () => {
      const jpy = stzToFiat(610, 'JPY');
      expect(jpy).toBeCloseTo(10000, -1); // 610 / 0.061 ≈ 10000
    });
  });

  describe('Formatting', () => {
    it('formats EUR price', () => {
      const formatted = formatPrice(500, 'EUR');
      expect(formatted).toBe('€50.00');
    });

    it('formats USD price', () => {
      const formatted = formatPrice(91, 'USD');
      expect(formatted).toBe('$10.00');
    });

    it('formats JPY without decimals', () => {
      const formatted = formatPrice(61, 'JPY');
      expect(formatted).toMatch(/^¥\d+$/);
    });

    it('formats dual price', () => {
      const formatted = formatDualPrice(100, 'EUR');
      expect(formatted).toContain('100 STZ');
      expect(formatted).toContain('€');
    });
  });

  describe('Current rates', () => {
    it('returns default rates when no cache', () => {
      const rates = getCurrentRates();
      expect(rates.EUR).toBe(10);
      expect(rates.USD).toBe(9.1);
      expect(rates.GBP).toBe(11.7);
    });
  });

  describe('Rate history', () => {
    it('starts empty', () => {
      expect(getRateHistory()).toEqual([]);
    });
  });

  describe('Supported currencies', () => {
    it('has 5 currencies', () => {
      expect(SUPPORTED_CURRENCIES).toHaveLength(5);
      expect(SUPPORTED_CURRENCIES.map(c => c.code)).toEqual(['EUR', 'USD', 'GBP', 'JPY', 'CHF']);
    });
  });
});
