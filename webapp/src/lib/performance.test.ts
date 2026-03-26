import { describe, it, expect } from 'vitest';
import {
  PERFORMANCE_BUDGET, rateVital, generateVitalsReport,
  hasPerformanceIssues, getPerformanceScore, checkBundleSize,
} from './performance';
import type { WebVitals } from './pwa';

describe('Performance Budget', () => {
  describe('rateVital', () => {
    it('rates good LCP', () => {
      expect(rateVital('lcp', 1500)).toBe('good');
    });

    it('rates needs-improvement LCP', () => {
      expect(rateVital('lcp', 3000)).toBe('needs-improvement');
    });

    it('rates poor LCP', () => {
      expect(rateVital('lcp', 5000)).toBe('poor');
    });

    it('rates good CLS', () => {
      expect(rateVital('cls', 0.05)).toBe('good');
    });

    it('rates poor CLS', () => {
      expect(rateVital('cls', 0.5)).toBe('poor');
    });
  });

  describe('generateVitalsReport', () => {
    it('generates report from vitals', () => {
      const vitals: WebVitals = { lcp: 2000, fid: 50, cls: 0.05, ttfb: 500 };
      const report = generateVitalsReport(vitals);
      expect(report).toHaveLength(4);
      expect(report.every(r => r.rating === 'good')).toBe(true);
    });

    it('handles null vitals', () => {
      const vitals: WebVitals = { lcp: null, fid: null, cls: null, ttfb: null };
      const report = generateVitalsReport(vitals);
      expect(report).toHaveLength(0);
    });
  });

  describe('hasPerformanceIssues', () => {
    it('returns false for good vitals', () => {
      expect(hasPerformanceIssues({ lcp: 1000, fid: 50, cls: 0.05, ttfb: 300 })).toBe(false);
    });

    it('returns true for poor vitals', () => {
      expect(hasPerformanceIssues({ lcp: 6000, fid: null, cls: null, ttfb: null })).toBe(true);
    });
  });

  describe('getPerformanceScore', () => {
    it('scores 100 for all good', () => {
      expect(getPerformanceScore({ lcp: 1000, fid: 50, cls: 0.05, ttfb: 300 })).toBe(100);
    });

    it('scores lower for mixed ratings', () => {
      const score = getPerformanceScore({ lcp: 5000, fid: 50, cls: 0.05, ttfb: 300 });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('returns 100 for no data', () => {
      expect(getPerformanceScore({ lcp: null, fid: null, cls: null, ttfb: null })).toBe(100);
    });
  });

  describe('checkBundleSize', () => {
    it('passes for small bundles', () => {
      const result = checkBundleSize(300);
      expect(result.pass).toBe(true);
      expect(result.overageKB).toBe(0);
    });

    it('fails for large bundles', () => {
      const result = checkBundleSize(700);
      expect(result.pass).toBe(false);
      expect(result.overageKB).toBe(200);
    });

    it('uses custom budget', () => {
      expect(checkBundleSize(300, 200).pass).toBe(false);
      expect(checkBundleSize(300, 400).pass).toBe(true);
    });
  });

  describe('Budget constants', () => {
    it('has reasonable thresholds', () => {
      expect(PERFORMANCE_BUDGET.lcp.good).toBe(2500);
      expect(PERFORMANCE_BUDGET.fid.good).toBe(100);
      expect(PERFORMANCE_BUDGET.cls.good).toBe(0.1);
      expect(PERFORMANCE_BUDGET.mainBundleKB).toBe(500);
    });
  });
});
