import { describe, it, expect, beforeEach } from 'vitest';
import {
  getKYCState, getTransactionLimits, checkTransactionAllowed,
  completeBasicKYC, submitFullKYC, approveFullKYC, rejectFullKYC,
} from './kyc';

describe('KYC/AML Compliance', () => {
  beforeEach(() => localStorage.clear());

  describe('Default state', () => {
    it('starts at level none', () => {
      const state = getKYCState('STZ_user');
      expect(state.level).toBe('none');
      expect(state.status).toBe('not_started');
      expect(state.emailVerified).toBe(false);
      expect(state.idVerified).toBe(false);
    });

    it('has correct limits for unverified', () => {
      const limits = getTransactionLimits('STZ_user');
      expect(limits.maxSingleTx).toBe(500);
      expect(limits.maxMonthlyVolume).toBe(500);
    });
  });

  describe('Transaction checks', () => {
    it('allows small transactions for unverified', () => {
      const result = checkTransactionAllowed('STZ_user', 100);
      expect(result.allowed).toBe(true);
    });

    it('blocks large transactions for unverified', () => {
      const result = checkTransactionAllowed('STZ_user', 600);
      expect(result.allowed).toBe(false);
      expect(result.requiredLevel).toBe('basic');
      expect(result.reason).toContain('€500');
    });

    it('blocks very large transactions without full KYC', () => {
      completeBasicKYC('STZ_user');
      const result = checkTransactionAllowed('STZ_user', 6000);
      expect(result.allowed).toBe(false);
      expect(result.requiredLevel).toBe('full');
    });

    it('allows any amount with full KYC', () => {
      approveFullKYC('STZ_user');
      const result = checkTransactionAllowed('STZ_user', 100000);
      expect(result.allowed).toBe(true);
    });

    it('checks monthly volume', () => {
      const result = checkTransactionAllowed('STZ_user', 100, 450);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Monthly volume');
    });
  });

  describe('KYC Lifecycle', () => {
    it('basic KYC: email verification', () => {
      const state = completeBasicKYC('STZ_user');
      expect(state.level).toBe('basic');
      expect(state.emailVerified).toBe(true);
      expect(state.status).toBe('approved');
      expect(getTransactionLimits('STZ_user').maxSingleTx).toBe(5000);
    });

    it('full KYC: submit → approve', () => {
      completeBasicKYC('STZ_user');
      const pending = submitFullKYC('STZ_user');
      expect(pending.status).toBe('pending');
      expect(pending.submittedAt).toBeGreaterThan(0);

      const approved = approveFullKYC('STZ_user');
      expect(approved.level).toBe('full');
      expect(approved.idVerified).toBe(true);
      expect(approved.status).toBe('approved');
      expect(getTransactionLimits('STZ_user').maxSingleTx).toBe(Infinity);
    });

    it('full KYC: submit → reject', () => {
      submitFullKYC('STZ_user');
      const rejected = rejectFullKYC('STZ_user', 'Blurry document');
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectedReason).toBe('Blurry document');
      // Level stays at whatever it was before
      expect(rejected.level).not.toBe('full');
    });

    it('persists across reloads', () => {
      completeBasicKYC('STZ_user');
      const reloaded = getKYCState('STZ_user');
      expect(reloaded.level).toBe('basic');
      expect(reloaded.emailVerified).toBe(true);
    });
  });
});
