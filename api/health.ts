/**
 * Vercel Serverless Function — Health Check
 * GET /api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    status: 'ok',
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    timestamp: Date.now(),
  });
}
