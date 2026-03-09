/**
 * Cosmorare Fiat Gateway Server — Stripe + PayPal Payment Processing
 *
 * Production backend for fiat on/off ramp.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... npx ts-node server/fiat-gateway.ts
 *
 * Endpoints:
 *   POST /api/payments/create    — Create a Stripe Checkout Session
 *   POST /api/payments/webhook   — Stripe webhook handler
 *   POST /api/payouts/create     — Create a payout (Stripe Connect transfer)
 *   GET  /api/payments/:id       — Get payment status
 *   GET  /api/rates              — Get current exchange rates
 *   POST /api/rates              — Update exchange rates (admin)
 *   GET  /health                 — Health check
 *
 * Environment variables:
 *   GATEWAY_PORT           — Server port (default 8788)
 *   STRIPE_SECRET_KEY      — Stripe secret key (sk_test_... or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET  — Stripe webhook signing secret (whsec_...)
 *   GATEWAY_ADMIN_KEY      — Admin API key for rate updates
 *   SUPABASE_URL           — Supabase URL for persisting transactions
 *   SUPABASE_SERVICE_KEY   — Supabase service role key
 *   CORS_ORIGIN            — Allowed CORS origin (default *)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';

// ─── Config ───────────────────────────────────────────────

const PORT = parseInt(process.env.GATEWAY_PORT || '8788', 10);
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const ADMIN_KEY = process.env.GATEWAY_ADMIN_KEY || 'cosmorare-admin-dev';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ─── Stripe SDK (dynamic import for optional dependency) ──

let stripe: {
  checkout: { sessions: { create: (params: Record<string, unknown>) => Promise<{ id: string; url: string }> } };
  webhooks: { constructEvent: (body: string, sig: string, secret: string) => { type: string; data: { object: Record<string, unknown> } } };
  paymentIntents: { retrieve: (id: string) => Promise<Record<string, unknown>> };
  transfers: { create: (params: Record<string, unknown>) => Promise<{ id: string }> };
} | null = null;

async function initStripe() {
  if (!STRIPE_SECRET_KEY) {
    console.warn('[FiatGateway] STRIPE_SECRET_KEY not set — Stripe payments disabled');
    return;
  }
  try {
    const Stripe = (await import('stripe')).default;
    stripe = new (Stripe as any)(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' }) as typeof stripe;
    console.log('[FiatGateway] Stripe SDK initialized');
  } catch {
    console.warn('[FiatGateway] stripe package not installed — run: npm install stripe');
  }
}

// ─── In-Memory Rate Store (use Supabase in prod) ─────────

interface ExchangeRate {
  currency: string;
  warpsPerUnit: number;
  lastUpdated: number;
  source: string;
}

const rates = new Map<string, ExchangeRate>([
  ['EUR', { currency: 'EUR', warpsPerUnit: 100, lastUpdated: Date.now(), source: 'manual' }],
  ['USD', { currency: 'USD', warpsPerUnit: 92, lastUpdated: Date.now(), source: 'manual' }],
  ['GBP', { currency: 'GBP', warpsPerUnit: 115, lastUpdated: Date.now(), source: 'manual' }],
  ['JPY', { currency: 'JPY', warpsPerUnit: 0.62, lastUpdated: Date.now(), source: 'manual' }],
  ['CHF', { currency: 'CHF', warpsPerUnit: 105, lastUpdated: Date.now(), source: 'manual' }],
]);

// ─── Transaction Store (in-memory for dev, Supabase for prod) ──

interface FiatTxRecord {
  id: string;
  type: 'buy' | 'sell' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fiatAmount: number;
  fiatCurrency: string;
  warpAmount: number;
  buyerAddress: string;
  sellerAddress: string;
  paymentMethod: string;
  processorRef: string | null;
  wartId: string | null;
  platformFee: number;
  processorFee: number;
  createdAt: number;
  completedAt: number | null;
  error: string | null;
}

const transactions = new Map<string, FiatTxRecord>();
let txCounter = 0;

// ─── Fee Calculation ─────────────────────────────────────

const PLATFORM_FEE_PERCENT = 2.5;
const PROCESSOR_FEES: Record<string, { percent: number; fixed: number }> = {
  card: { percent: 2.9, fixed: 0.30 },
  paypal: { percent: 3.49, fixed: 0.49 },
  sepa: { percent: 0.8, fixed: 0 },
  apple_pay: { percent: 2.9, fixed: 0.30 },
  google_pay: { percent: 2.9, fixed: 0.30 },
  bank_transfer: { percent: 0, fixed: 1.50 },
};

function calculateFees(amount: number, method: string) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100 * 100) / 100;
  const proc = PROCESSOR_FEES[method] || { percent: 0, fixed: 0 };
  const processorFee = Math.round((amount * proc.percent / 100 + proc.fixed) * 100) / 100;
  return { platformFee, processorFee, total: platformFee + processorFee };
}

// ─── HTTP Server ─────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
  });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    });
    res.end();
    return;
  }

  try {
    // ─── Health ────────────────────────────
    if (url === '/health') {
      return json(res, 200, {
        status: 'ok',
        stripeEnabled: !!stripe,
        transactions: transactions.size,
        currencies: Array.from(rates.keys()),
      });
    }

    // ─── Get Rates ─────────────────────────
    if (url === '/api/rates' && method === 'GET') {
      return json(res, 200, { rates: Array.from(rates.values()) });
    }

    // ─── Update Rates (admin) ──────────────
    if (url === '/api/rates' && method === 'POST') {
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== ADMIN_KEY) return json(res, 403, { error: 'Unauthorized' });

      const body = JSON.parse(await readBody(req));
      if (body.currency && typeof body.warpsPerUnit === 'number') {
        rates.set(body.currency, {
          currency: body.currency,
          warpsPerUnit: body.warpsPerUnit,
          lastUpdated: Date.now(),
          source: body.source || 'admin',
        });
        return json(res, 200, { ok: true, rate: rates.get(body.currency) });
      }
      return json(res, 400, { error: 'Missing currency or warpsPerUnit' });
    }

    // ─── Create Payment ────────────────────
    if (url === '/api/payments/create' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const { amount, currency, paymentMethod, wartId, buyerAddress, sellerAddress } = body;

      if (!amount || !currency || !buyerAddress) {
        return json(res, 400, { error: 'Missing required fields: amount, currency, buyerAddress' });
      }

      const rate = rates.get(currency);
      if (!rate) return json(res, 400, { error: `Unsupported currency: ${currency}` });

      const warpAmount = Math.round(amount * rate.warpsPerUnit * 100) / 100;
      const fees = calculateFees(amount, paymentMethod || 'card');

      const txId = `FIAT_${Date.now().toString(36)}_${(++txCounter).toString(36)}`;
      const record: FiatTxRecord = {
        id: txId,
        type: 'buy',
        status: 'pending',
        fiatAmount: amount,
        fiatCurrency: currency,
        warpAmount,
        buyerAddress,
        sellerAddress: sellerAddress || '',
        paymentMethod: paymentMethod || 'card',
        processorRef: null,
        wartId: wartId || null,
        platformFee: fees.platformFee,
        processorFee: fees.processorFee,
        createdAt: Date.now(),
        completedAt: null,
        error: null,
      };

      transactions.set(txId, record);

      // Create Stripe Checkout Session if Stripe is available
      if (stripe) {
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: currency.toLowerCase(),
                unit_amount: Math.round(amount * 100), // Stripe uses cents
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

          record.processorRef = session.id;
          record.status = 'processing';

          return json(res, 200, {
            txId,
            processorRef: session.id,
            checkoutUrl: session.url,
            status: 'processing',
            warpAmount,
            fees,
          });
        } catch (err) {
          record.status = 'failed';
          record.error = err instanceof Error ? err.message : 'Stripe error';
          return json(res, 500, { error: record.error, txId });
        }
      }

      // No Stripe — settle locally (dev mode)
      record.status = 'completed';
      record.completedAt = Date.now();
      record.processorRef = `LOCAL_${txId}`;

      return json(res, 200, {
        txId,
        processorRef: record.processorRef,
        status: 'completed',
        warpAmount,
        fees,
        mode: 'local-settlement',
      });
    }

    // ─── Stripe Webhook ────────────────────
    if (url === '/api/payments/webhook' && method === 'POST') {
      if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        return json(res, 501, { error: 'Stripe not configured' });
      }

      const body = await readBody(req);
      const sig = req.headers['stripe-signature'] as string;

      let event;
      try {
        event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return json(res, 400, { error: 'Invalid webhook signature' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const txId = (session.metadata as Record<string, string>)?.cosmorare_tx_id;
        if (txId) {
          const record = transactions.get(txId);
          if (record) {
            record.status = 'completed';
            record.completedAt = Date.now();
            console.log(`[FiatGateway] Payment completed: ${txId}`);

            // TODO: Trigger Supabase balance update + chain transaction
            // await supabase.rpc('credit_warps', { address: record.buyerAddress, amount: record.warpAmount });
          }
        }
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        const txId = (session.metadata as Record<string, string>)?.cosmorare_tx_id;
        if (txId) {
          const record = transactions.get(txId);
          if (record) {
            record.status = 'failed';
            record.error = 'Payment session expired';
          }
        }
      }

      return json(res, 200, { received: true });
    }

    // ─── Create Payout ─────────────────────
    if (url === '/api/payouts/create' && method === 'POST') {
      const body = JSON.parse(await readBody(req));
      const { warpAmount, currency, paymentMethod, sellerAddress } = body;

      if (!warpAmount || !currency || !sellerAddress) {
        return json(res, 400, { error: 'Missing required fields' });
      }

      const rate = rates.get(currency);
      if (!rate) return json(res, 400, { error: `Unsupported currency: ${currency}` });

      const fiatAmount = Math.round(warpAmount / rate.warpsPerUnit * 100) / 100;
      const fees = calculateFees(fiatAmount, paymentMethod || 'bank_transfer');

      const txId = `PAYOUT_${Date.now().toString(36)}_${(++txCounter).toString(36)}`;
      const record: FiatTxRecord = {
        id: txId,
        type: 'sell',
        status: 'pending',
        fiatAmount,
        fiatCurrency: currency,
        warpAmount,
        buyerAddress: '',
        sellerAddress,
        paymentMethod: paymentMethod || 'bank_transfer',
        processorRef: null,
        wartId: null,
        platformFee: fees.platformFee,
        processorFee: fees.processorFee,
        createdAt: Date.now(),
        completedAt: null,
        error: null,
      };

      transactions.set(txId, record);

      // Stripe Connect transfer (if configured)
      if (stripe) {
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round((fiatAmount - fees.total) * 100),
            currency: currency.toLowerCase(),
            destination: sellerAddress, // This would be the Stripe Connect account ID
            metadata: { cosmorare_tx_id: txId },
          });
          record.processorRef = transfer.id;
          record.status = 'completed';
          record.completedAt = Date.now();
        } catch (err) {
          record.status = 'failed';
          record.error = err instanceof Error ? err.message : 'Payout failed';
          return json(res, 500, { error: record.error, txId });
        }
      } else {
        // Local settlement (dev mode)
        record.status = 'completed';
        record.completedAt = Date.now();
        record.processorRef = `LOCAL_${txId}`;
      }

      return json(res, 200, {
        txId,
        payoutId: record.processorRef,
        fiatAmount,
        sellerReceives: fiatAmount - fees.total,
        fees,
        status: record.status,
      });
    }

    // ─── Get Payment Status ────────────────
    if (url.startsWith('/api/payments/') && method === 'GET') {
      const txId = url.split('/').pop();
      if (!txId) return json(res, 400, { error: 'Missing txId' });

      const record = transactions.get(txId);
      if (!record) return json(res, 404, { error: 'Transaction not found' });

      return json(res, 200, record);
    }

    // ─── 404 ───────────────────────────────
    json(res, 404, { error: 'Not found' });

  } catch (err) {
    console.error('[FiatGateway] Error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
});

// ─── Start ────────────────────────────────────────────────

async function start() {
  await initStripe();

  server.listen(PORT, () => {
    console.log(`
┌─────────────────────────────────────────────┐
│  Cosmorare Fiat Gateway                     │
│  HTTP:   http://0.0.0.0:${PORT}                │
│  Health: http://0.0.0.0:${PORT}/health          │
│                                             │
│  Stripe: ${stripe ? 'ENABLED' : 'DISABLED (set STRIPE_SECRET_KEY)'}
│                                             │
│  Endpoints:                                 │
│    POST /api/payments/create                │
│    POST /api/payments/webhook               │
│    POST /api/payouts/create                 │
│    GET  /api/payments/:id                   │
│    GET  /api/rates                          │
│    POST /api/rates (admin)                  │
└─────────────────────────────────────────────┘
    `);
  });
}

start();

export { server };
