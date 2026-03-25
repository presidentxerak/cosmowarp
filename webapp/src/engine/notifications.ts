/**
 * Strangrz Enhanced Notifications — Preferences, grouping, deep links
 *
 * Extends the basic notification system with:
 * - Per-type enable/disable preferences
 * - Notification grouping (e.g. "5 people liked your wart")
 * - Mark all as read
 * - Deep link generation for navigation
 * - Sound toggle
 */

import { storage } from './storage';
import * as sync from '../lib/supabase-sync';
import type { Notification } from '../lib/supabase-db';

// ─── Types ────────────────────────────────────────────────

export type NotifType = 'follow' | 'buy' | 'sale' | 'comment' | 'level_up' | 'transfer' | 'like' | 'bid' | 'auction_end' | 'message';

export interface NotifPreferences {
  enabled: Record<NotifType, boolean>;
  sound: boolean;
  emailFrequency: 'instant' | 'daily' | 'weekly' | 'never';
}

export interface GroupedNotification {
  type: NotifType;
  title: string;
  body: string;
  count: number;
  latest: Notification;
  all: Notification[];
  deepLink: string;
}

// ─── Default Preferences ──────────────────────────────────

const PREFS_KEY = 'strangrz_notif_prefs';

const DEFAULT_PREFS: NotifPreferences = {
  enabled: {
    follow: true,
    buy: true,
    sale: true,
    comment: true,
    level_up: true,
    transfer: true,
    like: true,
    bid: true,
    auction_end: true,
    message: true,
  },
  sound: true,
  emailFrequency: 'never',
};

// ─── Preferences ──────────────────────────────────────────

export function getNotifPreferences(): NotifPreferences {
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const saved = JSON.parse(raw);
    // Merge with defaults to handle new types
    return {
      enabled: { ...DEFAULT_PREFS.enabled, ...saved.enabled },
      sound: saved.sound ?? DEFAULT_PREFS.sound,
      emailFrequency: saved.emailFrequency ?? DEFAULT_PREFS.emailFrequency,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setNotifPreferences(prefs: Partial<NotifPreferences>): NotifPreferences {
  const current = getNotifPreferences();
  const updated = {
    ...current,
    ...prefs,
    enabled: prefs.enabled ? { ...current.enabled, ...prefs.enabled } : current.enabled,
  };
  storage.setItem(PREFS_KEY, JSON.stringify(updated));
  return updated;
}

export function toggleNotifType(type: NotifType, enabled: boolean): NotifPreferences {
  const prefs = getNotifPreferences();
  prefs.enabled[type] = enabled;
  storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  return prefs;
}

// ─── Filtering ────────────────────────────────────────────

/** Filter notifications based on user preferences */
export function filterByPreferences(notifications: Notification[]): Notification[] {
  const prefs = getNotifPreferences();
  return notifications.filter(n => {
    const type = n.notif_type as NotifType;
    return prefs.enabled[type] !== false; // default to showing if type unknown
  });
}

// ─── Grouping ─────────────────────────────────────────────

/** Group similar notifications together */
export function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups = new Map<string, Notification[]>();

  for (const notif of notifications) {
    // Group by type + ref_id (e.g. all likes on the same wart)
    const key = notif.ref_id ? `${notif.notif_type}:${notif.ref_id}` : `${notif.notif_type}:${notif.id}`;
    const group = groups.get(key) || [];
    group.push(notif);
    groups.set(key, group);
  }

  const result: GroupedNotification[] = [];
  for (const [, notifs] of groups) {
    const sorted = notifs.sort((a, b) => b.created_at - a.created_at);
    const latest = sorted[0];
    const type = latest.notif_type as NotifType;

    let title: string;
    let body: string;

    if (sorted.length === 1) {
      title = latest.title;
      body = latest.body;
    } else {
      // Group summary
      const count = sorted.length;
      switch (type) {
        case 'like':
          title = `${count} people liked your artwork`;
          body = `${latest.sender ? latest.sender.slice(0, 10) : 'Someone'} and ${count - 1} others`;
          break;
        case 'comment':
          title = `${count} new comments`;
          body = `${latest.sender ? latest.sender.slice(0, 10) : 'Someone'} and ${count - 1} others commented`;
          break;
        case 'follow':
          title = `${count} new followers`;
          body = `${latest.sender ? latest.sender.slice(0, 10) : 'Someone'} and ${count - 1} others followed you`;
          break;
        case 'bid':
          title = `${count} new bids`;
          body = `Latest bid from ${latest.sender ? latest.sender.slice(0, 10) : 'someone'}`;
          break;
        default:
          title = `${count} ${type} notifications`;
          body = latest.body;
      }
    }

    result.push({
      type,
      title,
      body,
      count: sorted.length,
      latest,
      all: sorted,
      deepLink: getDeepLink(type, latest.ref_id),
    });
  }

  return result.sort((a, b) => b.latest.created_at - a.latest.created_at);
}

// ─── Deep Links ───────────────────────────────────────────

/** Generate a navigation path for a notification */
export function getDeepLink(type: NotifType, refId: string | null): string {
  switch (type) {
    case 'follow':
      return refId ? `/user-profile?address=${refId}` : '/discover';
    case 'buy':
    case 'sale':
    case 'like':
    case 'comment':
      return refId ? `/gallery?detail=${refId}` : '/gallery';
    case 'bid':
    case 'auction_end':
      return refId ? `/gallery?auction=${refId}` : '/gallery';
    case 'transfer':
      return '/wallet';
    case 'level_up':
      return '/profile';
    case 'message':
      return '/messages';
    default:
      return '/notifications';
  }
}

// ─── Mark All Read ────────────────────────────────────────

/** Mark all notifications as read for a user */
export async function markAllRead(_address: string, notifications: Notification[]): Promise<void> {
  const unread = notifications.filter(n => !n.read);
  await Promise.all(unread.map(n => sync.markNotifRead(n.id)));
}

// ─── Unread Badge Count ───────────────────────────────────

/** Get unread notification count (filtered by preferences) */
export function getUnreadCount(notifications: Notification[]): number {
  const filtered = filterByPreferences(notifications);
  return filtered.filter(n => !n.read).length;
}
