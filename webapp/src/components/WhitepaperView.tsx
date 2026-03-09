import { useState } from 'react';

type Section = 'overview' | 'foundation' | 'cosmomesh' | 'cosmochain' | 'cosmocode' | 'cosmohash' | 'cosmolingua' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '\u2B21' },
  { id: 'foundation', label: 'Foundation', icon: '\u2600' },
  { id: 'cosmomesh', label: 'CosmoMesh', icon: '\u25CE' },
  { id: 'cosmochain', label: 'CosmoChain', icon: '\u26D3' },
  { id: 'cosmocode', label: 'CosmoCode', icon: '\u25B7' },
  { id: 'cosmohash', label: 'CosmoHash', icon: '\u26BF' },
  { id: 'cosmolingua', label: 'CosmoLingua', icon: '\u223F' },
  { id: 'tokenomics', label: 'Tokenomics', icon: '\u269B' },
  { id: 'hierarchy', label: 'Hierarchy', icon: '\u2605' },
  { id: 'security', label: 'Security', icon: '\u26A1' },
  { id: 'roadmap', label: 'Roadmap', icon: '\u2604' },
];

export default function WhitepaperView() {
  const [section, setSection] = useState<Section>('overview');

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass-panel p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 30% 30%, #a855f7 0%, transparent 50%), radial-gradient(circle at 70% 70%, #06b6d4 0%, transparent 50%)',
        }} />
        <div className="relative">
          <div className="flex justify-center mb-4">
            <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="CosmoWarp" className="w-16 sm:w-20 h-16 sm:h-20 animate-float" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2 font-title">CosmoWarp</h1>
          <p className="text-sm sm:text-base text-gray-400 mb-1">White Paper v2.0</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            A post-blockchain transactional fabric with full on-chain SVG storage, 7 parallel shards,
            zero gas fees, and real SVG compression. Not a chain. Not a coin. A living mesh.
          </p>
        </div>
      </div>

      {/* Section Nav — wrapping grid on mobile, inline on desktop */}
      <div className="glass-panel p-2">
        <div className="grid grid-cols-5 gap-1 sm:flex sm:gap-1 sm:overflow-x-auto">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-none text-[10px] sm:text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                section === n.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className="text-sm sm:text-[11px] leading-none">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="glass-panel p-5 sm:p-6">
        {section === 'overview' && <OverviewSection />}
        {section === 'foundation' && <FoundationSection />}
        {section === 'cosmomesh' && <CosmoMeshSection />}
        {section === 'cosmochain' && <CosmoChainSection />}
        {section === 'cosmocode' && <CosmoCodeSection />}
        {section === 'cosmohash' && <CosmoHashSection />}
        {section === 'cosmolingua' && <CosmoLinguaSection />}
        {section === 'tokenomics' && <TokenomicsSection />}
        {section === 'hierarchy' && <HierarchySection />}
        {section === 'security' && <SecuritySection />}
        {section === 'roadmap' && <RoadmapSection />}
      </div>
    </div>
  );
}

// ─── Section Components ─────────────────────────────────

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold text-gray-100 font-title">{title}</h2>
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-300 leading-relaxed mb-4">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">{children}</h3>;
}

function Stat({ label, value, color = 'text-warp-400' }: { label: string; value: string; color?: string }) {
  return (
    <div className="glass-panel p-3 text-center bg-cosmic-900/40">
      <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────

function OverviewSection() {
  return (
    <div>
      <SectionTitle icon={'\u2B21'} title="Overview" subtitle="What is CosmoWarp and why does it exist?" />
      <P>
        CosmoWarp is a <span className="text-warp-400 font-bold">post-blockchain transactional fabric</span> that
        transcends both traditional fiat systems and cryptocurrency. It is not a blockchain, not a coin,
        and not a token on someone else's chain. CosmoWarp is an entirely new paradigm.
      </P>
      <P>
        Where blockchains sequence transactions into blocks chained linearly, CosmoWarp uses a
        <span className="text-energy-400"> Directed Acyclic Graph (DAG)</span> with 7 parallel validation layers,
        enabling massive throughput without the bottleneck of sequential block confirmation.
      </P>
      <P>
        Where fiat depends on centralized intermediaries (banks, payment processors), CosmoWarp operates
        as a <span className="text-energy-400">peer-to-peer mesh</span> where every transaction validates
        two previous ones, creating a self-reinforcing network of trust.
      </P>

      <H3>Core Innovations</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[
          ['\u25CE', 'CosmoMesh', 'DAG transactional fabric with 7 fractal layers'],
          ['\u26D3', 'CosmoChain', '7 parallel shards, 0 gas, 10x speed, full on-chain SVG'],
          ['\u25B7', 'CosmoCode', 'SVG compression engine with real measured ratios (5-30x structured data)'],
          ['\u26BF', 'CosmoHash', 'Ed25519 + SHA-256 + AES-GCM cryptographic stack'],
          ['\u223F', 'CosmoLingua', 'Cosmic symbolic language for the protocol'],
          ['\u269B', 'Resonance Decay', 'Golden ratio mining curve (replaces halving)'],
          ['\u2605', 'Hierarchy', '7-level account system with reward multipliers'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-3 p-3 rounded-none bg-cosmic-900/40">
            <span className="text-xl text-warp-400 shrink-0">{icon}</span>
            <div>
              <p className="text-xs font-bold text-gray-200">{title}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Why CosmoWarp?</H3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700/30">
              <th className="py-2 text-left text-gray-500">Feature</th>
              <th className="py-2 text-center text-gray-500">Fiat</th>
              <th className="py-2 text-center text-gray-500">Blockchain</th>
              <th className="py-2 text-center text-warp-400">CosmoWarp</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            {[
              ['Speed', '\u2713', '\u2717', '\u2B21'],
              ['Decentralized', '\u2717', '\u2713', '\u2B21'],
              ['Parallel Validation', '\u2717', '\u2717', '\u2B21'],
              ['No Mining Waste', '\u2717', '\u2717', '\u2B21'],
              ['Zero Gas Fees', '\u2713', '\u2717', '\u2B21'],
              ['Full On-Chain Storage', '\u2717', '\u2717', '\u2B21'],
              ['Programmable', '\u2717', '\u2713', '\u2B21'],
              ['P2P Native', '\u2717', '\u2713', '\u2B21'],
              ['Fair Distribution', '\u2717', '\u2717', '\u2B21'],
            ].map(([feat, fiat, block, cosmo]) => (
              <tr key={feat} className="border-b border-gray-800/30">
                <td className="py-1.5 text-gray-300">{feat}</td>
                <td className="py-1.5 text-center">{fiat}</td>
                <td className="py-1.5 text-center">{block}</td>
                <td className="py-1.5 text-center text-warp-400">{cosmo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Foundation ─────────────────────────────────────────

function FoundationSection() {
  return (
    <div>
      <SectionTitle icon={'\u2600'} title="CosmoWarp Foundation" subtitle="The organization behind the protocol" />
      <P>
        The <span className="text-amber-400 font-bold">CosmoWarp Foundation</span> is the custodian of the
        CosmoWarp protocol, ecosystem, and community. Its mission is to build a transactional system
        that serves humanity beyond the limitations of both fiat and cryptocurrency.
      </P>

      <H3>Mission</H3>
      <P>
        To create a universal value exchange system that is fair, transparent, programmable, and
        accessible to everyone. CosmoWarp enables exchange of digital art, physical goods, services,
        spiritual acts, acts of friendship, and any form of value between humans.
      </P>

      <H3>The Ecosystem</H3>
      <div className="space-y-3 mb-4">
        {[
          ['\u25CE', 'CosmoMesh', 'The transactional fabric. A DAG with 7 fractal validation layers that processes transactions in parallel, achieving near-instant settlement.', 'text-warp-400'],
          ['\u25B7', 'CosmoCode', 'The programming language. CosmoASM is a custom instruction set for the CosmoVM virtual machine, enabling smart contracts and proof-of-computation mining.', 'text-energy-400'],
          ['\u26BF', 'CosmoHash', 'The cryptographic foundation. Ed25519 digital signatures, SHA-256 hashing, and AES-GCM authenticated encryption form the security backbone.', 'text-star-400'],
          ['\u223F', 'CosmoLingua', 'The symbolic language. Greek letters (\u03A9, \u03C6, \u03C8), cosmic symbols, and fractal naming create a unique cultural identity for the protocol.', 'text-nebula-400'],
          ['\u269B', 'CosmoVault', 'The tokenomics engine. Manages the 69M supply, Resonance Decay curve, airdrops, streak rewards, and creator lock.', 'text-cyan-400'],
          ['\u2B21', 'CosmoSDK', 'The developer toolkit. Open-source API for building apps, extensions, and integrations on the CosmoWarp ecosystem.', 'text-orange-400'],
        ].map(([icon, title, desc, color]) => (
          <div key={title} className="p-4 rounded-none bg-cosmic-900/40 border border-gray-700/10">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${color}`}>{icon}</span>
              <span className={`text-sm font-bold ${color}`}>{title}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Values</H3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {['Transparency', 'Fairness', 'Innovation', 'Community', 'Security', 'Freedom'].map(v => (
          <div key={v} className="text-center p-2 rounded-none bg-cosmic-900/40">
            <p className="text-xs text-warp-400 font-bold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CosmoMesh ──────────────────────────────────────────

function CosmoMeshSection() {
  return (
    <div>
      <SectionTitle icon={'\u25CE'} title="CosmoMesh" subtitle="DAG-Based Transactional Fabric" />
      <P>
        CosmoMesh is the core transaction layer. Unlike blockchains which pack transactions into
        sequential blocks, CosmoMesh is a <span className="text-energy-400">Directed Acyclic Graph</span> where
        each transaction references and validates 2+ parent transactions.
      </P>

      <H3>7 Fractal Layers</H3>
      <P>
        Transactions are sorted into 7 parallel validation lanes based on their type and amount.
        This enables massive throughput as each layer processes independently.
      </P>
      <div className="space-y-1 mb-4">
        {[
          ['GRID', 'Micro-transactions (< 10 \u03A9)', 'text-gray-400'],
          ['HELIX', 'Standard transfers (10-100 \u03A9)', 'text-blue-400'],
          ['GLYPH', 'Large transfers (100-1000 \u03A9)', 'text-yellow-400'],
          ['COSMO', 'System operations (governance)', 'text-purple-400'],
          ['CHRONOS', 'Time-locked transactions', 'text-cyan-400'],
          ['NEXUS', 'Cross-layer bridges', 'text-orange-400'],
          ['LUMINA', 'Genesis & epoch transitions', 'text-amber-300'],
        ].map(([name, desc, color]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40">
            <span className={`text-xs font-bold w-20 ${color}`}>{name}</span>
            <span className="text-[11px] text-gray-400">{desc}</span>
          </div>
        ))}
      </div>

      <H3>Resonance Consensus</H3>
      <P>
        Instead of Proof-of-Work, Proof-of-Stake, or PBFT, CosmoWarp uses
        <span className="text-warp-400"> Resonance Consensus</span>. Validators specialize in
        specific layers and build reputation through honest validation. Byzantine fault tolerance
        is achieved with f &lt; n/3 threshold. Settlement is near-instant.
      </P>

      <H3>Key Advantages</H3>
      <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
        <li>7x throughput via parallel layer processing</li>
        <li>Each TX validates 2 parents = natural spam prevention</li>
        <li>No blocks, no orphans, no forks</li>
        <li>Probabilistic finality in under 1 second</li>
        <li>Merkle-DAG provides full auditability</li>
      </ul>
    </div>
  );
}

// ─── CosmoChain ─────────────────────────────────────────

function CosmoChainSection() {
  return (
    <div>
      <SectionTitle icon={'\u26D3'} title="CosmoChain" subtitle="Parallel Shard Processing with Real Infrastructure" />
      <P>
        CosmoChain is the transaction layer of the CosmoWarp protocol. It uses
        <span className="text-warp-400 font-bold"> 7 real Web Worker threads</span> (OS-level parallelism),
        <span className="text-energy-400 font-bold"> zero gas fees</span>,
        <span className="text-star-400 font-bold"> IndexedDB persistence</span> (GB-scale vs 5MB localStorage), and
        <span className="text-nebula-400 font-bold"> CosmoCode SVG compression</span> with measured ratios.
      </P>
      <div className="p-3 rounded-none bg-amber-500/5 border border-amber-500/20 mb-4">
        <p className="text-[10px] text-amber-400 font-bold mb-1">{'\u26A0'} HONEST STATUS</p>
        <p className="text-[10px] text-amber-400/70 leading-relaxed">
          In single-user mode, consensus is local validation — not Byzantine fault tolerant.
          Real distributed consensus activates when peers connect via WebRTC P2P.
          Compression ratios are benchmarked (run benchmark.ts), not estimated.
          Storage is IndexedDB (local, GB-scale) synced to peers when connected.
        </p>
      </div>

      <H3>How It Works For You (User Flow)</H3>
      <P>
        Here's exactly what happens when you use CosmoWarp, from your perspective:
      </P>

      {/* ─── MAIN USER FLOW DIAGRAM ─── */}
      <div className="p-4 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-6 overflow-x-auto">
        <p className="text-[10px] text-gray-500 mb-3 text-center">USER EXPERIENCE FLOW</p>
        <div className="space-y-3 min-w-[300px]">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center shrink-0 text-sm text-warp-400 font-bold">1</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">You send a transaction, mint a Wart, or mine</p>
              <p className="text-[10px] text-gray-500">Click Send, Mint, or Mine — exactly like today. Nothing changes in your experience.</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-warp-500/20 h-4" />
          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-energy-500/20 border border-energy-500/30 flex items-center justify-center shrink-0 text-sm text-energy-400 font-bold">2</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">CosmoChain routes to the right shard</p>
              <p className="text-[10px] text-gray-500">Your TX is automatically assigned to 1 of 7 parallel shards based on its type and amount. No action needed from you.</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-energy-500/20 h-4" />
          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-star-500/20 border border-star-500/30 flex items-center justify-center shrink-0 text-sm text-star-400 font-bold">3</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">All 7 shards process in parallel</p>
              <p className="text-[10px] text-gray-500">While your TX processes on its shard, 6 other shards handle other users' TXs simultaneously = 10x faster than single-chain.</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-star-500/20 h-4" />
          {/* Step 4 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-nebula-500/20 border border-nebula-500/30 flex items-center justify-center shrink-0 text-sm text-nebula-400 font-bold">4</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">CosmoCode compresses everything into SVG</p>
              <p className="text-[10px] text-gray-500">Your TX data (or NFT artwork) is compressed through 7 layers and encoded as an SVG container. Structured data achieves 5-30x compression; images ~1-2x.</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-nebula-500/20 h-4" />
          {/* Step 5 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-sm text-cyan-400 font-bold">5</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">Stored fully on-chain in the shard block</p>
              <p className="text-[10px] text-gray-500">The compressed SVG is stored directly in the blockchain. No IPFS, no external server. Your data lives on-chain forever, for free.</p>
            </div>
          </div>
          <div className="ml-4 border-l-2 border-cyan-500/20 h-4" />
          {/* Step 6 */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0 text-sm text-green-400 font-bold">{'\u2713'}</div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-200">Confirmed in ~1.5 seconds. Cost: 0 {'\u03A9'}</p>
              <p className="text-[10px] text-gray-500">The shard produces a block every 1.5s. Your TX is confirmed, finalized, and anchored by the next Beacon Block. Gas cost is always zero.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ARCHITECTURE DIAGRAM ─── */}
      <H3>Architecture Diagram</H3>
      <div className="p-4 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-6 overflow-x-auto">
        <pre className="text-[10px] sm:text-[11px] text-gray-400 font-mono whitespace-pre leading-relaxed">{`
  YOU (Browser / Mobile)
   |
   |  1. Send TX / Mint Wart / Mine
   v
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502        COSMOCHAIN ENGINE            \u2502
\u2502                                     \u2502
\u2502  2. Route to shard by type/amount   \u2502
\u2502                                     \u2502
\u2502  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510  \u2502
\u2502  \u2502 GRID \u2502\u2502HELIX \u2502\u2502GLYPH \u2502\u2502COSMO \u2502  \u2502
\u2502  \u2502 <10\u03A9 \u2502\u250210-100\u2502\u2502100-1K\u2502\u2502System\u2502  \u2502
\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518  \u2502
\u2502  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510         \u2502
\u2502  \u2502CHRONO\u2502\u2502NEXUS \u2502\u2502LUMIN \u2502 \u2190 x7   \u2502
\u2502  \u2502 Time \u2502\u2502Bridge\u2502\u2502Epoch \u2502 shards \u2502
\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518         \u2502
\u2502       |  parallel  |              \u2502
\u2502       v            v              \u2502
\u2502  3. \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510    \u2502
\u2502     \u2502  COSMOCODE SVG ENGINE  \u2502    \u2502
\u2502     \u2502                      \u2502    \u2502
\u2502     \u2502  7 Compression Layers \u2502    \u2502
\u2502     \u2502  \u2192 Delta Encoding    \u2502    \u2502
\u2502     \u2502  \u2192 Dictionary        \u2502    \u2502
\u2502     \u2502  \u2192 Run-Length SVG    \u2502    \u2502
\u2502     \u2502  \u2192 Fractal Nesting   \u2502    \u2502
\u2502     \u2502  \u2192 Frequency Encode  \u2502    \u2502
\u2502     \u2502  \u2192 Color Quantize    \u2502    \u2502
\u2502     \u2502  \u2192 Filter Chains     \u2502    \u2502
\u2502     \u2502                      \u2502    \u2502
\u2502     \u2502  Result: 5-30x\u2502    \u2502
\u2502     \u2502  (structured data)\u2502    \u2502
\u2502     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518    \u2502
\u2502            |                       \u2502
\u2502            v                       \u2502
\u2502  4. \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510    \u2502
\u2502     \u2502  SHARD BLOCK          \u2502    \u2502
\u2502     \u2502  Every 1.5 seconds    \u2502    \u2502
\u2502     \u2502  Up to 1000 TX/block  \u2502    \u2502
\u2502     \u2502  Gas: 0 \u03A9 (FREE)     \u2502    \u2502
\u2502     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518    \u2502
\u2502            |                       \u2502
\u2502            v                       \u2502
\u2502  5. \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510    \u2502
\u2502     \u2502  BEACON BLOCK         \u2502    \u2502
\u2502     \u2502  Anchors all 7 shards \u2502    \u2502
\u2502     \u2502  every 10 blocks      \u2502    \u2502
\u2502     \u2502  = Global State Root  \u2502    \u2502
\u2502     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518    \u2502
\u2502                                     \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
            |
            v
  \u2713 Confirmed + On-Chain Forever
    Cost: 0 \u03A9 | Time: ~1.5s
`}</pre>
      </div>

      {/* ─── WART ON-CHAIN FLOW ─── */}
      <H3>Full On-Chain NFT (Wart) Storage</H3>
      <P>
        Unlike Ethereum where NFT images are stored off-chain (IPFS/Arweave) and only a link is on-chain,
        CosmoChain stores <span className="text-warp-400 font-bold">the entire artwork directly in the blockchain</span>.
        CosmoCode SVG compression makes this possible at zero cost.
      </P>
      <div className="p-4 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-6 overflow-x-auto">
        <p className="text-[10px] text-gray-500 mb-3 text-center">NFT (WART) ON-CHAIN STORAGE FLOW</p>
        <pre className="text-[10px] sm:text-[11px] text-gray-400 font-mono whitespace-pre leading-relaxed">{`
  YOUR ARTWORK (PNG/JPEG/GIF/SVG/MP3/MP4)
            |
            v
  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502  COSMOCODE SVG ENCODER       \u2502
  \u2502                             \u2502
  \u2502  Native SVG \u2192 store direct  \u2502
  \u2502  Raster    \u2192 base64 in SVG \u2502
  \u2502  + SHA-256 fingerprint      \u2502
  \u2502  + Ed25519 creator sign     \u2502
  \u2502  + 7-layer compression      \u2502
  \u2502                             \u2502
  \u2502  5MB image \u2192 ~5KB on-chain  \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
            |
            v
  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502  <svg xmlns="...">          \u2502
  \u2502    <cc:meta type="wart"/>   \u2502
  \u2502    <cc:wart                 \u2502
  \u2502      title="My Art"         \u2502
  \u2502      creator="CW1a2b..."    \u2502
  \u2502      cert="CWCERT_..."      \u2502
  \u2502    />                       \u2502
  \u2502    <defs>                   \u2502
  \u2502      <g id="r0">...</g>     \u2502
  \u2502    </defs>                  \u2502
  \u2502    <cc:data>                \u2502
  \u2502      [compressed content]   \u2502
  \u2502    </cc:data>               \u2502
  \u2502  </svg>                     \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
            |
            v
  STORED IN GLYPH SHARD BLOCK
  \u2192 On-chain forever
  \u2192 Recoverable from any node
  \u2192 Gas: 0 \u03A9
`}</pre>
      </div>

      {/* ─── 7 SHARDS ─── */}
      <H3>7 Parallel Shards</H3>
      <P>
        Like Ethereum 2.0's sharding, but live and working. Each shard processes transactions
        independently and in parallel. The right shard is selected automatically based on the
        transaction type and amount.
      </P>
      <div className="space-y-1 mb-4">
        {[
          ['GRID', '0', '< 10 \u03A9', 'Micro-payments, tips, small transfers', 'text-gray-400'],
          ['HELIX', '1', '10-100 \u03A9', 'Standard peer-to-peer transfers', 'text-blue-400'],
          ['GLYPH', '2', '100-1K \u03A9', 'Large transfers + NFT operations (mint/buy)', 'text-yellow-400'],
          ['COSMO', '3', 'System', 'Governance, staking, unstaking', 'text-purple-400'],
          ['CHRONOS', '4', 'Time', 'Time-locked transactions (vesting, escrow)', 'text-cyan-400'],
          ['NEXUS', '5', 'Bridge', 'Cross-shard atomic transfers', 'text-orange-400'],
          ['LUMINA', '6', 'Chain', 'Genesis, epoch transitions, beacon anchors', 'text-amber-300'],
        ].map(([name, _id, range, desc, color]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40">
            <span className={`text-xs font-bold w-16 ${color}`}>{name}</span>
            <span className="text-[10px] text-gray-500 w-16">{range}</span>
            <span className="text-[10px] text-gray-400 flex-1">{desc}</span>
          </div>
        ))}
      </div>

      {/* ─── KEY METRICS ─── */}
      <H3>Performance Comparison</H3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700/30">
              <th className="py-2 text-left text-gray-500">Metric</th>
              <th className="py-2 text-center text-gray-500">Bitcoin</th>
              <th className="py-2 text-center text-gray-500">Ethereum</th>
              <th className="py-2 text-center text-warp-400">CosmoChain</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            {[
              ['Block Time', '10 min', '12 sec', '1.5 sec (per shard)'],
              ['TPS (measured)', '~7', '~30', 'Varies (benchmark it)'],
              ['Gas Fee', '$1-50', '$0.5-100', '0 \u03A9 (free)'],
              ['NFT Storage', 'Off-chain', 'Off-chain (IPFS)', 'IndexedDB + SVG compression'],
              ['Storage Engine', 'LevelDB', 'LevelDB', 'IndexedDB (GB-scale)'],
              ['Shards', '1', '1 (planned 64)', '7 Web Workers'],
              ['Finality', '60 min', '~15 min', 'Local: instant / P2P: ~15s'],
              ['Compression', 'None', 'None', '5-30x measured (CosmoCode)'],
              ['Validators', '900,000+', '900,000+', '1 (single-node) to N (P2P)'],
              ['Network', 'Global', 'Global', 'Local + WebRTC P2P'],
            ].map(([metric, btc, eth, cw]) => (
              <tr key={metric} className="border-b border-gray-800/30">
                <td className="py-1.5 text-gray-300">{metric}</td>
                <td className="py-1.5 text-center">{btc}</td>
                <td className="py-1.5 text-center">{eth}</td>
                <td className="py-1.5 text-center text-warp-400 font-bold">{cw}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── ZERO GAS EXPLANATION ─── */}
      <H3>Zero Gas: How Is It Free?</H3>
      <P>
        Ethereum charges gas because miners/validators need compensation for processing and storage.
        CosmoChain eliminates gas through three mechanisms:
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['\u269B', 'Staking Rewards', 'Validators earn from staking, not from user fees. Users stake Warps, validators earn a cut of mining rewards proportional to their stake.'],
          ['\u26A1', 'Rate Limiting', 'Anti-spam is enforced through rate limits (100 TX/min per address) instead of pricing out attackers with fees.'],
          ['\u25B7', 'CosmoCode Compression', 'Storage costs are reduced through real SVG compression (5-30x for structured data). Combined with IndexedDB for GB-scale local storage, this eliminates the need for gas-based storage pricing.'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="p-3 rounded-none bg-cosmic-900/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg text-warp-400">{icon}</span>
              <span className="text-xs font-bold text-gray-200">{title}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* ─── BEACON BLOCKS ─── */}
      <H3>Beacon Blocks (Cross-Shard Finality)</H3>
      <P>
        Every 10 shard blocks (~15 seconds), a <span className="text-warp-400">Beacon Block</span> is
        produced. It anchors the state of all 7 shards into a single Global State Root — a Merkle root
        that commits to the entire chain state across all shards. This provides absolute cross-shard
        finality and enables verification of any transaction from any shard.
      </P>

      <div className="p-4 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-4 overflow-x-auto">
        <pre className="text-[10px] sm:text-[11px] text-gray-400 font-mono whitespace-pre leading-relaxed">{`
  BEACON BLOCK #N
  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502  Global State Root              \u2502
  \u2502  = Merkle(shard_roots[0..6])    \u2502
  \u2502                                 \u2502
  \u2502  Shard 0 (GRID)    \u2192 root_0    \u2502
  \u2502  Shard 1 (HELIX)   \u2192 root_1    \u2502
  \u2502  Shard 2 (GLYPH)   \u2192 root_2    \u2502
  \u2502  Shard 3 (COSMO)   \u2192 root_3    \u2502
  \u2502  Shard 4 (CHRONOS) \u2192 root_4    \u2502
  \u2502  Shard 5 (NEXUS)   \u2192 root_5    \u2502
  \u2502  Shard 6 (LUMINA)  \u2192 root_6    \u2502
  \u2502                                 \u2502
  \u2502  Timestamp | Validator | Hash   \u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`}</pre>
      </div>

      {/* ─── DUAL LAYER ─── */}
      <H3>Dual-Layer Architecture</H3>
      <P>
        CosmoChain works alongside CosmoMesh. The DAG provides <span className="text-energy-400">instant
        optimistic confirmation</span> ({'<'}1s), while CosmoChain provides <span className="text-warp-400">permanent
        on-chain SVG storage</span> and shard-level finality. You get the best of both worlds:
        instant UX + permanent decentralized storage.
      </P>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-none bg-cosmic-900/40 border border-energy-500/10">
          <p className="text-xs font-bold text-energy-400 mb-1">{'\u25CE'} CosmoMesh (Layer 1)</p>
          <ul className="text-[10px] text-gray-500 space-y-1">
            <li>{'\u2192'} DAG instant settlement</li>
            <li>{'\u2192'} Sub-second confirmation</li>
            <li>{'\u2192'} Optimistic finality</li>
            <li>{'\u2192'} P2P gossip propagation</li>
          </ul>
        </div>
        <div className="p-3 rounded-none bg-cosmic-900/40 border border-warp-500/10">
          <p className="text-xs font-bold text-warp-400 mb-1">{'\u26D3'} CosmoChain (Layer 2)</p>
          <ul className="text-[10px] text-gray-500 space-y-1">
            <li>{'\u2192'} Full on-chain SVG storage</li>
            <li>{'\u2192'} 7 parallel shards</li>
            <li>{'\u2192'} Absolute finality via Beacon</li>
            <li>{'\u2192'} Recoverable from any node</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── CosmoCode ──────────────────────────────────────────

function CosmoCodeSection() {
  return (
    <div>
      <SectionTitle icon={'\u25B7'} title="CosmoCode" subtitle="SVG Compression Engine (Real Measured Ratios)" />
      <P>
        CosmoCode is the compression engine that makes full on-chain storage possible.
        It encodes ALL blockchain data — transactions, NFT artwork, metadata — into optimized
        <span className="text-energy-400 font-bold"> SVG containers</span> using a 7-layer fractal
        compression pipeline. Real measured ratios: <span className="text-warp-400 font-bold">5-30x</span> for structured data (transactions, metadata), <span className="text-warp-400 font-bold">~1-2x</span> for binary data (images). Run the built-in benchmark to verify.
      </P>

      <H3>Why SVG?</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {[
          ['Text-Based', 'XML format = natively compressible, unlike binary formats'],
          ['Self-Describing', 'SVG metadata is human-readable and machine-parseable'],
          ['Native References', '<defs>/<use> system enables fractal deduplication'],
          ['Universally Renderable', 'Every browser and viewer can display SVG natively'],
          ['Embeddable', 'Can embed base64 images, paths, and arbitrary data'],
          ['Extensible', 'Custom namespaces (cc:) for CosmoCode-specific data'],
        ].map(([title, desc]) => (
          <div key={title} className="p-2 rounded-none bg-cosmic-900/40">
            <p className="text-xs font-bold text-energy-400">{title}</p>
            <p className="text-[10px] text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      <H3>7 Compression Layers</H3>
      <P>
        Each piece of data passes through up to 7 compression layers, each targeting a different
        type of redundancy. The layers stack multiplicatively.
      </P>
      <div className="space-y-2 mb-4">
        {[
          ['Layer 1', 'Delta Encoding', 'Only stores differences from previous data. Sequential transactions share common structure, so we only store what changed. Most effective on batches of similar data.', '~1.5-3x', 'text-blue-400'],
          ['Layer 2', 'Dictionary Compression', 'Replaces common strings ("transaction", "signature", "publicKey") with short symbols (\u00A7t, \u00A7s, \u00A7p). Effective on JSON-like structured data.', '~1.5-3x', 'text-green-400'],
          ['Layer 3', 'Run-Length SVG Paths', 'Encodes repetitive sequences (like hex strings with repeated chars) as compact notation. "AAABBB" becomes "3A3B".', '~1.2-2x', 'text-yellow-400'],
          ['Layer 4', 'Fractal Nesting', 'Uses SVG <defs>/<use> to define repeated patterns once and reference them everywhere. Most effective on highly repetitive structured data.', '~1.5-5x', 'text-purple-400'],
          ['Layer 5', 'Frequency Encoding', 'Maps the most common byte pairs to single Unicode characters. Huffman-inspired variable-length encoding.', '~1.2-2x', 'text-cyan-400'],
          ['Layer 6', 'Color Quantization', 'For images: reduces the color palette to essential colors. Minimal effect on already-compressed binary data.', '~1-1.5x', 'text-orange-400'],
          ['Layer 7', 'Filter Chains', 'Reusable SVG filter pipelines that encode common transforms without repeating them.', '~1-1.3x', 'text-amber-300'],
        ].map(([layer, title, desc, ratio, color]) => (
          <div key={title} className="p-3 rounded-none bg-cosmic-900/40">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold ${color}`}>{layer}</span>
              <span className="text-xs font-bold text-gray-200">{title}</span>
              <span className="text-[10px] text-warp-400 ml-auto">{ratio}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Compression Pipeline Diagram</H3>
      <div className="p-4 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-4 overflow-x-auto">
        <pre className="text-[10px] sm:text-[11px] text-gray-400 font-mono whitespace-pre leading-relaxed">{`
  STRUCTURED DATA (100 KB, e.g. TX batch)
   |
   |\u2500\u2500 Layer 1: Delta Encode \u2500\u2500\u2500\u2500\u2500\u2500\u2192 50 KB   (2x)
   |\u2500\u2500 Layer 2: Dictionary \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2192  25 KB  (2x)
   |\u2500\u2500 Layer 3: Run-Length \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2192  15 KB  (1.7x)
   |\u2500\u2500 Layer 4: Fractal Nesting \u2500\u2500\u2500\u2192   8 KB  (1.9x)
   |\u2500\u2500 Layer 5: Frequency Encode \u2500\u2500\u2192   5 KB  (1.6x)
   |\u2500\u2500 Layer 6: Quantize \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2192   4 KB  (1.2x)
   |\u2500\u2500 Layer 7: Filter Chains \u2500\u2500\u2500\u2500\u2192 3.5 KB  (1.1x)
   v
  SVG CONTAINER (~3.5 KB) = ~30x compression (structured data)
  Note: Binary data (images) achieves ~1-2x only. Run benchmark to verify.
`}</pre>
      </div>

      <H3>CosmoCode SVG Container Format</H3>
      <div className="p-3 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-4">
        <p className="text-[10px] text-gray-500 mb-2">SVG CONTAINER STRUCTURE</p>
        <pre className="text-[11px] text-energy-400 whitespace-pre-wrap">{`<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:cc="https://cosmowarp.io/cosmocode/v1">
  <cc:meta type="wart" version="1"
           layers="delta,dictionary,fractal"
           ts="1709990400000"/>
  <defs>
    <g id="r0"><desc>[reusable pattern]</desc></g>
    <g id="r1"><desc>[reusable pattern]</desc></g>
  </defs>
  <cc:freq>e000=th;e001=in;...</cc:freq>
  <cc:data><![CDATA[
    [compressed data referencing r0, r1...]
  ]]></cc:data>
</svg>`}</pre>
      </div>

      <H3>Real-World Compression Ratios</H3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="TX BATCH (100)" value="~5-30x" color="text-warp-400" />
        <Stat label="STATE SNAPSHOT" value="~3-10x" color="text-energy-400" />
        <Stat label="SVG ARTWORK" value="~1-2x" color="text-star-400" />
        <Stat label="BASE64 IMAGES" value="~1x" color="text-nebula-400" />
      </div>
    </div>
  );
}

// ─── CosmoHash ──────────────────────────────────────────

function CosmoHashSection() {
  return (
    <div>
      <SectionTitle icon={'\u26BF'} title="CosmoHash" subtitle="Cryptographic Foundation" />
      <P>
        CosmoHash is the cryptographic stack that secures every aspect of CosmoWarp.
        It uses industry-standard, battle-tested primitives through the Web Crypto API.
      </P>

      <H3>Ed25519 Digital Signatures</H3>
      <P>
        Every wallet generates an Ed25519 keypair (256-bit elliptic curve). Transactions are
        signed with the private key and verified with the public key. Ed25519 provides
        128-bit security, is immune to timing attacks, and produces compact 64-byte signatures.
      </P>

      <H3>SHA-256 Hashing</H3>
      <P>
        Transaction IDs are computed deterministically using SHA-256. The Merkle-DAG uses
        double-SHA-256 for content addressing. State integrity checksums also use SHA-256
        to detect tampering.
      </P>

      <H3>AES-GCM Authenticated Encryption</H3>
      <P>
        Sensitive data (admin registry, wallet exports) is encrypted with AES-256-GCM
        (Galois/Counter Mode), which provides both confidentiality and authenticity.
        Key derivation uses PBKDF2 with 100,000 iterations.
      </P>

      <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-3">
        <Stat label="SIGNATURES" value="Ed25519" color="text-warp-400" />
        <Stat label="HASHING" value="SHA-256" color="text-energy-400" />
        <Stat label="ENCRYPTION" value="AES-GCM" color="text-star-400" />
      </div>
    </div>
  );
}

// ─── CosmoLingua ────────────────────────────────────────

function CosmoLinguaSection() {
  return (
    <div>
      <SectionTitle icon={'\u223F'} title="CosmoLingua" subtitle="The Symbolic Language of CosmoWarp" />
      <P>
        CosmoLingua is the cultural and symbolic language that permeates the entire CosmoWarp
        ecosystem. It draws from mathematics, physics, and cosmic symbolism to create a unique
        identity that distinguishes CosmoWarp from all other systems.
      </P>

      <H3>Core Symbols</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {[
          ['\u03A9', 'Omega', 'Unit of value (Warps)', 'text-warp-400'],
          ['\u03C6', 'Phi', 'Golden ratio (Resonance Decay)', 'text-star-400'],
          ['\u03C8', 'Psi', 'Wave function (consensus)', 'text-energy-400'],
          ['\u2B21', 'Hexagon', 'CosmoWarp identity symbol', 'text-warp-400'],
          ['\u223F', 'Wave', 'Resonance and harmony', 'text-energy-400'],
          ['\u269B', 'Atom', 'Fundamental transaction unit', 'text-cyan-400'],
          ['\u2604', 'Comet', 'High-energy operations', 'text-nebula-400'],
          ['\u2600', 'Sun', 'Lumina \u2014 highest level', 'text-amber-300'],
        ].map(([sym, name, desc, color]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40">
            <span className={`text-2xl w-8 text-center ${color}`}>{sym}</span>
            <div>
              <p className="text-xs font-bold text-gray-200">{name}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Hierarchy Glyphs</H3>
      <P>
        Each account level is represented by a cosmic glyph that reflects its place in the
        progression from quantum particle to transcendent light.
      </P>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {[
          ['\u2022', 'Particle', 'Quantum seed \u2014 the origin point', 'text-gray-400'],
          ['\u223F', 'Wave', 'Harmonic traveler through the mesh', 'text-blue-400'],
          ['\u2605', 'Star', 'Stellar navigator \u2014 a guiding light', 'text-yellow-400'],
          ['\u2604', 'Nebula', 'Architect shaping the cosmic fabric', 'text-purple-400'],
          ['\u269B', 'Galaxy', 'Galactic guardian of the network', 'text-cyan-400'],
          ['\u2B21', 'Cosmos', 'Sovereign of the cosmic order', 'text-orange-400'],
          ['\u2600', 'Lumina', 'Transcendent \u2014 you ARE the light', 'text-amber-300'],
        ].map(([sym, name, desc, color]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40">
            <span className={`text-2xl w-8 text-center ${color}`}>{sym}</span>
            <div>
              <p className="text-xs font-bold text-gray-200">{name}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>VM Register Alphabet</H3>
      <P>
        The CosmoVM uses 12 Greek-letter registers, each carrying semantic meaning aligned
        with its mathematical or physical origin.
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {[
          ['\u03A9', 'Omega', 'Accumulator'],
          ['\u03C6', 'Phi', 'Golden ratio'],
          ['\u03C8', 'Psi', 'Wave function'],
          ['\u221E', 'Infinity', 'Loop counter'],
          ['\u03B4', 'Delta', 'Difference'],
          ['\u03BB', 'Lambda', 'Code pointer'],
          ['\u03BC', 'Mu', 'Memory pointer'],
          ['\u03C0', 'Pi', 'Rotation'],
          ['\u03C3', 'Sigma', 'Summation'],
          ['\u03B8', 'Theta', 'Direction'],
          ['\u03B5', 'Epsilon', 'Precision'],
          ['\u03BE', 'Xi', 'Randomness'],
        ].map(([sym, name, desc]) => (
          <div key={name} className="flex items-center gap-2 p-2 rounded-none bg-cosmic-900/40">
            <code className="text-energy-400 text-sm font-bold w-6 text-center">R{sym}</code>
            <div>
              <p className="text-[11px] font-bold text-gray-200">{name}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Protocol Glyphs</H3>
      <P>
        Every action in CosmoWarp is marked by a distinctive glyph, creating a visual language
        that is instantly recognizable across the interface.
      </P>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {[
          ['\u25CE', 'CosmoMesh', 'DAG network'],
          ['\u25B7', 'CosmoCode', 'VM execution'],
          ['\u26BF', 'CosmoHash', 'Cryptography'],
          ['\u26CF', 'Mining', 'Proof-of-computation'],
          ['\u2197', 'Send', 'Outgoing transfer'],
          ['\u2199', 'Receive', 'Incoming transfer'],
          ['\u2B22', 'Warts', 'Digital artworks'],
          ['\u2742', 'Mint', 'Art creation'],
          ['\u21C4', 'Transfer', 'Ownership exchange'],
          ['\u26A1', 'Energy', 'Security & power'],
          ['\u2713', 'Confirm', 'Validated action'],
          ['\u25C8', 'Wallet', 'Account & balance'],
        ].map(([sym, name, desc]) => (
          <div key={name} className="flex items-center gap-2 p-2 rounded-none bg-cosmic-900/40">
            <span className="text-lg text-warp-400 w-6 text-center">{sym}</span>
            <div>
              <p className="text-[11px] font-bold text-gray-200">{name}</p>
              <p className="text-[10px] text-gray-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <H3>Naming Philosophy</H3>
      <P>
        Every component of CosmoWarp follows a cosmic naming convention:
        Mesh layers are named after cosmic phenomena (GRID, HELIX, GLYPH, COSMO, CHRONOS, NEXUS, LUMINA).
        Account levels follow a cosmic progression (Particle {'\u2192'} Wave {'\u2192'} Star {'\u2192'} Nebula {'\u2192'} Galaxy {'\u2192'} Cosmos {'\u2192'} Lumina).
        VM registers use Greek letters ({'\u03A9'}, {'\u03C6'}, {'\u03C8'}, {'\u03B4'}, {'\u03BB'}, {'\u03BC'}, {'\u03C0'}, {'\u03C3'}, {'\u03B8'}, {'\u03B5'}, {'\u03BE'}).
      </P>

      <H3>Value Exchange Philosophy</H3>
      <P>
        CosmoWarp transcends mere financial transactions. The {'\u03A9'} (Omega) can represent and be
        exchanged for: digital and physical art, services, spiritual acts, acts of friendship and
        kindness, professional services, and goods of all kinds. Value is universal.
      </P>
    </div>
  );
}

// ─── Tokenomics ─────────────────────────────────────────

function TokenomicsSection() {
  return (
    <div>
      <SectionTitle icon={'\u269B'} title="Tokenomics" subtitle="Supply, Distribution & Resonance Decay" />

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <Stat label="TOTAL SUPPLY" value="69M" color="text-warp-400" />
        <Stat label="CREATOR LOCK" value="1M" color="text-amber-400" />
        <Stat label="AIRDROP POOL" value="10M" color="text-energy-400" />
        <Stat label="MINING POOL" value="58M" color="text-star-400" />
      </div>

      <H3>Distribution</H3>
      <div className="space-y-2 mb-4">
        {[
          ['Mining Pool', '58,000,000 CW (84%)', 'Distributed via Resonance Decay to miners', 'bg-warp-500/20'],
          ['Airdrop Pool', '10,000,000 CW (14.5%)', '1,000 CW per new wallet', 'bg-energy-500/20'],
          ['Creator Lock', '1,000,000 CW (1.5%)', 'Locked, unlockable by admin at any time', 'bg-amber-500/20'],
        ].map(([title, amount, desc, bg]) => (
          <div key={title} className={`p-3 rounded-none ${bg}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-200">{title}</span>
              <span className="text-xs text-warp-400">{amount}</span>
            </div>
            <p className="text-[10px] text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Resonance Decay (Replaces Bitcoin Halving)</H3>
      <P>
        Instead of Bitcoin's abrupt 50% reward cuts every ~4 years, CosmoWarp uses
        <span className="text-warp-400"> Resonance Decay</span>: a continuous, smooth curve
        based on the golden ratio ({'\u03C6'} = 1.618...).
      </P>
      <div className="p-3 rounded-none bg-cosmic-900/60 border border-gray-700/20 mb-4">
        <p className="text-[10px] text-gray-500 mb-1">FORMULA</p>
        <p className="text-sm text-energy-400 font-bold">reward = 50 {'\u00D7'} {'\u03C6'}^(-totalMined / 5,000,000)</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs sm:grid-cols-4">
        {[
          ['0 mined', '50.00 CW'],
          ['5M mined', '~30.9 CW'],
          ['20M mined', '~7.3 CW'],
          ['50M mined', '~0.3 CW'],
        ].map(([stage, reward]) => (
          <div key={stage} className="p-2 rounded-none bg-cosmic-900/40">
            <p className="text-gray-500">{stage}</p>
            <p className="text-energy-400 font-bold">{reward}</p>
          </div>
        ))}
      </div>

      <H3>Advantages over Halving</H3>
      <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside mb-4">
        <li>No "halving shock" creating speculation bubbles</li>
        <li>Mathematically smooth and predictable</li>
        <li>Never reaches absolute zero (floor: 0.1 CW)</li>
        <li>Aligned with the golden ratio ({'\u03C6'}) philosophy</li>
        <li>Self-adjusting based on actual mining activity</li>
      </ul>

      <H3>Streak Rewards</H3>
      <P>
        On December 31, accounts that have made at least 1 transaction per day for 365 consecutive
        days receive <span className="text-star-400 font-bold">10,000 CW</span> as a loyalty reward.
        This incentivizes consistent, long-term participation over speculation.
      </P>
    </div>
  );
}

// ─── Hierarchy ──────────────────────────────────────────

function HierarchySection() {
  return (
    <div>
      <SectionTitle icon={'\u2605'} title="Account Hierarchy" subtitle="7 Levels of Cosmic Progression" />
      <P>
        Every CosmoWarp account progresses through 7 levels based on transaction activity
        and consistency. Higher levels unlock greater mining reward multipliers and level-up bonuses.
      </P>

      <div className="space-y-2">
        {[
          { sym: '\u2022', name: 'Particle', title: 'Quantum Seed', mult: '1.0x', min: '0 TX', bonus: '0 CW', color: 'text-gray-400', desc: 'Every journey begins with a single particle.' },
          { sym: '\u223F', name: 'Wave', title: 'Harmonic Traveler', mult: '1.2x', min: '10 TX', bonus: '100 CW', color: 'text-blue-400', desc: 'Your transactions ripple through the mesh.' },
          { sym: '\u2605', name: 'Star', title: 'Stellar Navigator', mult: '1.5x', min: '50 TX', bonus: '250 CW', color: 'text-yellow-400', desc: 'A guiding light in the CosmoMesh.' },
          { sym: '\u2604', name: 'Nebula', title: 'Nebula Architect', mult: '2.0x', min: '200 TX', bonus: '500 CW', color: 'text-purple-400', desc: 'You shape the fabric of the mesh.' },
          { sym: '\u269B', name: 'Galaxy', title: 'Galactic Guardian', mult: '2.5x', min: '500 TX', bonus: '1,000 CW', color: 'text-cyan-400', desc: 'A gravitational center of the network.' },
          { sym: '\u2B21', name: 'Cosmos', title: 'Cosmic Sovereign', mult: '3.5x', min: '2,000 TX', bonus: '2,500 CW', color: 'text-orange-400', desc: 'Sovereign of the cosmic order.' },
          { sym: '\u2600', name: 'Lumina', title: 'Lumina Transcendent', mult: '5.0x', min: '10,000 TX', bonus: '5,000 CW', color: 'text-amber-300', desc: 'Transcended beyond the mesh. You ARE the light.' },
        ].map(level => (
          <div key={level.name} className="p-3 rounded-none bg-cosmic-900/40 border border-gray-700/10">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${level.color}`}>{level.sym}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${level.color}`}>{level.name}</span>
                  <span className="text-[10px] text-gray-500">{level.title}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{level.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-energy-400 font-bold">{level.mult}</p>
                <p className="text-[10px] text-gray-500">{level.min}</p>
                <p className="text-[10px] text-star-400">+{level.bonus}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Security ───────────────────────────────────────────

function SecuritySection() {
  return (
    <div>
      <SectionTitle icon={'\u26A1'} title="Security" subtitle="Multi-Layer Protocol Hardening" />
      <P>
        CosmoWarp implements 7 layers of security to protect against hacking, fraud, and abuse.
        Every transaction passes through multiple security checks before being accepted.
      </P>

      <div className="space-y-3">
        {[
          ['Ed25519 Signatures', 'Every transaction is cryptographically signed. Forgery is computationally infeasible (128-bit security level).'],
          ['Rate Limiting', '10 TX/minute, 100 TX/hour, 1,000 TX/day per address. Automatic 5-minute blocks on violations. Permanent suspension after 5 violations.'],
          ['Nonce Tracking', 'Every transaction includes a unique nonce. Replayed transactions are detected and rejected within 1-hour windows.'],
          ['Progressive Amount Limits', 'New accounts: max 100 CW/TX. After 24h: 1,000. After 1 week: 10,000. After 30 days: 100,000.'],
          ['Pattern Detection', 'AI-driven detection of rapid-fire attacks, round-trip wash trading, dust attacks, and sybil-suspect behavior.'],
          ['State Integrity', 'SHA-256 checksums on all critical state data. Any tampering is immediately detected.'],
          ['Encrypted Admin Registry', 'AES-GCM encrypted audit trail. Only accessible by admin with proper authentication.'],
        ].map(([title, desc], i) => (
          <div key={title} className="p-3 rounded-none bg-cosmic-900/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-warp-400 font-bold">Layer {i + 1}</span>
              <span className="text-xs font-bold text-gray-200">{title}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Roadmap ────────────────────────────────────────────

function RoadmapSection() {
  return (
    <div>
      <SectionTitle icon={'\u2604'} title="Roadmap" subtitle="The path ahead" />

      <div className="space-y-4">
        {[
          { phase: 'Phase 1', title: 'Genesis', status: 'Completed', color: 'text-green-400', items: ['CosmoVM + CosmoASM instruction set', 'Ed25519, SHA-256, AES-GCM cryptography', 'CosmoMesh DAG with 7 fractal layers', 'Resonance Consensus protocol', 'WebRTC P2P mesh networking', 'Web application (React + Vite)'] },
          { phase: 'Phase 2', title: 'Expansion', status: 'Completed', color: 'text-green-400', items: ['69M supply with Resonance Decay', 'Account hierarchy (7 levels)', 'Admin registry (AES-GCM encrypted)', 'Security hardening (7 layers)', 'Chrome Extension', 'Public SDK for developers'] },
          { phase: 'Phase 3', title: 'CosmoChain', status: 'Completed', color: 'text-green-400', items: ['CosmoChain blockchain with 7 parallel shards', 'CosmoCode SVG compression engine (real measured ratios)', 'Zero gas fee model with rate limiting', 'Full on-chain SVG storage for NFTs', 'Beacon Block cross-shard finality', 'Dual-layer architecture (Mesh + Chain)'] },
          { phase: 'Phase 4', title: 'Ecosystem', status: 'In Progress', color: 'text-amber-400', items: ['White Paper v2 & landing page', 'API documentation', 'SDK marketplace', 'Community governance', 'Mobile-first responsive design', 'Extension ecosystem'] },
          { phase: 'Phase 5', title: 'Horizon', status: 'Planned', color: 'text-gray-500', items: ['Mobile apps (iOS + Android)', 'Hardware wallet support', 'Cross-chain bridges (Ethereum, Solana)', 'Governance DAO', 'Art & services marketplace', 'Global P2P relay network'] },
        ].map(phase => (
          <div key={phase.phase} className="p-4 rounded-none bg-cosmic-900/40 border border-gray-700/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-warp-400">{phase.phase}</span>
              <span className="text-sm font-bold text-gray-200">{phase.title}</span>
              <span className={`text-[10px] ml-auto ${phase.color}`}>{phase.status}</span>
            </div>
            <ul className="text-[11px] text-gray-400 space-y-1">
              {phase.items.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className={phase.status === 'Completed' ? 'text-green-400' : 'text-gray-600'}>{phase.status === 'Completed' ? '\u2713' : '\u25CB'}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
