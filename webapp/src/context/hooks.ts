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

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { CollectionEngine } from '../engine/collections';
import { AuctionEngine } from '../engine/auctions';
import { MessagingEngine, setOnline, isOnline } from '../engine/messaging';
import {
  getPayoutHistory, getPayoutSettings, setPayoutSettings, getSellerEarnings,
  requestPayout, type PayoutSettings,
} from '../engine/payouts';
import {
  calculateRoyaltySplit, getCreatorRoyalties, getTotalRoyalties, getRoyaltiesByWart,
} from '../engine/royalties';
import {
  getKYCState, getTransactionLimits, checkTransactionAllowed,
  completeBasicKYC, submitFullKYC,
} from '../engine/kyc';
import {
  getPreferredCurrency, setPreferredCurrency, getCurrentRates,
  stzToFiat, fiatToStz, formatPrice, formatDualPrice, refreshRates,
  SUPPORTED_CURRENCIES,
} from '../engine/currency';
import {
  getNotifPreferences, setNotifPreferences, toggleNotifType,
  filterByPreferences, groupNotifications, getUnreadCount, markAllRead,
  type NotifType,
} from '../engine/notifications';
import {
  isVerified, getVerification, getAllVerified, computeCreatorStats, getFeatured,
} from '../engine/verification';
import { GovernanceEngine } from '../engine/governance';
import { DisputeEngine, type DisputeReason } from '../engine/disputes';
import { SubscriptionEngine, type SubscriptionTier } from '../engine/subscriptions';
import { computePlatformMetrics, computeCreatorAnalytics, downloadCSV } from '../engine/analytics';
import { isMobile, getGridColumns } from '../lib/responsive';
import { runSecurityChecklist, sanitizeText, sanitizeAlias } from '../lib/security-audit';
import {
  getOnboardingState, isOnboardingActive, getCurrentStep, getProgress,
  completeStep, skipOnboarding, type OnboardingStep,
} from '../engine/onboarding';
import { setMetaTags, resetMetaTags, setArtworkMeta, setGalleryMeta } from '../lib/seo';
import { getPerformanceScore, generateVitalsReport, PERFORMANCE_BUDGET } from '../lib/performance';
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

// ─── Phase 3 Hooks ────────────────────────────────────────

/**
 * Messaging — send/receive DMs, unread counts.
 */
export function useMessaging() {
  const { wallet } = useWallet();
  const engineRef = useRef(MessagingEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const engine = engineRef.current;

  // Keep presence alive
  if (wallet) setOnline(wallet.address);

  return useMemo(() => ({
    conversations: wallet ? engine.getConversations(wallet.address) : [],
    totalUnread: wallet ? engine.getTotalUnread(wallet.address) : 0,
    getConversation: (otherAddress: string) =>
      wallet ? engine.getConversation(wallet.address, otherAddress) : null,
    sendMessage: (to: string, content: string, type?: 'text' | 'wart_share' | 'transaction_receipt', refId?: string) => {
      if (!wallet) return null;
      const msg = engine.sendMessage(wallet.address, to, content, type || 'text', refId);
      bump();
      return msg;
    },
    markRead: (otherAddress: string) => {
      if (!wallet) return;
      const id = [wallet.address, otherAddress].sort().join('_');
      engine.markConversationRead(id, wallet.address);
      bump();
    },
    deleteConversation: (otherAddress: string) => {
      if (!wallet) return;
      const id = [wallet.address, otherAddress].sort().join('_');
      engine.deleteConversation(id);
      bump();
    },
    isUserOnline: isOnline,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Enhanced notifications — preferences, grouping, deep links.
 */
export function useNotifications() {
  const { wallet, globalTxs } = useWallet();
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const prefs = getNotifPreferences();

  return useMemo(() => ({
    preferences: prefs,
    setPreferences: (p: Parameters<typeof setNotifPreferences>[0]) => {
      setNotifPreferences(p);
      bump();
    },
    toggleType: (type: NotifType, enabled: boolean) => {
      toggleNotifType(type, enabled);
      bump();
    },
    filterByPrefs: filterByPreferences,
    groupNotifications,
    getUnreadCount,
    markAllRead: async (notifications: Parameters<typeof markAllRead>[1]) => {
      if (!wallet) return;
      await markAllRead(wallet.address, notifications);
      bump();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, globalTxs, version]);
}

/**
 * Creator verification — badges and stats.
 */
export function useVerification() {
  const { warts } = useWallet();

  return useMemo(() => ({
    isVerified,
    getVerification,
    allVerified: getAllVerified(),
    featured: getFeatured(),
    getCreatorStats: (address: string, followerCount?: number) =>
      computeCreatorStats(address, warts, followerCount),
  }), [warts]);
}

// ─── Phase 4 Hooks ────────────────────────────────────────

/**
 * Payouts — history, settings, earnings, request payout.
 */
export function usePayouts() {
  const { wallet } = useWallet();
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  return useMemo(() => {
    const address = wallet?.address || '';
    return {
      history: getPayoutHistory(address),
      settings: getPayoutSettings(address),
      earnings: getSellerEarnings(address),
      updateSettings: (s: Partial<PayoutSettings>) => {
        if (!wallet) return;
        setPayoutSettings(wallet.address, s);
        bump();
      },
      requestPayout: async (amount: number, currency: string) => {
        if (!wallet) return { success: false, error: 'No wallet' };
        const result = await requestPayout(wallet.address, amount, currency);
        if (result.success) bump();
        return result;
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, version]);
}

/**
 * Royalties — calculation, tracking, creator dashboard.
 */
export function useRoyalties() {
  const { wallet } = useWallet();

  return useMemo(() => ({
    calculateSplit: calculateRoyaltySplit,
    myRoyalties: wallet ? getCreatorRoyalties(wallet.address) : [],
    totalEarned: wallet ? getTotalRoyalties(wallet.address) : 0,
    byWart: wallet ? getRoyaltiesByWart(wallet.address) : new Map(),
  }), [wallet]);
}

/**
 * KYC — level, limits, transaction checks, verification lifecycle.
 */
export function useKYC() {
  const { wallet } = useWallet();
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const state = wallet ? getKYCState(wallet.address) : null;
  const limits = wallet ? getTransactionLimits(wallet.address) : { maxSingleTx: 0, maxMonthlyVolume: 0 };

  return useMemo(() => ({
    state,
    limits,
    checkTransaction: (amountEUR: number, monthlyVolumeEUR?: number) => {
      if (!wallet) return { allowed: false, reason: 'No wallet' };
      return checkTransactionAllowed(wallet.address, amountEUR, monthlyVolumeEUR);
    },
    completeBasic: () => {
      if (!wallet) return null;
      const result = completeBasicKYC(wallet.address);
      bump();
      return result;
    },
    submitFull: () => {
      if (!wallet) return null;
      const result = submitFullKYC(wallet.address);
      bump();
      return result;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Currency — preferred currency, conversion, formatting, live rates.
 */
export function useCurrency() {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  // Auto-refresh rates on mount
  useEffect(() => {
    refreshRates().then(() => bump());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({
    preferred: getPreferredCurrency(),
    rates: getCurrentRates(),
    supported: SUPPORTED_CURRENCIES,
    setPreferred: (currency: Parameters<typeof setPreferredCurrency>[0]) => {
      setPreferredCurrency(currency);
      bump();
    },
    toFiat: stzToFiat,
    toStz: fiatToStz,
    format: formatPrice,
    formatDual: formatDualPrice,
    refreshRates: async () => {
      await refreshRates();
      bump();
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [version]);
}

// ─── Phase 6 Hooks ────────────────────────────────────────

/**
 * DAO Governance — proposals, voting, execution.
 */
export function useGovernance() {
  const { wallet } = useWallet();
  const engineRef = useRef(GovernanceEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const engine = engineRef.current;

  return useMemo(() => ({
    activeProposals: engine.getActive(),
    allProposals: engine.getAll(),
    getProposal: (id: string) => engine.get(id),
    getVotes: (id: string) => engine.getVotes(id),
    hasVoted: (id: string) => wallet ? engine.hasVoted(id, wallet.address) : false,
    createProposal: (title: string, description: string, type: Parameters<typeof engine.createProposal>[3], circulatingSupply: number, options?: Parameters<typeof engine.createProposal>[5]) => {
      if (!wallet) return null;
      const p = engine.createProposal(wallet.address, title, description, type, circulatingSupply, options);
      bump();
      return p;
    },
    vote: (proposalId: string, choice: 'for' | 'against' | 'abstain', weight: number) => {
      if (!wallet) return { success: false, error: 'No wallet' };
      const result = engine.vote(proposalId, wallet.address, choice, weight);
      if (result.success) bump();
      return result;
    },
    settle: (proposalId: string) => {
      const result = engine.settle(proposalId);
      if (result.success) bump();
      return result;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Dispute resolution — report, counter-notice, resolve.
 */
export function useDisputes() {
  const { wallet } = useWallet();
  const engineRef = useRef(DisputeEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const engine = engineRef.current;

  return useMemo(() => ({
    pending: engine.getPending(),
    all: engine.getAll(),
    getDispute: (id: string) => engine.get(id),
    getByWart: (wartId: string) => engine.getByWart(wartId),
    report: (wartId: string, creator: string, reason: DisputeReason, evidence: string) => {
      if (!wallet) return null;
      const d = engine.report(wallet.address, wartId, creator, reason, evidence);
      bump();
      return d;
    },
    resolve: (disputeId: string, action: 'remove' | 'dismiss' | 'warn', resolution: string) => {
      if (!wallet) return false;
      const ok = engine.resolve(disputeId, wallet.address, action, resolution);
      if (ok) bump();
      return ok;
    },
    counterNotice: (disputeId: string, notice: string) => {
      if (!wallet) return false;
      const ok = engine.counterNotice(disputeId, wallet.address, notice);
      if (ok) bump();
      return ok;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Subscriptions — tiers, subscribe, gated content access.
 */
export function useSubscriptions() {
  const { wallet } = useWallet();
  const engineRef = useRef(SubscriptionEngine.load());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const engine = engineRef.current;

  return useMemo(() => ({
    mySubscriptions: wallet ? engine.getMySubscriptions(wallet.address) : [],
    getSubscribers: (creatorAddress: string) => engine.getSubscribers(creatorAddress),
    getSubscriberCounts: (creatorAddress: string) => engine.getSubscriberCounts(creatorAddress),
    getTiers: (creatorAddress: string) => engine.getTiers(creatorAddress),
    hasAccess: (creatorAddress: string, tier: SubscriptionTier) =>
      wallet ? engine.hasAccess(wallet.address, creatorAddress, tier) : tier === 'free',
    subscribe: (creatorAddress: string, tier: SubscriptionTier) => {
      if (!wallet) return null;
      const sub = engine.subscribe(wallet.address, creatorAddress, tier);
      bump();
      return sub;
    },
    unsubscribe: (creatorAddress: string) => {
      if (!wallet) return false;
      const ok = engine.unsubscribe(wallet.address, creatorAddress);
      if (ok) bump();
      return ok;
    },
    setupTiers: (tiers?: Parameters<typeof engine.setupTiers>[1]) => {
      if (!wallet) return null;
      const config = engine.setupTiers(wallet.address, tiers);
      bump();
      return config;
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [wallet, version]);
}

/**
 * Analytics — platform metrics, creator dashboard, CSV export.
 */
export function useAnalytics() {
  const { wallet, warts, globalTxs } = useWallet();

  const platformMetrics = useMemo(() =>
    computePlatformMetrics(warts, globalTxs, 0),
    [warts, globalTxs],
  );

  const creatorAnalytics = useMemo(() =>
    wallet ? computeCreatorAnalytics(wallet.address, warts, globalTxs) : null,
    [wallet, warts, globalTxs],
  );

  return {
    platformMetrics,
    creatorAnalytics,
    downloadCSV,
    isMobile: isMobile(),
    gridColumns: getGridColumns('gallery'),
    // Security
    securityChecklist: runSecurityChecklist(),
    sanitizeText,
    sanitizeAlias,
  };
}

// ─── Phase 8 Hooks ────────────────────────────────────────

/**
 * Onboarding — step-by-step guide for new users.
 */
export function useOnboarding() {
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  return useMemo(() => ({
    state: getOnboardingState(),
    isActive: isOnboardingActive(),
    currentStep: getCurrentStep(),
    progress: getProgress(),
    complete: (step: OnboardingStep) => { completeStep(step); bump(); },
    skip: () => { skipOnboarding(); bump(); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [version]);
}

/**
 * SEO — meta tags, Open Graph, structured data.
 */
export function useSEO() {
  return useMemo(() => ({
    setMeta: setMetaTags,
    resetMeta: resetMetaTags,
    setArtworkMeta,
    setGalleryMeta,
  }), []);
}

/**
 * Performance — budget checking, vitals scoring.
 */
export function usePerformance() {
  return useMemo(() => ({
    budget: PERFORMANCE_BUDGET,
    getScore: getPerformanceScore,
    getReport: generateVitalsReport,
  }), []);
}
