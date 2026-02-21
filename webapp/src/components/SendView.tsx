import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function SendView() {
  const { wallet, send } = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-gray-400">Create a wallet first to send Warps.</p>
      </div>
    );
  }

  const handleSend = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) {
      setResult({ success: false, message: 'Invalid amount' });
      return;
    }
    setSending(true);
    try {
      const res = await send(to.trim(), amt, memo || undefined);
      if (res.success) {
        setResult({ success: true, message: `Sent ${amt} \u03A9 via CosmoMesh DAG!` });
        setTo('');
        setAmount('');
        setMemo('');
      } else {
        setResult({ success: false, message: res.error || 'Transaction failed' });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Transaction failed' });
    } finally {
      setSending(false);
    }
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5">
        <h2 className="text-lg font-bold text-warp-300 mb-1 font-title">{'\u2197'} Send Warps</h2>
        <p className="text-xs text-gray-500 mb-4">
          Balance: <span className="text-energy-400">{wallet.balance.toLocaleString()} {'\u03A9'}</span>
          <span className="text-gray-600 ml-2">Ed25519 signed + DAG validated</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">RECIPIENT ADDRESS</label>
            <input
              className="warp-input"
              placeholder="CW..."
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">AMOUNT ({'\u03A9'})</label>
            <div className="flex gap-2">
              <input
                className="warp-input"
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <button
                className="warp-button text-xs shrink-0"
                onClick={() => setAmount(wallet.balance.toString())}
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">MEMO (optional)</label>
            <input
              className="warp-input"
              placeholder="What's this for?"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>

          {result && (
            <div className={`text-sm p-3 rounded-none ${
              result.success
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {result.message}
            </div>
          )}

          <button
            className="warp-button w-full py-3 text-base"
            onClick={handleSend}
            disabled={!to || !amount || sending}
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
                Signing & Validating...
              </span>
            ) : (
              <>{'\u26A1'} Send Transaction</>
            )}
          </button>
        </div>
      </div>

      {/* Quick amounts */}
      <div className="glass-panel p-4">
        <p className="text-[10px] text-gray-500 mb-2">QUICK AMOUNTS</p>
        <div className="flex gap-2 flex-wrap">
          {[10, 25, 50, 100].map(a => (
            <button
              key={a}
              className="warp-button text-xs"
              onClick={() => setAmount(a.toString())}
              disabled={a > wallet.balance}
            >
              {a} {'\u03A9'}
            </button>
          ))}
        </div>
      </div>

      {/* Protocol info */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-2">Transaction Flow</h3>
        <div className="text-[11px] text-gray-500 space-y-1">
          <p>1. Ed25519 signature generation</p>
          <p>2. SHA-256 deterministic TX ID</p>
          <p>3. DAG parent selection (2 tips)</p>
          <p>4. Layer assignment by amount</p>
          <p>5. Resonance Consensus validation</p>
          <p>6. Merkle-DAG commitment</p>
        </div>
      </div>
    </div>
  );
}
