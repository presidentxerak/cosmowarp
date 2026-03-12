/**
 * Vercel Serverless Function — AI Image Generation Proxy
 * GET /api/ai-image?prompt=...&width=1024&height=1024
 *
 * Provider chain:
 *   1. Together.ai FLUX Schnell (free, needs TOGETHER_API_KEY)
 *   2. Pollinations.ai (free, no key)
 *
 * Returns { imageData: "data:image/...;base64,..." }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Provider 1: Together.ai FLUX Schnell (free tier, high quality) ───
async function tryTogetherAi(prompt: string, width: number, height: number): Promise<string | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetchWithTimeout('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width,
        height,
        steps: 4,
        n: 1,
        response_format: 'b64_json',
      }),
    }, 60000);

    if (!resp.ok) return null;

    const json = await resp.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return null;

    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

// ─── Provider 2: Pollinations.ai (free, no key needed) ───
async function tryPollinations(prompt: string, width: number, height: number): Promise<string | null> {
  const seed = Date.now();
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

  try {
    const resp = await fetchWithTimeout(url, undefined, 60000);
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await resp.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

// ─── Handler ───
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

  // Try providers in order
  const providers = [tryTogetherAi, tryPollinations];
  for (const provider of providers) {
    const result = await provider(prompt, width, height);
    if (result) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ imageData: result });
    }
  }

  return res.status(502).json({ error: 'All image generation providers failed. Please try again.' });
}
