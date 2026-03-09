import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { FiatGateway, getCurrencySymbol, formatFiatPrice } from '../engine/fiatgateway';
import type { FiatCurrency, FiatTransaction, PaymentMethod, ExchangeRate } from '../engine/fiatgateway';

type Tab = 'buy' | 'sell' | 'rates' | 'history';

export default function FiatGatewayView() {
  const { wallet, unlocked, send } = useWallet();
  const [gateway] = useState(() => new FiatGateway());
  const [tab, setTab] = useState<Tab>('buy');

  // Currency
  const [currency, setCurrency] = useState<FiatCurrency>('EUR');
  const [rates, setRates] = useState<ExchangeRate[]>([]);

  // Buy
  const [buyAmount, setBuyAmount] = useState('');
  const [buyMethod, setBuyMethod] = useState<PaymentMethod>('card');
  const [buyResult, setBuyResult] = useState('');
  const [buying, setBuying] = useState(false);

  // Sell
  const [sellWarps, setSellWarps] = useState('');
  const [sellMethod, setSellMethod] = useState<PaymentMethod>('sepa');
  const [sellResult, setSellResult] = useState('');
  const [selling, setSelling] = useState(false);

  // History
  const [transactions, setTransactions] = useState<FiatTransaction[]>([]);

  useEffect(() => {
    setRates(gateway.getAllRates());
    if (wallet) {
      setTransactions(gateway.getTransactionsByAddress(wallet.address));
    }
  }, [wallet, tab]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">{'\u20AC'}</p>
          <h2 className="text-title-sm font-bold mb-1 font-title">Fiat Gateway</h2>
          <p className="opacity-50 text-base">Unlock your wallet to access the fiat gateway</p>
          <p className="opacity-30 text-body-sm mt-1">Buy and sell Warps with EUR, USD, GBP</p>
        </div>
      </div>
    );
  }

  const buyFiat = parseFloat(buyAmount) || 0;
  const buyWarps = gateway.fiatToWarps(buyFiat, currency);
  const buyFees = buyFiat > 0 ? gateway.calculateFees(buyFiat, buyMethod) : null;

  const sellWarpAmount = parseFloat(sellWarps) || 0;
  const sellFiat = gateway.warpsToFiat(sellWarpAmount, currency);
  const sellFees = sellFiat > 0 ? gateway.calculateFees(sellFiat, sellMethod) : null;

  const handleBuy = async () => {
    if (buyFiat <= 0) return;
    setBuying(true);
    setBuyResult('');
    try {
      const tx = await gateway.createBuyTransaction({
        buyerAddress: wallet.address,
        sellerAddress: 'FIAT_GATEWAY',
        wartId: '',
        wartTitle: '',
        fiatAmount: buyFiat,
        currency,
        paymentMethod: buyMethod,
      });
      // Simulate crediting warps to wallet
      await send('FIAT_GATEWAY', 0, `Fiat buy: ${formatFiatPrice(buyFiat, currency)}`);
      setBuyResult(`Purchased ${tx.warpAmount.toFixed(2)} \u03A9 for ${formatFiatPrice(buyFiat, currency)}`);
      setBuyAmount('');
      setTransactions(gateway.getTransactionsByAddress(wallet.address));
    } catch (e: any) {
      setBuyResult(`Error: ${e.message}`);
    }
    setBuying(false);
    setTimeout(() => setBuyResult(''), 5000);
  };

  const handleSell = async () => {
    if (sellWarpAmount <= 0) return;
    if (sellWarpAmount > wallet.balance) {
      setSellResult('Insufficient balance');
      setTimeout(() => setSellResult(''), 3000);
      return;
    }
    setSelling(true);
    setSellResult('');
    try {
      const tx = await gateway.createSellTransaction({
        sellerAddress: wallet.address,
        warpAmount: sellWarpAmount,
        currency,
        paymentMethod: sellMethod,
      });
      await send('FIAT_GATEWAY', sellWarpAmount, `Fiat sell: ${sellWarpAmount} \u03A9`);
      setSellResult(`Sold ${sellWarpAmount} \u03A9 for ${formatFiatPrice(tx.sellerReceives, currency)} (after fees)`);
      setSellWarps('');
      setTransactions(gateway.getTransactionsByAddress(wallet.address));
    } catch (e: any) {
      setSellResult(`Error: ${e.message}`);
    }
    setSelling(false);
    setTimeout(() => setSellResult(''), 5000);
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: 'Card', icon: '\u2610' },
    { id: 'paypal', label: 'PayPal', icon: '\u24C5' },
    { id: 'sepa', label: 'SEPA', icon: '\u2B21' },
    { id: 'apple_pay', label: 'Apple Pay', icon: '\uF8FF' },
    { id: 'google_pay', label: 'Google Pay', icon: '\u25B6' },
    { id: 'bank_transfer', label: 'Bank', icon: '\u23E3' },
  ];

  const currencies: FiatCurrency[] = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'];

  const tabList: { id: Tab; label: string }[] = [
    { id: 'buy', label: 'Buy \u03A9' },
    { id: 'sell', label: 'Sell \u03A9' },
    { id: 'rates', label: 'Rates' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="glass-panel p-5 text-center">
        <h2 className="text-title-sm font-bold font-title">{'\u20AC'} Fiat Gateway</h2>
        <p className="text-body-sm opacity-40 mt-1">Buy and sell Warps with fiat currency</p>
        <p className="text-label opacity-30 mt-1">MOCK — Interface only, no real payment processing</p>
        <div className="flex justify-center gap-3 mt-3">
          <span className="text-base font-bold opacity-80">{wallet.balance.toFixed(2)} {'\u03A9'}</span>
          <span className="text-base opacity-40">|</span>
          <span className="text-base opacity-60">{'\u2248'} {formatFiatPrice(gateway.warpsToFiat(wallet.balance, currency), currency)}</span>
        </div>
      </div>

      {/* Currency selector */}
      <div className="flex gap-1 px-1">
        {currencies.map(c => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`flex-1 py-1.5 text-body-sm font-medium transition-all cursor-pointer ${
              currency === c ? 'bg-current/10 opacity-90' : 'opacity-40 hover:opacity-70'
            }`}
          >
            {getCurrencySymbol(c)} {c}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-current/10 px-2">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-50 hover:opacity-90'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Buy Tab ──────────────────────────────────── */}
      {tab === 'buy' && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-base font-bold opacity-70">Buy Warps with {currency}</h3>

          <div>
            <label className="text-label opacity-40 block mb-1">AMOUNT ({getCurrencySymbol(currency)})</label>
            <input
              className="warp-input text-title-sm text-center"
              type="number"
              value={buyAmount}
              onChange={e => setBuyAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {buyFiat > 0 && (
            <div className="bg-current/5 p-3 space-y-1 text-body-sm">
              <div className="flex justify-between">
                <span className="opacity-50">You receive</span>
                <span className="font-bold opacity-90">{buyWarps.toFixed(2)} {'\u03A9'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Rate</span>
                <span className="opacity-60">1 {currency} = {gateway.getRate(currency)?.warpsPerUnit} {'\u03A9'}</span>
              </div>
              {buyFees && (
                <>
                  <div className="flex justify-between">
                    <span className="opacity-40">Platform fee (2.5%)</span>
                    <span className="opacity-40">{getCurrencySymbol(currency)}{buyFees.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-40">Processor fee</span>
                    <span className="opacity-40">{getCurrencySymbol(currency)}{buyFees.processorFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-current/10">
                    <span className="opacity-60 font-medium">Total</span>
                    <span className="font-bold opacity-90">{formatFiatPrice(buyFiat, currency)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-label opacity-40 block mb-2">PAYMENT METHOD</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setBuyMethod(m.id)}
                  className={`py-2 text-body-sm transition-all cursor-pointer border ${
                    buyMethod === m.id
                      ? 'border-current/20 opacity-90 bg-current/5'
                      : 'border-current/10 opacity-40 hover:opacity-70'
                  }`}
                >
                  <span className="text-base block">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBuy}
            className="warp-button w-full py-3 text-base"
            disabled={buying || buyFiat <= 0}
          >
            {buying ? 'Processing...' : `Buy ${buyWarps > 0 ? buyWarps.toFixed(2) + ' \u03A9' : 'Warps'}`}
          </button>

          {buyResult && (
            <p className="text-body-sm text-center opacity-70">{buyResult}</p>
          )}
        </div>
      )}

      {/* ─── Sell Tab ─────────────────────────────────── */}
      {tab === 'sell' && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-base font-bold opacity-70">Sell Warps for {currency}</h3>

          <div>
            <label className="text-label opacity-40 block mb-1">AMOUNT ({'\u03A9'})</label>
            <input
              className="warp-input text-title-sm text-center"
              type="number"
              value={sellWarps}
              onChange={e => setSellWarps(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <p className="text-label opacity-30 mt-1 text-right">Balance: {wallet.balance.toFixed(2)} {'\u03A9'}</p>
          </div>

          {sellWarpAmount > 0 && (
            <div className="bg-current/5 p-3 space-y-1 text-body-sm">
              <div className="flex justify-between">
                <span className="opacity-50">Gross amount</span>
                <span className="opacity-60">{formatFiatPrice(sellFiat, currency)}</span>
              </div>
              {sellFees && (
                <>
                  <div className="flex justify-between">
                    <span className="opacity-40">Platform fee (2.5%)</span>
                    <span className="opacity-40">-{getCurrencySymbol(currency)}{sellFees.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-40">Processor fee</span>
                    <span className="opacity-40">-{getCurrencySymbol(currency)}{sellFees.processorFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-current/10">
                    <span className="opacity-60 font-medium">You receive</span>
                    <span className="font-bold opacity-90">{formatFiatPrice(sellFees.sellerReceives, currency)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-label opacity-40 block mb-2">PAYOUT METHOD</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.filter(m => ['sepa', 'paypal', 'bank_transfer'].includes(m.id)).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSellMethod(m.id)}
                  className={`py-2 text-body-sm transition-all cursor-pointer border ${
                    sellMethod === m.id
                      ? 'border-current/20 opacity-90 bg-current/5'
                      : 'border-current/10 opacity-40 hover:opacity-70'
                  }`}
                >
                  <span className="text-base block">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSell}
            className="warp-button w-full py-3 text-base"
            disabled={selling || sellWarpAmount <= 0}
          >
            {selling ? 'Processing...' : `Sell ${sellWarpAmount > 0 ? sellWarpAmount.toFixed(2) + ' \u03A9' : 'Warps'}`}
          </button>

          {sellResult && (
            <p className="text-body-sm text-center opacity-70">{sellResult}</p>
          )}
        </div>
      )}

      {/* ─── Rates Tab ────────────────────────────────── */}
      {tab === 'rates' && (
        <div className="space-y-3">
          <div className="glass-panel p-5">
            <h3 className="text-base font-bold opacity-70 mb-3">Exchange Rates</h3>
            <p className="text-label opacity-30 mb-4">1 unit of fiat = X Warps ({'\u03A9'})</p>
            <div className="space-y-2">
              {rates.map(r => (
                <div key={r.currency} className="flex items-center justify-between py-2 border-b border-current/5">
                  <div className="flex items-center gap-3">
                    <span className="text-title-sm font-bold opacity-90 w-10">{getCurrencySymbol(r.currency)}</span>
                    <span className="text-base opacity-60">{r.currency}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold opacity-90">{r.warpsPerUnit} {'\u03A9'}</span>
                    <p className="text-label opacity-30">
                      1 {'\u03A9'} = {getCurrencySymbol(r.currency)}{(1 / r.warpsPerUnit).toFixed(4)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h3 className="text-base font-bold opacity-70 mb-3">Fee Schedule</h3>
            <div className="space-y-2 text-body-sm">
              <div className="flex justify-between py-1">
                <span className="opacity-50">Platform fee</span>
                <span className="opacity-70">2.5%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="opacity-50">Card (Stripe)</span>
                <span className="opacity-70">2.9% + {getCurrencySymbol(currency)}0.30</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="opacity-50">PayPal</span>
                <span className="opacity-70">3.49% + {getCurrencySymbol(currency)}0.49</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="opacity-50">SEPA transfer</span>
                <span className="opacity-70">0.8%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="opacity-50">Bank transfer</span>
                <span className="opacity-70">{getCurrencySymbol(currency)}1.50 flat</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Tab ──────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="glass-panel p-10 text-center">
              <p className="text-base opacity-50">No transactions yet</p>
              <p className="text-body-sm opacity-30 mt-1">Buy or sell Warps to see your history</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="glass-panel p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${tx.type === 'buy' ? 'opacity-80' : 'opacity-60'}`}>
                      {tx.type === 'buy' ? '\u2191 Buy' : '\u2193 Sell'}
                    </span>
                    <span className={`text-label px-1.5 py-0.5 ${
                      tx.status === 'completed' ? 'bg-current/5 opacity-60' :
                      tx.status === 'failed' ? 'opacity-40' : 'opacity-40'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <span className="text-label opacity-30">
                    {new Date(tx.timestamp).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between text-body-sm mt-1">
                  <span className="opacity-60">{tx.warpAmount.toFixed(2)} {'\u03A9'}</span>
                  <span className="opacity-60">{formatFiatPrice(tx.fiatAmount, tx.fiatCurrency)}</span>
                </div>
                <div className="flex justify-between text-label opacity-30 mt-1">
                  <span>via {tx.paymentMethod}</span>
                  <span>Fee: {getCurrencySymbol(tx.fiatCurrency)}{(tx.platformFeeAmount + tx.processorFeeAmount).toFixed(2)}</span>
                </div>
                {tx.wartTitle && (
                  <p className="text-label opacity-40 mt-1">Wart: {tx.wartTitle}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
