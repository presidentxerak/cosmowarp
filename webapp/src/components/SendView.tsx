import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function SendView() {
  const { wallet, send } = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-gray-400">Create a wallet first to send Warps.</p>
      </div>
    );
  }

  const handleSend = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) {
      setResult({ success: false, message: 'Invalid amount' });
      return;
    }
    const res = send(to.trim(), amt, memo || undefined);
    if (res.success) {
      setResult({ success: true, message: `Sent ${amt} \u03A9 successfully!` });
      setTo('');
      setAmount('');
      setMemo('');
    } else {
      setResult({ success: false, message: res.error || 'Transaction failed' });
    }
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5">
        <h2 className="text-lg font-bold text-warp-300 mb-1">{'\u2197'} Send Warps</h2>
        <p className="text-xs text-gray-500 mb-4">
          Balance: <span className="text-energy-400">{wallet.balance.toLocaleString()} {'\u03A9'}</span>
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
            <div className={`text-sm p-3 rounded-lg ${
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
            disabled={!to || !amount}
          >
            {'\u26A1'} Send Transaction
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
    </div>
  );
}
