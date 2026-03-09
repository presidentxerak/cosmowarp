import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  loadWallet, createWallet, sendWarps, mineWarps,
  getGlobalTransactions, getMeshStats, getSupplyBreakdown,
  getProgressToNextLevel, unlockAdminRegistry, getAdminDashboard,
  unlockCreatorTokens, unlockWalletKey, walletNeedsMigration,
  migrateWallet, exportWallet, importWallet, loginCosmoID, clearWallet,
  type WarpWallet, type Transaction, type SupplyBreakdown,
  type RegistryDashboard, type LevelUpResult, type WalletExport,
} from '../engine/wallet';
import type { MiningProof } from '../engine/miner';
import { generateCosmoLink, parseCosmoLink } from '../engine/cosmolink';
import type { MeshStats } from '../engine/cosmomesh';
import { WartEngine, type Wart } from '../engine/warts';
import { storage } from '../engine/storage';
import type { VaultStats, RecoveryKit } from '../engine/cosmovault';
import type { CosmoContract } from '../engine/cosmocontract';
import type { FiatCurrency, FiatTransaction } from '../engine/fiatgateway';
// ─── Supabase Sync ──────────────────────────────────────────
import * as sync from '../lib/supabase-sync';
import { realtime } from '../lib/supabase-realtime';
import { isBackendAvailable } from '../lib/supabase';

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface WalletContextType {
  wallet: WarpWallet | null;
  unlocked: boolean;
  needsMigration: boolean;
  globalTxs: Transaction[];
  meshStats: MeshStats | null;
  supplyInfo: SupplyBreakdown | null;
  adminDashboard: RegistryDashboard | null;
  levelProgress: number;
  lastLevelUp: LevelUpResult | null;
  initWallet: (password: string, alias?: string) => Promise<void>;
  cosmoIDLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string; isNew?: boolean }>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  signOut: () => void;
  migrate: (password: string) => Promise<boolean>;
  doExportWallet: () => WalletExport | null;
  doImportWallet: (data: WalletExport, password: string) => Promise<boolean>;
  doGenerateCosmoLink: (password: string) => Promise<string | null>;
  doImportCosmoLink: (link: string, password: string) => Promise<boolean>;
  send: (to: string, amount: number, memo?: string) => Promise<{ success: boolean; error?: string; levelUp?: LevelUpResult }>;
  mine: (proof: MiningProof) => Promise<{ tx: Transaction; levelUp?: LevelUpResult }>;
  refreshTxs: () => void;
  refreshStats: () => void;
  unlockAdmin: () => Promise<boolean>;
  unlockCreator: (amount: number) => Promise<boolean>;
  // Wart operations
  warts: Wart[];
  marketplace: Wart[];
  myCollection: Wart[];
  myCreated: Wart[];
  mintWart: (title: string, description: string, imageData: string, price: number | null, royaltyPercent?: number, editionType?: 'unique' | 'limited' | 'unlimited', maxEditions?: number | null, durationHours?: number | null, mediaType?: 'image' | 'audio' | 'video' | 'svg', audioCover?: string) => Promise<Wart>;
  buyWart: (wartId: string) => Promise<{ success: boolean; error?: string }>;
  listWart: (wartId: string, price: number) => boolean;
  delistWart: (wartId: string) => boolean;
  transferWart: (wartId: string, toAddress: string) => Promise<{ success: boolean; error?: string }>;
  deleteWart: (wartId: string) => boolean;
  editWart: (wartId: string, updates: { title?: string; description?: string; price?: number | null; royaltyPercent?: number }) => boolean;
  addWartComment: (wartId: string, content: string) => boolean;
  verifyWartCertificate: (wartId: string) => Promise<{ valid: boolean; reason: string }>;
  refreshWarts: () => void;
  // Vault operations
  vaultStats: VaultStats | null;
  addToVault: (wartId: string) => Promise<boolean>;
  addAllToVault: () => Promise<{ added: number; failed: number }>;
  generateRecoveryKit: (recoveryPassword: string) => Promise<RecoveryKit | null>;
  restoreFromRecoveryKit: (kit: RecoveryKit, recoveryPassword: string) => Promise<{ restored: number; failed: number; errors: string[] }>;
  // Fiat operations
  listWartFiat: (wartId: string, priceFiat: number, currency: FiatCurrency) => boolean;
  buyWartFiat: (wartId: string, paymentMethod: 'card' | 'paypal' | 'sepa') => Promise<{ success: boolean; fiatTx?: FiatTransaction; error?: string }>;
  getWartFiatPrice: (wartId: string) => string | null;
  // Contract operations
  createAuction: (wartId: string, startPrice: number, durationHours: number, reservePrice?: number) => Promise<CosmoContract | null>;
  getWartContracts: (wartId: string) => CosmoContract[];
  getActiveAuctions: () => CosmoContract[];
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WarpWallet | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [globalTxs, setGlobalTxs] = useState<Transaction[]>([]);
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);
  const [supplyInfo, setSupplyInfo] = useState<SupplyBreakdown | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<RegistryDashboard | null>(null);
  const [levelProgress, setLevelProgress] = useState(0);
  const [lastLevelUp, setLastLevelUp] = useState<LevelUpResult | null>(null);
  const [warts, setWarts] = useState<Wart[]>([]);
  const [marketplace, setMarketplace] = useState<Wart[]>([]);
  const [myCollection, setMyCollection] = useState<Wart[]>([]);
  const [myCreated, setMyCreated] = useState<Wart[]>([]);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wartEngineRef = useRef<WartEngine | null>(null);

  function getWartEngine(): WartEngine {
    if (!wartEngineRef.current) {
      wartEngineRef.current = WartEngine.load();
    }
    return wartEngineRef.current;
  }

  // ─── Session timeout (auto-lock after inactivity) ──────
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (wallet) {
        wallet.privateKey = '';
        setUnlocked(false);
      }
    }, SESSION_TIMEOUT_MS);
  }, [wallet]);

  useEffect(() => {
    if (!unlocked) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [unlocked, resetTimer]);

  // ─── Load wallet on mount + Supabase sync ──────────────
  useEffect(() => {
    const w = loadWallet();
    if (w) {
      setWallet(w);
      setLevelProgress(getProgressToNextLevel(w.address));
      setNeedsMigration(walletNeedsMigration());

      // Pull cloud data if backend is available
      if (isBackendAvailable()) {
        sync.fullSync(w.address).then(cloudData => {
          if (cloudData?.profile) {
            // Use cloud balance if higher (source of truth)
            if (cloudData.profile.balance > w.balance) {
              w.balance = cloudData.profile.balance;
              setWallet({ ...w });
            }
          }
          if (cloudData?.transactions && cloudData.transactions.length > 0) {
            setGlobalTxs(prev =>
              prev.length < cloudData.transactions.length ? cloudData.transactions : prev
            );
          }
        });
      }
    }
    setGlobalTxs(getGlobalTransactions());
    try {
      setMeshStats(getMeshStats());
      setSupplyInfo(getSupplyBreakdown());
    } catch { /* first load */ }
    refreshWartsState(w?.address);

    // Start realtime subscriptions
    if (isBackendAvailable()) {
      realtime.start();
    }

    return () => {
      realtime.stop();
    };
  }, []);

  function refreshWartsState(address?: string) {
    const engine = getWartEngine();
    setWarts(engine.getAll());
    setMarketplace(engine.getMarketplace());
    if (address) {
      setMyCollection(engine.getCollection(address));
      setMyCreated(engine.getCreated(address));
      setVaultStats(engine.getVaultStats(address));
    }
  }

  // ─── Wallet creation ──────────────────────────────────
  const initWallet = useCallback(async (password: string, alias?: string) => {
    const w = await createWallet(password, alias);
    setWallet({ ...w });
    setUnlocked(true);
    setNeedsMigration(false);
    setMeshStats(getMeshStats());
    setSupplyInfo(getSupplyBreakdown());
    setLevelProgress(0);
    refreshWartsState(w.address);
    // Sync to Supabase
    sync.syncProfile(w);
    for (const tx of w.transactions) sync.syncTransaction(tx);
  }, []);

  // ─── CosmoID Login ───────────────────────────────────────
  const doCosmoIDLogin = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string; isNew?: boolean }> => {
    try {
      const existingBefore = loadWallet();
      const w = await loginCosmoID(username, password);
      const isNew = !existingBefore;
      setWallet({ ...w });
      setUnlocked(true);
      setNeedsMigration(false);
      try {
        setMeshStats(getMeshStats());
        setSupplyInfo(getSupplyBreakdown());
      } catch { /* first load */ }
      setLevelProgress(getProgressToNextLevel(w.address));
      // Initialize vault with CosmoID credentials
      const engine = getWartEngine();
      await engine.initVault(username, password);
      refreshWartsState(w.address);
      // Sync: pull cloud data then push local state
      sync.fullSync(w.address).then(cloudData => {
        if (cloudData?.profile && cloudData.profile.balance > w.balance) {
          w.balance = cloudData.profile.balance;
          setWallet({ ...w });
        }
      });
      sync.syncProfile(w);
      for (const tx of w.transactions) sync.syncTransaction(tx);
      return { success: true, isNew };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  // ─── Unlock ────────────────────────────────────────────
  const doUnlock = useCallback(async (password: string): Promise<boolean> => {
    if (!wallet) return false;
    try {
      const privateKey = await unlockWalletKey(wallet, password);
      wallet.privateKey = privateKey;
      setWallet({ ...wallet });
      setUnlocked(true);
      return true;
    } catch {
      return false;
    }
  }, [wallet]);

  // ─── Lock ──────────────────────────────────────────────
  const doLock = useCallback(() => {
    if (wallet) {
      wallet.privateKey = '';
      setWallet({ ...wallet });
    }
    setUnlocked(false);
  }, [wallet]);

  // ─── Sign out (clear local wallet) ─────────────────────
  const doSignOut = useCallback(() => {
    clearWallet();
    setWallet(null);
    setUnlocked(false);
    setNeedsMigration(false);
    setGlobalTxs([]);
    setMeshStats(null);
    setSupplyInfo(null);
    setAdminDashboard(null);
    setLevelProgress(0);
    setLastLevelUp(null);
    setWarts([]);
    setMarketplace([]);
    setMyCollection([]);
    setMyCreated([]);
  }, []);

  // ─── Migration ─────────────────────────────────────────
  const doMigrate = useCallback(async (password: string): Promise<boolean> => {
    const success = await migrateWallet(password);
    if (success) {
      setNeedsMigration(false);
      const w = loadWallet();
      if (w) {
        const privateKey = await unlockWalletKey(w, password);
        w.privateKey = privateKey;
        setWallet({ ...w });
        setUnlocked(true);
      }
    }
    return success;
  }, []);

  // ─── Export / Import ───────────────────────────────────
  const doExportWallet = useCallback((): WalletExport | null => {
    if (!wallet) return null;
    return exportWallet(wallet);
  }, [wallet]);

  const doImportWallet = useCallback(async (data: WalletExport, password: string): Promise<boolean> => {
    try {
      const w = await importWallet(data, password);
      setWallet({ ...w });
      setUnlocked(true);
      setNeedsMigration(false);
      refreshWartsState(w.address);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ─── CosmoLink ─────────────────────────────────────────
  const doGenerateCosmoLink = useCallback(async (password: string): Promise<string | null> => {
    if (!wallet) return null;
    try {
      const data = exportWallet(wallet);
      return await generateCosmoLink(data, password);
    } catch {
      return null;
    }
  }, [wallet]);

  const doImportCosmoLink = useCallback(async (link: string, password: string): Promise<boolean> => {
    try {
      const data = await parseCosmoLink(link, password);
      const w = await importWallet(data, password);
      setWallet({ ...w });
      setUnlocked(true);
      setNeedsMigration(false);
      refreshWartsState(w.address);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ─── Send ──────────────────────────────────────────────
  const send = useCallback(async (to: string, amount: number, memo?: string) => {
    if (!wallet) return { success: false, error: 'No wallet' };
    const result = await sendWarps(wallet, to, amount, memo);
    if (result.success) {
      setWallet({ ...wallet });
      setGlobalTxs(getGlobalTransactions());
      setMeshStats(getMeshStats());
      setSupplyInfo(getSupplyBreakdown());
      setLevelProgress(getProgressToNextLevel(wallet.address));
      if (result.levelUp) setLastLevelUp(result.levelUp);
      // Sync to Supabase (atomic transfer + transaction record)
      sync.atomicTransfer(wallet.address, to, amount);
      sync.syncProfile(wallet);
      if (result.tx) sync.syncTransaction(result.tx);
    }
    return result;
  }, [wallet]);

  // ─── Mine ──────────────────────────────────────────────
  const mine = useCallback(async (proof: MiningProof) => {
    if (!wallet) throw new Error('No wallet');
    const result = await mineWarps(wallet, proof);
    setWallet({ ...wallet });
    setGlobalTxs(getGlobalTransactions());
    setMeshStats(getMeshStats());
    setSupplyInfo(getSupplyBreakdown());
    setLevelProgress(getProgressToNextLevel(wallet.address));
    if (result.levelUp) setLastLevelUp(result.levelUp);
    // Sync to Supabase
    sync.syncProfile(wallet);
    sync.syncTransaction(result.tx);
    return result;
  }, [wallet]);

  const refreshTxs = useCallback(() => {
    setGlobalTxs(getGlobalTransactions());
  }, []);

  const refreshStats = useCallback(() => {
    try {
      setMeshStats(getMeshStats());
      setSupplyInfo(getSupplyBreakdown());
    } catch { /* no mesh yet */ }
  }, []);

  const unlockAdmin = useCallback(async () => {
    if (!wallet) return false;
    const success = await unlockAdminRegistry(wallet);
    if (success) {
      setAdminDashboard(getAdminDashboard());
    }
    return success;
  }, [wallet]);

  const unlockCreator = useCallback(async (amount: number) => {
    if (!wallet) return false;
    const success = await unlockCreatorTokens(wallet, amount);
    if (success) {
      setWallet({ ...wallet });
      setSupplyInfo(getSupplyBreakdown());
    }
    return success;
  }, [wallet]);

  // ─── Wart Operations ──────────────────────────────────

  const mintWart = useCallback(async (
    title: string, description: string, imageData: string,
    price: number | null, royaltyPercent = 5,
    editionType: 'unique' | 'limited' | 'unlimited' = 'unique',
    maxEditions: number | null = null,
    durationHours: number | null = null,
    mediaType: 'image' | 'audio' | 'video' | 'svg' = 'image',
    audioCover?: string,
  ): Promise<Wart> => {
    if (!wallet || !wallet.privateKey) throw new Error('Wallet locked');
    const engine = getWartEngine();
    const wart = await engine.mint(wallet.address, title, description, imageData, price, royaltyPercent, editionType, maxEditions, durationHours, mediaType, audioCover, wallet.privateKey);

    // Record mint transaction
    const result = await sendWarps(wallet, wallet.address, 0);
    void result; // Mint is free, just record in feed
    const tx: Transaction = {
      id: wart.id.slice(0, 16),
      from: wallet.address,
      to: wallet.address,
      amount: 0,
      timestamp: Date.now(),
      signature: 'wart_mint',
      type: 'wart_mint',
      memo: `Minted Wart: ${title}`,
    };
    const txs = JSON.parse(storage.getItem('cosmorare_global_tx') || '[]');
    txs.unshift(tx);
    storage.setItem('cosmorare_global_tx', JSON.stringify(txs.slice(0, 200)));
    wallet.transactions.unshift(tx);

    setWallet({ ...wallet });
    refreshWartsState(wallet.address);
    setGlobalTxs(getGlobalTransactions());
    // Sync to Supabase (wart + media + transaction)
    sync.syncWart(wart);
    sync.syncProfile(wallet);
    if (wart.certId) {
      sync.syncCertificate({
        certId: wart.certId,
        contentFingerprint: wart.contentFingerprint || '',
        creatorSignature: wart.creatorSignature || '',
        creator: wart.creator,
        wartId: wart.id,
        title: wart.title,
        issuedAt: wart.createdAt,
      });
    }
    return wart;
  }, [wallet]);

  const buyWart = useCallback(async (wartId: string): Promise<{ success: boolean; error?: string }> => {
    if (!wallet || !wallet.privateKey) return { success: false, error: 'Wallet locked' };
    const engine = getWartEngine();
    const wart = engine.getWart(wartId);
    if (!wart) return { success: false, error: 'Wart not found' };
    if (!wart.listed || wart.price === null) return { success: false, error: 'Not for sale' };
    if (wart.owner === wallet.address) return { success: false, error: 'You already own this' };
    if (wallet.balance < wart.price) return { success: false, error: 'Insufficient Warps' };

    const seller = wart.owner;
    const creator = wart.creator;
    const price = wart.price;
    const isResale = seller !== creator;
    const royaltyAmount = isResale ? Math.round(price * wart.royaltyPercent / 100 * 100) / 100 : 0;
    const sellerAmount = price - royaltyAmount;

    // Pay seller
    const payResult = await sendWarps(wallet, seller, sellerAmount, `Wart purchase: ${wart.title}`);
    if (!payResult.success) return { success: false, error: payResult.error };

    // Pay royalty to creator if resale
    if (royaltyAmount > 0 && creator !== seller) {
      await sendWarps(wallet, creator, royaltyAmount, `Wart royalty: ${wart.title}`);
    }

    // Transfer ownership
    const txId = payResult.tx?.id || '';
    engine.buy(wartId, wallet.address, txId);

    // Record wart_buy in feed
    const buyTx: Transaction = {
      id: txId,
      from: wallet.address,
      to: seller,
      amount: price,
      timestamp: Date.now(),
      signature: 'wart_buy',
      type: 'wart_buy',
      memo: `Bought Wart: ${wart.title}`,
    };
    wallet.transactions.unshift(buyTx);

    setWallet({ ...wallet });
    refreshWartsState(wallet.address);
    setGlobalTxs(getGlobalTransactions());
    // Sync purchase to Supabase (atomic operation)
    sync.atomicPurchaseWart({
      wartId,
      buyer: wallet.address,
      price,
      royaltyAmount,
      creator,
      seller,
      txId,
    });
    sync.syncProfile(wallet);
    sync.syncTransaction(buyTx);
    sync.syncNotification({
      recipient: seller,
      sender: wallet.address,
      type: 'sale',
      title: 'Artwork sold!',
      body: `${wart.title} was purchased for ${price} \u03A9`,
      refId: wartId,
    });
    return { success: true };
  }, [wallet]);

  const listWart = useCallback((wartId: string, price: number): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.list(wartId, price, wallet.address);
    if (ok) {
      refreshWartsState(wallet.address);
      const wart = engine.getWart(wartId);
      if (wart) sync.syncWartMetadata(wart);
    }
    return ok;
  }, [wallet]);

  const delistWart = useCallback((wartId: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.delist(wartId, wallet.address);
    if (ok) {
      refreshWartsState(wallet.address);
      const wart = engine.getWart(wartId);
      if (wart) sync.syncWartMetadata(wart);
    }
    return ok;
  }, [wallet]);

  const transferWart = useCallback(async (wartId: string, toAddress: string): Promise<{ success: boolean; error?: string }> => {
    if (!wallet || !wallet.privateKey) return { success: false, error: 'Wallet locked' };
    const engine = getWartEngine();
    const wart = engine.getWart(wartId);
    if (!wart) return { success: false, error: 'Wart not found' };
    if (wart.owner !== wallet.address) return { success: false, error: 'Not your Wart' };

    const ok = engine.transfer(wartId, wallet.address, toAddress, '');
    if (!ok) return { success: false, error: 'Transfer failed' };

    const tx: Transaction = {
      id: Date.now().toString(36),
      from: wallet.address,
      to: toAddress,
      amount: 0,
      timestamp: Date.now(),
      signature: 'wart_transfer',
      type: 'wart_transfer',
      memo: `Transferred Wart: ${wart.title}`,
    };
    wallet.transactions.unshift(tx);
    setWallet({ ...wallet });
    refreshWartsState(wallet.address);
    setGlobalTxs(getGlobalTransactions());
    // Sync transfer to Supabase
    const updatedWart = engine.getWart(wartId);
    if (updatedWart) sync.syncWartMetadata(updatedWart);
    sync.syncTransferHistory(wartId, { from: wallet.address, to: toAddress, price: 0, timestamp: Date.now(), txId: '' });
    sync.syncTransaction(tx);
    sync.syncNotification({
      recipient: toAddress,
      sender: wallet.address,
      type: 'transfer',
      title: 'Artwork received!',
      body: `You received: ${wart.title}`,
      refId: wartId,
    });
    return { success: true };
  }, [wallet]);

  const doDeleteWart = useCallback((wartId: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.delete(wartId, wallet.address);
    if (ok) {
      refreshWartsState(wallet.address);
      sync.syncWartDelete(wartId);
    }
    return ok;
  }, [wallet]);

  const doEditWart = useCallback((
    wartId: string,
    updates: { title?: string; description?: string; price?: number | null; royaltyPercent?: number },
  ): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.update(wartId, wallet.address, updates);
    if (ok) {
      refreshWartsState(wallet.address);
      const wart = engine.getWart(wartId);
      if (wart) sync.syncWartMetadata(wart);
    }
    return ok;
  }, [wallet]);

  const doAddWartComment = useCallback((wartId: string, content: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const alias = wallet.alias || wallet.address.slice(0, 10);
    const comment = engine.addComment(wartId, wallet.address, alias, content);
    if (comment) {
      refreshWartsState(wallet.address);
      sync.syncComment(wartId, comment);
      // Notify wart owner
      const wart = engine.getWart(wartId);
      if (wart && wart.owner !== wallet.address) {
        sync.syncNotification({
          recipient: wart.owner,
          sender: wallet.address,
          type: 'comment',
          title: 'New comment',
          body: `${alias} commented on ${wart.title}`,
          refId: wartId,
        });
      }
    }
    return !!comment;
  }, [wallet]);

  const verifyWartCertificate = useCallback(async (wartId: string): Promise<{ valid: boolean; reason: string }> => {
    const engine = getWartEngine();
    return engine.verifyCertificate(wartId);
  }, []);

  const refreshWarts = useCallback(() => {
    refreshWartsState(wallet?.address);
  }, [wallet]);

  // ─── Vault Operations ──────────────────────────────────

  const doAddToVault = useCallback(async (wartId: string): Promise<boolean> => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const result = await engine.addToVault(wartId, wallet.address);
    if (result) refreshWartsState(wallet.address);
    return !!result;
  }, [wallet]);

  const doAddAllToVault = useCallback(async (): Promise<{ added: number; failed: number }> => {
    if (!wallet) return { added: 0, failed: 0 };
    const engine = getWartEngine();
    const result = await engine.addAllToVault(wallet.address);
    refreshWartsState(wallet.address);
    return result;
  }, [wallet]);

  const doGenerateRecoveryKit = useCallback(async (recoveryPassword: string): Promise<RecoveryKit | null> => {
    if (!wallet || !wallet.privateKey) return null;
    const engine = getWartEngine();
    try {
      return await engine.generateRecoveryKit(wallet.address, recoveryPassword, wallet.privateKey);
    } catch {
      return null;
    }
  }, [wallet]);

  const doRestoreFromRecoveryKit = useCallback(async (kit: RecoveryKit, recoveryPassword: string): Promise<{ restored: number; failed: number; errors: string[] }> => {
    if (!wallet) return { restored: 0, failed: 0, errors: ['No wallet'] };
    const engine = getWartEngine();
    const result = await engine.restoreFromRecoveryKit(kit, recoveryPassword, wallet.address);
    refreshWartsState(wallet.address);
    return result;
  }, [wallet]);

  // ─── Fiat Operations ───────────────────────────────────

  const doListWartFiat = useCallback((wartId: string, priceFiat: number, currency: FiatCurrency): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.listWithFiat(wartId, wallet.address, priceFiat, currency);
    if (ok) refreshWartsState(wallet.address);
    return ok;
  }, [wallet]);

  const doBuyWartFiat = useCallback(async (wartId: string, paymentMethod: 'card' | 'paypal' | 'sepa'): Promise<{ success: boolean; fiatTx?: FiatTransaction; error?: string }> => {
    if (!wallet || !wallet.privateKey) return { success: false, error: 'Wallet locked' };
    const engine = getWartEngine();
    const txId = Date.now().toString(36);
    const result = await engine.buyWithFiat({ wartId, buyerAddress: wallet.address, paymentMethod, txId });
    if (result.success) refreshWartsState(wallet.address);
    return result;
  }, [wallet]);

  const doGetWartFiatPrice = useCallback((wartId: string): string | null => {
    const engine = getWartEngine();
    return engine.getFiatPrice(wartId);
  }, []);

  // ─── Contract Operations ──────────────────────────────

  const doCreateAuction = useCallback(async (wartId: string, startPrice: number, durationHours: number, reservePrice?: number): Promise<CosmoContract | null> => {
    if (!wallet || !wallet.privateKey) return null;
    const engine = getWartEngine();
    const contract = await engine.createAuction({
      wartId,
      sellerAddress: wallet.address,
      sellerPrivateKey: wallet.privateKey,
      startPrice,
      reservePrice,
      durationHours,
    });
    if (contract) refreshWartsState(wallet.address);
    return contract;
  }, [wallet]);

  const doGetWartContracts = useCallback((wartId: string): CosmoContract[] => {
    const engine = getWartEngine();
    return engine.getWartContracts(wartId);
  }, []);

  const doGetActiveAuctions = useCallback((): CosmoContract[] => {
    const engine = getWartEngine();
    return engine.getActiveAuctions();
  }, []);

  return (
    <WalletContext.Provider value={{
      wallet, unlocked, needsMigration, globalTxs, meshStats, supplyInfo,
      adminDashboard, levelProgress, lastLevelUp,
      initWallet, cosmoIDLogin: doCosmoIDLogin, unlock: doUnlock,
      lock: doLock, signOut: doSignOut, migrate: doMigrate,
      doExportWallet, doImportWallet,
      doGenerateCosmoLink, doImportCosmoLink,
      send, mine, refreshTxs, refreshStats, unlockAdmin, unlockCreator,
      warts, marketplace, myCollection, myCreated,
      mintWart, buyWart, listWart, delistWart, transferWart,
      deleteWart: doDeleteWart, editWart: doEditWart,
      addWartComment: doAddWartComment, verifyWartCertificate, refreshWarts,
      // Vault
      vaultStats,
      addToVault: doAddToVault,
      addAllToVault: doAddAllToVault,
      generateRecoveryKit: doGenerateRecoveryKit,
      restoreFromRecoveryKit: doRestoreFromRecoveryKit,
      // Fiat
      listWartFiat: doListWartFiat,
      buyWartFiat: doBuyWartFiat,
      getWartFiatPrice: doGetWartFiatPrice,
      // Contracts
      createAuction: doCreateAuction,
      getWartContracts: doGetWartContracts,
      getActiveAuctions: doGetActiveAuctions,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
