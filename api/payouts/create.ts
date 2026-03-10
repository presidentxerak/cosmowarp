/**
 * Vercel Serverless Function — Create Payout
 * POST /api/payouts/create
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication: require a valid API key or signed request
  const authHeader = req.headers.authorization;
  const PAYOUT_SECRET = process.env.PAYOUT_SECRET_KEY;
  if (!PAYOUT_SECRET || authHeader !== `Bearer ${PAYOUT_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized: valid authentication required for payouts' });
  }

  const { warpAmount, currency, paymentMethod, sellerAddress } = req.body;

  if (!warpAmount || !currency || !sellerAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (typeof warpAmount !== 'number' || warpAmount <= 0 || !Number.isFinite(warpAmount)) {
    return res.status(400).json({ error: 'warpAmount must be a positive number' });
  }

  const rate = RATES[currency];
  if (!rate) return res.status(400).json({ error: `Unsupported currency: ${currency}` });

  const fiatAmount = Math.round(warpAmount / rate * 100) / 100;
  const fees = calculateFees(fiatAmount, paymentMethod || 'bank_transfer');
  const txId = `PAYOUT_${Date.now().toString(36)}_${(++txCounter).toString(36)}`;

  // Stripe Connect transfer
  if (STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

      const transfer = await stripe.transfers.create({
        amount: Math.round((fiatAmount - fees.total) * 100),
        currency: currency.toLowerCase(),
        destination: sellerAddress,
        metadata: { cosmorare_tx_id: txId },
      });

      return res.json({
        txId,
        payoutId: transfer.id,
        fiatAmount,
        sellerReceives: fiatAmount - fees.total,
        fees,
        status: 'completed',
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Payout failed',
        txId,
      });
    }
  }

  // Local settlement (dev mode)
  return res.json({
    txId,
    payoutId: `LOCAL_${txId}`,
    fiatAmount,
    sellerReceives: fiatAmount - fees.total,
    fees,
    status: 'completed',
    mode: 'local-settlement',
  });
}
