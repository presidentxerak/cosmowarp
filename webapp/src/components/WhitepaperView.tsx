import { useState } from 'react';

type Section = 'overview' | 'foundation' | 'cosmomesh' | 'cosmocode' | 'cosmohash' | 'cosmolingua' | 'tokenomics' | 'hierarchy' | 'security' | 'roadmap';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '\u2B21' },
  { id: 'foundation', label: 'Foundation', icon: '\u2600' },
  { id: 'cosmomesh', label: 'CosmoMesh', icon: '\u25CE' },
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
          <div className="text-5xl sm:text-6xl mb-4 animate-float">{'\u2B21'}</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-warp-300 mb-2 font-title">CosmoWarp</h1>
          <p className="text-sm sm:text-base text-gray-400 mb-1">White Paper v1.0</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            A post-blockchain transactional fabric designed to surpass both fiat and cryptocurrency.
            Not a chain. Not a coin. A living mesh.
          </p>
        </div>
      </div>

      {/* Section Nav */}
      <div className="glass-panel p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                section === n.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="glass-panel p-5 sm:p-6">
        {section === 'overview' && <OverviewSection />}
        {section === 'foundation' && <FoundationSection />}
        {section === 'cosmomesh' && <CosmoMeshSection />}
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
        <h2 className="text-xl font-bold text-warp-300 font-title">{title}</h2>
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
          ['\u25B7', 'CosmoCode', 'Programmable VM with CosmoASM instruction set'],
          ['\u26BF', 'CosmoHash', 'Ed25519 + SHA-256 + AES-GCM cryptographic stack'],
          ['\u223F', 'CosmoLingua', 'Cosmic symbolic language for the protocol'],
          ['\u269B', 'Resonance Decay', 'Golden ratio mining curve (replaces halving)'],
          ['\u2605', 'Hierarchy', '7-level account system with reward multipliers'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-3 p-3 rounded-lg bg-cosmic-900/40">
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
          <div key={title} className="p-4 rounded-lg bg-cosmic-900/40 border border-gray-700/10">
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
          <div key={v} className="text-center p-2 rounded-lg bg-cosmic-900/40">
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
          <div key={name} className="flex items-center gap-3 p-2 rounded bg-cosmic-900/40">
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

// ─── CosmoCode ──────────────────────────────────────────

function CosmoCodeSection() {
  return (
    <div>
      <SectionTitle icon={'\u25B7'} title="CosmoCode" subtitle="CosmoASM Instruction Set & Virtual Machine" />
      <P>
        CosmoCode is the programmable layer of CosmoWarp. It consists of
        <span className="text-energy-400"> CosmoASM</span>, a custom assembly-like instruction set,
        and <span className="text-energy-400">CosmoVM</span>, the virtual machine that executes it.
      </P>

      <H3>CosmoVM Architecture</H3>
      <P>
        The CosmoVM is a register-based virtual machine with 12 special-purpose registers named
        with Greek letters, reflecting the cosmic philosophy of the protocol.
      </P>
      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
        {[
          ['R\u03A9', 'Accumulator'],
          ['R\u03C6', 'Golden Ratio'],
          ['R\u03C8', 'Psi (wave)'],
          ['R\u221E', 'Loop counter'],
          ['R\u03B4', 'Difference'],
          ['R\u03BB', 'Lambda (code)'],
          ['R\u03BC', 'Memory ptr'],
          ['R\u03C0', 'Rotation'],
          ['R\u03C3', 'Sum'],
          ['R\u03B8', 'Direction'],
          ['R\u03B5', 'Precision'],
          ['R\u03BE', 'Random'],
        ].map(([reg, desc]) => (
          <div key={reg} className="flex items-center gap-2 p-2 rounded bg-cosmic-900/40">
            <code className="text-energy-400 text-xs font-bold">{reg}</code>
            <span className="text-[10px] text-gray-500">{desc}</span>
          </div>
        ))}
      </div>

      <H3>Instruction Categories</H3>
      <div className="space-y-2 mb-4">
        {[
          ['FLUX', 'Core operations: WARP_INIT, ENERGY_LOAD, FLUX_GATE, QUANTUM_JUMP, FOLD_SPACE', 'text-warp-400'],
          ['MIND', 'Neural ops: MIND_LINK, DREAM_WEAVE, SOUL_SYNC, ECHO_THOUGHT, PSI_BURST', 'text-nebula-400'],
          ['CRYPTO', 'Crypto ops: HASH_STAR, SIGN_NEBULA, ENCRYPT_VOID, KEY_FORGE, VERIFY_GLYPH', 'text-star-400'],
          ['NET', 'Network ops: NODE_CONNECT, MESH_WEAVE, SIGNAL_BURST, BROADCAST_WAVE', 'text-energy-400'],
        ].map(([cat, desc, color]) => (
          <div key={cat} className="p-3 rounded-lg bg-cosmic-900/40">
            <span className={`text-xs font-bold ${color}`}>{cat}</span>
            <p className="text-[11px] text-gray-400 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <H3>Proof-of-Computation Mining</H3>
      <P>
        Mining in CosmoWarp is done by executing CosmoASM programs. The VM measures computational
        energy (cycles, entropy, hash quality) and rewards proportionally. No wasted electricity
        solving arbitrary puzzles — the computation itself is the value.
      </P>

      <div className="p-3 rounded-lg bg-cosmic-900/60 border border-gray-700/20">
        <p className="text-[10px] text-gray-500 mb-2">EXAMPLE PROGRAM</p>
        <pre className="text-[11px] text-energy-400 whitespace-pre-wrap">{`WARP_INIT GRID.R\u03A9, R\u03A9
ENERGY_LOAD GRID.R\u03A9, #42
HASH_STAR GRID.R\u03A9
SIGNAL_BURST GRID.R\u03A9`}</pre>
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

      <H3>Symbolic Vocabulary</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {[
          ['\u03A9', 'Omega', 'Unit of value (Warps)'],
          ['\u03C6', 'Phi', 'Golden ratio (Resonance Decay)'],
          ['\u03C8', 'Psi', 'Wave function (consensus)'],
          ['\u2B21', 'Hexagon', 'CosmoWarp identity symbol'],
          ['\u223F', 'Wave', 'Resonance and harmony'],
          ['\u269B', 'Atom', 'Fundamental transaction unit'],
          ['\u2604', 'Comet', 'High-energy operations'],
          ['\u2600', 'Sun', 'Lumina — highest level'],
        ].map(([sym, name, desc]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded bg-cosmic-900/40">
            <span className="text-2xl text-warp-400 w-8 text-center">{sym}</span>
            <div>
              <p className="text-xs font-bold text-gray-200">{name}</p>
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
        VM registers use Greek letters ({'\u03A9'}, {'\u03C6'}, {'\u03C8'}, {'\u03B4'}).
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
          <div key={title} className={`p-3 rounded-lg ${bg}`}>
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
      <div className="p-3 rounded-lg bg-cosmic-900/60 border border-gray-700/20 mb-4">
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
          <div key={stage} className="p-2 rounded bg-cosmic-900/40">
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
          <div key={level.name} className="p-3 rounded-lg bg-cosmic-900/40 border border-gray-700/10">
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
          <div key={title} className="p-3 rounded-lg bg-cosmic-900/40">
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
          { phase: 'Phase 3', title: 'Ecosystem', status: 'In Progress', color: 'text-amber-400', items: ['White Paper & landing page', 'API documentation', 'SDK marketplace', 'Community governance', 'Mobile-first responsive design', 'Extension ecosystem'] },
          { phase: 'Phase 4', title: 'Horizon', status: 'Planned', color: 'text-gray-500', items: ['Mobile apps (iOS + Android)', 'Hardware wallet support', 'Cross-mesh bridges', 'Governance DAO', 'Art & services marketplace', 'Global P2P relay network'] },
        ].map(phase => (
          <div key={phase.phase} className="p-4 rounded-lg bg-cosmic-900/40 border border-gray-700/10">
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
