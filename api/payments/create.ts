/**
 * Vercel Serverless Function — Create Payment
 * POST /api/payments/create
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_RATES, calculateFees, generateTxId, PRIMARY_MARKET_FEE_PERCENT, SECONDARY_MARKET_FEE_PERCENT } from '../_shared/rates';
import { checkRateLimit, getClientIp } from '../_shared/rate-limit';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.CORS_ORIGIN || 'https://strangrz.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 10 payment creations per minute per IP
  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const limit = checkRateLimit(`payment:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter: limit.retryAfter });
  }

  const { amount, currency, paymentMethod, wartId, buyerAddress, sellerAddress, isResale } = req.body;

  if (!amount || !currency || !buyerAddress) {
    return res.status(400).json({ error: 'Missing required fields: amount, currency, buyerAddress' });
  }

  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const rate = DEFAULT_RATES[currency];
  if (!rate) return res.status(400).json({ error: `Unsupported currency: ${currency}` });

  const warpAmount = Math.round(amount * rate * 100) / 100;
  const fees = calculateFees(amount, paymentMethod || 'card', !!isResale);
  const txId = generateTxId('FIAT');

  // Total charged to buyer: artwork price + platform fee
  const feePercent = isResale ? SECONDARY_MARKET_FEE_PERCENT : PRIMARY_MARKET_FEE_PERCENT;
  const platformFee = Math.round(amount * feePercent / 100 * 100) / 100;
  const totalCharged = amount + platformFee;

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
            unit_amount: Math.round(totalCharged * 100),
            product_data: {
              name: wartId ? `Strangrz #${wartId}` : `${warpAmount} STZ (⬣)`,
              description: wartId
                ? `Strangrz purchase — ${amount} ${currency.toUpperCase()} + ${feePercent}% platform fee`
                : `Strangrz purchase — ${warpAmount} ⬣`,
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin || process.env.CORS_ORIGIN || 'https://strangrz.com'}/payment-success?tx=${txId}`,
        cancel_url: `${req.headers.origin || process.env.CORS_ORIGIN || 'https://strangrz.com'}/payment-cancel?tx=${txId}`,
        metadata: {
          strangrz_tx_id: txId,
          buyer_address: buyerAddress,
          seller_address: sellerAddress || '',
          warp_amount: warpAmount.toString(),
          wart_id: wartId || '',
          platform_fee_percent: feePercent.toString(),
          platform_fee_amount: platformFee.toString(),
          artwork_price: amount.toString(),
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
