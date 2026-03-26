import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOnboardingState, isOnboardingActive, getCurrentStep, getProgress,
  completeStep, skipOnboarding, resetOnboarding, ONBOARDING_STEPS,
} from './onboarding';

describe('Onboarding', () => {
  beforeEach(() => localStorage.clear());

  it('starts at welcome step', () => {
    const state = getOnboardingState();
    expect(state.currentStep).toBe('welcome');
    expect(state.completedSteps).toEqual([]);
    expect(state.skipped).toBe(false);
  });

  it('is active by default', () => {
    expect(isOnboardingActive()).toBe(true);
  });

  it('gets current step config', () => {
    const step = getCurrentStep();
    expect(step).not.toBeNull();
    expect(step!.id).toBe('welcome');
    expect(step!.title).toContain('Welcome');
  });

  it('starts at 0% progress', () => {
    expect(getProgress()).toBe(0);
  });

  it('advances through steps', () => {
    completeStep('welcome');
    expect(getOnboardingState().currentStep).toBe('create_wallet');
    expect(getProgress()).toBe(20);

    completeStep('create_wallet');
    expect(getOnboardingState().currentStep).toBe('explore_gallery');
    expect(getProgress()).toBe(40);
  });

  it('completes when all steps done', () => {
    for (const step of ONBOARDING_STEPS) {
      completeStep(step.id);
    }
    expect(getOnboardingState().currentStep).toBe('completed');
    expect(getOnboardingState().completedAt).toBeGreaterThan(0);
    expect(isOnboardingActive()).toBe(false);
    expect(getProgress()).toBe(100);
  });

  it('skips onboarding', () => {
    skipOnboarding();
    expect(isOnboardingActive()).toBe(false);
    expect(getOnboardingState().skipped).toBe(true);
  });

  it('resets onboarding', () => {
    completeStep('welcome');
    completeStep('create_wallet');
    resetOnboarding();
    expect(getOnboardingState().currentStep).toBe('welcome');
    expect(getOnboardingState().completedSteps).toEqual([]);
    expect(isOnboardingActive()).toBe(true);
  });

  it('prevents duplicate step completion', () => {
    completeStep('welcome');
    completeStep('welcome'); // duplicate
    expect(getOnboardingState().completedSteps.filter(s => s === 'welcome')).toHaveLength(1);
  });

  it('has 5 defined steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(5);
    expect(ONBOARDING_STEPS.every(s => s.title && s.route && s.icon)).toBe(true);
  });
});
