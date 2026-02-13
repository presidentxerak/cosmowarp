/**
 * CosmoASM - Assembleur Cosmique
 * 32 opcodes répartis en 4 familles de 8
 */

// ═══════════════════════════════════════════════════════
// Famille FLUX (0x00 - 0x07) — Énergie & Déplacement
// ═══════════════════════════════════════════════════════
export enum FluxOp {
  WARP_INIT    = 0x00,  // Initialisation du warp
  ENERGY_LOAD  = 0x01,  // Chargement d'énergie
  FLUX_GATE    = 0x02,  // Porte de flux
  QUANTUM_JUMP = 0x03,  // Saut quantique
  FOLD_SPACE   = 0x04,  // Pliage spatial
  SYNC_PULSE   = 0x05,  // Impulsion de synchronisation
  DRIFT_ALIGN  = 0x06,  // Alignement de dérive
  VOID_BRIDGE  = 0x07,  // Pont du vide
}

// ═══════════════════════════════════════════════════════
// Famille CONSCIENCE (0x08 - 0x0F) — Esprit & Perception
// ═══════════════════════════════════════════════════════
export enum ConscienceOp {
  MIND_LINK    = 0x08,  // Lien mental
  DREAM_WEAVE  = 0x09,  // Tissage de rêve
  SOUL_SYNC    = 0x0A,  // Synchronisation d'âme
  ECHO_THOUGHT = 0x0B,  // Écho de pensée
  PSI_BURST    = 0x0C,  // Rafale psi
  NEURAL_MAP   = 0x0D,  // Carte neurale
  KARMA_CHECK  = 0x0E,  // Vérification karmique
  COSMO_SENSE  = 0x0F,  // Sens cosmique
}

// ═══════════════════════════════════════════════════════
// Famille CRYPTO (0x10 - 0x17) — Chiffrement & Preuve
// ═══════════════════════════════════════════════════════
export enum CryptoOp {
  HASH_STAR     = 0x10,  // Hash stellaire
  SIGN_NEBULA   = 0x11,  // Signature nébuleuse
  ENCRYPT_VOID  = 0x12,  // Chiffrement du vide
  DECRYPT_LIGHT = 0x13,  // Déchiffrement lumière
  KEY_FORGE     = 0x14,  // Forge de clé
  PROOF_COSMIC  = 0x15,  // Preuve cosmique
  VERIFY_GLYPH  = 0x16,  // Vérification de glyphe
  SEAL_QUANTUM  = 0x17,  // Sceau quantique
}

// ═══════════════════════════════════════════════════════
// Famille RÉSEAU (0x18 - 0x1F) — Communication & Maillage
// ═══════════════════════════════════════════════════════
export enum ReseauOp {
  NODE_CONNECT   = 0x18,  // Connexion de noeud
  MESH_WEAVE     = 0x19,  // Tissage de maillage
  SIGNAL_BURST   = 0x1A,  // Rafale de signal
  RELAY_CHAIN    = 0x1B,  // Chaîne de relais
  ORBIT_SYNC     = 0x1C,  // Synchronisation orbitale
  PEER_DISCOVER  = 0x1D,  // Découverte de pair
  CHANNEL_OPEN   = 0x1E,  // Ouverture de canal
  BROADCAST_WAVE = 0x1F,  // Onde de diffusion
}

// Union de tous les opcodes
export type CosmoOpcode = FluxOp | ConscienceOp | CryptoOp | ReseauOp;

// Familles d'opcodes
export enum OpcodeFamily {
  FLUX       = 'FLUX',
  CONSCIENCE = 'CONSCIENCE',
  CRYPTO     = 'CRYPTO',
  RESEAU     = 'RÉSEAU',
}

export function getOpcodeFamily(opcode: number): OpcodeFamily {
  if (opcode >= 0x00 && opcode <= 0x07) return OpcodeFamily.FLUX;
  if (opcode >= 0x08 && opcode <= 0x0F) return OpcodeFamily.CONSCIENCE;
  if (opcode >= 0x10 && opcode <= 0x17) return OpcodeFamily.CRYPTO;
  if (opcode >= 0x18 && opcode <= 0x1F) return OpcodeFamily.RESEAU;
  throw new Error(`Opcode invalide: 0x${opcode.toString(16).padStart(2, '0')}`);
}

export function getOpcodeName(opcode: number): string {
  const names: Record<number, string> = {
    // FLUX
    0x00: 'WARP_INIT',    0x01: 'ENERGY_LOAD',  0x02: 'FLUX_GATE',
    0x03: 'QUANTUM_JUMP', 0x04: 'FOLD_SPACE',   0x05: 'SYNC_PULSE',
    0x06: 'DRIFT_ALIGN',  0x07: 'VOID_BRIDGE',
    // CONSCIENCE
    0x08: 'MIND_LINK',    0x09: 'DREAM_WEAVE',  0x0A: 'SOUL_SYNC',
    0x0B: 'ECHO_THOUGHT', 0x0C: 'PSI_BURST',    0x0D: 'NEURAL_MAP',
    0x0E: 'KARMA_CHECK',  0x0F: 'COSMO_SENSE',
    // CRYPTO
    0x10: 'HASH_STAR',    0x11: 'SIGN_NEBULA',  0x12: 'ENCRYPT_VOID',
    0x13: 'DECRYPT_LIGHT',0x14: 'KEY_FORGE',    0x15: 'PROOF_COSMIC',
    0x16: 'VERIFY_GLYPH', 0x17: 'SEAL_QUANTUM',
    // RÉSEAU
    0x18: 'NODE_CONNECT', 0x19: 'MESH_WEAVE',   0x1A: 'SIGNAL_BURST',
    0x1B: 'RELAY_CHAIN',  0x1C: 'ORBIT_SYNC',   0x1D: 'PEER_DISCOVER',
    0x1E: 'CHANNEL_OPEN', 0x1F: 'BROADCAST_WAVE',
  };
  return names[opcode] ?? `UNKNOWN(0x${opcode.toString(16).padStart(2, '0')})`;
}

// Map nom -> opcode pour le parsing
export const OPCODE_BY_NAME: Record<string, number> = {};
for (let i = 0; i <= 0x1F; i++) {
  OPCODE_BY_NAME[getOpcodeName(i)] = i;
}
