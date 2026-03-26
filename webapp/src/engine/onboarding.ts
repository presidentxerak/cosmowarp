/**
 * Strangrz Onboarding — Step-by-step guide for new users
 *
 * Features:
 * - Multi-step onboarding wizard state
 * - Progress tracking (persisted)
 * - Skip option for returning users
 * - Feature highlights with tooltips
 */

import { storage } from './storage';

// ─── Types ────────────────────────────────────────────────

export type OnboardingStep =
  | 'welcome'
  | 'create_wallet'
  | 'explore_gallery'
  | 'first_like'
  | 'visit_profile'
  | 'completed';

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
  startedAt: number;
  completedAt: number | null;
}

export interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  action: string;        // CTA button text
  route: string;         // where to navigate
  icon: string;
}

// ─── Step Definitions ─────────────────────────────────────

export const ONBOARDING_STEPS: StepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to Strangrz',
    description: 'Strangrz is a decentralized marketplace for certified digital artworks. Let\'s get you started.',
    action: 'Get Started',
    route: '/',
    icon: '\u2B21',
  },
  {
    id: 'create_wallet',
    title: 'Create Your Wallet',
    description: 'Your wallet is your identity on Strangrz. It\'s created locally and secured with your password.',
    action: 'Create Wallet',
    route: '/wallet',
    icon: '\u26BF',
  },
  {
    id: 'explore_gallery',
    title: 'Explore the Gallery',
    description: 'Browse artworks from creators worldwide. Filter by media type, price, or tags.',
    action: 'Open Gallery',
    route: '/gallery',
    icon: '\u2742',
  },
  {
    id: 'first_like',
    title: 'Like Your First Artwork',
    description: 'Tap the heart on any artwork you enjoy. Likes help creators get discovered.',
    action: 'Browse & Like',
    route: '/gallery',
    icon: '\u2665',
  },
  {
    id: 'visit_profile',
    title: 'Check Your Profile',
    description: 'View your collection, balance, and level. Customize your alias and bio.',
    action: 'View Profile',
    route: '/profile',
    icon: '\u2605',
  },
];

// ─── Storage ──────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_onboarding';

function loadState(): OnboardingState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    currentStep: 'welcome',
    completedSteps: [],
    skipped: false,
    startedAt: Date.now(),
    completedAt: null,
  };
}

function saveState(state: OnboardingState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Onboarding Engine ────────────────────────────────────

/** Get current onboarding state */
export function getOnboardingState(): OnboardingState {
  return loadState();
}

/** Check if onboarding is active (not completed/skipped) */
export function isOnboardingActive(): boolean {
  const state = loadState();
  return !state.skipped && state.currentStep !== 'completed';
}

/** Get current step config */
export function getCurrentStep(): StepConfig | null {
  const state = loadState();
  return ONBOARDING_STEPS.find(s => s.id === state.currentStep) || null;
}

/** Get progress percentage (0-100) */
export function getProgress(): number {
  const state = loadState();
  return Math.round((state.completedSteps.length / ONBOARDING_STEPS.length) * 100);
}

/** Complete the current step and advance to next */
export function completeStep(stepId: OnboardingStep): OnboardingState {
  const state = loadState();
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
  }

  // Find next uncompleted step
  const nextStep = ONBOARDING_STEPS.find(s => !state.completedSteps.includes(s.id));
  state.currentStep = nextStep?.id || 'completed';

  if (state.currentStep === 'completed') {
    state.completedAt = Date.now();
  }

  saveState(state);
  return state;
}

/** Skip onboarding entirely */
export function skipOnboarding(): OnboardingState {
  const state = loadState();
  state.skipped = true;
  saveState(state);
  return state;
}

/** Reset onboarding (for testing or re-trigger) */
export function resetOnboarding(): OnboardingState {
  const state: OnboardingState = {
    currentStep: 'welcome',
    completedSteps: [],
    skipped: false,
    startedAt: Date.now(),
    completedAt: null,
  };
  saveState(state);
  return state;
}
