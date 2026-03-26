/**
 * Strangrz Load Test — k6 script for marketplace endpoints
 *
 * Run: k6 run loadtest/k6-marketplace.js --env BASE_URL=https://strangrz.com
 *
 * Scenarios:
 *   1. Browse marketplace (GET /api/rates + static pages)
 *   2. Concurrent checkouts (POST /api/payments/create)
 *   3. Realtime stress (simulates Supabase subscription load)
 *
 * Targets:
 *   - 1000 concurrent users browsing
 *   - 10 concurrent checkouts
 *   - P95 response time < 1s
 *   - No errors under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Config ───────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'https://strangrz.com';

export const options = {
  scenarios: {
    // Scenario 1: Browse marketplace
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },   // ramp up
        { duration: '2m', target: 1000 },    // sustained load
        { duration: '30s', target: 0 },      // ramp down
      ],
      exec: 'browseMarketplace',
    },
    // Scenario 2: Concurrent checkouts
    checkout: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '30s',  // start after browse ramp-up
      exec: 'createCheckout',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95th percentile < 1s
    http_req_failed: ['rate<0.01'],      // < 1% error rate
    'checkout_duration': ['p(95)<2000'], // checkouts < 2s
  },
};

// ─── Custom Metrics ───────────────────────────────────────

const checkoutDuration = new Trend('checkout_duration');
const errorRate = new Rate('errors');

// ─── Scenario: Browse Marketplace ─────────────────────────

export function browseMarketplace() {
  group('Browse', () => {
    // 1. Load exchange rates
    const ratesRes = http.get(`${BASE_URL}/api/rates`);
    check(ratesRes, {
      'rates status 200': (r) => r.status === 200,
      'rates has EUR': (r) => JSON.parse(r.body).rates?.EUR !== undefined,
    }) || errorRate.add(1);

    // 2. Load health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      'health status 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(Math.random() * 2 + 1); // 1-3s between page loads
  });
}

// ─── Scenario: Create Checkout ────────────────────────────

export function createCheckout() {
  group('Checkout', () => {
    const payload = JSON.stringify({
      amount: Math.floor(Math.random() * 100) + 10,
      currency: 'EUR',
      buyerAddress: `STZ_loadtest_${__VU}_${Date.now().toString(36)}`,
      wartId: `wart_loadtest_${Math.random().toString(36).slice(2)}`,
    });

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/payments/create`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    const duration = Date.now() - start;
    checkoutDuration.add(duration);

    check(res, {
      'checkout status 200 or 429': (r) => r.status === 200 || r.status === 429,
      'checkout has txId': (r) => {
        if (r.status === 429) return true; // rate-limited is OK
        try { return JSON.parse(r.body).txId !== undefined; } catch { return false; }
      },
    }) || errorRate.add(1);

    sleep(Math.random() * 3 + 2); // 2-5s between checkouts
  });
}

// ─── Lifecycle ────────────────────────────────────────────

export function setup() {
  console.log(`Load test targeting: ${BASE_URL}`);
  // Verify API is reachable
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`API not reachable: ${res.status}`);
  }
}

export function teardown(data) {
  console.log('Load test complete.');
}
