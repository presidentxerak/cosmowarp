/**
 * Vercel Serverless Function — Stripe Webhook
 * POST /api/payments/webhook
 *
 * Handles checkout.session.completed by atomically:
 *   1. Crediting buyer with ⬣ (mint from gateway)
 *   2. Transferring wart ownership (if artwork purchase)
 *   3. Paying seller + creator royalties via purchase_wart RPC
 *   4. Recording transaction history
 *   5. Sending notifications to buyer & seller
 *   6. Auto-payout to seller via Stripe Connect
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(501).json({ error: 'Supabase not configured' });
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
      const sellerAddress = session.metadata?.seller_address;
      const wartId = session.metadata?.wart_id;
      const warpAmount = parseFloat(session.metadata?.warp_amount || '0');

      if (!txId || !buyerAddress || warpAmount <= 0) {
        return res.json({ received: true, skipped: 'missing metadata' });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Check idempotency: don't process the same tx twice
      const { data: existingTx } = await supabase
        .from('fiat_transactions')
        .select('status')
        .eq('tx_id', txId)
        .single();

      if (existingTx?.status === 'completed') {
        return res.json({ received: true, skipped: 'already processed' });
      }

      // ─── ARTWORK PURCHASE (wart_id present) ─────────────────
      if (wartId && sellerAddress) {
        // Fetch wart to get royalty info
        const { data: wart } = await supabase
          .from('warts')
          .select('creator, royalty_percent, price, owner')
          .eq('id', wartId)
          .single();

        if (!wart) {
          await updateFiatTx(supabase, txId, 'failed', session.id, 'Artwork not found');
          return res.json({ received: true, error: 'wart not found' });
        }

        // Calculate royalty (only on resale: seller !== creator)
        const isResale = wart.creator !== sellerAddress;
        const royaltyPercent = isResale ? (wart.royalty_percent || 5) : 0;
        const royaltyAmount = Math.round(warpAmount * royaltyPercent / 100 * 100) / 100;

        // First: credit buyer with ⬣ (mint from fiat gateway)
        const { error: creditError } = await supabase.rpc('credit_warps', {
          p_address: buyerAddress,
          p_amount: warpAmount,
          p_tx_id: `${txId}_credit`,
          p_memo: `Fiat purchase: ${warpAmount} ⬣ (${session.currency?.toUpperCase()} ${(session.amount_total || 0) / 100})`,
        });

        if (creditError) {
          await updateFiatTx(supabase, txId, 'failed', session.id, creditError.message);
          return res.status(500).json({ received: true, error: 'credit failed' });
        }

        // Then: atomic purchase (debit buyer → credit seller + creator → transfer ownership)
        const { data: purchased, error: purchaseError } = await supabase.rpc('purchase_wart', {
          p_wart_id: wartId,
          p_buyer: buyerAddress,
          p_price: warpAmount,
          p_royalty_amount: royaltyAmount,
          p_creator: wart.creator,
          p_seller: sellerAddress,
          p_tx_id: txId,
        });

        if (purchaseError || !purchased) {
          // Refund the credited ⬣ since purchase failed
          await supabase.rpc('credit_warps', {
            p_address: buyerAddress,
            p_amount: -warpAmount,
            p_tx_id: `${txId}_refund`,
            p_memo: `Refund: purchase failed`,
          });
          await updateFiatTx(supabase, txId, 'failed', session.id, purchaseError?.message || 'purchase_wart returned false');
          return res.status(500).json({ received: true, error: 'purchase failed' });
        }

        // Record transaction in global feed
        const now = Date.now();
        await supabase.from('transactions').insert({
          id: txId,
          from_addr: buyerAddress,
          to_addr: sellerAddress,
          amount: warpAmount,
          tx_type: 'wart_buy',
          memo: `Purchased "${wartId}" for ${warpAmount} ⬣ via fiat`,
          created_at: now,
        });

        // Auto-payout: if seller has a Stripe Connect account, transfer fiat
        let payoutStatus = 'pending_connect';
        const { data: connectAccount } = await supabase
          .from('stripe_connect_accounts')
          .select('stripe_account_id, onboarding_complete')
          .eq('seller_address', sellerAddress)
          .single();

        if (connectAccount?.onboarding_complete && connectAccount.stripe_account_id) {
          try {
            const sellerFiatAmount = (session.amount_total || 0); // in cents
            // Deduct platform fee (2.5%) — seller gets the rest
            const platformFeeCents = Math.round(sellerFiatAmount * 0.025);
            const sellerReceivesCents = sellerFiatAmount - platformFeeCents;

            if (sellerReceivesCents > 0) {
              await stripe.transfers.create({
                amount: sellerReceivesCents,
                currency: session.currency || 'eur',
                destination: connectAccount.stripe_account_id,
                metadata: { strangrz_tx_id: txId, wart_id: wartId },
              });
              payoutStatus = 'completed';
            }
          } catch {
            payoutStatus = 'payout_failed';
          }
        }

        // Send notifications
        const sellerPayoutMsg = payoutStatus === 'completed'
          ? ' Payment has been sent to your bank account.'
          : payoutStatus === 'pending_connect'
            ? ' Set up payouts in Settings to receive your earnings in EUR.'
            : ' Payout failed — please contact support.';

        await Promise.allSettled([
          supabase.from('notifications').insert({
            recipient: buyerAddress,
            sender: sellerAddress,
            notif_type: 'buy',
            title: 'Artwork purchased',
            body: `You now own "${wartId}". It has been added to your collection.`,
            ref_id: wartId,
            created_at: now,
          }),
          supabase.from('notifications').insert({
            recipient: sellerAddress,
            sender: buyerAddress,
            notif_type: 'sale',
            title: 'Artwork sold',
            body: `Your artwork "${wartId}" was purchased for ${warpAmount} ⬣.${sellerPayoutMsg}`,
            ref_id: wartId,
            created_at: now,
          }),
        ]);

        // Mark fiat transaction as completed
        await updateFiatTx(supabase, txId, 'completed', session.id);

      } else {
        // ─── PURE TOKEN PURCHASE (no wart) ──────────────────────
        const { error: creditError } = await supabase.rpc('credit_warps', {
          p_address: buyerAddress,
          p_amount: warpAmount,
          p_tx_id: `${txId}_credit`,
          p_memo: `Fiat purchase: ${warpAmount} ⬣ (${session.currency?.toUpperCase()} ${(session.amount_total || 0) / 100})`,
        });

        if (creditError) {
          await updateFiatTx(supabase, txId, 'failed', session.id, creditError.message);
          return res.status(500).json({ received: true, error: 'credit failed' });
        }

        await updateFiatTx(supabase, txId, 'completed', session.id);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('signature') || message.includes('Webhook')) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/** Update fiat_transactions table status */
async function updateFiatTx(
  supabase: SupabaseClient,
  txId: string,
  status: string,
  processorRef: string,
  error?: string,
) {
  await supabase.from('fiat_transactions').update({
    status,
    processor_ref: processorRef,
    error: error || null,
    updated_at: Date.now(),
  }).eq('tx_id', txId);
}
