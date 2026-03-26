import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotifPreferences, setNotifPreferences, toggleNotifType,
  filterByPreferences, groupNotifications, getDeepLink, getUnreadCount,
} from './notifications';
import type { Notification } from '../lib/supabase-db';

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: Math.floor(Math.random() * 100000),
    recipient: 'STZ_me',
    sender: 'STZ_other',
    notif_type: 'like',
    title: 'New like',
    body: 'Someone liked your artwork',
    ref_id: 'wart_1',
    read: false,
    created_at: Date.now(),
    ...overrides,
  };
}

describe('Enhanced Notifications', () => {
  beforeEach(() => localStorage.clear());

  describe('Preferences', () => {
    it('returns default preferences', () => {
      const prefs = getNotifPreferences();
      expect(prefs.sound).toBe(true);
      expect(prefs.enabled.like).toBe(true);
      expect(prefs.enabled.follow).toBe(true);
      expect(prefs.emailFrequency).toBe('never');
    });

    it('saves and loads preferences', () => {
      setNotifPreferences({ sound: false });
      expect(getNotifPreferences().sound).toBe(false);
      // Other defaults preserved
      expect(getNotifPreferences().enabled.like).toBe(true);
    });

    it('toggles individual notification types', () => {
      toggleNotifType('like', false);
      expect(getNotifPreferences().enabled.like).toBe(false);
      toggleNotifType('like', true);
      expect(getNotifPreferences().enabled.like).toBe(true);
    });
  });

  describe('Filtering', () => {
    it('filters out disabled types', () => {
      toggleNotifType('like', false);
      const notifs = [
        makeNotif({ notif_type: 'like' }),
        makeNotif({ notif_type: 'follow' }),
        makeNotif({ notif_type: 'sale' }),
      ];
      const filtered = filterByPreferences(notifs);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(n => n.notif_type !== 'like')).toBe(true);
    });
  });

  describe('Grouping', () => {
    it('groups notifications by type + ref_id', () => {
      const notifs = [
        makeNotif({ notif_type: 'like', ref_id: 'wart_1', sender: 'STZ_a' }),
        makeNotif({ notif_type: 'like', ref_id: 'wart_1', sender: 'STZ_b' }),
        makeNotif({ notif_type: 'like', ref_id: 'wart_1', sender: 'STZ_c' }),
        makeNotif({ notif_type: 'sale', ref_id: 'wart_2' }),
      ];
      const grouped = groupNotifications(notifs);
      expect(grouped).toHaveLength(2);
      const likeGroup = grouped.find(g => g.type === 'like')!;
      expect(likeGroup.count).toBe(3);
      expect(likeGroup.title).toContain('3 people liked');
    });

    it('does not group single notifications', () => {
      const notifs = [makeNotif({ notif_type: 'sale', title: 'Sold!' })];
      const grouped = groupNotifications(notifs);
      expect(grouped).toHaveLength(1);
      expect(grouped[0].title).toBe('Sold!');
      expect(grouped[0].count).toBe(1);
    });
  });

  describe('Deep Links', () => {
    it('generates correct deep links', () => {
      expect(getDeepLink('follow', 'STZ_user')).toContain('/user-profile');
      expect(getDeepLink('sale', 'wart_1')).toContain('/gallery');
      expect(getDeepLink('bid', 'auc_1')).toContain('/gallery');
      expect(getDeepLink('transfer', null)).toBe('/wallet');
      expect(getDeepLink('level_up', null)).toBe('/profile');
      expect(getDeepLink('message', null)).toBe('/messages');
    });
  });

  describe('Unread Count', () => {
    it('counts unread notifications', () => {
      // Ensure all types enabled (clean state)
      localStorage.clear();
      const notifs = [
        makeNotif({ read: false, notif_type: 'sale' }),
        makeNotif({ read: false, notif_type: 'follow' }),
        makeNotif({ read: true, notif_type: 'sale' }),
      ];
      expect(getUnreadCount(notifs)).toBe(2);
    });

    it('respects preferences filter', () => {
      toggleNotifType('like', false);
      const notifs = [
        makeNotif({ notif_type: 'like', read: false }),
        makeNotif({ notif_type: 'follow', read: false }),
      ];
      expect(getUnreadCount(notifs)).toBe(1);
    });
  });
});
