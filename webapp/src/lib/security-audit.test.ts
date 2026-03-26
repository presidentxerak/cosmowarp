import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML, sanitizeText, sanitizeAlias, isValidAddress, isValidURL,
  sanitizeURL, validateAmount, validatePagination, runSecurityChecklist,
} from './security-audit';

describe('Security Audit', () => {
  describe('sanitizeHTML', () => {
    it('escapes HTML tags', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('escapes ampersands', () => {
      expect(sanitizeHTML('foo & bar')).toBe('foo &amp; bar');
    });

    it('passes through clean text', () => {
      expect(sanitizeHTML('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('sanitizeText', () => {
    it('trims and limits length', () => {
      const long = 'a'.repeat(6000);
      expect(sanitizeText(long, 100).length).toBe(100);
    });

    it('strips tags and trims', () => {
      expect(sanitizeText('  <b>bold</b>  ')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('sanitizeAlias', () => {
    it('accepts valid aliases', () => {
      expect(sanitizeAlias('Alice_123').valid).toBe(true);
      expect(sanitizeAlias('bob-art.ist').valid).toBe(true);
    });

    it('rejects too short', () => {
      expect(sanitizeAlias('a').valid).toBe(false);
    });

    it('rejects too long', () => {
      expect(sanitizeAlias('a'.repeat(31)).valid).toBe(false);
    });

    it('rejects special characters', () => {
      expect(sanitizeAlias('user<script>').valid).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    it('accepts STZ addresses', () => {
      expect(isValidAddress('STZ_' + 'a'.repeat(40))).toBe(true);
    });

    it('accepts Ethereum addresses', () => {
      expect(isValidAddress('0x' + 'a'.repeat(40))).toBe(true);
    });

    it('rejects invalid', () => {
      expect(isValidAddress('invalid')).toBe(false);
      expect(isValidAddress('')).toBe(false);
    });
  });

  describe('isValidURL / sanitizeURL', () => {
    it('accepts http/https URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://localhost:3000')).toBe(true);
    });

    it('rejects javascript URLs', () => {
      expect(isValidURL('javascript:alert(1)')).toBe(false);
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
    });

    it('rejects data URLs', () => {
      expect(isValidURL('data:text/html,<h1>hi</h1>')).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('accepts valid amounts', () => {
      expect(validateAmount(100).valid).toBe(true);
      expect(validateAmount(0.01).valid).toBe(true);
    });

    it('rejects invalid amounts', () => {
      expect(validateAmount(-1).valid).toBe(false);
      expect(validateAmount(0).valid).toBe(false);
      expect(validateAmount(NaN).valid).toBe(false);
      expect(validateAmount(Infinity).valid).toBe(false);
      expect(validateAmount('100').valid).toBe(false);
    });

    it('rejects excessively large amounts', () => {
      expect(validateAmount(2_000_000_000).valid).toBe(false);
    });
  });

  describe('validatePagination', () => {
    it('returns defaults for invalid input', () => {
      expect(validatePagination(null, null)).toEqual({ limit: 50, offset: 0 });
    });

    it('caps limit at 200', () => {
      expect(validatePagination(500, 0).limit).toBe(200);
    });
  });

  describe('runSecurityChecklist', () => {
    it('returns security checks', () => {
      const checks = runSecurityChecklist();
      expect(checks.length).toBeGreaterThan(5);
      expect(checks.every(c => ['pass', 'warn', 'fail'].includes(c.status))).toBe(true);
    });
  });
});
