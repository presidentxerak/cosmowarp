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

import { useMemo } from 'react';
import { useWallet } from './WalletContext';

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
