/**
 * Strangrz — Supabase Realtime Subscriptions
 *
 * Subscribes to real-time changes on key tables so all connected
 * clients stay synchronized. Uses Supabase Realtime (Postgres changes).
 */

import { supabase, isBackendAvailable } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Event Types ─────────────────────────────────────────────

export type RealtimeEvent =
  | { type: 'wart_new'; payload: Record<string, unknown> }
  | { type: 'wart_update'; payload: Record<string, unknown> }
  | { type: 'wart_delete'; payload: { id: string } }
  | { type: 'transaction_new'; payload: Record<string, unknown> }
  | { type: 'comment_new'; payload: Record<string, unknown> }
  | { type: 'notification_new'; payload: Record<string, unknown> }
  | { type: 'follow_new'; payload: Record<string, unknown> }
  | { type: 'follow_delete'; payload: Record<string, unknown> };

type RealtimeListener = (event: RealtimeEvent) => void;

// ─── Manager ─────────────────────────────────────────────────

class RealtimeManager {
  private channels: RealtimeChannel[] = [];
  private listeners: Set<RealtimeListener> = new Set();
  private started = false;

  /** Register a listener for all realtime events */
  subscribe(fn: RealtimeListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(event: RealtimeEvent) {
    this.listeners.forEach(fn => {
      try { fn(event); } catch { /* listener error */ }
    });
  }

  /** Start all realtime channels */
  start() {
    if (this.started || !isBackendAvailable() || !supabase) return;
    this.started = true;

    // ─── Warts channel ──────────────────────────────────
    const wartsChannel = supabase
      .channel('warts-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'warts' },
        (payload) => this.emit({ type: 'wart_new', payload: payload.new as Record<string, unknown> }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'warts' },
        (payload) => this.emit({ type: 'wart_update', payload: payload.new as Record<string, unknown> }),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'warts' },
        (payload) => this.emit({ type: 'wart_delete', payload: { id: (payload.old as Record<string, unknown>).id as string } }),
      )
      .subscribe();

    this.channels.push(wartsChannel);

    // ─── Transactions channel ───────────────────────────
    const txChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => this.emit({ type: 'transaction_new', payload: payload.new as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(txChannel);

    // ─── Comments channel ───────────────────────────────
    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wart_comments' },
        (payload) => this.emit({ type: 'comment_new', payload: payload.new as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(commentsChannel);

    // ─── Notifications channel ──────────────────────────
    const notifsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => this.emit({ type: 'notification_new', payload: payload.new as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(notifsChannel);

    // ─── Social follows channel ─────────────────────────
    const followsChannel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_follows' },
        (payload) => this.emit({ type: 'follow_new', payload: payload.new as Record<string, unknown> }),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'social_follows' },
        (payload) => this.emit({ type: 'follow_delete', payload: payload.old as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(followsChannel);
  }

  /** Stop all realtime channels */
  stop() {
    for (const ch of this.channels) {
      supabase?.removeChannel(ch);
    }
    this.channels = [];
    this.started = false;
  }

  /** Restart (e.g., after reconnect) */
  restart() {
    this.stop();
    this.start();
  }
}

/** Singleton realtime manager */
export const realtime = new RealtimeManager();
