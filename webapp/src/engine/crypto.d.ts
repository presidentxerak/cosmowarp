/**
 * CosmoWarp Crypto Engine — Real Cryptographic Primitives
 *
 * Ed25519 for signatures, SHA-256 for hashing, AES-GCM for encryption.
 * Uses the Web Crypto API (SubtleCrypto) — no dependencies.
 */
export declare function sha256(data: string | ArrayBuffer): Promise<string>;
export declare function sha256Raw(data: ArrayBuffer): Promise<ArrayBuffer>;
export declare function doubleSha256(data: string): Promise<string>;
export interface CosmoKeyPair {
    publicKey: string;
    privateKey: string;
    address: string;
}
export declare function generateKeyPair(): Promise<CosmoKeyPair>;
export declare function signTransaction(data: string, privateKeyHex: string): Promise<string>;
export declare function verifySignature(data: string, signatureHex: string, publicKeyHex: string): Promise<boolean>;
export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    tag: string;
}
export declare function encryptData(plaintext: string, sharedSecret: string): Promise<EncryptedPayload>;
export declare function decryptData(payload: EncryptedPayload, sharedSecret: string): Promise<string>;
export declare function computeTxId(from: string, to: string, amount: number, timestamp: number, parentIds: string[]): Promise<string>;
export declare function cosmicHashSync(input: string): number;
export declare function shortAddress(address: string): string;
export declare function isValidAddress(address: string): boolean;
export declare function randomBytes(length: number): Uint8Array;
export declare function randomHex(length: number): string;
export declare function encryptPrivateKey(privateKeyHex: string, password: string): Promise<EncryptedPayload>;
export declare function decryptPrivateKey(payload: EncryptedPayload, password: string): Promise<string>;
/**
 * Derive a 32-byte Ed25519 seed from username + password.
 * Uses PBKDF2 with 600,000 iterations for brute-force resistance.
 * Same credentials always produce the same seed → same wallet.
 */
export declare function deriveWalletSeed(username: string, password: string): Promise<Uint8Array>;
/**
 * Generate an Ed25519 key pair from a 32-byte seed (deterministic).
 * Builds PKCS8 from seed, imports via Web Crypto, extracts public key from JWK.
 */
export declare function generateKeyPairFromSeed(seed: Uint8Array): Promise<CosmoKeyPair>;
//# sourceMappingURL=crypto.d.ts.map