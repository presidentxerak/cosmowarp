/**
 * Vercel Serverless Function — Stripe Connect Status
 * GET /api/connect/status?address=<sellerAddress>
 *
 * Returns the Stripe Connect status for a seller.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://strangrz.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const address = req.query.address as string;
  if (!address) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.json({ status: 'not_configured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, onboarding_complete')
      .eq('seller_address', address)
      .single();

    if (!data) {
      return res.json({ status: 'none' });
    }

    // If onboarding was started but not confirmed, check with Stripe
    if (!data.onboarding_complete && STRIPE_SECRET_KEY) {
      const Stripe = (await import('stripe')).default;
      const stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
      const account = await stripe.accounts.retrieve(data.stripe_account_id);

      if (account.charges_enabled && account.payouts_enabled) {
        // Mark as complete
        await supabase.from('stripe_connect_accounts').update({
          onboarding_complete: true,
          updated_at: Date.now(),
        }).eq('seller_address', address);

        return res.json({ status: 'active', stripeAccountId: data.stripe_account_id });
      }

      return res.json({ status: 'pending', stripeAccountId: data.stripe_account_id });
    }

    return res.json({
      status: data.onboarding_complete ? 'active' : 'pending',
      stripeAccountId: data.stripe_account_id,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Status check failed',
    });
  }
}
