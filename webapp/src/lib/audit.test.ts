import { describe, it, expect, beforeEach } from 'vitest';
import { logAdminAction, fetchAuditLog } from './audit';

describe('Admin Audit Logger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logs an action to localStorage (no Supabase)', async () => {
    await logAdminAction({
      action: 'unlock_registry',
      actor_address: 'STZ_admin_test123',
      details: { reason: 'test' },
    });

    const log = await fetchAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe('unlock_registry');
    expect(log[0].actor_address).toBe('STZ_admin_test123');
    expect(log[0].details).toEqual({ reason: 'test' });
    expect(log[0].created_at).toBeGreaterThan(0);
  });

  it('stores multiple entries in order (most recent first)', async () => {
    await logAdminAction({ action: 'action_1', actor_address: 'admin1' });
    await logAdminAction({ action: 'action_2', actor_address: 'admin1' });
    await logAdminAction({ action: 'action_3', actor_address: 'admin1' });

    const log = await fetchAuditLog();
    expect(log).toHaveLength(3);
    expect(log[0].action).toBe('action_3'); // most recent
    expect(log[2].action).toBe('action_1'); // oldest
  });

  it('limits local entries to 500', async () => {
    for (let i = 0; i < 510; i++) {
      await logAdminAction({ action: `action_${i}`, actor_address: 'admin1' });
    }
    const log = await fetchAuditLog(600);
    expect(log.length).toBeLessThanOrEqual(500);
  });

  it('respects limit parameter', async () => {
    for (let i = 0; i < 10; i++) {
      await logAdminAction({ action: `action_${i}`, actor_address: 'admin1' });
    }
    const log = await fetchAuditLog(3);
    expect(log).toHaveLength(3);
  });

  it('returns empty array when no entries', async () => {
    const log = await fetchAuditLog();
    expect(log).toEqual([]);
  });
});
