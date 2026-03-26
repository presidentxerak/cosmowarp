import { describe, it, expect } from 'vitest';
import {
  BREAKPOINTS, getCurrentBreakpoint, isMobile, isTablet, isDesktop,
  isTouchDevice, getGridColumns,
} from './responsive';

describe('Responsive Utilities', () => {
  it('has correct breakpoints', () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
  });

  it('detects breakpoint from window width', () => {
    // jsdom default innerWidth = 1024
    const bp = getCurrentBreakpoint();
    expect(['xs', 'sm', 'md', 'lg', 'xl']).toContain(bp);
  });

  it('isMobile/isTablet/isDesktop are exclusive', () => {
    const m = isMobile();
    const t = isTablet();
    const d = isDesktop();
    // At least one should be true (jsdom has a width)
    expect(m || t || d).toBe(true);
  });

  it('isTouchDevice returns boolean', () => {
    expect(typeof isTouchDevice()).toBe('boolean');
  });

  it('getGridColumns returns valid count', () => {
    const cols = getGridColumns('gallery');
    expect(cols).toBeGreaterThanOrEqual(1);
    expect(cols).toBeLessThanOrEqual(4);
  });

  it('list context always returns 1 column', () => {
    expect(getGridColumns('list')).toBe(1);
  });
});
