import { describe, it, expect } from 'vitest';

// Verify that the focused hooks module exports the expected functions
describe('Focused context hooks', () => {
  it('exports useAuth, useWarts, useBalance', async () => {
    const mod = await import('./hooks');
    expect(typeof mod.useAuth).toBe('function');
    expect(typeof mod.useWarts).toBe('function');
    expect(typeof mod.useBalance).toBe('function');
  });
});
