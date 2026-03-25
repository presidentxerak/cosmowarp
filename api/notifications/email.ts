/**
 * Vercel Serverless Function — Send Email Notification
 * POST /api/notifications/email
 *
 * Sends transactional emails for sale notifications, new followers, etc.
 * Integrates with Resend (https://resend.com) — free tier: 3000 emails/month.
 *
 * Environment variables:
 *   - RESEND_API_KEY: Resend API key
 *   - EMAIL_FROM: Sender address (e.g. "Strangrz <noreply@strangrz.com>")
 *
 * Request body:
 *   - to: recipient email
 *   - type: 'sale' | 'follow' | 'digest'
 *   - data: { title, body, actionUrl, ... }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimitAsync, getClientIp } from '../_shared/rate-limit';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Strangrz <noreply@strangrz.com>';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://strangrz.com';

type EmailType = 'sale' | 'follow' | 'comment' | 'digest';

interface EmailData {
  title: string;
  body: string;
  actionUrl?: string;
  recipientName?: string;
}

function buildHtml(type: EmailType, data: EmailData): string {
  const actionButton = data.actionUrl
    ? `<a href="${data.actionUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;margin-top:16px;">View on Strangrz</a>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;color:#ccc;padding:32px;margin:0;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:24px;color:#fff;">&#x2B21;</span>
      <span style="font-size:18px;color:#fff;margin-left:8px;font-weight:bold;">Strangrz</span>
    </div>
    <div style="background:#111;border:1px solid rgba(255,255,255,0.1);padding:24px;">
      ${data.recipientName ? `<p style="color:#888;font-size:13px;">Hi ${data.recipientName},</p>` : ''}
      <h2 style="color:#fff;font-size:18px;margin:0 0 12px;">${data.title}</h2>
      <p style="color:#aaa;font-size:14px;line-height:1.6;">${data.body}</p>
      ${actionButton}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#555;font-size:11px;">
        You received this email because you enabled notifications on Strangrz.
        <a href="${CORS_ORIGIN}/settings" style="color:#666;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildSubject(type: EmailType, data: EmailData): string {
  switch (type) {
    case 'sale': return `Your artwork was sold! — ${data.title}`;
    case 'follow': return `New follower on Strangrz`;
    case 'comment': return `New comment on ${data.title}`;
    case 'digest': return `Your weekly Strangrz digest`;
    default: return data.title;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 20 emails per minute per IP
  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>);
  const limit = await checkRateLimitAsync(`email:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: limit.retryAfter });
  }

  if (!RESEND_API_KEY) {
    return res.status(501).json({ error: 'Email not configured: missing RESEND_API_KEY' });
  }

  const { to, type, data } = req.body as { to?: string; type?: EmailType; data?: EmailData };

  if (!to || !type || !data) {
    return res.status(400).json({ error: 'Missing required fields: to, type, data' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: buildSubject(type, data),
        html: buildHtml(type, data),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: 'Email send failed', details: err });
    }

    const result = await response.json();
    return res.json({ success: true, emailId: (result as { id?: string }).id });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Email send failed',
    });
  }
}
