"use strict";
/**
 * CosmoMesh — DAG-Based Transactional Fabric
 *
 * NOT a blockchain. A Directed Acyclic Graph of transactions where:
 * - Each transaction references 2+ parent transactions (validates them)
 * - 7 parallel validation lanes (fractal layers) for massive throughput
 * - Instant settlement via Resonance Consensus
 * - No blocks, no miners, no chain — just a living mesh of transactions
 *
 * Key innovations over blockchain:
 * - Parallel validation across 7 layers = 7x throughput potential
 * - Each new TX validates 2 previous = natural spam prevention
 * - DAG structure = no orphan blocks, no forks
 * - Resonance scoring = probabilistic finality in <1 second
 *
 * Key innovations over fiat:
 * - P2P = no intermediary, no bank
 * - Ed25519 signatures = unforgeable
 * - Merkle-DAG = fully auditable
 * - CosmoASM programmable = smart contracts via VM
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CosmoMesh = exports.LAYER_NAMES = exports.MeshLayer = void 0;
exports.assignLayer = assignLayer;
const crypto_1 = require("./crypto");
const merkle_1 = require("./merkle");
// ─── Fractal Layers ──────────────────────────────────────
exports.MeshLayer = {
    GRID: 0, // Micro-transactions (< 10 Ω)
    HELIX: 1, // Standard transfers (10-100 Ω)
    GLYPH: 2, // Large transfers (100-1000 Ω)
    COSMO: 3, // System operations (governance, staking)
    CHRONOS: 4, // Time-locked transactions
    NEXUS: 5, // Cross-layer bridges
    LUMINA: 6, // Genesis & epoch transitions
};
exports.LAYER_NAMES = ['GRID', 'HELIX', 'GLYPH', 'COSMO', 'CHRONOS', 'NEXUS', 'LUMINA'];
/** Determine which layer a transaction belongs to based on amount and type */
function assignLayer(amount, type) {
    if (type === 'genesis' || type === 'epoch')
        return exports.MeshLayer.LUMINA;
    if (type === 'bridge')
        return exports.MeshLayer.NEXUS;
    if (type === 'timelock')
        return exports.MeshLayer.CHRONOS;
    if (type === 'governance')
        return exports.MeshLayer.COSMO;
    if (amount >= 1000)
        return exports.MeshLayer.GLYPH;
    if (amount >= 10)
        return exports.MeshLayer.HELIX;
    return exports.MeshLayer.GRID;
}
// ─── CosmoMesh Engine ────────────────────────────────────
class CosmoMesh {
    transactions = new Map();
    merkleDAG = new merkle_1.MerkleDAG();
    balances = new Map();
    tipsByLayer = new Map();
    childIndex = new Map(); // parent -> children
    genesisId = null;
    // Layer-specific throughput counters
    layerTps = new Map();
    constructor() {
        // Initialize layer tip sets
        for (let i = 0; i <= exports.MeshLayer.LUMINA; i++) {
            this.tipsByLayer.set(i, new Set());
            this.layerTps.set(i, []);
        }
    }
    get size() { return this.transactions.size; }
    // ─── Genesis ─────────────────────────────────────────
    async createGenesis(address, amount = 1000) {
        const timestamp = Date.now();
        const id = await (0, crypto_1.computeTxId)('COSMO_GENESIS', address, amount, timestamp, []);
        const tx = {
            id,
            from: 'COSMO_GENESIS',
            to: address,
            amount,
            timestamp,
            signature: 'genesis',
            publicKey: '',
            parentIds: [],
            layer: exports.MeshLayer.LUMINA,
            type: 'genesis',
            memo: `CosmoMesh Genesis — ${amount} Ω created`,
            resonanceScore: 1.0, // Genesis is fully confirmed
            confirmations: 0,
            meshDepth: 0,
        };
        this.transactions.set(id, tx);
        this.balances.set(address, (this.balances.get(address) || 0) + amount);
        this.tipsByLayer.get(exports.MeshLayer.LUMINA).add(id);
        this.childIndex.set(id, new Set());
        this.genesisId = id;
        // Add to Merkle DAG
        await this.merkleDAG.addGenesis(JSON.stringify(tx));
        return tx;
    }
    // ─── Transaction Creation ────────────────────────────
    async createTransaction(params) {
        const { from, to, amount, privateKey, publicKey, memo, type = 'transfer' } = params;
        // Select parent transactions (2 tips from appropriate layers)
        const parentIds = this.selectParents(amount, type);
        const timestamp = Date.now();
        const layer = assignLayer(amount, type);
        // Compute deterministic ID
        const id = await (0, crypto_1.computeTxId)(from, to, amount, timestamp, parentIds);
        // Sign the transaction data
        const signData = `${id}:${from}:${to}:${amount}:${timestamp}:${parentIds.join(',')}`;
        const signature = await (0, crypto_1.signTransaction)(signData, privateKey);
        const tx = {
            id,
            from,
            to,
            amount,
            timestamp,
            signature,
            publicKey,
            parentIds,
            layer,
            type,
            memo,
            resonanceScore: 0,
            confirmations: 0,
            meshDepth: this.computeDepth(parentIds),
        };
        // Validate
        const validation = await this.validateTransaction(tx);
        if (validation.valid) {
            // Apply transaction
            this.applyTransaction(tx);
            tx.resonanceScore = validation.resonanceScore;
            // Update parent confirmations and resonance
            this.propagateConfirmation(tx);
            // Track throughput
            this.trackTps(layer);
        }
        return { tx, validation };
    }
    // ─── Mining / Proof-of-Computation ───────────────────
    async createMiningReward(params) {
        const reward = Math.min(50, Math.max(1, Math.round(params.energyUsed / 10)));
        return this.createTransaction({
            from: 'COSMO_MINE',
            to: params.to,
            amount: reward,
            privateKey: params.privateKey,
            publicKey: params.publicKey,
            type: 'mine',
            memo: `Proof-of-Computation: ${params.cycles} cycles, ${params.energyUsed.toFixed(1)} energy`,
        });
    }
    // ─── Validation ──────────────────────────────────────
    async validateTransaction(tx) {
        const errors = [];
        // 1. Verify amount
        if (tx.amount <= 0)
            errors.push('Amount must be positive');
        // 2. Verify addresses
        if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE' && !(0, crypto_1.isValidAddress)(tx.from)) {
            errors.push('Invalid sender address');
        }
        if (!(0, crypto_1.isValidAddress)(tx.to))
            errors.push('Invalid recipient address');
        // 3. Verify self-send
        if (tx.from === tx.to)
            errors.push('Cannot send to yourself');
        // 4. Verify balance (skip for genesis/mine)
        if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
            const balance = this.balances.get(tx.from) || 0;
            if (balance < tx.amount)
                errors.push(`Insufficient balance: ${balance} < ${tx.amount}`);
        }
        // 5. Verify parents exist
        for (const pid of tx.parentIds) {
            if (!this.transactions.has(pid) && this.transactions.size > 0) {
                errors.push(`Parent transaction not found: ${pid.slice(0, 8)}...`);
            }
        }
        // 6. Verify signature (skip genesis/mine system transactions)
        if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE' && tx.publicKey) {
            const signData = `${tx.id}:${tx.from}:${tx.to}:${tx.amount}:${tx.timestamp}:${tx.parentIds.join(',')}`;
            const sigValid = await (0, crypto_1.verifySignature)(signData, tx.signature, tx.publicKey);
            if (!sigValid)
                errors.push('Invalid Ed25519 signature');
        }
        // 7. Verify deterministic ID
        const expectedId = await (0, crypto_1.computeTxId)(tx.from, tx.to, tx.amount, tx.timestamp, tx.parentIds);
        if (expectedId !== tx.id)
            errors.push('Transaction ID mismatch');
        // 8. Check for double-spend (same tx ID)
        if (this.transactions.has(tx.id))
            errors.push('Duplicate transaction');
        // Compute resonance score based on validation depth
        const resonanceScore = errors.length === 0 ? this.computeResonance(tx) : 0;
        return {
            valid: errors.length === 0,
            errors,
            resonanceScore,
            layer: tx.layer,
        };
    }
    // ─── Parent Selection (Tip Selection Algorithm) ──────
    selectParents(amount, type) {
        const targetLayer = assignLayer(amount, type);
        const parents = [];
        // First, try to select from the target layer
        const layerTips = this.tipsByLayer.get(targetLayer);
        if (layerTips && layerTips.size > 0) {
            const tipArray = Array.from(layerTips);
            parents.push(tipArray[Math.floor(Math.random() * tipArray.length)]);
        }
        // Then select from adjacent or any available layer
        const allTips = this.getAllTips();
        const remaining = allTips.filter(t => !parents.includes(t));
        if (remaining.length > 0) {
            // Weighted random selection favoring recent tips
            const selected = this.weightedTipSelection(remaining);
            if (selected && !parents.includes(selected)) {
                parents.push(selected);
            }
        }
        // If we still don't have 2 parents and there are transactions
        if (parents.length < 2 && allTips.length > 0) {
            for (const tip of allTips) {
                if (!parents.includes(tip)) {
                    parents.push(tip);
                    if (parents.length >= 2)
                        break;
                }
            }
        }
        // For the very first transaction after genesis, 1 parent is OK
        return parents;
    }
    /** Weighted random tip selection — favors newer tips */
    weightedTipSelection(tips) {
        if (tips.length === 0)
            return null;
        const now = Date.now();
        const weights = tips.map(tipId => {
            const tx = this.transactions.get(tipId);
            if (!tx)
                return 1;
            const age = now - tx.timestamp;
            // Exponential decay: newer tips get higher weight
            return Math.exp(-age / 60000); // Half-life ~1 minute
        });
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalWeight;
        for (let i = 0; i < tips.length; i++) {
            r -= weights[i];
            if (r <= 0)
                return tips[i];
        }
        return tips[tips.length - 1];
    }
    // ─── Resonance Scoring ───────────────────────────────
    /** Compute resonance score for a transaction based on:
     * - Parent validation depth (deeper = more trusted)
     * - Cross-layer references (more layers = more secure)
     * - Network participation (more confirmations = more final)
     */
    computeResonance(tx) {
        if (tx.parentIds.length === 0)
            return 1.0; // Genesis
        let score = 0;
        // Factor 1: Parent depth contribution (0-0.4)
        const parentDepths = tx.parentIds.map(pid => {
            const parent = this.transactions.get(pid);
            return parent ? parent.meshDepth : 0;
        });
        const avgDepth = parentDepths.reduce((a, b) => a + b, 0) / parentDepths.length;
        score += Math.min(0.4, avgDepth / 25); // Maxes at depth 25
        // Factor 2: Cross-layer coverage (0-0.3)
        const layersCovered = new Set(tx.parentIds.map(pid => {
            const parent = this.transactions.get(pid);
            return parent?.layer ?? 0;
        }));
        score += (layersCovered.size / 7) * 0.3;
        // Factor 3: Parent resonance inheritance (0-0.3)
        const parentResonances = tx.parentIds.map(pid => {
            const parent = this.transactions.get(pid);
            return parent?.resonanceScore ?? 0;
        });
        const avgParentResonance = parentResonances.reduce((a, b) => a + b, 0) / parentResonances.length;
        score += avgParentResonance * 0.3;
        return Math.min(1.0, score);
    }
    // ─── Internal State Management ───────────────────────
    applyTransaction(tx) {
        this.transactions.set(tx.id, tx);
        // Update balances
        if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
            this.balances.set(tx.from, (this.balances.get(tx.from) || 0) - tx.amount);
        }
        this.balances.set(tx.to, (this.balances.get(tx.to) || 0) + tx.amount);
        // Update tip sets
        const layerTips = this.tipsByLayer.get(tx.layer);
        layerTips.add(tx.id);
        // Remove parents from tips (they're no longer leaves)
        for (const pid of tx.parentIds) {
            const parentTx = this.transactions.get(pid);
            if (parentTx) {
                this.tipsByLayer.get(parentTx.layer)?.delete(pid);
            }
        }
        // Update child index
        this.childIndex.set(tx.id, new Set());
        for (const pid of tx.parentIds) {
            if (!this.childIndex.has(pid)) {
                this.childIndex.set(pid, new Set());
            }
            this.childIndex.get(pid).add(tx.id);
        }
    }
    propagateConfirmation(tx) {
        // Each parent gets +1 confirmation and resonance boost
        for (const pid of tx.parentIds) {
            const parent = this.transactions.get(pid);
            if (parent) {
                parent.confirmations++;
                // Boost resonance with diminishing returns
                const boost = 0.05 / (1 + parent.confirmations * 0.1);
                parent.resonanceScore = Math.min(1.0, parent.resonanceScore + boost);
            }
        }
    }
    computeDepth(parentIds) {
        if (parentIds.length === 0)
            return 0;
        let maxDepth = 0;
        for (const pid of parentIds) {
            const parent = this.transactions.get(pid);
            if (parent) {
                maxDepth = Math.max(maxDepth, parent.meshDepth);
            }
        }
        return maxDepth + 1;
    }
    trackTps(layer) {
        const now = Date.now();
        const tps = this.layerTps.get(layer);
        tps.push(now);
        // Keep only last 60 seconds
        const cutoff = now - 60000;
        while (tps.length > 0 && tps[0] < cutoff)
            tps.shift();
    }
    // ─── Queries ─────────────────────────────────────────
    getTransaction(id) {
        return this.transactions.get(id);
    }
    getBalance(address) {
        return this.balances.get(address) || 0;
    }
    getTransactionsByAddress(address) {
        return Array.from(this.transactions.values())
            .filter(tx => tx.from === address || tx.to === address)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    getRecentTransactions(limit = 100) {
        return Array.from(this.transactions.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
    getAllTips() {
        const tips = [];
        for (const layerTips of this.tipsByLayer.values()) {
            tips.push(...layerTips);
        }
        return tips;
    }
    getLayerTips(layer) {
        return Array.from(this.tipsByLayer.get(layer) || []);
    }
    /** Get transactions per second for a layer (last 60s) */
    getLayerTps(layer) {
        const tps = this.layerTps.get(layer);
        const now = Date.now();
        const cutoff = now - 60000;
        const recent = tps.filter(t => t >= cutoff);
        return recent.length / 60;
    }
    /** Get total TPS across all layers */
    getTotalTps() {
        let total = 0;
        for (let i = 0; i <= exports.MeshLayer.LUMINA; i++) {
            total += this.getLayerTps(i);
        }
        return total;
    }
    /** Is a transaction considered final? (resonance > 0.7 and 3+ confirmations) */
    isFinalized(txId) {
        const tx = this.transactions.get(txId);
        if (!tx)
            return false;
        return tx.resonanceScore >= 0.7 && tx.confirmations >= 3;
    }
    /** Get mesh statistics */
    getStats() {
        const layerCounts = new Map();
        let totalResonance = 0;
        let finalized = 0;
        for (const tx of this.transactions.values()) {
            layerCounts.set(tx.layer, (layerCounts.get(tx.layer) || 0) + 1);
            totalResonance += tx.resonanceScore;
            if (this.isFinalized(tx.id))
                finalized++;
        }
        return {
            totalTransactions: this.transactions.size,
            totalTips: this.getAllTips().length,
            avgResonance: this.transactions.size > 0 ? totalResonance / this.transactions.size : 0,
            finalizedCount: finalized,
            layerDistribution: Object.fromEntries(layerCounts),
            totalTps: this.getTotalTps(),
            maxDepth: Math.max(0, ...Array.from(this.transactions.values()).map(t => t.meshDepth)),
        };
    }
    // ─── Persistence ─────────────────────────────────────
    serialize() {
        return JSON.stringify({
            transactions: Array.from(this.transactions.entries()),
            balances: Array.from(this.balances.entries()),
            tips: Object.fromEntries(Array.from(this.tipsByLayer.entries()).map(([k, v]) => [k, Array.from(v)])),
            childIndex: Array.from(this.childIndex.entries()).map(([k, v]) => [k, Array.from(v)]),
            genesisId: this.genesisId,
        });
    }
    static deserialize(json) {
        const data = JSON.parse(json);
        const mesh = new CosmoMesh();
        mesh.transactions = new Map(data.transactions);
        mesh.balances = new Map(data.balances);
        mesh.genesisId = data.genesisId;
        if (data.tips) {
            for (const [layer, tips] of Object.entries(data.tips)) {
                mesh.tipsByLayer.set(Number(layer), new Set(tips));
            }
        }
        if (data.childIndex) {
            for (const [parent, children] of data.childIndex) {
                mesh.childIndex.set(parent, new Set(children));
            }
        }
        return mesh;
    }
}
exports.CosmoMesh = CosmoMesh;
//# sourceMappingURL=cosmomesh.js.map