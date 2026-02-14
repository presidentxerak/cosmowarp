import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loadWallet, createWallet, sendWarps, mineWarps, getGlobalTransactions, getMeshStats, type WarpWallet, type Transaction } from '../engine/wallet';
import type { MeshStats } from '../engine/cosmomesh';

interface WalletContextType {
  wallet: WarpWallet | null;
  globalTxs: Transaction[];
  meshStats: MeshStats | null;
  initWallet: (alias?: string) => Promise<void>;
  send: (to: string, amount: number, memo?: string) => Promise<{ success: boolean; error?: string }>;
  mine: (energy: number, cycles: number) => Promise<Transaction>;
  refreshTxs: () => void;
  refreshStats: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WarpWallet | null>(null);
  const [globalTxs, setGlobalTxs] = useState<Transaction[]>([]);
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);

  useEffect(() => {
    const w = loadWallet();
    if (w) setWallet(w);
    setGlobalTxs(getGlobalTransactions());
    try { setMeshStats(getMeshStats()); } catch { /* first load */ }
  }, []);

  const initWallet = useCallback(async (alias?: string) => {
    const w = await createWallet(alias);
    setWallet({ ...w });
    setMeshStats(getMeshStats());
  }, []);

  const send = useCallback(async (to: string, amount: number, memo?: string) => {
    if (!wallet) return { success: false, error: 'No wallet' };
    const result = await sendWarps(wallet, to, amount, memo);
    if (result.success) {
      setWallet({ ...wallet });
      setGlobalTxs(getGlobalTransactions());
      setMeshStats(getMeshStats());
    }
    return result;
  }, [wallet]);

  const mine = useCallback(async (energy: number, cycles: number) => {
    if (!wallet) throw new Error('No wallet');
    const tx = await mineWarps(wallet, energy, cycles);
    setWallet({ ...wallet });
    setGlobalTxs(getGlobalTransactions());
    setMeshStats(getMeshStats());
    return tx;
  }, [wallet]);

  const refreshTxs = useCallback(() => {
    setGlobalTxs(getGlobalTransactions());
  }, []);

  const refreshStats = useCallback(() => {
    try { setMeshStats(getMeshStats()); } catch { /* no mesh yet */ }
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, globalTxs, meshStats, initWallet, send, mine, refreshTxs, refreshStats }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
