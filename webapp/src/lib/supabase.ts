/**
 * Strangrz — Supabase Client Configuration
 *
 * Initializes the Supabase client for database, storage, and realtime.
 * Uses environment variables set in .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Strangrz] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Backend sync is disabled — running in offline mode.'
  );
}

/** Singleton Supabase client — null if credentials are missing */
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: { eventsPerSecond: 10 },
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: { 'x-strangrz-client': 'webapp/2.0' },
          // Inject wallet address header for RLS ownership checks
          fetch: (url, options = {}) => {
            const headers = new Headers(options.headers);
            if (_currentAddress) {
              headers.set('x-strangrz-address', _currentAddress);
            }
            return fetch(url, { ...options, headers });
          },
        },
      })
    : null;

/** Returns true if Supabase backend is configured and available */
export function isBackendAvailable(): boolean {
  return supabase !== null;
}

/**
 * Set the wallet address header for RLS ownership checks.
 * Must be called after wallet is loaded/unlocked.
 */
let _currentAddress = '';
export function setSupabaseAddress(address: string): void {
  _currentAddress = address;
}
export function getSupabaseAddress(): string {
  return _currentAddress;
}

/** Supabase Storage bucket names */
export const BUCKETS = {
  MEDIA: 'media',
  AVATARS: 'avatars',
} as const;

/** Get public URL for a storage object */
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
