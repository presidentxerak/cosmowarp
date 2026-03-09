import { useWallet } from '../context/WalletContext';
import Logo from './Logo';

export default function LandingView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ─── Hero ──────────────────────────────────────────── */}
      <div className="glass-panel p-8 sm:p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          background: 'radial-gradient(circle at 20% 20%, #a855f7 0%, transparent 40%), radial-gradient(circle at 80% 80%, #06b6d4 0%, transparent 40%), radial-gradient(circle at 50% 50%, #f59e0b 0%, transparent 30%)',
        }} />
        <div className="relative">
          <Logo className="w-24 sm:w-32 h-24 sm:h-32 mx-auto mb-6 animate-float" />
          <h1 className="text-3xl sm:text-5xl font-bold opacity-100 mb-3 font-title">
            CosmoWarp
          </h1>
          <p className="text-base sm:text-lg opacity-80 font-bold mb-2">
            Post-Blockchain Transactional Fabric
          </p>
          <p className="text-base opacity-50 max-w-lg mx-auto mb-8 leading-relaxed">
            Not a chain. Not a coin. A living mesh.
            {' '}CosmoWarp is a new paradigm for value exchange — faster, fairer, and truly decentralized.
          </p>
          <button
            onClick={() => onNavigate('wallet')}
            className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer  hover:"
          >
            {wallet ? '\u25C8 Open Wallet' : '\u25C8 Connect'}
          </button>
        </div>
      </div>

      {/* ─── The Problem ───────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u26A0'} The Problem
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">Why the world needs something new</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '\u{1F3E6}',
              title: 'Centralized Finance',
              desc: 'Banks control your money. They freeze accounts, impose limits, charge hidden fees, and operate on their schedule — not yours.',
              color: 'opacity-80',
            },
            {
              icon: '\u26D3',
              title: 'Blockchain Limits',
              desc: 'Bitcoin is slow and wastes energy. Ethereum has high gas fees. Both rely on linear block chains that bottleneck at scale.',
              color: 'opacity-80',
            },
            {
              icon: '\u{1F441}',
              title: 'Surveillance Economy',
              desc: 'Every transaction you make is tracked, profiled, and sold. Your financial identity belongs to corporations, not to you.',
              color: 'opacity-80',
            },
          ].map(card => (
            <div key={card.title} className="p-4 bg-current/5 border border-current/5">
              <span className="text-2xl block mb-2">{card.icon}</span>
              <h3 className={`text-base font-bold ${card.color} mb-2`}>{card.title}</h3>
              <p className="text-body-sm opacity-50 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── The Solution ──────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u2B21'} The Solution
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">CosmoWarp changes everything</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: '\u25CE',
              title: 'CosmoMesh — DAG, Not Blockchain',
              desc: 'A Directed Acyclic Graph with 7 parallel validation layers. No blocks, no bottlenecks. Each transaction validates two others, creating a self-reinforcing mesh.',
              color: 'opacity-80',
            },
            {
              icon: '\u269B',
              title: 'Resonance Decay — Not Halving',
              desc: 'Mining rewards follow a smooth golden ratio curve instead of brutal halvings. Fair, predictable, and elegant. 69M total supply.',
              color: 'opacity-80',
            },
            {
              icon: '\u26BF',
              title: 'Real Cryptography',
              desc: 'Ed25519 signatures, SHA-256 hashing, AES-GCM encryption. Industry-standard, battle-tested primitives. No shortcuts.',
              color: 'opacity-80',
            },
            {
              icon: '\u2726',
              title: 'Certificate of Authenticity',
              desc: 'Every digital artwork (Wart) receives an unforgeable CWCERT certificate with SHA-256 fingerprint and creator Ed25519 signature. Permanent, tamper-proof.',
              color: 'opacity-80',
            },
          ].map(card => (
            <div key={card.title} className="p-4 bg-current/5 border border-current/5">
              <span className={`text-2xl block mb-2 ${card.color}`}>{card.icon}</span>
              <h3 className={`text-base font-bold ${card.color} mb-2`}>{card.title}</h3>
              <p className="text-body-sm opacity-50 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── How It Works ──────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u2699'} How It Works
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">4 steps to enter the CosmoWarp universe</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '01', icon: '\u25C8', title: 'Create Wallet', desc: 'Generate an Ed25519 keypair. Your address is yours forever. No email, no KYC, no intermediary.', action: 'wallet' },
            { step: '02', icon: '\u26CF', title: 'Mine Warps', desc: 'Run CosmoASM proof-of-computation programs. Earn Warps (\u03A9) proportional to your contribution. No wasted energy.', action: 'wallet' },
            { step: '03', icon: '\u2B22', title: 'Create & Trade', desc: 'Mint digital artworks (Warts) with unforgeable certificates. Buy, sell, and collect on the Wart Market.', action: 'warts' },
            { step: '04', icon: '\u25CE', title: 'Connect', desc: 'Join CosmoChat — an encrypted social network. Share, tip in Warps, create channels, and build your community.', action: 'cosmochat' },
          ].map(s => (
            <button
              key={s.step}
              onClick={() => onNavigate(s.action)}
              className="p-4 bg-current/5 border border-current/5 text-left hover:bg-current/5 hover:border-current/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl opacity-80 opacity-30 group-hover:opacity-80 transition-opacity">{s.step}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <h3 className="text-base font-bold opacity-90 mb-1">{s.title}</h3>
              <p className="text-[11px] opacity-40 leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Ecosystem ─────────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u2604'} The Ecosystem
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">Everything you need, in one place</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: '\u25C8', label: 'Wallet', desc: 'Send, receive, mine', tab: 'wallet', color: 'opacity-80' },
            { icon: '\u2B22', label: 'Wart Market', desc: 'Digital art marketplace', tab: 'warts', color: 'opacity-80' },
            { icon: '\u25CE', label: 'CosmoChat', desc: 'Social network', tab: 'cosmochat', color: 'opacity-80' },
            { icon: '\u25C9', label: 'Feed', desc: 'Transaction history', tab: 'feed', color: 'opacity-80' },
            { icon: '\u2B21', label: 'White Paper', desc: 'Full documentation', tab: 'whitepaper', color: 'opacity-80' },
            { icon: '\u2753', label: 'Help & Cosmo', desc: 'AI guide + FAQ', tab: 'help', color: 'opacity-80' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="p-3 bg-current/5 border border-current/5 text-center hover:bg-current/5 transition-all cursor-pointer"
            >
              <span className={`text-xl block mb-1 ${item.color}`}>{item.icon}</span>
              <p className="text-body-sm font-bold opacity-90">{item.label}</p>
              <p className="text-[10px] opacity-40">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: '69M', label: 'Total Supply', color: 'opacity-80' },
          { value: '\u03C6', label: 'Golden Ratio Mining', color: 'opacity-80' },
          { value: '7', label: 'Mesh Layers', color: 'opacity-80' },
          { value: '\u221E', label: 'Offline + Online', color: 'opacity-80' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-4 text-center">
            <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] opacity-40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <div className="glass-panel p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 50% 50%, #a855f7 0%, transparent 60%)',
        }} />
        <div className="relative">
          <h2 className="text-xl sm:text-2xl font-bold opacity-100 mb-3 font-title">
            Ready to enter the Cosmos?
          </h2>
          <p className="text-base opacity-50 mb-6 max-w-md mx-auto">
            Create your wallet in seconds. No email required. No third-party. Just you and the mesh.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer "
            >
              {wallet ? '\u25C8 Open Wallet' : '\u2B21 Create Wallet'}
            </button>
            <button
              onClick={() => onNavigate('whitepaper')}
              className="px-8 py-3 bg-white/5 border border-current/10 opacity-70 text-base hover:bg-white/10 transition-all cursor-pointer"
            >
              {'\u2B21'} Read White Paper
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] opacity-30">
        CosmoWarp Foundation {'\u2B21'} — A post-blockchain transactional fabric for humanity
      </p>
    </div>
  );
}
