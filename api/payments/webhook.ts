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
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const txId = session.metadata?.strangrz_tx_id;
      const buyerAddress = session.metadata?.buyer_address;
      const warpAmount = parseFloat(session.metadata?.warp_amount || '0');

      if (!Number.isFinite(warpAmount) || warpAmount <= 0) {
        console.error(`[Webhook] Invalid warp amount: ${warpAmount} for tx ${txId}`);
        return res.json({ received: true });
      }

      if (!txId || !buyerAddress) {
        console.error(`[Webhook] Missing metadata — txId: ${txId}, buyerAddress: ${buyerAddress}`);
        return res.json({ received: true });
      }

      console.log(`[Webhook] Payment completed: ${txId} — ${warpAmount} Ω → ${buyerAddress}`);

      // Credit buyer's balance atomically via Supabase RPC
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY && txId && buyerAddress && warpAmount > 0) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

          // Credit balance FIRST — if this fails, status stays pending (safe to retry)
          const memo = `Fiat purchase: ${warpAmount} ⬣ (${session.currency?.toUpperCase()} ${(session.amount_total || 0) / 100})`;
          const { data: credited, error: creditError } = await supabase.rpc('credit_warps', {
            p_address: buyerAddress,
            p_amount: warpAmount,
            p_tx_id: `${txId}_credit`,
            p_memo: memo,
          });

          if (creditError) {
            console.error(`[Webhook] RPC error crediting ${warpAmount} ⬣ to ${buyerAddress}:`, creditError.message);
          } else if (!credited) {
            console.error(`[Webhook] Failed to credit ${warpAmount} ⬣ to ${buyerAddress}`);
          }

          // Only mark as completed AFTER successful credit
          if (credited) {
            const { error: updateError } = await supabase.from('fiat_transactions').update({
              status: 'completed',
              processor_ref: session.id,
              updated_at: Date.now(),
            }).eq('tx_id', txId);

            if (updateError) {
              console.error(`[Webhook] Failed to update tx ${txId}:`, updateError.message);
            }
          }
        } catch (supaErr) {
          console.error(`[Webhook] Supabase error for tx ${txId}:`, supaErr instanceof Error ? supaErr.message : supaErr);
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }
}
