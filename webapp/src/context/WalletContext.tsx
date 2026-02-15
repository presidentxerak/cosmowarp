import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  loadWallet, createWallet, sendWarps, mineWarps,
  getGlobalTransactions, getMeshStats, getSupplyBreakdown,
  getProgressToNextLevel, unlockAdminRegistry, getAdminDashboard,
  unlockCreatorTokens,
  type WarpWallet, type Transaction, type SupplyBreakdown,
  type RegistryDashboard, type LevelUpResult,
} from '../engine/wallet';
import type { MeshStats } from '../engine/cosmomesh';

interface WalletContextType {
  wallet: WarpWallet | null;
  globalTxs: Transaction[];
  meshStats: MeshStats | null;
  supplyInfo: SupplyBreakdown | null;
  adminDashboard: RegistryDashboard | null;
  levelProgress: number;
  lastLevelUp: LevelUpResult | null;
  initWallet: (alias?: string) => Promise<void>;
  send: (to: string, amount: number, memo?: string) => Promise<{ success: boolean; error?: string; levelUp?: LevelUpResult }>;
  mine: (energy: number, cycles: number) => Promise<{ tx: Transaction; levelUp?: LevelUpResult }>;
  refreshTxs: () => void;
  refreshStats: () => void;
  unlockAdmin: () => Promise<boolean>;
  unlockCreator: (amount: number) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WarpWallet | null>(null);
  const [globalTxs, setGlobalTxs] = useState<Transaction[]>([]);
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);
  const [supplyInfo, setSupplyInfo] = useState<SupplyBreakdown | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<RegistryDashboard | null>(null);
  const [levelProgress, setLevelProgress] = useState(0);
  const [lastLevelUp, setLastLevelUp] = useState<LevelUpResult | null>(null);

  useEffect(() => {
    const w = loadWallet();
    if (w) {
      setWallet(w);
      setLevelProgress(getProgressToNextLevel(w.address));
    }
    setGlobalTxs(getGlobalTransactions());
    try {
      setMeshStats(getMeshStats());
      setSupplyInfo(getSupplyBreakdown());
    } catch { /* first load */ }
  }, []);

  const initWallet = useCallback(async (alias?: string) => {
    const w = await createWallet(alias);
    setWallet({ ...w });
    setMeshStats(getMeshStats());
    setSupplyInfo(getSupplyBreakdown());
    setLevelProgress(0);
  }, []);

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

  return (
    <WalletContext.Provider value={{
      wallet, globalTxs, meshStats, supplyInfo, adminDashboard, levelProgress, lastLevelUp,
      initWallet, send, mine, refreshTxs, refreshStats, unlockAdmin, unlockCreator,
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
