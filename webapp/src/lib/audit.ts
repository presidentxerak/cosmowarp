/**
 * Admin Audit Logger — tracks all admin actions to Supabase
 *
 * All admin operations (unlock registry, creator tokens, delete wart, etc.)
 * are logged to the admin_audit_log table for compliance and debugging.
 *
 * Falls back to localStorage when Supabase is not available.
 */

import { isBackendAvailable, supabase } from './supabase';

export interface AuditEntry {
  action: string;
  actor_address: string;
  target_address?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  created_at?: number;
}

const LOCAL_AUDIT_KEY = 'strangrz_admin_audit';
const MAX_LOCAL_ENTRIES = 500;

/**
 * Log an admin action. Writes to Supabase if available, localStorage as fallback.
 */
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  const record = {
    ...entry,
    created_at: entry.created_at || Date.now(),
  };

  // Try Supabase first
  if (isBackendAvailable()) {
    try {
      if (supabase) {
        await supabase.from('admin_audit_log').insert(record);
        return;
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    const entries: AuditEntry[] = raw ? JSON.parse(raw) : [];
    entries.unshift(record);
    // Keep only the most recent entries
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL_ENTRIES)));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

/**
 * Fetch audit log entries (most recent first).
 */
export async function fetchAuditLog(limit = 100): Promise<AuditEntry[]> {
  if (isBackendAvailable()) {
    try {
      if (supabase) {
        const { data } = await supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (data) return data as AuditEntry[];
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback: localStorage
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]).slice(0, limit) : [];
  } catch {
    return [];
  }
}
