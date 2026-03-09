/**
 * Cosmorare Miner — Real SHA-256 Proof-of-Work
 *
 * Implements genuine PoW mining:
 * - SHA-256 hashing with nonce search
 * - Difficulty target: hash must start with N leading zero bits
 * - Dynamic difficulty adjustment based on mining rate
 * - Verifiable proofs: anyone can check hash(blockData + nonce) < target
 * - Runs in main thread with chunked iterations to avoid UI freeze
 */

import { sha256 } from './crypto';

// ─── Types ────────────────────────────────────────────────

export interface MiningProof {
  blockData: string;       // The full input that was hashed
  nonce: number;           // The winning nonce
  hash: string;            // SHA-256(blockData) — the winning hash
  difficulty: number;      // Difficulty (leading zero bits) at time of mining
  timestamp: number;       // When mining started
  minerAddress: string;    // Miner's wallet address
  previousHash: string;    // Hash of last mined block (chain continuity)
  hashesComputed: number;  // Total hashes tried
  timeTaken: number;       // Milliseconds to find proof
}

export interface MiningResult {
  success: boolean;
  proof: MiningProof | null;
  aborted: boolean;
  hashrate: number;        // Hashes per second achieved
  error?: string;
}

export interface MiningProgress {
  hashesComputed: number;
  currentNonce: number;
  elapsed: number;
  hashrate: number;
  bestHash: string;        // Closest hash found so far
  bestZeroBits: number;    // Leading zero bits in best hash
  targetBits: number;      // Difficulty target in bits
}

export type MiningProgressCallback = (progress: MiningProgress) => void;

// ─── Difficulty ───────────────────────────────────────────

/**
 * Convert difficulty (number of leading zero bits) to a hex target string.
 * A hash is valid if it is lexicographically less than the target.
 *
 * difficulty=4  → target starts with "0"   (1 hex zero)
 * difficulty=8  → target starts with "00"  (2 hex zeros)
 * difficulty=12 → target starts with "000" (3 hex zeros)
 * difficulty=16 → target starts with "0000" (4 hex zeros)
 */
export function difficultyToTarget(difficulty: number): string {
  const fullZeroChars = Math.floor(difficulty / 4);
  const remainingBits = difficulty % 4;
  const nextCharMax = remainingBits > 0 ? (16 >> remainingBits) : 0;
  const nextChar = remainingBits > 0 ? nextCharMax.toString(16) : '';
  const trailingChars = 64 - fullZeroChars - (remainingBits > 0 ? 1 : 0);
  return '0'.repeat(fullZeroChars) + nextChar + 'f'.repeat(trailingChars);
}

/**
 * Check if a hash meets the difficulty target.
 */
export function hashMeetsDifficulty(hash: string, difficulty: number): boolean {
  const target = difficultyToTarget(difficulty);
  return hash <= target;
}

/**
 * Count leading zero bits in a hex hash string.
 */
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
const TARGET_BLOCK_TIME_MS = 15_000;  // Target: 15 seconds per block
const ADJUSTMENT_INTERVAL = 10;       // Adjust every 10 blocks
const MIN_DIFFICULTY = 8;             // Minimum 8 bits (2 hex zeros)
const MAX_DIFFICULTY = 32;            // Maximum 32 bits (8 hex zeros)
const INITIAL_DIFFICULTY = 12;        // Start with 12 bits (3 hex zeros)

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
    if (raw) return JSON.parse(raw);
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

/**
 * Adjust difficulty based on recent block times.
 * If blocks are mined too fast → increase difficulty.
 * If blocks are mined too slow → decrease difficulty.
 */
export function adjustDifficulty(state: DifficultyState): number {
  if (state.recentBlockTimes.length < ADJUSTMENT_INTERVAL) {
    return state.currentDifficulty;
  }

  const recentTimes = state.recentBlockTimes.slice(-ADJUSTMENT_INTERVAL);
  const avgBlockTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
  const ratio = avgBlockTime / TARGET_BLOCK_TIME_MS;

  let newDifficulty = state.currentDifficulty;

  if (ratio < 0.5) {
    newDifficulty += 2;     // Way too fast
  } else if (ratio < 0.8) {
    newDifficulty += 1;     // Slightly too fast
  } else if (ratio > 2.0) {
    newDifficulty -= 2;     // Way too slow
  } else if (ratio > 1.25) {
    newDifficulty -= 1;     // Slightly too slow
  }

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
): string {
  return [
    'CW_BLOCK_V1',
    minerAddress,
    previousHash,
    timestamp.toString(36),
    difficulty.toString(),
    blockHeight.toString(),
    nonce.toString(36),
  ].join(':');
}

// ─── Mining Engine (Chunked for UI responsiveness) ───────

const CHUNK_SIZE = 2000;

/**
 * Mine a block: search for a nonce such that SHA-256(blockData:nonce) < target.
 *
 * Runs in main thread, yields every CHUNK_SIZE hashes for UI responsiveness.
 */
export async function mineBlock(
  minerAddress: string,
  abortSignal: AbortSignal,
  onProgress?: MiningProgressCallback,
): Promise<MiningResult> {
  const state = loadDifficultyState();
  const difficulty = state.currentDifficulty;
  const previousHash = state.lastBlockHash;
  const timestamp = Date.now();
  const blockHeight = state.blocksMined;

  let nonce = 0;
  let hashesComputed = 0;
  const startTime = performance.now();
  let bestZeroBits = 0;
  let bestHash = 'f'.repeat(64);

  while (!abortSignal.aborted) {
    // Process a chunk of hashes
    for (let i = 0; i < CHUNK_SIZE; i++) {
      const candidate = buildBlockData(minerAddress, previousHash, timestamp, difficulty, blockHeight, nonce);
      const hash = await sha256(candidate);
      hashesComputed++;

      // Track best hash found
      const zeroBits = countLeadingZeroBits(hash);
      if (zeroBits > bestZeroBits) {
        bestZeroBits = zeroBits;
        bestHash = hash;
      }

      // Check if hash meets difficulty
      if (hashMeetsDifficulty(hash, difficulty)) {
        const timeTaken = performance.now() - startTime;
        const proof: MiningProof = {
          blockData: candidate,
          nonce,
          hash,
          difficulty,
          timestamp,
          minerAddress,
          previousHash,
          hashesComputed,
          timeTaken,
        };

        // Update difficulty state
        state.blocksMined++;
        state.lastBlockHash = hash;
        state.lastBlockTimestamp = Date.now();
        state.recentBlockTimes.push(timeTaken);
        if (state.recentBlockTimes.length > 30) {
          state.recentBlockTimes = state.recentBlockTimes.slice(-30);
        }

        // Adjust difficulty if needed
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
      });
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // Aborted
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
 * Verify a mining proof. Anyone can call this.
 *
 * Checks:
 * 1. SHA-256(blockData) === proof.hash
 * 2. proof.hash meets the claimed difficulty
 * 3. Block data contains the miner address
 * 4. Valid block data format
 */
export async function verifyProof(proof: MiningProof): Promise<{ valid: boolean; reason: string }> {
  // 1. Recompute hash
  const recomputedHash = await sha256(proof.blockData);
  if (recomputedHash !== proof.hash) {
    return { valid: false, reason: 'Hash mismatch: recomputed hash does not match claimed hash' };
  }

  // 2. Check difficulty
  if (!hashMeetsDifficulty(proof.hash, proof.difficulty)) {
    return { valid: false, reason: `Hash does not meet difficulty ${proof.difficulty}` };
  }

  // 3. Verify miner address is in block data
  if (!proof.blockData.includes(proof.minerAddress)) {
    return { valid: false, reason: 'Block data does not contain miner address' };
  }

  // 4. Verify format
  if (!proof.blockData.startsWith('CW_BLOCK_V1:')) {
    return { valid: false, reason: 'Invalid block data format' };
  }

  return { valid: true, reason: 'Valid proof-of-work' };
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
