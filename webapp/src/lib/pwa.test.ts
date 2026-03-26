import { describe, it, expect, beforeEach } from 'vitest';
import {
  isInstallAvailable, queueSyncAction, getPendingSyncActions,
  clearSyncActions, isOnline,
} from './pwa';

describe('PWA Utilities', () => {
  beforeEach(() => localStorage.clear());

  describe('Install prompt', () => {
    it('starts as unavailable', () => {
      expect(isInstallAvailable()).toBe(false);
    });
  });

  describe('Background Sync Queue', () => {
    it('queues and retrieves actions', () => {
      queueSyncAction('like', { wartId: 'w1' });
      queueSyncAction('follow', { address: 'STZ_user' });
      const actions = getPendingSyncActions();
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('like');
      expect(actions[1].type).toBe('follow');
    });

    it('clears specific actions by ID', () => {
      queueSyncAction('like', { wartId: 'w1' });
      queueSyncAction('follow', { address: 'STZ_user' });
      const actions = getPendingSyncActions();
      clearSyncActions([actions[0].id]);
      expect(getPendingSyncActions()).toHaveLength(1);
      expect(getPendingSyncActions()[0].type).toBe('follow');
    });

    it('limits queue to 100 items', () => {
      for (let i = 0; i < 110; i++) {
        queueSyncAction('test', { i });
      }
      expect(getPendingSyncActions().length).toBeLessThanOrEqual(100);
    });
  });

  describe('Online detection', () => {
    it('reports online status', () => {
      // jsdom defaults to online
      expect(isOnline()).toBe(true);
    });
  });
});
