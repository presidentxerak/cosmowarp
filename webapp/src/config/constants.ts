/**
 * Strangrz Platform Constants — Single source of truth
 *
 * All tunable parameters centralized here. Engine files import from this module
 * instead of defining inline values.
 */

// ─── Platform Fees ────────────────────────────────────────

/** Platform fee on first sale (lazy mint → buyer pays) */
export const PRIMARY_MARKET_FEE_PERCENT = 10;

/** Platform fee on resale (secondary market) */
export const SECONDARY_MARKET_FEE_PERCENT = 5;

/** Payment processor fee schedules */
export const PROCESSOR_FEES = {
  card:          { percent: 2.9,  fixed: 0.30 },
  paypal:        { percent: 3.49, fixed: 0.49 },
  sepa:          { percent: 0.8,  fixed: 0 },
  apple_pay:     { percent: 2.9,  fixed: 0.30 },
  google_pay:    { percent: 2.9,  fixed: 0.30 },
  bank_transfer: { percent: 0,    fixed: 1.50 },
  internal:      { percent: 0,    fixed: 0 },
} as const;

// ─── Tokenomics ───────────────────────────────────────────

export const TOTAL_SUPPLY = 69_000_000;
export const CREATOR_LOCKED = 1_000_000;
export const AIRDROP_AMOUNT = 300;
export const AIRDROP_POOL = 10_000_000;
export const MINING_POOL = TOTAL_SUPPLY - CREATOR_LOCKED - AIRDROP_POOL;
export const BASE_MINING_REWARD = 50;
export const STREAK_REWARD = 10_000;
export const STREAK_DAYS_REQUIRED = 365;
export const PURCHASE_REWARD = 100;
export const AIRDROP_THRESHOLD = 2000;
export const GOLDEN_RATIO = 1.618033988749895;
export const DECAY_CONSTANT = 5_000_000;

// ─── Storage Fee Tiers ────────────────────────────────────

export const STORAGE_FEE_TIERS = [
  { maxBytes: 1 * 1024 * 1024,   fee: 50 },    // < 1MB
  { maxBytes: 5 * 1024 * 1024,   fee: 100 },   // < 5MB
  { maxBytes: 25 * 1024 * 1024,  fee: 250 },   // < 25MB
  { maxBytes: 50 * 1024 * 1024,  fee: 500 },   // < 50MB
] as const;

// ─── Exchange Rates (anchor: 1 STZ = 0.10 EUR) ───────────

export const STZ_ANCHOR_EUR = 0.10;
export const DEFAULT_EXCHANGE_RATES = {
  EUR: 10,      // 1 EUR = 10 STZ
  USD: 9.1,     // based on EUR/USD ≈ 1.10
  GBP: 11.7,    // based on GBP/USD ≈ 1.29
  JPY: 0.061,   // based on USD/JPY ≈ 150
  CHF: 10.3,    // based on USD/CHF ≈ 0.89
} as const;

export const ETH_REFERENCE_PRICE_USD = 2500;
export const ETH_VOLATILITY_BAND = 0.20;

// ─── Mining / Difficulty ──────────────────────────────────

export const TARGET_BLOCK_TIME_MS = 600_000;       // 10 minutes
export const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;   // every 10 blocks
export const MIN_DIFFICULTY = 16;                   // bits
export const MAX_DIFFICULTY = 64;                   // bits
export const INITIAL_DIFFICULTY = 20;               // ~1M hashes
export const MAX_ADJUSTMENT_FACTOR = 4;             // 4x max change per period

// ─── Blockchain / Shards ──────────────────────────────────

export const SHARD_COUNT = 7;
export const SHARD_BLOCK_TIME_MS = 1_500;           // 1.5s per shard block
export const BEACON_BLOCK_INTERVAL = 10;
export const MAX_TX_PER_SHARD_BLOCK = 1000;
export const MAX_TX_PER_SECOND = 7000;              // theoretical
export const CHAIN_RATE_LIMIT_PER_MINUTE = 100;
export const GAS_COST = 0;

// ─── Security / Rate Limits ───────────────────────────────

export const SECURITY_MAX_TX_PER_MINUTE = 10;
export const SECURITY_MAX_TX_PER_HOUR = 100;
export const SECURITY_MAX_TX_PER_DAY = 1000;
export const SECURITY_BLOCK_DURATION_MS = 300_000;  // 5 min
export const SECURITY_MAX_VIOLATIONS = 5;

/** Progressive limits based on account age (hours) */
export const PROGRESSIVE_TX_LIMITS = [
  { ageHours: 0,   maxSingleTx: 100,    maxDailyTotal: 500 },
  { ageHours: 24,  maxSingleTx: 1000,   maxDailyTotal: 5000 },
  { ageHours: 168, maxSingleTx: 10000,  maxDailyTotal: 50000 },
  { ageHours: 720, maxSingleTx: 100000, maxDailyTotal: 500000 },
] as const;

// ─── Consensus ────────────────────────────────────────────

export const RESONANCE_THRESHOLD = 0.67;            // 2/3 supermajority
export const LAYER_WEIGHT_DECAY = 0.95;
export const PBFT_VIEW_CHANGE_TIMEOUT_MS = 5000;
export const MIN_STAKE_AMOUNT = 100;
export const BLOCK_REWARD = 50;

// ─── Networking ───────────────────────────────────────────

export const PRESENCE_UPDATE_INTERVAL_MS = 10_000;
export const TIP_SYNC_INTERVAL_MS = 30_000;
export const MESH_SUMMARY_INTERVAL_MS = 60_000;
export const DISCOVERY_CONNECT_INTERVAL_MS = 15_000;
export const SIGNALING_ANNOUNCE_INTERVAL_MS = 5000;
export const MAX_RECONNECT_DELAY_MS = 30_000;
export const MAX_PEERS = 20;
export const MAX_NEW_CONNECTIONS = 3;

// ─── Cryptography ─────────────────────────────────────────

export const PBKDF2_ITERATIONS_STANDARD = 100_000;
export const PBKDF2_ITERATIONS_HIGH = 600_000;

// ─── TOTP ─────────────────────────────────────────────────

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;

// ─── Media & Data ─────────────────────────────────────────

export const MAX_MEDIA_DATA_LENGTH = 5000;
export const MAX_CACHE_SIZE = 10_000;
export const INTEGRITY_CHECK_INTERVAL_MS = 300_000; // 5 min
export const NONCE_TTL_MS = 3_600_000;              // 1 hour

// ─── Auctions ─────────────────────────────────────────────

export const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;      // 5 minutes
export const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000;   // extend by 5 minutes
export const MAX_TAGS_PER_WART = 5;

// ─── Hierarchy ────────────────────────────────────────────
// Level definitions are kept in hierarchy.ts as they include
// UI metadata (names, symbols, colors, descriptions).
// Only numeric thresholds could be extracted, but the levels
// array is self-documenting — no benefit to splitting it.

// ─── Storage Keys ─────────────────────────────────────────

export const STORAGE_KEYS = {
  WALLET: 'strangrz_wallet',
  SOCIAL: 'strangrz_social',
  GLOBAL_TX: 'strangrz_global_tx',
  MESH: 'strangrz_mesh',
  CONSENSUS: 'strangrz_consensus',
  ADMIN_ADDRESS: 'strangrz_admin_address',
  DAILY_TOTALS: 'strangrz_daily_totals',
  WARTS: 'strangrz_warts',
  CERT_REGISTRY: 'strangrz_cert_registry',
  TOKENOMICS: 'strangrz_tokenomics',
  HIERARCHY: 'strangrz_hierarchy',
  FIAT_RATES: 'strangrz_fiat_rates',
  FIAT_TX: 'strangrz_fiat_tx',
  FIAT_LISTINGS: 'strangrz_fiat_listings',
  MINING_DIFFICULTY: 'strangrz_mining_difficulty',
  MINING_HISTORY: 'strangrz_mining_history',
} as const;
