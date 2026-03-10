/**
 * Vercel Serverless Function — Create Payment
 * POST /api/payments/create
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const PLATFORM_FEE_PERCENT = 2.5;

const PROCESSOR_FEES: Record<string, { percent: number; fixed: number }> = {
  card: { percent: 2.9, fixed: 0.30 },
  paypal: { percent: 3.49, fixed: 0.49 },
  sepa: { percent: 0.8, fixed: 0 },
  apple_pay: { percent: 2.9, fixed: 0.30 },
  google_pay: { percent: 2.9, fixed: 0.30 },
  bank_transfer: { percent: 0, fixed: 1.50 },
};

const RATES: Record<string, number> = {
  EUR: 100, USD: 92, GBP: 115, JPY: 0.62, CHF: 105,
};

function calculateFees(amount: number, method: string) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100 * 100) / 100;
  const proc = PROCESSOR_FEES[method] || { percent: 0, fixed: 0 };
  const processorFee = Math.round((amount * proc.percent / 100 + proc.fixed) * 100) / 100;
  return { platformFee, processorFee, total: platformFee + processorFee };
}

let txCounter = 0;

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

  const rate = RATES[currency];
  if (!rate) return res.status(400).json({ error: `Unsupported currency: ${currency}` });

  const warpAmount = Math.round(amount * rate * 100) / 100;
  const fees = calculateFees(amount, paymentMethod || 'card');
  const txId = `FIAT_${Date.now().toString(36)}_${(++txCounter).toString(36)}`;

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
              name: wartId ? `Cosmorare #${wartId}` : `${warpAmount} Warps (Ω)`,
              description: `Cosmorare purchase — ${warpAmount} Ω`,
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
