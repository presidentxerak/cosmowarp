/**
 * Vercel Serverless Function — Create Payment
 * POST /api/payments/create
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_RATES, calculateFees, generateTxId } from '../_shared/rates';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://cosmorare.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, currency, paymentMethod, wartId, buyerAddress, sellerAddress } = req.body;

  if (!amount || !currency || !buyerAddress) {
    return res.status(400).json({ error: 'Missing required fields: amount, currency, buyerAddress' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const rate = DEFAULT_RATES[currency];
  if (!rate) return res.status(400).json({ error: `Unsupported currency: ${currency}` });

  const warpAmount = Math.round(amount * rate * 100) / 100;
  const fees = calculateFees(amount, paymentMethod || 'card');
  const txId = generateTxId('FIAT');

  // Stripe integration
  if (STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: wartId ? `Cosmorare #${wartId}` : `${warpAmount} Warps (\u03A9)`,
              description: `Cosmorare purchase \u2014 ${warpAmount} \u03A9`,
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin || 'https://cosmorare.com'}/payment-success?tx=${txId}`,
        cancel_url: `${req.headers.origin || 'https://cosmorare.com'}/payment-cancel?tx=${txId}`,
        metadata: {
          cosmorare_tx_id: txId,
          buyer_address: buyerAddress,
          seller_address: sellerAddress || '',
          warp_amount: warpAmount.toString(),
          wart_id: wartId || '',
        },
      });

      return res.json({
        txId,
        processorRef: session.id,
        checkoutUrl: session.url,
        status: 'processing',
        warpAmount,
        fees,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Stripe error',
        txId,
      });
    }
  }

  // No Stripe — local settlement (dev mode)
  return res.json({
    txId,
    processorRef: `LOCAL_${txId}`,
    status: 'completed',
    warpAmount,
    fees,
    mode: 'local-settlement',
  });
}
