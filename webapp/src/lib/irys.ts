/**
 * Strangrz — Irys SDK Integration
 *
 * Provides browser-side and server-side helpers for uploading
 * media to Arweave via Irys (permanent, pay-once storage).
 *
 * Browser: user connects wallet (MetaMask etc.) → fund → upload
 * Server:  platform wallet (private key in env) → fund → upload
 *
 * @see https://docs.irys.xyz/onchain-storage/quickstart
 */

// ─── Types ──────────────────────────────────────────────────

export interface IrysUploadResult {
  /** Arweave transaction ID */
  txId: string;
  /** ar:// locator for storage routes */
  locator: string;
  /** Full gateway URL for direct access */
  gatewayUrl: string;
  /** Size in bytes that was uploaded */
  sizeBytes: number;
}

export interface IrysPriceEstimate {
  /** Price in atomic units of the payment token */
  atomic: string;
  /** Price in standard units (e.g. ETH) */
  standard: string;
  /** Token used for payment */
  token: string;
}

export interface IrysBalance {
  /** Balance in atomic units */
  atomic: string;
  /** Balance in standard units */
  standard: string;
}

// ─── Config ─────────────────────────────────────────────────

const IRYS_GATEWAY = import.meta.env.VITE_ARWEAVE_GATEWAY_URL || 'https://arweave.net';

/**
 * Get the Arweave gateway URL for a given transaction ID.
 */
export function arweaveGatewayUrl(txId: string): string {
  return `${IRYS_GATEWAY.replace(/\/$/, '')}/${txId}`;
}

// ─── Browser-Side Uploader (wallet-connected) ──────────────

/**
 * Create a browser-side Irys uploader using the user's wallet (MetaMask etc.).
 * The user pays for uploads directly from their connected wallet.
 *
 * Usage:
 * ```ts
 * const uploader = await createBrowserUploader();
 * const result = await uploadFromBrowser(uploader, file);
 * ```
 */
export async function createBrowserUploader() {
  const { WebUploader } = await import('@irys/web-upload');
  const { WebEthereum } = await import('@irys/web-upload-ethereum');

  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
  }

  const uploader = await WebUploader(WebEthereum).withProvider(window.ethereum);
  return uploader;
}

/**
 * Get the current funded balance on Irys for the connected wallet.
 */
export async function getBrowserBalance(
  uploader: Awaited<ReturnType<typeof createBrowserUploader>>,
): Promise<IrysBalance> {
  const balance = await uploader.getBalance();
  return {
    atomic: balance.toString(),
    standard: uploader.utils.fromAtomic(balance).toString(),
  };
}

/**
 * Estimate the price to upload a given number of bytes.
 */
export async function estimatePrice(
  uploader: Awaited<ReturnType<typeof createBrowserUploader>>,
  sizeBytes: number,
): Promise<IrysPriceEstimate> {
  const price = await uploader.getPrice(sizeBytes);
  return {
    atomic: price.toString(),
    standard: uploader.utils.fromAtomic(price).toString(),
    token: uploader.token,
  };
}

/**
 * Fund the Irys account from the connected wallet.
 * @param amount Amount in standard units (e.g. "0.01" ETH)
 */
export async function fundFromBrowser(
  uploader: Awaited<ReturnType<typeof createBrowserUploader>>,
  amount: string,
): Promise<string> {
  const fundTx = await uploader.fund(uploader.utils.toAtomic(amount));
  return fundTx.id;
}

/**
 * Upload a File/Blob from the browser via the user's wallet.
 * Returns the Arweave transaction details.
 */
export async function uploadFromBrowser(
  uploader: Awaited<ReturnType<typeof createBrowserUploader>>,
  data: File | Blob | Uint8Array,
  tags?: Array<{ name: string; value: string }>,
): Promise<IrysUploadResult> {
  const defaultTags = [
    { name: 'App-Name', value: 'Strangrz' },
    { name: 'Content-Type', value: data instanceof Blob ? data.type : 'application/octet-stream' },
    ...(tags || []),
  ];

  // Convert to buffer for upload
  const buffer = data instanceof Uint8Array
    ? Buffer.from(data)
    : Buffer.from(await (data as Blob).arrayBuffer());

  const receipt = await uploader.upload(buffer, { tags: defaultTags });

  return {
    txId: receipt.id,
    locator: `ar://${receipt.id}`,
    gatewayUrl: arweaveGatewayUrl(receipt.id),
    sizeBytes: buffer.length,
  };
}

// ─── Data URL Helpers ───────────────────────────────────────

/**
 * Convert a data URL to a Uint8Array for upload.
 */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const [header, b64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

/**
 * Upload a data URL (base64-encoded) to Irys from browser.
 * Convenience wrapper for the common Strangrz use case.
 */
export async function uploadDataUrlFromBrowser(
  uploader: Awaited<ReturnType<typeof createBrowserUploader>>,
  dataUrl: string,
  wartId?: string,
): Promise<IrysUploadResult> {
  const { bytes, mimeType } = dataUrlToBytes(dataUrl);

  const tags = [
    { name: 'App-Name', value: 'Strangrz' },
    { name: 'Content-Type', value: mimeType },
  ];
  if (wartId) tags.push({ name: 'Wart-ID', value: wartId });

  const buffer = Buffer.from(bytes);
  const receipt = await uploader.upload(buffer, { tags });

  return {
    txId: receipt.id,
    locator: `ar://${receipt.id}`,
    gatewayUrl: arweaveGatewayUrl(receipt.id),
    sizeBytes: bytes.length,
  };
}

// ─── Server-Side Upload (via API) ───────────────────────────

/**
 * Upload data to Arweave via the platform's server-side API endpoint.
 * This is used when the platform pays for storage (e.g. included in sale price).
 *
 * @param data - Base64 data URL or raw bytes
 * @param wartId - Associated wart ID for tagging
 * @param apiUrl - API base URL (defaults to same origin)
 */
export async function uploadViaServer(
  data: string | Uint8Array,
  wartId: string,
  apiUrl?: string,
): Promise<IrysUploadResult> {
  const base = apiUrl || import.meta.env.VITE_API_URL || '';

  const body = data instanceof Uint8Array
    ? JSON.stringify({ data: uint8ArrayToBase64(data), wartId })
    : JSON.stringify({ data, wartId });

  const response = await fetch(`${base}/api/storage/irys-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Irys server upload failed: ${error}`);
  }

  return response.json();
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ─── Window type augmentation ───────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}
