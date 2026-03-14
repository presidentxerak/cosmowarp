/**
 * StrangrzLink — Compact Encrypted Wallet Transfer Code
 *
 * Generates a short, copy-pasteable code that contains the full encrypted
 * wallet data. Users can share this via any messaging app (iMessage, WhatsApp,
 * Telegram, etc.) and import it on another device with their password.
 *
 * Format: CWLINK-<base64url(AES-256-GCM encrypted compact wallet JSON)>
 *
 * Security: The StrangrzLink is encrypted with the user's password using
 * AES-256-GCM + PBKDF2 (100K iterations). Even if intercepted, it's
 * useless without the password.
 */

import { encryptData, decryptData, type EncryptedPayload } from './crypto';
import type { WalletExport } from './wallet';

const LINK_PREFIX = 'CWLINK-';
const LINK_SECRET_PREFIX = 'STRANGRZLINK_TRANSFER:';
const LEGACY_LINK_SECRET_PREFIX = 'COSMOLINK_TRANSFER:';

/**
 * Generate a StrangrzLink from a wallet export.
 * The result is a compact string safe for copy-paste.
 */
export async function generateStrangrzLink(
  walletExport: WalletExport,
  password: string
): Promise<string> {
  // Compact the wallet data into an array (smaller than full JSON)
  const compact = JSON.stringify([
    walletExport.address,
    walletExport.publicKey,
    walletExport.encryptedPrivateKey.ciphertext,
    walletExport.encryptedPrivateKey.iv,
    walletExport.alias || '',
    walletExport.createdAt,
  ]);

  // Encrypt with password
  const encrypted = await encryptData(compact, LINK_SECRET_PREFIX + password);

  // Pack into a minimal payload [ciphertext, iv]
  const payload = JSON.stringify([encrypted.ciphertext, encrypted.iv]);

  // Base64URL encode (URL-safe, no padding)
  const b64 = btoa(payload)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return LINK_PREFIX + b64;
}

/**
 * Parse and decrypt a StrangrzLink back into a WalletExport.
 * Throws if the link is invalid or the password is wrong.
 */
export async function parseStrangrzLink(
  link: string,
  password: string
): Promise<WalletExport> {
  const trimmed = link.trim();
  if (!trimmed.startsWith(LINK_PREFIX)) {
    throw new Error('Invalid StrangrzLink format');
  }

  // Decode base64url
  const b64 = trimmed.slice(LINK_PREFIX.length)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  let payload: [string, string];
  try {
    payload = JSON.parse(atob(b64));
  } catch {
    throw new Error('Invalid StrangrzLink data');
  }

  const encrypted: EncryptedPayload = {
    ciphertext: payload[0],
    iv: payload[1],
    tag: '',
  };

  // Decrypt with password (try new prefix, then legacy for backward compatibility)
  let compact: string;
  try {
    compact = await decryptData(encrypted, LINK_SECRET_PREFIX + password);
  } catch {
    try {
      compact = await decryptData(encrypted, LEGACY_LINK_SECRET_PREFIX + password);
    } catch {
      throw new Error('Wrong password or corrupted StrangrzLink');
    }
  }

  // Parse compact array
  let arr: [string, string, string, string, string, number];
  try {
    arr = JSON.parse(compact);
  } catch {
    throw new Error('Corrupted StrangrzLink data');
  }

  return {
    version: 2,
    address: arr[0],
    publicKey: arr[1],
    encryptedPrivateKey: {
      ciphertext: arr[2],
      iv: arr[3],
      tag: '',
    },
    alias: arr[4] || undefined,
    createdAt: arr[5],
  };
}

/**
 * Check if a string looks like a StrangrzLink.
 */
export function isStrangrzLink(text: string): boolean {
  return text.trim().startsWith(LINK_PREFIX) && text.trim().length > LINK_PREFIX.length + 10;
}
