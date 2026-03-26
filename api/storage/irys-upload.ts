/**
 * Vercel Serverless Function — Irys/Arweave Upload
 * POST /api/storage/irys-upload
 *
 * Server-side upload to Arweave via Irys using the platform wallet.
 * Used when the platform pays for permanent storage (e.g. included in sale price).
 *
 * Request body (JSON):
 *   - data: base64 data URL (e.g. "data:image/png;base64,...")
 *   - wartId: associated wart ID for tagging
 *
 * Response (JSON):
 *   - txId: Arweave transaction ID
 *   - locator: "ar://<txId>"
 *   - gatewayUrl: full gateway URL
 *   - sizeBytes: uploaded size in bytes
 *
 * Environment variables required:
 *   - IRYS_PRIVATE_KEY: Ethereum private key for the platform wallet (hex, with or without 0x prefix)
 *   - IRYS_NETWORK: "mainnet" or "devnet" (default: "mainnet")
 *
 * @see https://docs.irys.xyz/onchain-storage/quickstart
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimitAsync, getClientIp } from '../_shared/rate-limit';

const IRYS_PRIVATE_KEY = process.env.IRYS_PRIVATE_KEY || '';
const IRYS_NETWORK = process.env.IRYS_NETWORK || 'mainnet';
const ARWEAVE_GATEWAY = process.env.VITE_ARWEAVE_GATEWAY_URL || 'https://arweave.net';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://strangrz.com';

/** Max upload size: 50 MB (matches Supabase limit) */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 10 uploads per minute per IP
  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const limit = await checkRateLimitAsync(`upload:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter: limit.retryAfter });
  }

  if (!IRYS_PRIVATE_KEY) {
    return res.status(500).json({ error: 'Irys not configured: missing IRYS_PRIVATE_KEY' });
  }

  try {
    const { data, wartId } = req.body as { data?: string; wartId?: string };

    if (!data) return res.status(400).json({ error: 'Missing "data" field' });
    if (!wartId) return res.status(400).json({ error: 'Missing "wartId" field' });

    // Convert data URL to buffer
    const { buffer, mimeType } = dataUrlToBuffer(data);

    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: `File too large: ${buffer.length} bytes (max ${MAX_UPLOAD_BYTES})` });
    }

    // Dynamic import of Irys SDK (server-side only)
    const { Uploader } = await import('@irys/upload');
    const { Ethereum } = await import('@irys/upload-ethereum');

    // Create uploader with platform wallet
    const irysUploader = await Uploader(Ethereum).withWallet(IRYS_PRIVATE_KEY);

    // Check price and balance
    const price = await irysUploader.getPrice(buffer.length);
    const balance = await irysUploader.getBalance();

    // Auto-fund if balance is insufficient (with 10% buffer)
    const priceWithBuffer = (BigInt(price.toString()) * 110n) / 100n;
    if (BigInt(balance.toString()) < priceWithBuffer) {
      const fundAmount = priceWithBuffer - BigInt(balance.toString());
      await irysUploader.fund(fundAmount);
    }

    // Upload with metadata tags
    const tags = [
      { name: 'App-Name', value: 'Strangrz' },
      { name: 'Content-Type', value: mimeType },
      { name: 'Wart-ID', value: wartId },
      { name: 'Network', value: IRYS_NETWORK },
      { name: 'Timestamp', value: new Date().toISOString() },
    ];

    const receipt = await irysUploader.upload(Buffer.from(buffer), { tags });

    const gatewayBase = ARWEAVE_GATEWAY.replace(/\/$/, '');

    return res.status(200).json({
      txId: receipt.id,
      locator: `ar://${receipt.id}`,
      gatewayUrl: `${gatewayBase}/${receipt.id}`,
      sizeBytes: buffer.length,
    });
  } catch (error) {
    console.error('[irys-upload] Upload failed:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/** Convert data URL or base64 string to Buffer + mime type */
function dataUrlToBuffer(data: string): { buffer: Uint8Array; mimeType: string } {
  if (data.startsWith('data:')) {
    const [header, b64] = data.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const binary = Buffer.from(b64, 'base64');
    return { buffer: new Uint8Array(binary), mimeType };
  }

  // Raw base64
  const binary = Buffer.from(data, 'base64');
  return { buffer: new Uint8Array(binary), mimeType: 'application/octet-stream' };
}
