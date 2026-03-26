/**
 * Sentry Error Reporting — initialization module
 *
 * Set VITE_SENTRY_DSN in environment to enable.
 * In development (import.meta.env.DEV), Sentry is disabled by default.
 */

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry(): void {
  if (!DSN) {
    if (import.meta.env.DEV) {
      console.info('[Sentry] No DSN configured — error reporting disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.DEV ? 'development' : 'production',
    release: `strangrz@${import.meta.env.VITE_APP_VERSION || '3.0.0'}`,

    // Performance: sample 10% of transactions in production
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,

    // Only send errors in production unless explicitly enabled in dev
    enabled: !import.meta.env.DEV || !!import.meta.env.VITE_SENTRY_FORCE_DEV,

    // Filter out known non-actionable errors
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || '';
      // Chunk load errors are handled by lazyRetry in App.tsx
      if (message.includes('Loading chunk') || message.includes('Failed to fetch dynamically imported module')) {
        return null;
      }
      return event;
    },

    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });
}

/** Re-export Sentry for use in error boundaries */
export { Sentry };
