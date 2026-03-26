/**
 * Strangrz — Supabase Realtime Subscriptions
 *
 * Subscribes to real-time changes on key tables so all connected
 * clients stay synchronized. Uses Supabase Realtime (Postgres changes).
 */

import { supabase, isBackendAvailable } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EventBatcher, HeartbeatMonitor, ConnectionTracker, getReconnectDelay } from './realtime-optimizer';

// ─── Event Types ─────────────────────────────────────────────

export type RealtimeEvent =
  | { type: 'wart_new'; payload: Record<string, unknown> }
  | { type: 'wart_update'; payload: Record<string, unknown> }
  | { type: 'wart_delete'; payload: { id: string } }
  | { type: 'transaction_new'; payload: Record<string, unknown> }
  | { type: 'comment_new'; payload: Record<string, unknown> }
  | { type: 'notification_new'; payload: Record<string, unknown> }
  | { type: 'follow_new'; payload: Record<string, unknown> }
  | { type: 'follow_delete'; payload: Record<string, unknown> }
  // Phase 2
  | { type: 'collection_new'; payload: Record<string, unknown> }
  | { type: 'collection_update'; payload: Record<string, unknown> }
  | { type: 'collection_delete'; payload: Record<string, unknown> }
  | { type: 'auction_update'; payload: Record<string, unknown> }
  | { type: 'bid_new'; payload: Record<string, unknown> }
  // Phase 3
  | { type: 'dm_new'; payload: Record<string, unknown> }
  | { type: 'profile_update'; payload: Record<string, unknown> };

type RealtimeListener = (event: RealtimeEvent) => void;

// ─── Manager ─────────────────────────────────────────────────

class RealtimeManager {
  private channels: RealtimeChannel[] = [];
  private listeners: Set<RealtimeListener> = new Set();
  private started = false;
  private reconnectAttempts = 0;

  /** Event batcher — debounces rapid-fire events to reduce re-renders */
  private batcher = new EventBatcher<RealtimeEvent>((batch) => {
    for (const event of batch) this.emitDirect(event);
  }, 150, 20);

  /** Heartbeat monitor — detects degraded connections */
  private heartbeat = new HeartbeatMonitor(() => {
    this.tracker.setHealth('degraded');
  });

  /** Connection health tracker */
  readonly tracker = new ConnectionTracker();

  /** Register a listener for all realtime events */
  subscribe(fn: RealtimeListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emitDirect(event: RealtimeEvent) {
    this.tracker.recordEvent();
    this.heartbeat.receivePong();
    this.listeners.forEach(fn => {
      try { fn(event); } catch { /* listener error */ }
    });
  }

  private emit(event: RealtimeEvent) {
    this.batcher.add(event);
  }

  /** Start all realtime channels */
  start() {
    if (this.started || !isBackendAvailable() || !supabase) return;
    this.started = true;
    this.tracker.setHealth('connected');
    this.heartbeat.start();
    this.reconnectAttempts = 0;

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

    // ─── Collections channel (Phase 2) ─────────────────
    const collectionsChannel = supabase
      .channel('collections-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'collections' },
        (payload) => this.emit({ type: 'collection_new', payload: payload.new as Record<string, unknown> }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'collections' },
        (payload) => this.emit({ type: 'collection_update', payload: payload.new as Record<string, unknown> }),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'collections' },
        (payload) => this.emit({ type: 'collection_delete', payload: payload.old as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(collectionsChannel);

    // ─── Auctions channel (Phase 2) ────────────────────
    const auctionsChannel = supabase
      .channel('auctions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload) => this.emit({ type: 'auction_update', payload: (payload.new || payload.old) as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(auctionsChannel);

    // ─── Bids channel (Phase 2) ─────────────────────────
    const bidsChannel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => this.emit({ type: 'bid_new', payload: payload.new as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(bidsChannel);

    // ─── DM threads channel (Phase 3) ───────────────────
    const dmsChannel = supabase
      .channel('dms-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_dms' },
        (payload) => this.emit({ type: 'dm_new', payload: (payload.new || payload.old) as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(dmsChannel);

    // ─── Profile updates channel (Phase 3 — verification) ─
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => this.emit({ type: 'profile_update', payload: payload.new as Record<string, unknown> }),
      )
      .subscribe();

    this.channels.push(profilesChannel);
  }

  /** Stop all realtime channels */
  stop() {
    this.batcher.clear();
    this.heartbeat.stop();
    this.tracker.setHealth('disconnected');
    for (const ch of this.channels) {
      supabase?.removeChannel(ch);
    }
    this.channels = [];
    this.started = false;
  }

  /** Restart with exponential backoff */
  restart() {
    this.stop();
    this.reconnectAttempts++;
    this.tracker.recordReconnectAttempt();
    const delay = getReconnectDelay(this.reconnectAttempts);
    setTimeout(() => this.start(), delay);
  }
}

/** Singleton realtime manager */
export const realtime = new RealtimeManager();
