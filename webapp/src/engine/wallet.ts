import { generateKeyPair, signTransaction } from './crypto';

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
  type: 'send' | 'receive' | 'mine' | 'genesis';
  memo?: string;
}

export interface WarpWallet {
  address: string;
  privateKey: string;
  balance: number;
  transactions: Transaction[];
  createdAt: number;
  alias?: string;
}

const STORAGE_KEY = 'cosmowarp_wallet';
const TX_STORAGE_KEY = 'cosmowarp_global_tx';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadWallet(): WarpWallet | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWallet(wallet: WarpWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function createWallet(alias?: string): WarpWallet {
  const { publicKey, privateKey } = generateKeyPair();
  const wallet: WarpWallet = {
    address: publicKey,
    privateKey,
    balance: 100, // Genesis bonus
    transactions: [{
      id: genId(),
      from: 'COSMO_GENESIS',
      to: publicKey,
      amount: 100,
      timestamp: Date.now(),
      signature: 'genesis',
      type: 'genesis',
      memo: 'Welcome to CosmoWarp! Genesis bonus: 100 \u03A9',
    }],
    createdAt: Date.now(),
    alias,
  };
  saveWallet(wallet);
  return wallet;
}

export function sendWarps(
  wallet: WarpWallet,
  toAddress: string,
  amount: number,
  memo?: string
): { success: boolean; error?: string; tx?: Transaction } {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  if (amount > wallet.balance) return { success: false, error: 'Insufficient Warps' };
  if (toAddress === wallet.address) return { success: false, error: 'Cannot send to yourself' };
  if (!/^CW[a-f0-9]{40}$/.test(toAddress)) return { success: false, error: 'Invalid address format' };

  const txData = `${wallet.address}:${toAddress}:${amount}:${Date.now()}`;
  const signature = signTransaction(txData, wallet.privateKey);

  const tx: Transaction = {
    id: genId(),
    from: wallet.address,
    to: toAddress,
    amount,
    timestamp: Date.now(),
    signature,
    type: 'send',
    memo,
  };

  wallet.balance -= amount;
  wallet.transactions.unshift(tx);
  saveWallet(wallet);

  // Store in global feed
  addGlobalTx(tx);

  return { success: true, tx };
}

export function mineWarps(
  wallet: WarpWallet,
  energyUsed: number,
  cycles: number
): Transaction {
  // Mining reward = energy / 10, min 1, max 50
  const reward = Math.min(50, Math.max(1, Math.round(energyUsed / 10)));

  const tx: Transaction = {
    id: genId(),
    from: 'COSMO_MINE',
    to: wallet.address,
    amount: reward,
    timestamp: Date.now(),
    signature: 'mined',
    type: 'mine',
    memo: `Mined with ${cycles} cycles, ${energyUsed.toFixed(1)} energy`,
  };

  wallet.balance += reward;
  wallet.transactions.unshift(tx);
  saveWallet(wallet);
  addGlobalTx(tx);

  return tx;
}

// Global transaction feed (simulated network)
export function getGlobalTransactions(): Transaction[] {
  const raw = localStorage.getItem(TX_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addGlobalTx(tx: Transaction): void {
  const txs = getGlobalTransactions();
  txs.unshift(tx);
  // Keep last 100
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(txs.slice(0, 100)));
}
