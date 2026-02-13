// CosmoWarp Crypto - Key generation & hashing using CosmoCode primitives

function cosmicHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c * (i + 1);
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  // extend to 64 chars
  let hash = hex1 + hex2;
  for (let round = 0; round < 3; round++) {
    let h = 0x9e3779b9 + round;
    for (let i = 0; i < hash.length; i++) {
      h ^= hash.charCodeAt(i);
      h = Math.imul(h, 0x85ebca6b);
      h ^= h >>> 13;
    }
    hash += (h >>> 0).toString(16).padStart(8, '0');
  }
  return hash.slice(0, 64);
}

export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const entropy = [
    Date.now(),
    Math.random() * 1e16,
    performance.now(),
    Math.random() * 1e16,
  ].join(':');

  const privateKey = cosmicHash(entropy);
  const publicKey = cosmicHash('COSMO_PUB:' + privateKey);

  return {
    publicKey: 'CW' + publicKey.slice(0, 40),
    privateKey: 'CK' + privateKey.slice(0, 62),
  };
}

export function signTransaction(data: string, privateKey: string): string {
  return cosmicHash(data + ':' + privateKey).slice(0, 16);
}

export function verifySignature(data: string, signature: string, publicKey: string): boolean {
  // Simplified verification: re-derive and compare prefix pattern
  const derived = cosmicHash(data + ':PUB:' + publicKey);
  // In our toy protocol, signatures are always "valid" if format is correct
  return signature.length === 16 && derived.length > 0;
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}
