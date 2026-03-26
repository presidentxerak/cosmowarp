import { describe, it, expect, beforeEach } from 'vitest';
import { DisputeEngine } from './disputes';

describe('DisputeEngine', () => {
  beforeEach(() => localStorage.clear());

  it('reports a wart', () => {
    const engine = DisputeEngine.load();
    const d = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Stolen artwork');
    expect(d.id).toMatch(/^DISP_/);
    expect(d.status).toBe('pending_review');
    expect(d.reason).toBe('copyright');
  });

  it('prevents duplicate reports from same user', () => {
    const engine = DisputeEngine.load();
    const d1 = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Evidence');
    const d2 = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'More evidence');
    expect(d1.id).toBe(d2.id); // same dispute returned
  });

  it('allows different users to report same wart', () => {
    const engine = DisputeEngine.load();
    engine.report('STZ_user1', 'wart_1', 'STZ_creator', 'copyright', 'Evidence 1');
    engine.report('STZ_user2', 'wart_1', 'STZ_creator', 'spam', 'Evidence 2');
    expect(engine.getByWart('wart_1')).toHaveLength(2);
  });

  it('admin resolves dispute (remove)', () => {
    const engine = DisputeEngine.load();
    const d = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Stolen');
    expect(engine.resolve(d.id, 'STZ_admin', 'remove', 'Confirmed copyright violation')).toBe(true);
    expect(engine.get(d.id)!.status).toBe('resolved_removed');
    expect(engine.get(d.id)!.resolverAddress).toBe('STZ_admin');
  });

  it('admin resolves dispute (dismiss)', () => {
    const engine = DisputeEngine.load();
    const d = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'spam', 'Looks spammy');
    expect(engine.resolve(d.id, 'STZ_admin', 'dismiss', 'Not spam')).toBe(true);
    expect(engine.get(d.id)!.status).toBe('resolved_dismissed');
  });

  it('creator submits counter-notice', () => {
    const engine = DisputeEngine.load();
    const d = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Stolen');
    expect(engine.counterNotice(d.id, 'STZ_creator', 'I am the original creator')).toBe(true);
    expect(engine.get(d.id)!.status).toBe('counter_notice');
    expect(engine.get(d.id)!.counterNotice).toBe('I am the original creator');
  });

  it('non-creator cannot counter-notice', () => {
    const engine = DisputeEngine.load();
    const d = engine.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Stolen');
    expect(engine.counterNotice(d.id, 'STZ_hacker', 'I am creator')).toBe(false);
  });

  it('getPending returns only unresolved', () => {
    const engine = DisputeEngine.load();
    engine.report('STZ_a', 'w1', 'STZ_c1', 'spam', 'e1');
    engine.report('STZ_b', 'w2', 'STZ_c2', 'fraud', 'e2');
    const d3 = engine.report('STZ_c', 'w3', 'STZ_c3', 'copyright', 'e3');
    engine.resolve(d3.id, 'STZ_admin', 'dismiss', 'OK');
    expect(engine.getPending()).toHaveLength(2);
  });

  it('persists across loads', () => {
    const e1 = DisputeEngine.load();
    e1.report('STZ_reporter', 'wart_1', 'STZ_creator', 'copyright', 'Evidence');
    const e2 = DisputeEngine.load();
    expect(e2.getAll()).toHaveLength(1);
  });
});
