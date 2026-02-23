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
import { generateCosmoLink, parseCosmoLink } from '../engine/cosmolink';
import type { MeshStats } from '../engine/cosmomesh';
import { WartEngine, type Wart } from '../engine/warts';
import { storage } from '../engine/storage';

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
  mine: (energy: number, cycles: number) => Promise<{ tx: Transaction; levelUp?: LevelUpResult }>;
  refreshTxs: () => void;
  refreshStats: () => void;
  unlockAdmin: () => Promise<boolean>;
  unlockCreator: (amount: number) => Promise<boolean>;
  // Wart operations
  warts: Wart[];
  marketplace: Wart[];
  myCollection: Wart[];
  myCreated: Wart[];
  mintWart: (title: string, description: string, imageData: string, price: number | null, royaltyPercent?: number, editionType?: 'unique' | 'limited' | 'unlimited', maxEditions?: number | null, durationHours?: number | null, mediaType?: 'image' | 'audio' | 'video', audioCover?: string) => Promise<Wart>;
  buyWart: (wartId: string) => Promise<{ success: boolean; error?: string }>;
  listWart: (wartId: string, price: number) => boolean;
  delistWart: (wartId: string) => boolean;
  transferWart: (wartId: string, toAddress: string) => Promise<{ success: boolean; error?: string }>;
  deleteWart: (wartId: string) => boolean;
  editWart: (wartId: string, updates: { title?: string; description?: string; price?: number | null; royaltyPercent?: number }) => boolean;
  addWartComment: (wartId: string, content: string) => boolean;
  verifyWartCertificate: (wartId: string) => Promise<{ valid: boolean; reason: string }>;
  refreshWarts: () => void;
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

  // ─── Load wallet on mount ──────────────────────────────
  useEffect(() => {
    const w = loadWallet();
    if (w) {
      setWallet(w);
      setLevelProgress(getProgressToNextLevel(w.address));
      setNeedsMigration(walletNeedsMigration());
    }
    setGlobalTxs(getGlobalTransactions());
    try {
      setMeshStats(getMeshStats());
      setSupplyInfo(getSupplyBreakdown());
    } catch { /* first load */ }
    refreshWartsState(w?.address);
  }, []);

  function refreshWartsState(address?: string) {
    const engine = getWartEngine();
    setWarts(engine.getAll());
    setMarketplace(engine.getMarketplace());
    if (address) {
      setMyCollection(engine.getCollection(address));
      setMyCreated(engine.getCreated(address));
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
      refreshWartsState(w.address);
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
    }
    return result;
  }, [wallet]);

  // ─── Mine ──────────────────────────────────────────────
  const mine = useCallback(async (energy: number, cycles: number) => {
    if (!wallet) throw new Error('No wallet');
    const result = await mineWarps(wallet, energy, cycles);
    setWallet({ ...wallet });
    setGlobalTxs(getGlobalTransactions());
    setMeshStats(getMeshStats());
    setSupplyInfo(getSupplyBreakdown());
    setLevelProgress(getProgressToNextLevel(wallet.address));
    if (result.levelUp) setLastLevelUp(result.levelUp);
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
    mediaType: 'image' | 'audio' | 'video' = 'image',
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
    const txs = JSON.parse(storage.getItem('cosmowarp_global_tx') || '[]');
    txs.unshift(tx);
    storage.setItem('cosmowarp_global_tx', JSON.stringify(txs.slice(0, 200)));
    wallet.transactions.unshift(tx);

    setWallet({ ...wallet });
    refreshWartsState(wallet.address);
    setGlobalTxs(getGlobalTransactions());
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
    return { success: true };
  }, [wallet]);

  const listWart = useCallback((wartId: string, price: number): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.list(wartId, price, wallet.address);
    if (ok) refreshWartsState(wallet.address);
    return ok;
  }, [wallet]);

  const delistWart = useCallback((wartId: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.delist(wartId, wallet.address);
    if (ok) refreshWartsState(wallet.address);
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
    return { success: true };
  }, [wallet]);

  const doDeleteWart = useCallback((wartId: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.delete(wartId, wallet.address);
    if (ok) refreshWartsState(wallet.address);
    return ok;
  }, [wallet]);

  const doEditWart = useCallback((
    wartId: string,
    updates: { title?: string; description?: string; price?: number | null; royaltyPercent?: number },
  ): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const ok = engine.update(wartId, wallet.address, updates);
    if (ok) refreshWartsState(wallet.address);
    return ok;
  }, [wallet]);

  const doAddWartComment = useCallback((wartId: string, content: string): boolean => {
    if (!wallet) return false;
    const engine = getWartEngine();
    const alias = wallet.alias || wallet.address.slice(0, 10);
    const comment = engine.addComment(wartId, wallet.address, alias, content);
    if (comment) refreshWartsState(wallet.address);
    return !!comment;
  }, [wallet]);

  const verifyWartCertificate = useCallback(async (wartId: string): Promise<{ valid: boolean; reason: string }> => {
    const engine = getWartEngine();
    return engine.verifyCertificate(wartId);
  }, []);

  const refreshWarts = useCallback(() => {
    refreshWartsState(wallet?.address);
  }, [wallet]);

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
