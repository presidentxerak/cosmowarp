/**
 * Vercel Serverless Function — Stripe Webhook
 * POST /api/payments/webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return res.status(501).json({ error: 'Stripe not configured' });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

    const body = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;

    const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const txId = session.metadata?.strangrz_tx_id;
      const buyerAddress = session.metadata?.buyer_address;
      const warpAmount = parseFloat(session.metadata?.warp_amount || '0');

      console.log(`[Webhook] Payment completed: ${txId} — ${warpAmount} Ω → ${buyerAddress}`);

      // Credit buyer's balance atomically via Supabase RPC
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY && buyerAddress && warpAmount > 0) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Update fiat transaction status
        await supabase.from('fiat_transactions').update({
          status: 'completed',
          processor_ref: session.id,
          updated_at: Date.now(),
        }).eq('tx_id', txId);

        // Atomic credit via RPC (prevents race conditions)
        const memo = `Fiat purchase: ${warpAmount} \u03A9 (${session.currency?.toUpperCase()} ${(session.amount_total || 0) / 100})`;
        const { data: credited } = await supabase.rpc('credit_warps', {
          p_address: buyerAddress,
          p_amount: warpAmount,
          p_tx_id: `${txId}_credit`,
          p_memo: memo,
        });

        if (!credited) {
          console.error(`[Webhook] Failed to credit ${warpAmount} \u03A9 to ${buyerAddress}`);
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
}
