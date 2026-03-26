import { describe, it, expect, beforeEach } from 'vitest';
import { CollectionEngine } from './collections';

describe('CollectionEngine', () => {
  beforeEach(() => localStorage.clear());

  it('creates a collection', () => {
    const engine = CollectionEngine.load();
    const col = engine.create('STZ_alice', 'My Collection', 'Best artworks');
    expect(col.id).toMatch(/^COL_/);
    expect(col.creator).toBe('STZ_alice');
    expect(col.title).toBe('My Collection');
    expect(col.wartIds).toEqual([]);
  });

  it('persists across loads', () => {
    const e1 = CollectionEngine.load();
    e1.create('STZ_alice', 'Persisted');
    const e2 = CollectionEngine.load();
    expect(e2.getAll()).toHaveLength(1);
    expect(e2.getAll()[0].title).toBe('Persisted');
  });

  it('adds and removes warts', () => {
    const engine = CollectionEngine.load();
    const col = engine.create('STZ_alice', 'Test');
    expect(engine.addWart(col.id, 'STZ_alice', 'wart_1')).toBe(true);
    expect(engine.addWart(col.id, 'STZ_alice', 'wart_2')).toBe(true);
    // Duplicate
    expect(engine.addWart(col.id, 'STZ_alice', 'wart_1')).toBe(false);
    expect(engine.get(col.id)!.wartIds).toEqual(['wart_1', 'wart_2']);

    expect(engine.removeWart(col.id, 'STZ_alice', 'wart_1')).toBe(true);
    expect(engine.get(col.id)!.wartIds).toEqual(['wart_2']);
  });

  it('prevents unauthorized modifications', () => {
    const engine = CollectionEngine.load();
    const col = engine.create('STZ_alice', 'Private');
    expect(engine.addWart(col.id, 'STZ_bob', 'wart_1')).toBe(false);
    expect(engine.update(col.id, 'STZ_bob', { title: 'Hacked' })).toBe(false);
    expect(engine.delete(col.id, 'STZ_bob')).toBe(false);
  });

  it('reorders warts', () => {
    const engine = CollectionEngine.load();
    const col = engine.create('STZ_alice', 'Test');
    engine.addWart(col.id, 'STZ_alice', 'w1');
    engine.addWart(col.id, 'STZ_alice', 'w2');
    engine.addWart(col.id, 'STZ_alice', 'w3');
    expect(engine.reorderWarts(col.id, 'STZ_alice', ['w3', 'w1', 'w2'])).toBe(true);
    expect(engine.get(col.id)!.wartIds).toEqual(['w3', 'w1', 'w2']);
    // Invalid reorder (missing ID)
    expect(engine.reorderWarts(col.id, 'STZ_alice', ['w3', 'w1'])).toBe(false);
  });

  it('gets collections by creator', () => {
    const engine = CollectionEngine.load();
    engine.create('STZ_alice', 'Alice 1');
    engine.create('STZ_alice', 'Alice 2');
    engine.create('STZ_bob', 'Bob 1');
    expect(engine.getByCreator('STZ_alice')).toHaveLength(2);
    expect(engine.getByCreator('STZ_bob')).toHaveLength(1);
  });

  it('finds collections containing a wart', () => {
    const engine = CollectionEngine.load();
    const c1 = engine.create('STZ_alice', 'Collection 1');
    const c2 = engine.create('STZ_alice', 'Collection 2');
    engine.addWart(c1.id, 'STZ_alice', 'wart_shared');
    engine.addWart(c2.id, 'STZ_alice', 'wart_shared');
    engine.addWart(c2.id, 'STZ_alice', 'wart_other');
    expect(engine.getCollectionsForWart('wart_shared')).toHaveLength(2);
    expect(engine.getCollectionsForWart('wart_other')).toHaveLength(1);
  });

  it('deletes a collection', () => {
    const engine = CollectionEngine.load();
    const col = engine.create('STZ_alice', 'To Delete');
    expect(engine.getAll()).toHaveLength(1);
    expect(engine.delete(col.id, 'STZ_alice')).toBe(true);
    expect(engine.getAll()).toHaveLength(0);
  });
});
