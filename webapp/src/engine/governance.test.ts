import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GovernanceEngine } from './governance';

describe('GovernanceEngine', () => {
  beforeEach(() => localStorage.clear());

  it('creates a proposal', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Reduce fees', 'Lower to 8%', 'parameter_change', 1_000_000);
    expect(p.id).toMatch(/^PROP_/);
    expect(p.status).toBe('active');
    expect(p.quorum).toBe(100_000); // 10% of 1M
  });

  it('votes correctly', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    expect(engine.vote(p.id, 'STZ_bob', 'for', 50).success).toBe(true);
    expect(engine.vote(p.id, 'STZ_carol', 'against', 30).success).toBe(true);
    const updated = engine.get(p.id)!;
    expect(updated.votesFor).toBe(50);
    expect(updated.votesAgainst).toBe(30);
    expect(updated.voterCount).toBe(2);
  });

  it('prevents double voting', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    engine.vote(p.id, 'STZ_bob', 'for', 10);
    expect(engine.vote(p.id, 'STZ_bob', 'against', 10).success).toBe(false);
  });

  it('prevents creator from voting on own proposal', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    expect(engine.vote(p.id, 'STZ_alice', 'for', 100).success).toBe(false);
  });

  it('passes proposal when votes exceed quorum and for > against', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    engine.vote(p.id, 'STZ_b', 'for', 8);
    engine.vote(p.id, 'STZ_c', 'for', 5);
    // Fast-forward past deadline
    vi.setSystemTime(p.deadline + 1000);
    const updated = engine.get(p.id)!;
    expect(updated.status).toBe('passed');
    vi.useRealTimers();
  });

  it('rejects proposal when against > for', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    engine.vote(p.id, 'STZ_b', 'for', 3);
    engine.vote(p.id, 'STZ_c', 'against', 10);
    vi.setSystemTime(p.deadline + 1000);
    expect(engine.get(p.id)!.status).toBe('rejected');
    vi.useRealTimers();
  });

  it('expires proposal when quorum not met', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 1000);
    engine.vote(p.id, 'STZ_b', 'for', 5); // 5 < 100 quorum
    vi.setSystemTime(p.deadline + 1000);
    expect(engine.get(p.id)!.status).toBe('expired');
    vi.useRealTimers();
  });

  it('settles passed proposal after execution delay', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    engine.vote(p.id, 'STZ_b', 'for', 20);
    vi.setSystemTime(p.deadline + 1000);
    engine.get(p.id); // trigger status update
    // Not yet executable (within delay)
    expect(engine.settle(p.id).success).toBe(false);
    // Fast-forward past execution delay
    vi.setSystemTime(p.deadline + p.executionDelay + 1000);
    expect(engine.settle(p.id).success).toBe(true);
    expect(engine.get(p.id)!.status).toBe('executed');
    vi.useRealTimers();
  });

  it('persists across loads', () => {
    const e1 = GovernanceEngine.load();
    e1.createProposal('STZ_alice', 'Persistent', 'Desc', 'community', 100);
    const e2 = GovernanceEngine.load();
    expect(e2.getAll()).toHaveLength(1);
  });

  it('hasVoted checks correctly', () => {
    const engine = GovernanceEngine.load();
    const p = engine.createProposal('STZ_alice', 'Test', 'Desc', 'community', 100);
    expect(engine.hasVoted(p.id, 'STZ_bob')).toBe(false);
    engine.vote(p.id, 'STZ_bob', 'for', 10);
    expect(engine.hasVoted(p.id, 'STZ_bob')).toBe(true);
  });
});
