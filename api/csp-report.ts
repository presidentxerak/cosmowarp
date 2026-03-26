/**
 * Vercel Serverless Function — CSP Violation Report Collector
 * POST /api/csp-report
 *
 * Collects Content Security Policy violation reports for monitoring.
 * Reports are logged to console (and Supabase if configured).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CSP reports use POST
  if (req.method !== 'POST') return res.status(204).end();

  try {
    const report = req.body?.['csp-report'] || req.body;
    if (report) {
      console.warn('[CSP Violation]', JSON.stringify({
        blockedURI: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        documentURI: report['document-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        timestamp: new Date().toISOString(),
      }));
    }
  } catch {
    // Malformed report — ignore
  }

  return res.status(204).end();
}
