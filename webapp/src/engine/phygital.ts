/**
 * Cosmorare Phygital Authentication System
 *
 * Generates printable hash signatures from Wart transactions
 * that creators can physically attach to their artworks.
 * Anyone can verify authenticity by entering the hash.
 */

import { sha256 } from './crypto';
import { storage } from './storage';

// ─── Types ─────────────────────────────────────────────

export interface PhygitalCertificate {
  id: string;                   // CWPHY_<hash[0:16]>
  wartId: string;
  wartTitle: string;
  creatorAddress: string;
  ownerAddress: string;
  certHash: string;             // Full SHA-256 hash of the certificate data
  contentFingerprint: string;   // SHA-256 of the artwork content
  createdAt: number;
  editionInfo: string;          // e.g. "1/1" or "3/10"
  verificationCode: string;     // Short 12-char verification code
}

// ─── Storage ───────────────────────────────────────────

const STORAGE_KEY = 'cosmorare_phygital_certs';

function loadCerts(): PhygitalCertificate[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCerts(certs: PhygitalCertificate[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

// ─── Certificate Generation ────────────────────────────

export async function generatePhygitalCert(
  wartId: string,
  wartTitle: string,
  creatorAddress: string,
  ownerAddress: string,
  contentFingerprint: string,
  editionNumber: number,
  maxEditions: number | null,
): Promise<PhygitalCertificate> {
  const timestamp = Date.now();
  const payload = `CWPHY:${wartId}:${creatorAddress}:${contentFingerprint}:${timestamp}`;
  const certHash = await sha256(payload);
  const verificationCode = certHash.slice(0, 4).toUpperCase() + '-' +
    certHash.slice(4, 8).toUpperCase() + '-' +
    certHash.slice(8, 12).toUpperCase();
  const id = 'CWPHY_' + certHash.slice(0, 16).toUpperCase();

  const editionInfo = maxEditions
    ? `${editionNumber}/${maxEditions}`
    : editionNumber === 1 ? '1/1' : `#${editionNumber}`;

  const cert: PhygitalCertificate = {
    id,
    wartId,
    wartTitle,
    creatorAddress,
    ownerAddress,
    certHash,
    contentFingerprint,
    createdAt: timestamp,
    editionInfo,
    verificationCode,
  };

  const certs = loadCerts();
  certs.push(cert);
  saveCerts(certs);

  return cert;
}

// ─── Verification ──────────────────────────────────────

export function verifyCert(code: string): PhygitalCertificate | null {
  const certs = loadCerts();
  const normalized = code.trim().toUpperCase().replace(/-/g, '');

  return certs.find(c => {
    const certNorm = c.verificationCode.replace(/-/g, '');
    return certNorm === normalized || c.id === code.trim().toUpperCase() || c.certHash.startsWith(normalized.toLowerCase());
  }) || null;
}

export function getCertByWartId(wartId: string): PhygitalCertificate | null {
  const certs = loadCerts();
  return certs.find(c => c.wartId === wartId) || null;
}

export function getAllCerts(): PhygitalCertificate[] {
  return loadCerts();
}

// ─── Printable SVG Generation ──────────────────────────

export function generatePrintableSVG(cert: PhygitalCertificate): string {
  const shortCreator = cert.creatorAddress.slice(0, 6) + '...' + cert.creatorAddress.slice(-4);
  const date = new Date(cert.createdAt).toLocaleDateString('fr-FR');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" style="font-family:Inter,Helvetica,Arial,sans-serif">
  <rect width="400" height="240" fill="#ffffff" stroke="#000000" stroke-width="2"/>
  <rect x="10" y="10" width="380" height="220" fill="none" stroke="#000000" stroke-width="0.5"/>

  <!-- Header -->
  <text x="200" y="38" text-anchor="middle" font-size="14" font-weight="600" fill="#000000">CERTIFICATE OF AUTHENTICITY</text>
  <line x1="60" y1="46" x2="340" y2="46" stroke="#000000" stroke-width="0.5"/>

  <!-- Title -->
  <text x="200" y="70" text-anchor="middle" font-size="18" font-weight="700" fill="#000000">${escapeXml(cert.wartTitle)}</text>
  <text x="200" y="88" text-anchor="middle" font-size="10" fill="#666666">Edition ${cert.editionInfo}</text>

  <!-- Verification code -->
  <rect x="110" y="100" width="180" height="36" fill="#f5f5f5" stroke="#000000" stroke-width="1"/>
  <text x="200" y="124" text-anchor="middle" font-size="20" font-weight="700" fill="#000000" letter-spacing="3">${cert.verificationCode}</text>

  <!-- Details -->
  <text x="30" y="160" font-size="9" fill="#333333">Creator: ${shortCreator}</text>
  <text x="30" y="175" font-size="9" fill="#333333">Date: ${date}</text>
  <text x="30" y="190" font-size="9" fill="#333333">Cert ID: ${cert.id}</text>

  <!-- Hash -->
  <text x="30" y="210" font-size="7" fill="#999999">${cert.certHash}</text>

  <!-- Logo -->
  <text x="370" y="225" text-anchor="end" font-size="8" fill="#999999">Cosmorare</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
