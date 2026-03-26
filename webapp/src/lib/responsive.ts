/**
 * Strangrz Responsive — Mobile-first utilities
 *
 * Breakpoints, touch detection, viewport hooks, responsive helpers.
 */

// ─── Breakpoints (matches Tailwind defaults) ─────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Check current breakpoint */
export function getCurrentBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (typeof window === 'undefined') return 'md';
  const w = window.innerWidth;
  if (w >= BREAKPOINTS.xl) return 'xl';
  if (w >= BREAKPOINTS.lg) return 'lg';
  if (w >= BREAKPOINTS.md) return 'md';
  if (w >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/** Check if mobile viewport */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.sm;
}

/** Check if tablet viewport */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  return w >= BREAKPOINTS.sm && w < BREAKPOINTS.lg;
}

/** Check if desktop viewport */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= BREAKPOINTS.lg;
}

// ─── Touch Detection ──────────────────────────────────────

/** Detect touch-capable device */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ─── Grid Columns ─────────────────────────────────────────

/** Get recommended grid columns for current viewport */
export function getGridColumns(context: 'gallery' | 'collection' | 'list' = 'gallery'): number {
  const bp = getCurrentBreakpoint();
  switch (context) {
    case 'gallery':
      return bp === 'xs' ? 2 : bp === 'sm' ? 2 : bp === 'md' ? 3 : 4;
    case 'collection':
      return bp === 'xs' ? 1 : bp === 'sm' ? 2 : 3;
    case 'list':
      return 1;
    default:
      return bp === 'xs' ? 2 : 3;
  }
}

// ─── Safe Area ────────────────────────────────────────────

/** Get CSS safe area insets (for notched devices) */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('--sal') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('--sar') || '0', 10) || 0,
  };
}

// ─── Viewport Listener ───────────────────────────────────

/** Listen for viewport size changes (debounced) */
export function onViewportChange(callback: () => void, debounceMs = 150): () => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  const handler = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, debounceMs);
  };
  window.addEventListener('resize', handler);
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('resize', handler);
  };
}

// ─── Scroll Lock (for modals on mobile) ──────────────────

let scrollLockCount = 0;
let savedScrollY = 0;

export function lockScroll(): void {
  if (scrollLockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount++;
}

export function unlockScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY);
  }
}
