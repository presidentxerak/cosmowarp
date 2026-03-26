/**
 * Strangrz Performance Budget — Thresholds, monitoring, regression alerts
 *
 * Defines acceptable limits for Web Vitals and bundle sizes.
 * Reports violations to console (dev) or Sentry (prod).
 */

import type { WebVitals } from './pwa';

// ─── Performance Budget ───────────────────────────────────

export const PERFORMANCE_BUDGET = {
  /** Largest Contentful Paint: target <2.5s (good), warn <4s */
  lcp: { good: 2500, warn: 4000 },
  /** First Input Delay: target <100ms (good), warn <300ms */
  fid: { good: 100, warn: 300 },
  /** Cumulative Layout Shift: target <0.1 (good), warn <0.25 */
  cls: { good: 0.1, warn: 0.25 },
  /** Time to First Byte: target <800ms (good), warn <1800ms */
  ttfb: { good: 800, warn: 1800 },
  /** Main JS bundle: target <500KB */
  mainBundleKB: 500,
  /** Total page weight: target <2MB */
  totalPageKB: 2048,
} as const;

// ─── Types ────────────────────────────────────────────────

export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalReport {
  metric: string;
  value: number;
  rating: VitalRating;
  threshold: { good: number; warn: number };
}

// ─── Rating ───────────────────────────────────────────────

/** Rate a Web Vital metric against the budget */
export function rateVital(metric: keyof typeof PERFORMANCE_BUDGET, value: number): VitalRating {
  const budget = PERFORMANCE_BUDGET[metric];
  if (typeof budget === 'number') return value <= budget ? 'good' : 'poor';
  if (value <= budget.good) return 'good';
  if (value <= budget.warn) return 'needs-improvement';
  return 'poor';
}

/** Generate a full report from Web Vitals */
export function generateVitalsReport(vitals: WebVitals): VitalReport[] {
  const reports: VitalReport[] = [];

  if (vitals.lcp !== null) {
    reports.push({
      metric: 'LCP',
      value: vitals.lcp,
      rating: rateVital('lcp', vitals.lcp),
      threshold: PERFORMANCE_BUDGET.lcp,
    });
  }
  if (vitals.fid !== null) {
    reports.push({
      metric: 'FID',
      value: vitals.fid,
      rating: rateVital('fid', vitals.fid),
      threshold: PERFORMANCE_BUDGET.fid,
    });
  }
  if (vitals.cls !== null) {
    reports.push({
      metric: 'CLS',
      value: vitals.cls,
      rating: rateVital('cls', vitals.cls),
      threshold: PERFORMANCE_BUDGET.cls,
    });
  }
  if (vitals.ttfb !== null) {
    reports.push({
      metric: 'TTFB',
      value: vitals.ttfb,
      rating: rateVital('ttfb', vitals.ttfb),
      threshold: PERFORMANCE_BUDGET.ttfb,
    });
  }

  return reports;
}

/** Check if any vitals are in "poor" state */
export function hasPerformanceIssues(vitals: WebVitals): boolean {
  const report = generateVitalsReport(vitals);
  return report.some(r => r.rating === 'poor');
}

/** Get overall performance score (0-100, Lighthouse-style) */
export function getPerformanceScore(vitals: WebVitals): number {
  const report = generateVitalsReport(vitals);
  if (report.length === 0) return 100;

  const scores = report.map(r => {
    switch (r.rating) {
      case 'good': return 100;
      case 'needs-improvement': return 60;
      case 'poor': return 20;
    }
  });

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── Bundle Size Check (CI helper) ────────────────────────

/** Check if a bundle size exceeds the budget */
export function checkBundleSize(sizeKB: number, budget: number = PERFORMANCE_BUDGET.mainBundleKB): {
  pass: boolean;
  sizeKB: number;
  budgetKB: number;
  overageKB: number;
} {
  return {
    pass: sizeKB <= budget,
    sizeKB,
    budgetKB: budget,
    overageKB: Math.max(0, sizeKB - budget),
  };
}
