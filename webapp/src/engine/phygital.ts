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

// ─── Signature PDF (Business Card Landscape) ─────────

export interface SignatureData {
  artworkName: string;
  artistName: string;
  transactionId: string;
}

/**
 * Generates a printable PDF (business card landscape 85×55mm)
 * with the Cosmowarp logo, artwork name, artist name, and transaction ID.
 * Uses canvas rendering → PDF blob via print or download.
 */
export function generateSignaturePDF(data: SignatureData): void {
  // Business card landscape: 85mm × 55mm at 300dpi = 1004 × 650 px
  const W = 1004;
  const H = 650;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // Inner border
  ctx.lineWidth = 0.5;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Load and draw the logo
  const logoImg = new Image();
  logoImg.onload = () => {
    // Logo centered at top, 80×80px
    const logoSize = 80;
    const logoX = (W - logoSize) / 2;
    const logoY = 44;
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

    // "COSMOWARP" text under logo
    ctx.fillStyle = '#000000';
    ctx.font = '600 18px Inter, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COSMOWARP', W / 2, logoY + logoSize + 24);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(120, 180);
    ctx.lineTo(W - 120, 180);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // "TRANSACTION SIGNATURE" header
    ctx.font = '600 14px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('TRANSACTION SIGNATURE', W / 2, 204);

    // Artwork name
    ctx.font = '700 28px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#000000';
    const truncatedTitle = data.artworkName.length > 30
      ? data.artworkName.slice(0, 30) + '...'
      : data.artworkName;
    ctx.fillText(truncatedTitle, W / 2, 260);

    // Artist label + name
    ctx.font = '400 13px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Artist', W / 2, 300);
    ctx.font = '600 20px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#000000';
    const truncatedArtist = data.artistName.length > 36
      ? data.artistName.slice(0, 36) + '...'
      : data.artistName;
    ctx.fillText(truncatedArtist, W / 2, 326);

    // Separator line
    ctx.beginPath();
    ctx.moveTo(120, 356);
    ctx.lineTo(W - 120, 356);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Transaction ID label
    ctx.font = '400 11px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Transaction ID', W / 2, 384);

    // Transaction ID box
    ctx.fillStyle = '#f5f5f5';
    const boxW = 600;
    const boxH = 40;
    const boxX = (W - boxW) / 2;
    const boxY = 394;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.font = '700 16px monospace';
    ctx.fillStyle = '#000000';
    const truncatedTxId = data.transactionId.length > 48
      ? data.transactionId.slice(0, 48) + '...'
      : data.transactionId;
    ctx.fillText(truncatedTxId, W / 2, boxY + 26);

    // Date at bottom
    ctx.font = '400 10px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText(new Date().toLocaleDateString('fr-FR'), W / 2, 480);

    // Footer
    ctx.font = '400 9px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText('Certified on Cosmowarp Protocol', W / 2, H - 40);

    // Open print dialog with the canvas as business card
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Print Signature - ${escapeXml(data.artworkName)}</title>
<style>
  @page { size: 85mm 55mm landscape; margin: 0; }
  * { margin: 0; padding: 0; }
  body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; }
  img { width: 85mm; height: 55mm; object-fit: contain; }
  @media print {
    body { background: white; height: auto; }
    img { width: 85mm; height: 55mm; }
  }
</style></head>
<body><img src="${dataUrl}" /><script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
      printWindow.document.close();
    }
  };

  logoImg.onerror = () => {
    // Fallback: draw without logo
    ctx.fillStyle = '#000000';
    ctx.font = '700 24px Inter, Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COSMOWARP', W / 2, 80);

    ctx.font = '600 14px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('TRANSACTION SIGNATURE', W / 2, 140);

    ctx.beginPath();
    ctx.moveTo(120, 160);
    ctx.lineTo(W - 120, 160);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.font = '700 28px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(data.artworkName.slice(0, 30), W / 2, 220);

    ctx.font = '400 13px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Artist', W / 2, 270);
    ctx.font = '600 20px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(data.artistName.slice(0, 36), W / 2, 296);

    ctx.font = '400 11px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('Transaction ID', W / 2, 340);

    ctx.fillStyle = '#f5f5f5';
    const boxW2 = 600, boxH2 = 40, boxX2 = (W - 600) / 2, boxY2 = 354;
    ctx.fillRect(boxX2, boxY2, boxW2, boxH2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX2, boxY2, boxW2, boxH2);
    ctx.font = '700 16px monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(data.transactionId.slice(0, 48), W / 2, boxY2 + 26);

    ctx.font = '400 9px Inter, Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText('Certified on Cosmowarp Protocol', W / 2, H - 40);

    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Print Signature - ${escapeXml(data.artworkName)}</title>
<style>
  @page { size: 85mm 55mm landscape; margin: 0; }
  * { margin: 0; padding: 0; }
  body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f0f0; }
  img { width: 85mm; height: 55mm; object-fit: contain; }
  @media print {
    body { background: white; height: auto; }
    img { width: 85mm; height: 55mm; }
  }
</style></head>
<body><img src="${dataUrl}" /><script>setTimeout(()=>window.print(),300);<\/script></body></html>`);
      printWindow.document.close();
    }
  };

  logoImg.src = '/cosmowarp-logo-black.svg';
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
