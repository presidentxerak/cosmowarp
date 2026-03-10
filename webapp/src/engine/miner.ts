/**
 * Cosmorare Resonance Miner — φ-Chain Proof-of-Work
 *
 * A unique mining algorithm built around Cosmorare's golden ratio (φ) philosophy.
 * NOT a Bitcoin clone — this is a 3-phase hash chain specific to Cosmorare:
 *
 *   Phase 1 — SEED:      SHA-256(blockHeader + nonce) → seedHash
 *   Phase 2 — RESONANCE: Golden ratio byte-mixing of seedHash → resonanceData
 *   Phase 3 — PROOF:     SHA-256(resonanceData) → finalHash
 *
 * The φ-mixing in Phase 2 makes this algorithm unique:
 * - Each byte of the seed hash is XOR'd with a φ-derived rotation key
 * - The rotation pattern follows the golden angle (≈137.508°)
 * - This creates a non-trivial transformation that cannot be shortcut
 * - The final hash must meet the difficulty target (leading zero bits)
 *
 * Difficulty is Bitcoin-grade:
 * - 10-minute target block time
 * - Dynamic adjustment every 10 blocks (faster adaptation for browser mining)
 * - Max 4x adjustment per period
 * - Range: 16 to 64 bits (20 bits initial ≈ 1M hashes average)
 *
 * Each block also carries a "certification payload" — a reference to
 * Cosmorares being validated, tying mining directly to the ecosystem.
 */

import { sha256Raw } from './crypto';

// ─── Constants ────────────────────────────────────────────

const PHI = 1.618033988749895;                    // Golden ratio
const GOLDEN_ANGLE_RAD = 2 * Math.PI / (PHI + 1); // Golden angle ≈ 2.399 rad
const PHI_FRAC = PHI - 1;                         // 0.618... fractional part

// ─── Types ────────────────────────────────────────────────

export interface MiningProof {
  blockData: string;       // Phase 1 input
  nonce: number;           // The winning nonce
  hash: string;            // Final hash after φ-chain (Phase 3 output)
  seedHash: string;        // Phase 1 output (for verification)
  resonanceKey: string;    // φ-rotation key used (hex, for verification)
  difficulty: number;      // Difficulty (leading zero bits) at time of mining
  timestamp: number;       // When mining started
  minerAddress: string;    // Miner's wallet address
  previousHash: string;    // Hash of last mined block (chain continuity)
  hashesComputed: number;  // Total hashes tried
  timeTaken: number;       // Milliseconds to find proof
  certPayload: string;     // Certification payload (artworks referenced)
}

export interface MiningResult {
  success: boolean;
  proof: MiningProof | null;
  aborted: boolean;
  hashrate: number;
  error?: string;
}

export interface MiningProgress {
  hashesComputed: number;
  currentNonce: number;
  elapsed: number;
  hashrate: number;
  bestHash: string;
  bestZeroBits: number;
  targetBits: number;
  phase: 'seed' | 'resonance' | 'proof';  // Current phase indicator
}

export type MiningProgressCallback = (progress: MiningProgress) => void;

// ─── φ-Chain Hash Functions ──────────────────────────────

/**
 * Generate the golden ratio rotation key for Phase 2.
 * 32 bytes derived from φ, each byte = floor(256 * frac(i * φ))
 * This creates a deterministic but non-trivial mixing pattern.
 */
function generatePhiRotationKey(): Uint8Array {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    // Use golden angle to generate each byte
    const angle = (i + 1) * GOLDEN_ANGLE_RAD;
    const phiMix = ((i + 1) * PHI_FRAC) % 1;
    key[i] = Math.floor(256 * ((Math.sin(angle) * 0.5 + 0.5) * phiMix + (1 - phiMix) * ((Math.cos(angle * PHI) * 0.5 + 0.5))));
  }
  return key;
}

/**
 * Phase 2: Resonance mixing.
 * XOR the seed hash bytes with the φ-rotation key, then apply
 * golden spiral byte permutation.
 */
function resonanceMix(seedBytes: Uint8Array, phiKey: Uint8Array): Uint8Array {
  const mixed = new Uint8Array(32);

  // Step 1: XOR with φ-key
  for (let i = 0; i < 32; i++) {
    mixed[i] = seedBytes[i] ^ phiKey[i];
  }

  // Step 2: Golden spiral permutation
  // Each byte position is mapped to a new position using φ-based indexing
  const permuted = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const newPos = Math.floor(((i * PHI) % 32 + mixed[i] / 256 * PHI_FRAC) % 32);
    permuted[newPos] ^= mixed[i]; // XOR to avoid collisions
  }

  // Step 3: Chain — each byte depends on the previous (avalanche effect)
  for (let i = 1; i < 32; i++) {
    permuted[i] ^= ((permuted[i - 1] * 137 + 1) & 0xFF); // 137 ≈ golden angle in degrees
  }

  return permuted;
}

/**
 * Full φ-Chain hash: seed → resonance → proof
 * Returns the final hash string.
 */
async function phiChainHash(input: string, phiKey: Uint8Array): Promise<{ finalHash: string; seedHash: string }> {
  // Phase 1: SHA-256 seed
  const seedBuffer = await sha256Raw(new TextEncoder().encode(input).buffer);
  const seedBytes = new Uint8Array(seedBuffer);
  const seedHash = Array.from(seedBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Phase 2: Resonance mixing with φ-key
  const resonanceBytes = resonanceMix(seedBytes, phiKey);

  // Phase 3: SHA-256 of resonance data → final proof hash
  const finalBuffer = await sha256Raw(new Uint8Array(resonanceBytes).buffer as ArrayBuffer);
  const finalHash = Array.from(new Uint8Array(finalBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  return { finalHash, seedHash };
}

// ─── Difficulty ───────────────────────────────────────────

export function difficultyToTarget(difficulty: number): string {
  const fullZeroChars = Math.floor(difficulty / 4);
  const remainingBits = difficulty % 4;
  const nextCharMax = remainingBits > 0 ? (16 >> remainingBits) : 0;
  const nextChar = remainingBits > 0 ? nextCharMax.toString(16) : '';
  const trailingChars = 64 - fullZeroChars - (remainingBits > 0 ? 1 : 0);
  return '0'.repeat(fullZeroChars) + nextChar + 'f'.repeat(trailingChars);
}

export function hashMeetsDifficulty(hash: string, difficulty: number): boolean {
  const target = difficultyToTarget(difficulty);
  return hash <= target;
}

export function countLeadingZeroBits(hash: string): number {
  let bits = 0;
  for (const char of hash) {
    const val = parseInt(char, 16);
    if (val === 0) {
      bits += 4;
    } else {
      if (val < 2) bits += 3;
      else if (val < 4) bits += 2;
      else if (val < 8) bits += 1;
      break;
    }
  }
  return bits;
}

// ─── Difficulty Adjustment ────────────────────────────────

const DIFFICULTY_STORAGE_KEY = 'cosmorare_mining_difficulty';
const MINING_HISTORY_KEY = 'cosmorare_mining_history';
const TARGET_BLOCK_TIME_MS = 600_000;    // 10 minutes per block
const ADJUSTMENT_INTERVAL = 10;          // Adjust every 10 blocks (faster feedback for browser)
const MIN_DIFFICULTY = 16;               // 16 bits minimum
const MAX_DIFFICULTY = 64;               // 64 bits maximum (full range)
const INITIAL_DIFFICULTY = 20;           // ~1M hashes average
const MAX_ADJUSTMENT_FACTOR = 4;         // Max 4x change per adjustment

export interface DifficultyState {
  currentDifficulty: number;
  blocksMined: number;
  lastAdjustmentBlock: number;
  recentBlockTimes: number[];
  lastBlockHash: string;
  lastBlockTimestamp: number;
}

export function loadDifficultyState(): DifficultyState {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.currentDifficulty < MIN_DIFFICULTY) {
        state.currentDifficulty = INITIAL_DIFFICULTY;
      }
      return state;
    }
  } catch { /* ignore */ }
  return {
    currentDifficulty: INITIAL_DIFFICULTY,
    blocksMined: 0,
    lastAdjustmentBlock: 0,
    recentBlockTimes: [],
    lastBlockHash: '0'.repeat(64),
    lastBlockTimestamp: Date.now(),
  };
}

export function saveDifficultyState(state: DifficultyState): void {
  localStorage.setItem(DIFFICULTY_STORAGE_KEY, JSON.stringify(state));
}

export function adjustDifficulty(state: DifficultyState): number {
  if (state.recentBlockTimes.length < ADJUSTMENT_INTERVAL) {
    return state.currentDifficulty;
  }

  const recentTimes = state.recentBlockTimes.slice(-ADJUSTMENT_INTERVAL);
  const actualTime = recentTimes.reduce((a, b) => a + b, 0);
  const expectedTime = ADJUSTMENT_INTERVAL * TARGET_BLOCK_TIME_MS;

  let ratio = expectedTime / actualTime;
  ratio = Math.max(1 / MAX_ADJUSTMENT_FACTOR, Math.min(MAX_ADJUSTMENT_FACTOR, ratio));

  const bitsChange = Math.round(Math.log2(ratio));
  const newDifficulty = state.currentDifficulty + bitsChange;

  return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, newDifficulty));
}

// ─── Block Data Construction ─────────────────────────────

function buildBlockData(
  minerAddress: string,
  previousHash: string,
  timestamp: number,
  difficulty: number,
  blockHeight: number,
  nonce: number,
  certPayload: string,
): string {
  return [
    'CW_RESONANCE_V1',          // Cosmorare Resonance block
    previousHash,                // Chain continuity
    timestamp.toString(16),      // Timestamp hex
    difficulty.toString(16),     // Difficulty hex
    blockHeight.toString(16),    // Block height hex
    minerAddress,                // Miner address
    certPayload || 'GENESIS',   // Certification payload
    nonce.toString(16),          // Nonce hex
  ].join(':');
}

// ─── Mining Engine ───────────────────────────────────────

const CHUNK_SIZE = 3000;

/**
 * Mine a block using the φ-Chain Resonance algorithm.
 *
 * For each nonce candidate:
 *   1. SHA-256(blockHeader + nonce) → seedHash
 *   2. φ-Resonance mixing (golden ratio XOR + spiral permutation) → resonanceData
 *   3. SHA-256(resonanceData) → finalHash
 *   4. Check: finalHash < difficultyTarget?
 *
 * The 3-phase chain with φ-mixing makes each hash ~2x slower than plain SHA-256
 * (comparable to Bitcoin's double-SHA-256) while being unique to Cosmorare.
 *
 * At 20 bits: ~1M hashes avg → minutes
 * At 24 bits: ~16M hashes → tens of minutes
 * At 28 bits: ~268M hashes → hours
 */
export async function mineBlock(
  minerAddress: string,
  abortSignal: AbortSignal,
  onProgress?: MiningProgressCallback,
  certPayload: string = '',
): Promise<MiningResult> {
  const state = loadDifficultyState();
  const difficulty = state.currentDifficulty;
  const previousHash = state.lastBlockHash;
  const timestamp = Date.now();
  const blockHeight = state.blocksMined;

  // Pre-compute the φ-rotation key (deterministic, same for all miners)
  const phiKey = generatePhiRotationKey();
  const phiKeyHex = Array.from(phiKey).map(b => b.toString(16).padStart(2, '0')).join('');

  let nonce = 0;
  let hashesComputed = 0;
  const startTime = performance.now();
  let bestZeroBits = 0;
  let bestHash = 'f'.repeat(64);

  while (!abortSignal.aborted) {
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const candidate = buildBlockData(minerAddress, previousHash, timestamp, difficulty, blockHeight, nonce, certPayload);

      // φ-Chain: seed → resonance → proof
      const { finalHash, seedHash } = await phiChainHash(candidate, phiKey);
      hashesComputed++;

      const zeroBits = countLeadingZeroBits(finalHash);
      if (zeroBits > bestZeroBits) {
        bestZeroBits = zeroBits;
        bestHash = finalHash;
      }

      if (hashMeetsDifficulty(finalHash, difficulty)) {
        const timeTaken = performance.now() - startTime;
        const proof: MiningProof = {
          blockData: candidate,
          nonce,
          hash: finalHash,
          seedHash,
          resonanceKey: phiKeyHex,
          difficulty,
          timestamp,
          minerAddress,
          previousHash,
          hashesComputed,
          timeTaken,
          certPayload: certPayload || 'GENESIS',
        };

        // Update state
        state.blocksMined++;
        state.lastBlockHash = finalHash;
        state.lastBlockTimestamp = Date.now();
        state.recentBlockTimes.push(timeTaken);
        if (state.recentBlockTimes.length > ADJUSTMENT_INTERVAL * 3) {
          state.recentBlockTimes = state.recentBlockTimes.slice(-ADJUSTMENT_INTERVAL);
        }

        if (state.blocksMined - state.lastAdjustmentBlock >= ADJUSTMENT_INTERVAL) {
          state.currentDifficulty = adjustDifficulty(state);
          state.lastAdjustmentBlock = state.blocksMined;
        }

        saveDifficultyState(state);

        return {
          success: true,
          proof,
          aborted: false,
          hashrate: Math.round(hashesComputed / (timeTaken / 1000)),
        };
      }

      nonce++;
    }

    // Yield to UI
    const elapsed = performance.now() - startTime;
    const hashrate = elapsed > 0 ? Math.round(hashesComputed / (elapsed / 1000)) : 0;

    if (onProgress) {
      onProgress({
        hashesComputed,
        currentNonce: nonce,
        elapsed,
        hashrate,
        bestHash,
        bestZeroBits,
        targetBits: difficulty,
        phase: 'resonance',
      });
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const elapsed = performance.now() - startTime;
  return {
    success: false,
    proof: null,
    aborted: true,
    hashrate: elapsed > 0 ? Math.round(hashesComputed / (elapsed / 1000)) : 0,
  };
}

// ─── Proof Verification ──────────────────────────────────

/**
 * Verify a Resonance mining proof.
 *
 * Re-executes the full φ-chain:
 *   1. SHA-256(blockData) → must match proof.seedHash
 *   2. φ-Resonance mix with the same key → resonanceData
 *   3. SHA-256(resonanceData) → must match proof.hash
 *   4. proof.hash must meet difficulty
 */
export async function verifyProof(proof: MiningProof): Promise<{ valid: boolean; reason: string }> {
  // Reconstruct φ-key
  const phiKey = generatePhiRotationKey();
  const phiKeyHex = Array.from(phiKey).map(b => b.toString(16).padStart(2, '0')).join('');

  // Verify φ-key matches
  if (phiKeyHex !== proof.resonanceKey) {
    return { valid: false, reason: 'Resonance key mismatch' };
  }

  // Re-execute full φ-chain
  const { finalHash, seedHash } = await phiChainHash(proof.blockData, phiKey);

  if (seedHash !== proof.seedHash) {
    return { valid: false, reason: 'Seed hash mismatch (Phase 1 failed)' };
  }

  if (finalHash !== proof.hash) {
    return { valid: false, reason: 'Final hash mismatch (Phase 3 failed)' };
  }

  if (!hashMeetsDifficulty(proof.hash, proof.difficulty)) {
    return { valid: false, reason: `Hash does not meet difficulty ${proof.difficulty} bits` };
  }

  if (!proof.blockData.includes(proof.minerAddress)) {
    return { valid: false, reason: 'Block data does not contain miner address' };
  }

  if (!proof.blockData.startsWith('CW_RESONANCE_V1:') && !proof.blockData.startsWith('CW_BLOCK_V')) {
    return { valid: false, reason: 'Invalid block format' };
  }

  return { valid: true, reason: 'Valid φ-Chain Resonance proof-of-work' };
}

// ─── Mining History ──────────────────────────────────────

export interface MiningHistoryEntry {
  hash: string;
  nonce: number;
  difficulty: number;
  hashrate: number;
  timeTaken: number;
  reward: number;
  timestamp: number;
}

export function loadMiningHistory(): MiningHistoryEntry[] {
  try {
    const raw = localStorage.getItem(MINING_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function addMiningHistory(entry: MiningHistoryEntry): void {
  const history = loadMiningHistory();
  history.unshift(entry);
  localStorage.setItem(MINING_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}
