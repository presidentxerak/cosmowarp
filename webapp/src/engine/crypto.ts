/**
 * Strangrz Crypto Engine — Real Cryptographic Primitives
 *
 * Ed25519 for signatures, SHA-256 for hashing, AES-GCM for encryption.
 * Uses the Web Crypto API (SubtleCrypto) — no dependencies.
 */

// ─── Helpers ─────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function strToBuf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

// ─── SHA-256 Hashing ─────────────────────────────────────

export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buf = typeof data === 'string' ? strToBuf(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return bufToHex(hash);
}

export async function sha256Raw(data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', data);
}

export async function doubleSha256(data: string): Promise<string> {
  const first = await crypto.subtle.digest('SHA-256', strToBuf(data));
  const second = await crypto.subtle.digest('SHA-256', first);
  return bufToHex(second);
}

// ─── Ed25519 Key Generation & Signing ────────────────────

export interface CosmoKeyPair {
  publicKey: string;   // hex-encoded Ed25519 public key
  privateKey: string;  // hex-encoded Ed25519 private key (PKCS8)
  address: string;     // STZ + first 40 chars of SHA-256(publicKey)
}

export async function generateKeyPair(): Promise<CosmoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  ) as { publicKey: CryptoKey; privateKey: CryptoKey };

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const pubHex = bufToHex(publicKeyRaw);
  const privHex = bufToHex(privateKeyPkcs8);

  // Address = STZ + SHA-256(publicKey)[0:40]
  const addressHash = await sha256(pubHex);
  const address = 'STZ' + addressHash.slice(0, 40);

  return {
    publicKey: pubHex,
    privateKey: privHex,
    address,
  };
}

// Import keys from hex strings
async function importPrivateKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    hexToBuf(hexKey),
    { name: 'Ed25519' },
    false,
    ['sign']
  );
}

async function importPublicKey(hexKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    hexToBuf(hexKey),
    { name: 'Ed25519' },
    false,
    ['verify']
  );
}

// ─── Ed25519 Signing & Verification ─────────────────────

export async function signTransaction(data: string, privateKeyHex: string): Promise<string> {
  const privKey = await importPrivateKey(privateKeyHex);
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privKey,
    strToBuf(data)
  );
  return bufToHex(signature);
}

export async function verifySignature(
  data: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const pubKey = await importPublicKey(publicKeyHex);
    return crypto.subtle.verify(
      { name: 'Ed25519' },
      pubKey,
      hexToBuf(signatureHex),
      strToBuf(data)
    );
  } catch {
    return false;
  }
}

// ─── AES-GCM Encryption ─────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string;  // hex
  iv: string;          // hex (12 bytes)
  tag: string;         // included in ciphertext by Web Crypto
}

async function deriveAesKey(sharedSecret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuf(sharedSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: strToBuf('Cosmorare-AES-Salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(
  plaintext: string,
  sharedSecret: string
): Promise<EncryptedPayload> {
  const key = await deriveAesKey(sharedSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    strToBuf(plaintext)
  );
  return {
    ciphertext: bufToHex(ciphertext),
    iv: bufToHex(iv.buffer),
    tag: '', // tag is appended to ciphertext by WebCrypto
  };
}

export async function decryptData(
  payload: EncryptedPayload,
  sharedSecret: string
): Promise<string> {
  const key = await deriveAesKey(sharedSecret);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuf(payload.iv) },
    key,
    hexToBuf(payload.ciphertext)
  );
  return new TextDecoder().decode(plaintext);
}

// ─── Deterministic Transaction ID ───────────────────────

export async function computeTxId(
  from: string,
  to: string,
  amount: number,
  timestamp: number,
  parentIds: string[]
): Promise<string> {
  const canonical = `${from}:${to}:${amount}:${timestamp}:${parentIds.sort().join(',')}`;
  return sha256(canonical);
}

// ─── Cosmic Hash (fast non-crypto hash for VM) ──────────
// Kept for backward compatibility with VM opcodes

export function cosmicHashSync(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

// ─── Address utilities ──────────────────────────────────

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function isValidAddress(address: string): boolean {
  return /^STZ[a-f0-9]{40}$/.test(address);
}

// ─── Random bytes ────────────────────────────────────────

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function randomHex(length: number): string {
  const bytes = randomBytes(length);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Wallet Key Encryption ─────────────────────────────

export async function encryptPrivateKey(
  privateKeyHex: string,
  password: string
): Promise<EncryptedPayload> {
  return encryptData(privateKeyHex, 'COSMOWARP_WALLET_KEY:' + password);
}

export async function decryptPrivateKey(
  payload: EncryptedPayload,
  password: string
): Promise<string> {
  return decryptData(payload, 'COSMOWARP_WALLET_KEY:' + password);
}

// ─── StrangrzID: Deterministic Key Derivation ─────────────

/**
 * Derive a 32-byte Ed25519 seed from username + password.
 * Uses PBKDF2 with 600,000 iterations for brute-force resistance.
 * Same credentials always produce the same seed → same wallet.
 */
export async function deriveWalletSeed(
  username: string,
  password: string
): Promise<Uint8Array> {
  const normalizedUser = username.toLowerCase().trim();
  const salt = `Cosmorare-StrangrzID-v1:${normalizedUser}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuf(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: strToBuf(salt),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

function base64urlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Generate an Ed25519 key pair from a 32-byte seed (deterministic).
 * Builds PKCS8 from seed, imports via Web Crypto, extracts public key from JWK.
 */
export async function generateKeyPairFromSeed(
  seed: Uint8Array
): Promise<CosmoKeyPair> {
  // Ed25519 PKCS8 = 16-byte ASN.1 DER header + 32-byte seed
  const pkcs8Header = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(48);
  pkcs8.set(pkcs8Header);
  pkcs8.set(seed, 16);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8.buffer,
    { name: 'Ed25519' },
    true,
    ['sign']
  );

  // Export as JWK to get public key (x) alongside private key (d)
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const pubBytes = base64urlDecode(jwk.x!);
  const pubHex = bufToHex(pubBytes.buffer as ArrayBuffer);

  // Re-export full PKCS8 for storage
  const pkcs8Export = await crypto.subtle.exportKey('pkcs8', privateKey);
  const privHex = bufToHex(pkcs8Export);

  const addressHash = await sha256(pubHex);
  const address = 'STZ' + addressHash.slice(0, 40);

  return { publicKey: pubHex, privateKey: privHex, address };
}
