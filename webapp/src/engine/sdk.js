"use strict";
/**
 * CosmoWarp Public SDK — Developer API
 *
 * Open-source API for building apps on the CosmoWarp ecosystem.
 * Provides read access to the mesh, wallet creation, transaction
 * submission, and event subscriptions.
 *
 * Usage:
 *   const cosmo = new CosmoWarpSDK();
 *   const wallet = await cosmo.createWallet('MyApp User');
 *   const tx = await cosmo.send(wallet, recipientAddress, 100, 'Payment');
 *   const balance = cosmo.getBalance(wallet.address);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosmowarp = exports.CosmoWarpSDK = void 0;
const crypto_1 = require("./crypto");
const tokenomics_1 = require("./tokenomics");
const hierarchy_1 = require("./hierarchy");
const cosmomesh_1 = require("./cosmomesh");
// ─── CosmoWarp SDK ───────────────────────────────────────
class CosmoWarpSDK {
    version = '1.0.0';
    eventListeners = new Map();
    constructor() {
        // Initialize event maps
        const events = [
            'transaction_received',
            'transaction_confirmed',
            'balance_changed',
            'level_up',
            'streak_milestone',
        ];
        for (const event of events) {
            this.eventListeners.set(event, []);
        }
    }
    // ─── Info ────────────────────────────────────────────
    /** Get SDK version */
    getVersion() { return this.version; }
    /** Get protocol constants */
    getProtocolInfo() {
        return {
            name: 'CosmoWarp',
            version: this.version,
            totalSupply: tokenomics_1.TOTAL_SUPPLY,
            airdropAmount: tokenomics_1.AIRDROP_AMOUNT,
            layers: cosmomesh_1.LAYER_NAMES,
            hierarchyLevels: hierarchy_1.HIERARCHY_LEVELS.map(l => ({
                name: l.name,
                title: l.title,
                symbol: l.symbol,
                minTransactions: l.minTransactions,
                rewardMultiplier: l.rewardMultiplier,
            })),
            features: [
                'Ed25519 signatures',
                'SHA-256 hashing',
                'AES-GCM encryption',
                'DAG-based mesh (not blockchain)',
                '7 fractal validation layers',
                'Resonance Consensus',
                'Resonance Decay (golden ratio mining curve)',
                'WebRTC P2P networking',
                'Account hierarchy with 7 levels',
                'Annual streak rewards',
            ],
        };
    }
    // ─── Wallet ──────────────────────────────────────────
    /** Create a new wallet */
    async createWallet(alias) {
        const keyPair = await (0, crypto_1.generateKeyPair)();
        return {
            address: keyPair.address,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            alias,
            createdAt: Date.now(),
        };
    }
    /** Validate an address format */
    validateAddress(address) {
        return (0, crypto_1.isValidAddress)(address);
    }
    /** Shorten an address for display */
    formatAddress(address) {
        return (0, crypto_1.shortAddress)(address);
    }
    // ─── Cryptographic Utilities ─────────────────────────
    /** Hash data with SHA-256 */
    async hash(data) {
        return (0, crypto_1.sha256)(data);
    }
    /** Generate a new Ed25519 key pair */
    async generateKeys() {
        return (0, crypto_1.generateKeyPair)();
    }
    // ─── Mining Calculator ───────────────────────────────
    /** Calculate current mining reward for a given total mined */
    calculateReward(totalMined) {
        return (0, tokenomics_1.calculateMiningReward)(totalMined);
    }
    /** Get the mining reward curve (for charts) */
    getRewardCurve(points = 100) {
        const curve = [];
        const step = 58_000_000 / points;
        for (let i = 0; i <= points; i++) {
            const mined = Math.round(i * step);
            curve.push({ mined, reward: (0, tokenomics_1.calculateMiningReward)(mined) });
        }
        return curve;
    }
    // ─── Events ──────────────────────────────────────────
    /** Subscribe to SDK events */
    on(event, callback) {
        this.eventListeners.get(event)?.push(callback);
    }
    /** Unsubscribe from SDK events */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index >= 0)
                listeners.splice(index, 1);
        }
    }
    /** Emit an event (used internally) */
    emit(event) {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            for (const cb of listeners) {
                try {
                    cb(event);
                }
                catch { /* listener error, ignore */ }
            }
        }
    }
    // ─── Layer Utilities ─────────────────────────────────
    /** Get the layer name for an amount */
    getLayerForAmount(amount) {
        if (amount >= 1000)
            return 'GLYPH';
        if (amount >= 10)
            return 'HELIX';
        return 'GRID';
    }
    /** Get all layer names */
    getLayerNames() {
        return [...cosmomesh_1.LAYER_NAMES];
    }
}
exports.CosmoWarpSDK = CosmoWarpSDK;
// ─── Global SDK Instance ─────────────────────────────────
exports.cosmowarp = new CosmoWarpSDK();
//# sourceMappingURL=sdk.js.map