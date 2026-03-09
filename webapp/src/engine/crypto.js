"use strict";
/**
 * CosmoWarp Crypto Engine — Real Cryptographic Primitives
 *
 * Ed25519 for signatures, SHA-256 for hashing, AES-GCM for encryption.
 * Uses the Web Crypto API (SubtleCrypto) — no dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.sha256Raw = sha256Raw;
exports.doubleSha256 = doubleSha256;
exports.generateKeyPair = generateKeyPair;
exports.signTransaction = signTransaction;
exports.verifySignature = verifySignature;
exports.encryptData = encryptData;
exports.decryptData = decryptData;
exports.computeTxId = computeTxId;
exports.cosmicHashSync = cosmicHashSync;
exports.shortAddress = shortAddress;
exports.isValidAddress = isValidAddress;
exports.randomBytes = randomBytes;
exports.randomHex = randomHex;
exports.encryptPrivateKey = encryptPrivateKey;
exports.decryptPrivateKey = decryptPrivateKey;
exports.deriveWalletSeed = deriveWalletSeed;
exports.generateKeyPairFromSeed = generateKeyPairFromSeed;
// ─── Helpers ─────────────────────────────────────────────
function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
function hexToBuf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
}
function strToBuf(str) {
    return new TextEncoder().encode(str).buffer;
}
// ─── SHA-256 Hashing ─────────────────────────────────────
async function sha256(data) {
    const buf = typeof data === 'string' ? strToBuf(data) : data;
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return bufToHex(hash);
}
async function sha256Raw(data) {
    return crypto.subtle.digest('SHA-256', data);
}
async function doubleSha256(data) {
    const first = await crypto.subtle.digest('SHA-256', strToBuf(data));
    const second = await crypto.subtle.digest('SHA-256', first);
    return bufToHex(second);
}
async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const pubHex = bufToHex(publicKeyRaw);
    const privHex = bufToHex(privateKeyPkcs8);
    // Address = CW + SHA-256(publicKey)[0:40]
    const addressHash = await sha256(pubHex);
    const address = 'CW' + addressHash.slice(0, 40);
    return {
        publicKey: pubHex,
        privateKey: privHex,
        address,
    };
}
// Import keys from hex strings
async function importPrivateKey(hexKey) {
    return crypto.subtle.importKey('pkcs8', hexToBuf(hexKey), { name: 'Ed25519' }, false, ['sign']);
}
async function importPublicKey(hexKey) {
    return crypto.subtle.importKey('raw', hexToBuf(hexKey), { name: 'Ed25519' }, false, ['verify']);
}
// ─── Ed25519 Signing & Verification ─────────────────────
async function signTransaction(data, privateKeyHex) {
    const privKey = await importPrivateKey(privateKeyHex);
    const signature = await crypto.subtle.sign({ name: 'Ed25519' }, privKey, strToBuf(data));
    return bufToHex(signature);
}
async function verifySignature(data, signatureHex, publicKeyHex) {
    try {
        const pubKey = await importPublicKey(publicKeyHex);
        return crypto.subtle.verify({ name: 'Ed25519' }, pubKey, hexToBuf(signatureHex), strToBuf(data));
    }
    catch {
        return false;
    }
}
async function deriveAesKey(sharedSecret) {
    const keyMaterial = await crypto.subtle.importKey('raw', strToBuf(sharedSecret), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({
        name: 'PBKDF2',
        salt: strToBuf('CosmoWarp-AES-Salt-v1'),
        iterations: 100000,
        hash: 'SHA-256',
    }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptData(plaintext, sharedSecret) {
    const key = await deriveAesKey(sharedSecret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, strToBuf(plaintext));
    return {
        ciphertext: bufToHex(ciphertext),
        iv: bufToHex(iv.buffer),
        tag: '', // tag is appended to ciphertext by WebCrypto
    };
}
async function decryptData(payload, sharedSecret) {
    const key = await deriveAesKey(sharedSecret);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBuf(payload.iv) }, key, hexToBuf(payload.ciphertext));
    return new TextDecoder().decode(plaintext);
}
// ─── Deterministic Transaction ID ───────────────────────
async function computeTxId(from, to, amount, timestamp, parentIds) {
    const canonical = `${from}:${to}:${amount}:${timestamp}:${parentIds.sort().join(',')}`;
    return sha256(canonical);
}
// ─── Cosmic Hash (fast non-crypto hash for VM) ──────────
// Kept for backward compatibility with VM opcodes
function cosmicHashSync(input) {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) / 0xffffffff;
}
// ─── Address utilities ──────────────────────────────────
function shortAddress(address) {
    if (address.length <= 12)
        return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
}
function isValidAddress(address) {
    return /^CW[a-f0-9]{40}$/.test(address);
}
// ─── Random bytes ────────────────────────────────────────
function randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}
function randomHex(length) {
    const bytes = randomBytes(length);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
// ─── Wallet Key Encryption ─────────────────────────────
async function encryptPrivateKey(privateKeyHex, password) {
    return encryptData(privateKeyHex, 'COSMOWARP_WALLET_KEY:' + password);
}
async function decryptPrivateKey(payload, password) {
    return decryptData(payload, 'COSMOWARP_WALLET_KEY:' + password);
}
// ─── CosmoID: Deterministic Key Derivation ─────────────
/**
 * Derive a 32-byte Ed25519 seed from username + password.
 * Uses PBKDF2 with 600,000 iterations for brute-force resistance.
 * Same credentials always produce the same seed → same wallet.
 */
async function deriveWalletSeed(username, password) {
    const normalizedUser = username.toLowerCase().trim();
    const salt = `CosmoWarp-CosmoID-v1:${normalizedUser}`;
    const keyMaterial = await crypto.subtle.importKey('raw', strToBuf(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: strToBuf(salt),
        iterations: 600000,
        hash: 'SHA-256',
    }, keyMaterial, 256);
    return new Uint8Array(bits);
}
function base64urlDecode(str) {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4)
        b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    return bytes;
}
/**
 * Generate an Ed25519 key pair from a 32-byte seed (deterministic).
 * Builds PKCS8 from seed, imports via Web Crypto, extracts public key from JWK.
 */
async function generateKeyPairFromSeed(seed) {
    // Ed25519 PKCS8 = 16-byte ASN.1 DER header + 32-byte seed
    const pkcs8Header = new Uint8Array([
        0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
        0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
    ]);
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(pkcs8Header);
    pkcs8.set(seed, 16);
    const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8.buffer, { name: 'Ed25519' }, true, ['sign']);
    // Export as JWK to get public key (x) alongside private key (d)
    const jwk = await crypto.subtle.exportKey('jwk', privateKey);
    const pubBytes = base64urlDecode(jwk.x);
    const pubHex = bufToHex(pubBytes.buffer);
    // Re-export full PKCS8 for storage
    const pkcs8Export = await crypto.subtle.exportKey('pkcs8', privateKey);
    const privHex = bufToHex(pkcs8Export);
    const addressHash = await sha256(pubHex);
    const address = 'CW' + addressHash.slice(0, 40);
    return { publicKey: pubHex, privateKey: privHex, address };
}
//# sourceMappingURL=crypto.js.map