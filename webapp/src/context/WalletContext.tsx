import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loadWallet, createWallet, sendWarps, mineWarps, getGlobalTransactions, type WarpWallet, type Transaction } from '../engine/wallet';

interface WalletContextType {
  wallet: WarpWallet | null;
  globalTxs: Transaction[];
  initWallet: (alias?: string) => void;
  send: (to: string, amount: number, memo?: string) => { success: boolean; error?: string };
  mine: (energy: number, cycles: number) => Transaction;
  refreshTxs: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WarpWallet | null>(null);
  const [globalTxs, setGlobalTxs] = useState<Transaction[]>([]);

  useEffect(() => {
    const w = loadWallet();
    if (w) setWallet(w);
    setGlobalTxs(getGlobalTransactions());
  }, []);

  const initWallet = useCallback((alias?: string) => {
    const w = createWallet(alias);
    setWallet({ ...w });
  }, []);

  const send = useCallback((to: string, amount: number, memo?: string) => {
    if (!wallet) return { success: false, error: 'No wallet' };
    const result = sendWarps(wallet, to, amount, memo);
    if (result.success) {
      setWallet({ ...wallet });
      setGlobalTxs(getGlobalTransactions());
    }
    return result;
  }, [wallet]);

  const mine = useCallback((energy: number, cycles: number) => {
    if (!wallet) throw new Error('No wallet');
    const tx = mineWarps(wallet, energy, cycles);
    setWallet({ ...wallet });
    setGlobalTxs(getGlobalTransactions());
    return tx;
  }, [wallet]);

  const refreshTxs = useCallback(() => {
    setGlobalTxs(getGlobalTransactions());
  }, []);

  return (
    <WalletContext.Provider value={{ wallet, globalTxs, initWallet, send, mine, refreshTxs }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
