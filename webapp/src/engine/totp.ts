/**
 * TOTP (Time-based One-Time Password) Engine for Cosmorare 2FA
 *
 * Implements RFC 6238 TOTP using Web Crypto API (no dependencies).
 * Uses HMAC-SHA1 with 6-digit codes, 30-second time steps.
 *
 * Flow:
 *   1. User enables 2FA → generateSecret() → display QR URI
 *   2. User scans QR with authenticator app (Google Auth, Authy, etc.)
 *   3. User enters code → verifyTOTP() to confirm setup
 *   4. On login: if 2FA enabled, prompt for code → verifyTOTP()
 */

import { storage } from './storage';

// ─── Constants ────────────────────────────────────────────

const TOTP_STORAGE_KEY = 'cosmorare_totp';
const DIGITS = 6;
const PERIOD = 30; // seconds
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ─── Types ────────────────────────────────────────────────

export interface TOTPConfig {
  /** Base32-encoded secret */
  secret: string;
  /** CosmoID username */
  username: string;
  /** Whether 2FA is fully enabled (user has verified a code) */
  enabled: boolean;
  /** Timestamp of enablement */
  enabledAt: number;
  /** Backup codes (hashed) */
  backupCodes: string[];
  /** Used backup codes (hashed) */
  usedBackupCodes: string[];
}

// ─── Base32 Encoding/Decoding ─────────────────────────────

function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/[\s=]/g, '').toUpperCase();
  const output: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

// ─── HMAC-SHA1 via Web Crypto ─────────────────────────────

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

// ─── TOTP Core ────────────────────────────────────────────

/**
 * Generate a TOTP code for the given secret at the given time.
 */
async function generateCode(secret: Uint8Array, timeStep: number): Promise<string> {
  // Convert time step to 8-byte big-endian buffer
  const timeBuffer = new Uint8Array(8);
  let t = timeStep;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = t & 0xff;
    t = Math.floor(t / 256);
  }

  const hmac = await hmacSha1(secret, timeBuffer);

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, DIGITS);
  return otp.toString().padStart(DIGITS, '0');
}

/**
 * Generate a random 20-byte secret for TOTP.
 */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

/**
 * Generate 8 backup codes (8-char alphanumeric each).
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a backup code for storage (we don't store them in clear).
 */
async function hashBackupCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code.toUpperCase().replace(/\s/g, ''));
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the current TOTP code for a secret.
 */
export async function getCurrentCode(secret: string): Promise<string> {
  const secretBytes = base32Decode(secret);
  const timeStep = Math.floor(Date.now() / 1000 / PERIOD);
  return generateCode(secretBytes, timeStep);
}

/**
 * Verify a TOTP code against a secret.
 * Allows ±1 time step window to handle clock skew.
 */
export async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const secretBytes = base32Decode(secret);
  const timeStep = Math.floor(Date.now() / 1000 / PERIOD);

  // Check current, previous, and next time step
  for (let offset = -1; offset <= 1; offset++) {
    const expected = await generateCode(secretBytes, timeStep + offset);
    if (expected === code.trim()) {
      return true;
    }
  }
  return false;
}

/**
 * Generate an otpauth:// URI for QR code generation.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 */
export function generateTOTPUri(secret: string, username: string): string {
  const issuer = 'Cosmorare';
  const label = encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${PERIOD}`;
}

// ─── Storage (per-address) ────────────────────────────────

function loadAllConfigs(): Record<string, TOTPConfig> {
  const raw = storage.getItem(TOTP_STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function saveAllConfigs(configs: Record<string, TOTPConfig>): void {
  storage.setItem(TOTP_STORAGE_KEY, JSON.stringify(configs));
}

/**
 * Get 2FA config for an address (null if not set up).
 */
export function getTOTPConfig(address: string): TOTPConfig | null {
  const configs = loadAllConfigs();
  return configs[address] || null;
}

/**
 * Check if 2FA is enabled for an address.
 */
export function is2FAEnabled(address: string): boolean {
  const config = getTOTPConfig(address);
  return config?.enabled === true;
}

/**
 * Save a TOTP config (called after setup or modification).
 */
export function saveTOTPConfig(address: string, config: TOTPConfig): void {
  const configs = loadAllConfigs();
  configs[address] = config;
  saveAllConfigs(configs);
}

/**
 * Remove 2FA for an address (disable).
 */
export function removeTOTPConfig(address: string): void {
  const configs = loadAllConfigs();
  delete configs[address];
  saveAllConfigs(configs);
}

/**
 * Setup 2FA: generates secret and backup codes, returns them for display.
 * The config is saved but NOT enabled yet — call enable2FA() after verification.
 */
export async function setup2FA(address: string, username: string): Promise<{
  secret: string;
  uri: string;
  backupCodes: string[];
}> {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map(hashBackupCode));

  const config: TOTPConfig = {
    secret,
    username,
    enabled: false,
    enabledAt: 0,
    backupCodes: hashedCodes,
    usedBackupCodes: [],
  };

  saveTOTPConfig(address, config);

  return {
    secret,
    uri: generateTOTPUri(secret, username),
    backupCodes,
  };
}

/**
 * Enable 2FA after the user has verified a code.
 */
export async function enable2FA(address: string, code: string): Promise<boolean> {
  const config = getTOTPConfig(address);
  if (!config) return false;

  const valid = await verifyTOTP(config.secret, code);
  if (!valid) return false;

  config.enabled = true;
  config.enabledAt = Date.now();
  saveTOTPConfig(address, config);
  return true;
}

/**
 * Verify a 2FA code (TOTP or backup code) during login.
 */
export async function verify2FALogin(address: string, code: string): Promise<boolean> {
  const config = getTOTPConfig(address);
  if (!config || !config.enabled) return true; // 2FA not enabled, allow

  // Try TOTP first
  const totpValid = await verifyTOTP(config.secret, code);
  if (totpValid) return true;

  // Try backup code
  const codeHash = await hashBackupCode(code);
  const backupIdx = config.backupCodes.indexOf(codeHash);
  if (backupIdx !== -1 && !config.usedBackupCodes.includes(codeHash)) {
    config.usedBackupCodes.push(codeHash);
    saveTOTPConfig(address, config);
    return true;
  }

  return false;
}

/**
 * Disable 2FA for an address (requires valid code).
 */
export async function disable2FA(address: string, code: string): Promise<boolean> {
  const config = getTOTPConfig(address);
  if (!config || !config.enabled) return false;

  const valid = await verifyTOTP(config.secret, code);
  if (!valid) return false;

  removeTOTPConfig(address);
  return true;
}
