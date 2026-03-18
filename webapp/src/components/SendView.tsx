import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function SendView() {
  const { wallet, unlocked, send } = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Créez un wallet pour envoyer des Strangrz.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Déverrouillez votre wallet pour envoyer des Strangrz.</p>
      </div>
    );
  }

  const handleSend = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt)) {
      setResult({ success: false, message: 'Montant invalide' });
      return;
    }
    setSending(true);
    try {
      const res = await send(to.trim(), amt, memo || undefined);
      if (res.success) {
        setResult({ success: true, message: `${amt} \u2B23 envoyés via StrangrzMesh DAG !` });
        setTo('');
        setAmount('');
        setMemo('');
      } else {
        setResult({ success: false, message: res.error || 'Échec de la transaction' });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Échec de la transaction' });
    } finally {
      setSending(false);
    }
    setTimeout(() => setResult(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5">
        <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u2197'} Envoyer des Strangrz</h2>
        <p className="text-body-sm opacity-60 mb-4">
          Balance: <span className="opacity-80">{wallet.balance.toLocaleString()} {'\u2B23'}</span>
          <span className="opacity-50 ml-2">Ed25519 signed + DAG validated</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-label opacity-50 block mb-1">ADRESSE DU DESTINATAIRE</label>
            <input
              className="warp-input"
              placeholder="STZ..."
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-label opacity-50 block mb-1">AMOUNT ({'\u2B23'})</label>
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
                className="warp-button text-body-sm shrink-0"
                onClick={() => setAmount(wallet.balance.toString())}
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="text-label opacity-50 block mb-1">MEMO (optional)</label>
            <input
              className="warp-input"
              placeholder="Motif du transfert"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>

          {result && (
            <div className={`text-base p-3 rounded-none ${
              result.success
                ? 'bg-current/5 border border-current/10 opacity-80'
                : 'bg-current/5 border border-current/15 opacity-70'
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
                <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
                Signature & Validation...
              </span>
            ) : (
              <>{'\u26A1'} Envoyer</>
            )}
          </button>
        </div>
      </div>

      {/* Quick amounts */}
      <div className="glass-panel p-4">
        <p className="text-label opacity-60 mb-2">MONTANTS RAPIDES</p>
        <div className="flex gap-2 flex-wrap">
          {[10, 25, 50, 100].map(a => (
            <button
              key={a}
              className="warp-button text-body-sm"
              onClick={() => setAmount(a.toString())}
              disabled={a > wallet.balance}
            >
              {a} {'\u2B23'}
            </button>
          ))}
        </div>
      </div>

      {/* Protocol info */}
      <div className="glass-panel p-4">
        <h3 className="text-base font-bold opacity-70 mb-2">Flux de transaction</h3>
        <div className="text-[11px] opacity-60 space-y-1">
          <p>1. Génération de signature Ed25519</p>
          <p>2. ID de TX déterministe SHA-256</p>
          <p>3. Sélection des parents DAG (2 tips)</p>
          <p>4. Assignation de couche par montant</p>
          <p>5. Validation par Consensus Résonance</p>
          <p>6. Engagement Merkle-DAG</p>
        </div>
      </div>
    </div>
  );
}
