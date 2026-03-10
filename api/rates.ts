/**
 * Vercel Serverless Function — Exchange Rates
 * GET  /api/rates — Get current rates
 * POST /api/rates — Update rates (admin)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_RATES } from './_shared/rates';

const ADMIN_KEY = process.env.GATEWAY_ADMIN_KEY;
if (!ADMIN_KEY) {
  console.warn('[WARN] GATEWAY_ADMIN_KEY not set — rate updates will be disabled');
}

// In-memory rates (use Supabase in production for persistence)
const rates = new Map(
  Object.entries(DEFAULT_RATES).map(([currency, warpsPerUnit]) => [
    currency,
    { currency, warpsPerUnit, lastUpdated: Date.now(), source: 'manual' },
  ])
);

export default function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://cosmorare.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.json({ rates: Array.from(rates.values()) });
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

    const { currency, warpsPerUnit, source } = req.body;
    if (currency && typeof warpsPerUnit === 'number') {
      rates.set(currency, {
        currency,
        warpsPerUnit,
        lastUpdated: Date.now(),
        source: source || 'admin',
      });
      return res.json({ ok: true, rate: rates.get(currency) });
    }
    return res.status(400).json({ error: 'Missing currency or warpsPerUnit' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
