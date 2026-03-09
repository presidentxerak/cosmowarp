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
import { type CosmoKeyPair } from './crypto';
export interface SDKWallet {
    address: string;
    publicKey: string;
    privateKey: string;
    alias?: string;
    createdAt: number;
}
export interface SDKTransactionResult {
    success: boolean;
    transactionId?: string;
    amount?: number;
    fee?: number;
    layer?: string;
    resonanceScore?: number;
    error?: string;
}
export type SDKEventType = 'transaction_received' | 'transaction_confirmed' | 'balance_changed' | 'level_up' | 'streak_milestone';
export interface SDKEvent {
    type: SDKEventType;
    address: string;
    data: Record<string, unknown>;
    timestamp: number;
}
export declare class CosmoWarpSDK {
    private version;
    private eventListeners;
    constructor();
    /** Get SDK version */
    getVersion(): string;
    /** Get protocol constants */
    getProtocolInfo(): ProtocolInfo;
    /** Create a new wallet */
    createWallet(alias?: string): Promise<SDKWallet>;
    /** Validate an address format */
    validateAddress(address: string): boolean;
    /** Shorten an address for display */
    formatAddress(address: string): string;
    /** Hash data with SHA-256 */
    hash(data: string): Promise<string>;
    /** Generate a new Ed25519 key pair */
    generateKeys(): Promise<CosmoKeyPair>;
    /** Calculate current mining reward for a given total mined */
    calculateReward(totalMined: number): number;
    /** Get the mining reward curve (for charts) */
    getRewardCurve(points?: number): Array<{
        mined: number;
        reward: number;
    }>;
    /** Subscribe to SDK events */
    on(event: SDKEventType, callback: (event: SDKEvent) => void): void;
    /** Unsubscribe from SDK events */
    off(event: SDKEventType, callback: (event: SDKEvent) => void): void;
    /** Emit an event (used internally) */
    emit(event: SDKEvent): void;
    /** Get the layer name for an amount */
    getLayerForAmount(amount: number): string;
    /** Get all layer names */
    getLayerNames(): string[];
}
export interface ProtocolInfo {
    name: string;
    version: string;
    totalSupply: number;
    airdropAmount: number;
    layers: string[];
    hierarchyLevels: Array<{
        name: string;
        title: string;
        symbol: string;
        minTransactions: number;
        rewardMultiplier: number;
    }>;
    features: string[];
}
export declare const cosmowarp: CosmoWarpSDK;
//# sourceMappingURL=sdk.d.ts.map