/**
 * Vercel Serverless Function — Exchange Rates
 * GET  /api/rates — Get current rates (from Supabase, fallback to defaults)
 * POST /api/rates — Update rates (admin, persisted to Supabase)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_RATES } from './_shared/rates';

const ADMIN_KEY = process.env.GATEWAY_ADMIN_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://strangrz.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    // Try Supabase first (persistent), fallback to hardcoded defaults
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('exchange_rates').select('*');
      if (data && data.length > 0) {
        const rates = data.map((row: Record<string, unknown>) => ({
          currency: row.currency as string,
          warpsPerUnit: Number(row.warps_per_unit),
          lastUpdated: Number(row.updated_at),
          source: row.source as string,
        }));
        return res.json({ rates });
      }
    }

    // Fallback to defaults
    const rates = Object.entries(DEFAULT_RATES).map(([currency, warpsPerUnit]) => ({
      currency,
      warpsPerUnit,
      lastUpdated: Date.now(),
      source: 'default',
    }));
    return res.json({ rates });
  }

  if (req.method === 'POST') {
    const adminKey = req.headers['x-admin-key'];
    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Unauthorized' });

    const { currency, warpsPerUnit, source } = req.body;
    if (!currency || typeof warpsPerUnit !== 'number' || warpsPerUnit <= 0 || !Number.isFinite(warpsPerUnit)) {
      return res.status(400).json({ error: 'Missing currency or warpsPerUnit' });
    }

    const rate = {
      currency,
      warps_per_unit: warpsPerUnit,
      source: source || 'admin',
      updated_at: Date.now(),
    };

    // Persist to Supabase
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('exchange_rates').upsert(rate, { onConflict: 'currency' });
      if (error) {
        return res.status(500).json({ error: `Failed to persist rate: ${error.message}` });
      }
    }

    return res.json({
      ok: true,
      rate: { currency, warpsPerUnit, lastUpdated: rate.updated_at, source: rate.source },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
