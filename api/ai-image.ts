/**
 * Vercel Serverless Function — AI Image Generation Proxy
 * GET /api/ai-image?prompt=...&width=1024&height=1024
 *
 * Fetches from Pollinations.ai server-side to avoid CSP/CORS issues.
 * Returns the image as base64 data URL.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROVIDERS = [
  (prompt: string, w: number, h: number, seed: number) =>
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`,
  (prompt: string, w: number, h: number, seed: number) =>
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux`,
];

async function fetchWithTimeout(url: string, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const prompt = typeof req.query.prompt === 'string' ? req.query.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt parameter' });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: 'Prompt too long (max 1000 chars)' });
  }

  const width = Math.min(Number(req.query.width) || 1024, 1024);
  const height = Math.min(Number(req.query.height) || 1024, 1024);
  const seed = Date.now();

  for (const buildUrl of PROVIDERS) {
    const url = buildUrl(prompt, width, height, seed);
    try {
      const resp = await fetchWithTimeout(url);
      if (!resp.ok) continue;

      const contentType = resp.headers.get('content-type') || 'image/png';
      if (!contentType.startsWith('image/')) continue;

      const buffer = Buffer.from(await resp.arrayBuffer());
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ imageData: base64 });
    } catch {
      // Try next provider
      continue;
    }
  }

  return res.status(502).json({ error: 'All image generation providers failed. Please try again.' });
}
