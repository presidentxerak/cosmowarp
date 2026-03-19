/**
 * Vercel Serverless Function — Stripe Connect Onboarding
 * POST /api/connect/onboard
 *
 * Creates a Stripe Connect account for a seller and returns
 * an onboarding link. The seller completes KYC/bank details on Stripe.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '../_shared/rate-limit';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://strangrz.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 5 onboarding attempts per minute per IP
  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const limit = checkRateLimit(`connect:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: limit.retryAfter });
  }

  if (!STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: 'Stripe not configured' });
  }

  const { sellerAddress, email, returnUrl } = req.body;

  if (!sellerAddress) {
    return res.status(400).json({ error: 'Missing sellerAddress' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
    const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      : null;

    // Check if seller already has a Connect account
    let stripeAccountId: string | null = null;

    if (supabase) {
      const { data: existing } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id, onboarding_complete')
        .eq('seller_address', sellerAddress)
        .single();

      if (existing?.stripe_account_id) {
        stripeAccountId = existing.stripe_account_id;

        // If already onboarded, return status
        if (existing.onboarding_complete) {
          return res.json({
            status: 'active',
            stripeAccountId,
            message: 'Stripe Connect account already configured',
          });
        }
      }
    }

    // Create new Connect account if none exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        metadata: { strangrz_address: sellerAddress },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      // Store mapping in Supabase
      if (supabase) {
        await supabase.from('stripe_connect_accounts').upsert({
          seller_address: sellerAddress,
          stripe_account_id: stripeAccountId,
          onboarding_complete: false,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      }
    }

    // Create onboarding link
    const origin = returnUrl || req.headers.origin || 'https://strangrz.com';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/settings?connect=refresh`,
      return_url: `${origin}/settings?connect=complete`,
      type: 'account_onboarding',
    });

    return res.json({
      status: 'onboarding',
      stripeAccountId,
      onboardingUrl: accountLink.url,
    });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Connect onboarding failed',
    });
  }
}
