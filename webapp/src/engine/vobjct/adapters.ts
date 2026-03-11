/**
 * Vobjct — Chain Adapter Architecture
 *
 * Provides a chain-agnostic interface for resolving token bindings,
 * ownership, and metadata across different blockchain ecosystems.
 *
 * Includes concrete adapter for the Strangrz (CosmoChain) protocol.
 */

import type { TokenBinding, ChainFamily } from './schema';

// ─── Adapter Interface ──────────────────────────────────────

export interface ChainAdapter {
  /** Chain family identifier */
  readonly chainFamily: ChainFamily;
  /** Human-readable chain name */
  readonly chainName: string;
  /** Token standard name */
  readonly tokenStandard: string;

  /** Resolve token binding from app-specific asset data */
  resolveTokenBinding(assetId: string, contractRef: string): TokenBinding;

  /** Resolve current owner of an asset */
  resolveOwnership(assetId: string): Promise<string | null>;

  /** Map metadata URI or equivalent */
  resolveMetadataUri(assetId: string): string | null;

  /** Check if a given address is the owner */
  verifyOwnership(assetId: string, address: string): Promise<boolean>;

  /** Get the on-chain transaction reference for an asset */
  getTransactionRef(assetId: string): string | null;
}

// ─── Strangrz Chain Adapter ────────────────────────────────

/**
 * Concrete adapter for the Strangrz protocol.
 * Maps Warts (digital artworks) to Vobjct token bindings.
 */
export class StrangrzAdapter implements ChainAdapter {
  readonly chainFamily: ChainFamily = 'strangrz';
  readonly chainName = 'cosmochain';
  readonly tokenStandard = 'CW-721';

  private getWart: (id: string) => { owner: string; certId?: string; onChainTxId?: string } | null;

  constructor(wartLookup: (id: string) => { owner: string; certId?: string; onChainTxId?: string } | null) {
    this.getWart = wartLookup;
  }

  resolveTokenBinding(assetId: string, contractRef: string): TokenBinding {
    return {
      chain_family: this.chainFamily,
      chain_name: this.chainName,
      token_standard: this.tokenStandard,
      contract_or_issuer_reference: contractRef || 'strangrz_protocol',
      token_id_or_asset_reference: assetId,
    };
  }

  async resolveOwnership(assetId: string): Promise<string | null> {
    const wart = this.getWart(assetId);
    return wart?.owner || null;
  }

  resolveMetadataUri(assetId: string): string | null {
    return `strangrz://wart/${assetId}/metadata`;
  }

  async verifyOwnership(assetId: string, address: string): Promise<boolean> {
    const wart = this.getWart(assetId);
    return wart?.owner === address;
  }

  getTransactionRef(assetId: string): string | null {
    const wart = this.getWart(assetId);
    return wart?.onChainTxId || null;
  }
}

// ─── EVM Adapter (Template) ─────────────────────────────────

/**
 * Template adapter for EVM-compatible chains.
 * Requires an RPC endpoint and contract ABI for real usage.
 */
export class EVMAdapter implements ChainAdapter {
  readonly chainFamily: ChainFamily = 'evm';
  readonly chainName: string;
  readonly tokenStandard: string;

  constructor(chainName: string, tokenStandard: string = 'ERC-721') {
    this.chainName = chainName;
    this.tokenStandard = tokenStandard;
  }

  resolveTokenBinding(tokenId: string, contractAddress: string): TokenBinding {
    return {
      chain_family: 'evm',
      chain_name: this.chainName,
      token_standard: this.tokenStandard,
      contract_or_issuer_reference: contractAddress,
      token_id_or_asset_reference: tokenId,
    };
  }

  async resolveOwnership(_tokenId: string): Promise<string | null> {
    // In production: call contract.ownerOf(tokenId) via ethers/viem
    return null;
  }

  resolveMetadataUri(_tokenId: string): string | null {
    // In production: call contract.tokenURI(tokenId)
    return null;
  }

  async verifyOwnership(_tokenId: string, _address: string): Promise<boolean> {
    // In production: compare ownerOf result with address
    return false;
  }

  getTransactionRef(_tokenId: string): string | null {
    return null;
  }
}

// ─── XRPL Adapter (Template) ────────────────────────────────

export class XRPLAdapter implements ChainAdapter {
  readonly chainFamily: ChainFamily = 'xrpl';
  readonly chainName = 'xrpl_mainnet';
  readonly tokenStandard = 'NFToken';

  resolveTokenBinding(nftokenId: string, issuer: string): TokenBinding {
    return {
      chain_family: 'xrpl',
      chain_name: this.chainName,
      token_standard: this.tokenStandard,
      contract_or_issuer_reference: issuer,
      token_id_or_asset_reference: nftokenId,
    };
  }

  async resolveOwnership(_nftokenId: string): Promise<string | null> {
    return null;
  }

  resolveMetadataUri(_nftokenId: string): string | null {
    return null;
  }

  async verifyOwnership(_nftokenId: string, _address: string): Promise<boolean> {
    return false;
  }

  getTransactionRef(_nftokenId: string): string | null {
    return null;
  }
}

// ─── Adapter Registry ───────────────────────────────────────

const adapterRegistry = new Map<string, ChainAdapter>();

export function registerAdapter(key: string, adapter: ChainAdapter): void {
  adapterRegistry.set(key, adapter);
}

export function getAdapter(key: string): ChainAdapter | null {
  return adapterRegistry.get(key) || null;
}

export function listAdapters(): string[] {
  return Array.from(adapterRegistry.keys());
}
