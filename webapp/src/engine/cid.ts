/**
 * CID (Content Identifier) — IPFS-compatible Content Addressing
 *
 * Computes CIDv1 identifiers from data using SHA-256.
 * CIDs encode the hash algorithm, codec, and version so the identifier
 * itself proves the content's integrity — no external hash needed.
 *
 * Format: CIDv1 = <multibase><version><multicodec><multihash>
 *   - multibase:  'b' (base32lower)
 *   - version:    0x01 (CIDv1)
 *   - multicodec: 0x55 (raw) for binary, 0x70 (dag-pb) for structured
 *   - multihash:  0x12 (sha2-256) + 0x20 (32 bytes) + <digest>
 */

// ─── Multicodec Constants ───────────────────────────────────

const CID_VERSION = 0x01;
const CODEC_RAW = 0x55;
const HASH_SHA256 = 0x12;
const HASH_LENGTH = 0x20; // 32 bytes

// ─── Base32 Encoding (RFC 4648, lowercase, no padding) ──────

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return output;
}

function base32Decode(encoded: string): Uint8Array {
  const lookup = new Map<string, number>();
  for (let i = 0; i < BASE32_ALPHABET.length; i++) {
    lookup.set(BASE32_ALPHABET[i], i);
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of encoded.toLowerCase()) {
    const v = lookup.get(char);
    if (v === undefined) continue;
    value = (value << 5) | v;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

// ─── Varint Encoding ────────────────────────────────────────

function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7f);
  return new Uint8Array(bytes);
}

function decodeVarint(data: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset + bytesRead < data.length) {
    const byte = data[offset + bytesRead];
    value |= (byte & 0x7f) << shift;
    bytesRead++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  return { value, bytesRead };
}

// ─── SHA-256 Digest ─────────────────────────────────────────

async function sha256Digest(data: Uint8Array): Promise<Uint8Array> {
  const buf = new Uint8Array(data).buffer as ArrayBuffer;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(hash);
}

// ─── CID Operations ────────────────────────────────────────

/**
 * Compute a CIDv1 (base32, raw codec, sha2-256) from arbitrary data.
 * This is the standard IPFS CID format for raw binary content.
 */
export async function computeCID(data: string): Promise<string> {
  // Convert string data to bytes
  const bytes = typeof data === 'string' && data.startsWith('data:')
    ? base64DataUrlToBytes(data)
    : new TextEncoder().encode(data);

  const digest = await sha256Digest(bytes);

  // Build CID bytes: version + codec + multihash(algo + length + digest)
  const version = encodeVarint(CID_VERSION);
  const codec = encodeVarint(CODEC_RAW);
  const hashCode = encodeVarint(HASH_SHA256);
  const hashLength = encodeVarint(HASH_LENGTH);

  const cidBytes = new Uint8Array(
    version.length + codec.length + hashCode.length + hashLength.length + digest.length
  );

  let offset = 0;
  cidBytes.set(version, offset); offset += version.length;
  cidBytes.set(codec, offset); offset += codec.length;
  cidBytes.set(hashCode, offset); offset += hashCode.length;
  cidBytes.set(hashLength, offset); offset += hashLength.length;
  cidBytes.set(digest, offset);

  // Encode as base32 with 'b' multibase prefix
  return 'b' + base32Encode(cidBytes);
}

/**
 * Verify that data matches a given CID.
 * Recomputes the CID and compares.
 */
export async function verifyCID(data: string, expectedCID: string): Promise<boolean> {
  try {
    const computed = await computeCID(data);
    return computed === expectedCID;
  } catch {
    return false;
  }
}

/**
 * Parse a CID string into its components.
 */
export function parseCID(cid: string): {
  version: number;
  codec: number;
  hashAlgorithm: number;
  hashLength: number;
  digest: Uint8Array;
} | null {
  try {
    if (!cid.startsWith('b')) return null; // Only base32lower supported

    const bytes = base32Decode(cid.slice(1));

    let offset = 0;
    const version = decodeVarint(bytes, offset);
    offset += version.bytesRead;

    const codec = decodeVarint(bytes, offset);
    offset += codec.bytesRead;

    const hashAlgorithm = decodeVarint(bytes, offset);
    offset += hashAlgorithm.bytesRead;

    const hashLength = decodeVarint(bytes, offset);
    offset += hashLength.bytesRead;

    const digest = bytes.slice(offset, offset + hashLength.value);

    return {
      version: version.value,
      codec: codec.value,
      hashAlgorithm: hashAlgorithm.value,
      hashLength: hashLength.value,
      digest,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a string is a valid CIDv1.
 */
export function isValidCID(cid: string): boolean {
  const parsed = parseCID(cid);
  if (!parsed) return false;
  return parsed.version === CID_VERSION &&
    parsed.hashLength === HASH_LENGTH &&
    parsed.digest.length === HASH_LENGTH;
}

/**
 * Convert a CID to a gateway URL.
 */
export function cidToGatewayUrl(cid: string, gatewayBase: string = 'https://ipfs.io/ipfs/'): string {
  return `${gatewayBase.replace(/\/$/, '')}/${cid}`;
}

/**
 * Convert a CID to an ipfs:// URI.
 */
export function cidToUri(cid: string): string {
  return `ipfs://${cid}`;
}

// ─── Helpers ────────────────────────────────────────────────

function base64DataUrlToBytes(dataUrl: string): Uint8Array {
  const [, b64] = dataUrl.split(',');
  if (!b64) return new TextEncoder().encode(dataUrl);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
