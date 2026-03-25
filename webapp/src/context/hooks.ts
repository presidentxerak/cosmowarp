/**
 * Focused sub-hooks for WalletContext — reduce unnecessary re-renders
 *
 * Instead of splitting WalletContext into 3 separate providers (which would
 * require modifying 28+ consumer components), we extract focused sub-hooks
 * that select only the relevant slice of context via useMemo.
 *
 * Components can gradually migrate from useWallet() to the focused hooks:
 *   - useAuth()    → authentication state only
 *   - useWarts()   → artwork operations only
 *   - useBalance() → balance & transaction state only
 *
 * useWallet() remains fully backward-compatible.
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import { useWallet } from './WalletContext';
import { CollectionEngine } from '../engine/collections';
import { AuctionEngine } from '../engine/auctions';
import {
  filterWarts, setWartTags, getWartTags, getAllTags,
  DEFAULT_FILTERS, type SearchFilters,
} from '../engine/search';
import { getTrending, getNew, getForYou, getTopSellers, getTopCollectors } from '../engine/recommendations';

/**
 * Authentication state and operations.
 * Use this when you only need to know if the user is logged in.
 */
export function useAuth() {
  const ctx = useWallet();
  return useMemo(() => ({
    wallet: ctx.wallet,
    unlocked: ctx.unlocked,
    needsMigration: ctx.needsMigration,
    pending2FA: ctx.pending2FA,
    showRecoveryReminder: ctx.showRecoveryReminder,
    dismissRecoveryReminder: ctx.dismissRecoveryReminder,
    // Auth actions
    initWallet: ctx.initWallet,
    strangrzIDLogin: ctx.strangrzIDLogin,
    verify2FACode: ctx.verify2FACode,
    unlock: ctx.unlock,
    lock: ctx.lock,
    signOut: ctx.signOut,
    deleteAccount: ctx.deleteAccount,
    migrate: ctx.migrate,
    // Export / Import
    doExportWallet: ctx.doExportWallet,
    doImportWallet: ctx.doImportWallet,
    doGenerateStrangrzLink: ctx.doGenerateStrangrzLink,
    doImportStrangrzLink: ctx.doImportStrangrzLink,
  }), [
    ctx.wallet, ctx.unlocked, ctx.needsMigration, ctx.pending2FA,
    ctx.showRecoveryReminder, ctx.dismissRecoveryReminder,
    ctx.initWallet, ctx.strangrzIDLogin, ctx.verify2FACode,
    ctx.unlock, ctx.lock, ctx.signOut, ctx.deleteAccount, ctx.migrate,
    ctx.doExportWallet, ctx.doImportWallet,
    ctx.doGenerateStrangrzLink, ctx.doImportStrangrzLink,
  ]);
}

/**
 * Artwork (Wart) state and operations.
 * Use this for marketplace, gallery, and artwork management views.
 */
export function useWarts() {
  const ctx = useWallet();
  return useMemo(() => ({
    warts: ctx.warts,
    marketplace: ctx.marketplace,
    myCollection: ctx.myCollection,
    myCreated: ctx.myCreated,
    lazyListings: ctx.lazyListings,
    myLazyListings: ctx.myLazyListings,
    // Wart actions
    mintWart: ctx.mintWart,
    buyWart: ctx.buyWart,
    listWart: ctx.listWart,
    delistWart: ctx.delistWart,
    transferWart: ctx.transferWart,
    deleteWart: ctx.deleteWart,
    editWart: ctx.editWart,
    addWartComment: ctx.addWartComment,
    toggleWartLike: ctx.toggleWartLike,
    toggleWartBookmark: ctx.toggleWartBookmark,
    verifyWartCertificate: ctx.verifyWartCertificate,
    refreshWarts: ctx.refreshWarts,
    // Lazy minting
    createLazyListing: ctx.createLazyListing,
    buyLazyMint: ctx.buyLazyMint,
    cancelLazyListing: ctx.cancelLazyListing,
    refreshLazyListings: ctx.refreshLazyListings,
    // Fiat
    listWartFiat: ctx.listWartFiat,
    buyWartFiat: ctx.buyWartFiat,
    getWartFiatPrice: ctx.getWartFiatPrice,
    // Vault
    vaultStats: ctx.vaultStats,
    addToVault: ctx.addToVault,
    addAllToVault: ctx.addAllToVault,
    generateRecoveryKit: ctx.generateRecoveryKit,
    restoreFromRecoveryKit: ctx.restoreFromRecoveryKit,
    // Contracts
    createAuction: ctx.createAuction,
    getWartContracts: ctx.getWartContracts,
    getActiveAuctions: ctx.getActiveAuctions,
  }), [
    ctx.warts, ctx.marketplace, ctx.myCollection, ctx.myCreated,
    ctx.lazyListings, ctx.myLazyListings,
    ctx.mintWart, ctx.buyWart, ctx.listWart, ctx.delistWart,
    ctx.transferWart, ctx.deleteWart, ctx.editWart,
    ctx.addWartComment, ctx.toggleWartLike, ctx.toggleWartBookmark,
    ctx.verifyWartCertificate, ctx.refreshWarts,
    ctx.createLazyListing, ctx.buyLazyMint, ctx.cancelLazyListing, ctx.refreshLazyListings,
    ctx.listWartFiat, ctx.buyWartFiat, ctx.getWartFiatPrice,
    ctx.vaultStats, ctx.addToVault, ctx.addAllToVault,
    ctx.generateRecoveryKit, ctx.restoreFromRecoveryKit,
    ctx.createAuction, ctx.getWartContracts, ctx.getActiveAuctions,
  ]);
}

/**
 * Balance, transactions, and network state.
 * Use this for wallet balance display, transaction feed, mining.
 */
export function useBalance() {
  const ctx = useWallet();
  return useMemo(() => ({
    wallet: ctx.wallet,
    globalTxs: ctx.globalTxs,
    meshStats: ctx.meshStats,
    supplyInfo: ctx.supplyInfo,
    adminDashboard: ctx.adminDashboard,
    levelProgress: ctx.levelProgress,
    lastLevelUp: ctx.lastLevelUp,
    // Actions
    send: ctx.send,
    mine: ctx.mine,
    refreshTxs: ctx.refreshTxs,
    refreshStats: ctx.refreshStats,
    unlockAdmin: ctx.unlockAdmin,
    unlockCreator: ctx.unlockCreator,
  }), [
    ctx.wallet, ctx.globalTxs, ctx.meshStats, ctx.supplyInfo,
    ctx.adminDashboard, ctx.levelProgress, ctx.lastLevelUp,
    ctx.send, ctx.mine, ctx.refreshTxs, ctx.refreshStats,
    ctx.unlockAdmin, ctx.unlockCreator,
  ]);
}

// ─── Phase 2 Hooks ────────────────────────────────────────

/**
 * Collections management.
 * Wraps CollectionEngine with React state for reactivity.
 */
export function useCollections() {
  const { wallet } = useWallet();
  const engineRef = useRef(CollectionEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const engine = engineRef.current;

  return useMemo(() => ({
    collections: engine.getAll(),
    myCollections: wallet ? engine.getByCreator(wallet.address) : [],
    getCollection: (id: string) => engine.get(id),
    getCollectionsForWart: (wartId: string) => engine.getCollectionsForWart(wartId),
    createCollection: (title: string, description?: string) => {
      if (!wallet) return null;
      const col = engine.create(wallet.address, title, description);
      bump();
      return col;
    },
    updateCollection: (id: string, updates: { title?: string; description?: string; coverWartId?: string | null }) => {
      if (!wallet) return false;
      const ok = engine.update(id, wallet.address, updates);
      if (ok) bump();
      return ok;
    },
    addWartToCollection: (collectionId: string, wartId: string) => {
      if (!wallet) return false;
      const ok = engine.addWart(collectionId, wallet.address, wartId);
      if (ok) bump();
      return ok;
    },
    removeWartFromCollection: (collectionId: string, wartId: string) => {
      if (!wallet) return false;
      const ok = engine.removeWart(collectionId, wallet.address, wartId);
      if (ok) bump();
      return ok;
    },
    reorderCollection: (collectionId: string, wartIds: string[]) => {
      if (!wallet) return false;
      const ok = engine.reorderWarts(collectionId, wallet.address, wartIds);
      if (ok) bump();
      return ok;
    },
    deleteCollection: (id: string) => {
      if (!wallet) return false;
      const ok = engine.delete(id, wallet.address);
      if (ok) bump();
      return ok;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Auctions management.
 * Wraps AuctionEngine with React state for reactivity.
 */
export function useAuctions() {
  const { wallet } = useWallet();
  const engineRef = useRef(AuctionEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const engine = engineRef.current;

  return useMemo(() => ({
    activeAuctions: engine.getActive(),
    endedUnsettled: engine.getEndedUnsettled(),
    getAuction: (id: string) => engine.get(id),
    getAuctionForWart: (wartId: string) => engine.getByWart(wartId),
    createAuction: (wartId: string, startPrice: number, durationHours: number, reservePrice?: number) => {
      if (!wallet) return null;
      try {
        const auction = engine.create(wartId, wallet.address, startPrice, durationHours, reservePrice);
        bump();
        return auction;
      } catch {
        return null;
      }
    },
    placeBid: (auctionId: string, amount: number) => {
      if (!wallet) return { success: false, error: 'No wallet' };
      const result = engine.placeBid(auctionId, wallet.address, amount);
      if (result.success) bump();
      return result;
    },
    settleAuction: (auctionId: string) => {
      const result = engine.settle(auctionId);
      bump();
      return result;
    },
    cancelAuction: (auctionId: string) => {
      if (!wallet) return false;
      const ok = engine.cancel(auctionId, wallet.address);
      if (ok) bump();
      return ok;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Search, filtering, and recommendations.
 * Provides stateful search filters and computed results.
 */
export function useSearch() {
  const { warts, wallet } = useWallet();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

  const results = useMemo(() => filterWarts(warts, filters), [warts, filters]);

  const trending = useMemo(() => getTrending(warts), [warts]);
  const newest = useMemo(() => getNew(warts), [warts]);
  const topSellers = useMemo(() => getTopSellers(warts), [warts]);
  const topCollectors = useMemo(() => getTopCollectors(warts), [warts]);

  const updateFilters = useCallback((partial: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return {
    // Search
    filters,
    results,
    updateFilters,
    resetFilters,
    // Tags
    setTags: setWartTags,
    getTags: getWartTags,
    allTags: getAllTags(),
    // Recommendations
    trending,
    newest,
    topSellers,
    topCollectors,
    forYou: wallet ? getForYou(warts, wallet.address, []) : [],
  };
}
