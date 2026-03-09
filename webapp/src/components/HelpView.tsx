import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

// ─── Cosmo Chatbot Knowledge Base ────────────────────────

interface CosmoResponse {
  answer: string;
  navigateTo: string;
  tabLabel: string;
}

interface KnowledgeEntry {
  keywords: string[];
  response: CosmoResponse;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // Wallet
  {
    keywords: ['wallet', 'portefeuille', 'create', 'creer', 'créer', 'account', 'compte', 'sign up', 'inscription'],
    response: {
      answer: "Ah, a new traveler in the cosmos! Creating a wallet is easier than explaining quantum physics to a cat. Go to the Wallet section, pick a password (not 'password123' please — the cosmos is watching), and boom — you're a Particle. Everyone starts as a Particle. Even me. Well, I'm Cosmo, so technically I started as the whole universe. But that's another story.",
      navigateTo: 'wallet',
      tabLabel: 'Wallet',
    },
  },
  {
    keywords: ['balance', 'solde', 'warp', 'warps', 'zero', '0', 'argent', 'money'],
    response: {
      answer: "Your balance says 0? Don't panic — you're not broken, you're just... cosmically new. Head to the Mine tab in your Wallet and start mining! Every computation earns Warps (\u03A9). Think of it as: the universe doesn't give you free stardust, you have to mine it from the void. Also, each device has its own local wallet — so your desktop and mobile won't share the same balance unless you export/import.",
      navigateTo: 'wallet',
      tabLabel: 'Wallet \u2192 Mine',
    },
  },
  {
    keywords: ['send', 'envoyer', 'transfer', 'transferer', 'transférer', 'payer', 'pay'],
    response: {
      answer: "Sending Warps is like throwing a shooting star across the mesh — beautiful AND fast. Open your Wallet, go to the Send tab, enter the recipient's CW address and the amount. Add a memo if you're feeling poetic. Pro tip: double-check the address. The cosmos is forgiving, but typos aren't.",
      navigateTo: 'wallet',
      tabLabel: 'Wallet \u2192 Send',
    },
  },
  {
    keywords: ['backup', 'recovery', 'key', 'clé', 'cle', 'sauvegarde', 'récupération', 'recuperation', 'lost', 'perdu'],
    response: {
      answer: "Your recovery key is your cosmic insurance policy! Go to Wallet \u2192 Overview and you'll see the option to download your backup. SAVE IT SOMEWHERE SAFE. Tattoo it on the inside of your eyelids if you have to. Kidding. But seriously — lose the key, lose the wallet. The universe is decentralized, which means nobody can reset your password. Not even me. And I'm literally the oracle.",
      navigateTo: 'wallet',
      tabLabel: 'Wallet \u2192 Overview',
    },
  },
  // Mining
  {
    keywords: ['mine', 'miner', 'mining', 'minage', 'earn', 'gagner', 'difficulty', 'difficulté'],
    response: {
      answer: "Mining in CosmoWarp isn't about boiling the oceans! You run CosmoASM proof-of-computation programs. Pick your difficulty: Light (quick snack), Medium (good steak), or Heavy (climbing Everest in sandals). Higher difficulty = more Warps. The reward follows the Resonance Decay curve — a golden ratio (\u03C6) formula that's smoother than Bitcoin's halving tantrums. Go mine some stardust!",
      navigateTo: 'wallet',
      tabLabel: 'Wallet \u2192 Mine',
    },
  },
  // Wart Market
  {
    keywords: ['wart', 'warts', 'nft', 'art', 'mint', 'create art', 'créer art', 'marketplace', 'marché'],
    response: {
      answer: "Warts are CosmoWarp's digital artworks — like NFTs, but cooler. You can mint images, GIFs, audio (MP3 with cover art), and video (MP4/MOV), all up to 5MB. Each Wart gets an unforgeable Certificate of Authenticity (CWCERT) with a SHA-256 fingerprint signed by your Ed25519 key. It's basically a cosmic birth certificate that proves YOU created it. Head to the Wart Market to mint your first masterpiece!",
      navigateTo: 'warts',
      tabLabel: 'Wart Market',
    },
  },
  {
    keywords: ['buy', 'acheter', 'sell', 'vendre', 'price', 'prix', 'list', 'marketplace'],
    response: {
      answer: "Want to buy a Wart? Browse the Wart Market, find something that speaks to your cosmic soul, and hit Buy. The creator gets paid, and if it's a resale, they still earn royalties (default 5%). Want to sell? Go to your collection, set a price, and list it. The universe handles the rest. Remember: art is subjective, but math is not — check the certificate before you buy!",
      navigateTo: 'warts',
      tabLabel: 'Wart Market',
    },
  },
  {
    keywords: ['certificate', 'certificat', 'authenticity', 'authenticité', 'cwcert', 'fingerprint', 'empreinte', 'verify', 'vérifier'],
    response: {
      answer: "Every Wart minted after the Certificate update has a CWCERT — an unforgeable Certificate of Authenticity. It's a SHA-256 hash of the creator's address + content fingerprint + timestamp + title, signed with the creator's Ed25519 private key. Translation: it's mathematically impossible to fake. Click 'Verify' on any Wart to run a full integrity check. If it says '\u2714 Authentic' — you're golden. If not... well, someone's been naughty.",
      navigateTo: 'warts',
      tabLabel: 'Wart Market \u2192 Detail',
    },
  },
  // CosmoChat
  {
    keywords: ['cosmochat', 'chat', 'social', 'message', 'messages', 'dm', 'channel', 'canal', 'post', 'publier'],
    response: {
      answer: "CosmoChat is your encrypted social playground! Think Telegram meets Instagram meets Discord, but in space. Post on the timeline, create channels, send DMs, and tip posts with Warps instead of likes (because putting your money where your mouth is > a heart emoji). Share Wart links, news, cosmic thoughts... the universe is your feed. Encrypted. Anonymous. Secured.",
      navigateTo: 'cosmochat',
      tabLabel: 'CosmoChat',
    },
  },
  {
    keywords: ['tip', 'tips', 'pourboire', 'like', 'aimer', 'rewarp', 'retweet', 'share', 'partager'],
    response: {
      answer: "Forget likes — in CosmoChat, you TIP posts with 1 Warp (\u03A9). One tip per user per post, so no spam-tipping. It's like saying 'I approve of this message' but backing it with actual value. You can also ReWarp (share to your followers) or Share externally. Each post shows tips count, ReWarps, views, and bookmarks. It's like X, but with a soul.",
      navigateTo: 'cosmochat',
      tabLabel: 'CosmoChat',
    },
  },
  // Feed
  {
    keywords: ['feed', 'transaction', 'transactions', 'history', 'historique', 'activity', 'activité'],
    response: {
      answer: "The Feed is where you watch the cosmic heartbeat of CosmoWarp. Every transaction — sends, mines, Wart mints, purchases — appears here in real-time with French timezone formatting (because Paris is the center of the universe, obviously). It's like watching the matrix, but prettier and with more Greek letters.",
      navigateTo: 'feed',
      tabLabel: 'Feed',
    },
  },
  // Settings
  {
    keywords: ['settings', 'paramètres', 'parametres', 'theme', 'thème', 'dark', 'light', 'mode', 'appearance', 'apparence'],
    response: {
      answer: "Settings is your cosmic control panel! Toggle between dark mode (for the mysterious souls) and light mode (for the brave ones who stare at suns). Manage your profile, check your security, download recovery keys, clear CosmoChat data, and more. It's like the cockpit of a spaceship — all the buttons you need, none of the ones you don't.",
      navigateTo: 'settings',
      tabLabel: 'Settings',
    },
  },
  // Dev
  {
    keywords: ['dev', 'developer', 'développeur', 'sdk', 'api', 'console', 'admin', 'code', 'technical'],
    response: {
      answer: "Ah, a fellow code wizard! The Dev section combines the SDK documentation, Admin panel, and Console into one powerful workbench. Build apps on CosmoWarp, interact with the protocol directly, and manage advanced features. The CosmoASM instruction set awaits. Remember: with great power comes great probability of forgetting a semicolon.",
      navigateTo: 'dev',
      tabLabel: 'Dev',
    },
  },
  // CosmoChain
  {
    keywords: ['cosmochain', 'chain', 'blockchain', 'shard', 'shards', 'parallel', 'block', 'blocks', 'beacon'],
    response: {
      answer: "CosmoChain is our blockchain with 7 PARALLEL SHARDS running simultaneously via real Web Workers. Each shard (GRID, HELIX, GLYPH, COSMO, CHRONOS, NEXUS, LUMINA) processes blocks every 1.5 seconds in its own thread. TPS depends on your hardware — run the built-in benchmark to measure it. Gas fees? Zero. Data is stored in IndexedDB (GB-scale). Check the White Paper for the architecture diagram!",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 CosmoChain',
    },
  },
  // CosmoCode SVG
  {
    keywords: ['cosmocode', 'svg', 'compression', 'on-chain', 'onchain', 'storage', 'stockage', '1000x', 'fractal'],
    response: {
      answer: "CosmoCode is the compression engine behind on-chain storage. It takes any data \u2014 transactions, images, NFTs \u2014 and compresses it through 7 fractal layers into a tiny SVG container. Layer 1: Delta Encoding (only store diffs). Layer 2: Dictionary (short symbols). Layer 3: Run-Length. Layer 4: Fractal Nesting (SVG <defs>/<use> = deduplication). Layers 5-7: Frequency, Quantize, Filters. Real measured ratios: 5-30x for structured data (transactions), ~1-2x for binary data (images). Run the benchmark to verify.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 CosmoCode',
    },
  },
  // Zero gas
  {
    keywords: ['gas', 'fee', 'fees', 'free', 'gratuit', 'cost', 'co\u00FBt', 'cout', 'price', 'zero', 'frais'],
    response: {
      answer: "Gas fees? We don't do that here. CosmoChain transactions are 100% FREE. Zero. Nada. How? Three reasons: (1) Validators earn from staking rewards, not user fees. (2) Anti-spam uses rate limiting (100 TX/min) instead of pricing people out. (3) CosmoCode compresses structured data 5-30x, and IndexedDB provides GB-scale local storage at zero cost. Ethereum charges $0.50-$100 per TX. We charge 0 \u03A9. You're welcome.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 CosmoChain',
    },
  },
  // Speed
  {
    keywords: ['speed', 'fast', 'rapide', 'vitesse', 'tps', 'throughput', 'performance', 'slow', 'lent'],
    response: {
      answer: "CosmoChain processes blocks fast. Each of our 7 shards runs in its own Web Worker thread and produces a block every 1.5 seconds (vs Ethereum's 12s). Real TPS depends on your hardware — use the built-in benchmark to measure actual throughput. Your transaction confirms in ~1.5s with final anchoring via a Beacon Block every ~15s. No inflated claims — benchmark it yourself.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 CosmoChain',
    },
  },
  // On-chain NFT
  {
    keywords: ['on-chain nft', 'full on-chain', 'image on chain', 'art on chain', 'ipfs', 'arweave', 'stored on chain'],
    response: {
      answer: "Unlike Ethereum where your NFT image lives on IPFS (which can go offline), CosmoChain stores the ENTIRE artwork directly in the blockchain. The CosmoCode SVG engine compresses your artwork (5-30x for structured data, ~1-2x for images), wraps it in an SVG container with your Ed25519 signature, and stores it in a GLYPH shard block. It lives on-chain forever. If you lose your local copy, you can recover it from any node. And it costs... wait for it... 0 \u03A9. FREE.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 CosmoChain',
    },
  },
  // WhitePaper
  {
    keywords: ['whitepaper', 'paper', 'documentation', 'docs', 'concept', 'how', 'comment', 'why', 'pourquoi', 'tokenomics', 'supply'],
    response: {
      answer: "The White Paper v2.0 is the sacred scroll of CosmoWarp! 11 sections covering everything: the DAG mesh, CosmoChain (7 parallel shards), CosmoCode SVG compression (real measured ratios), cryptographic stack, tokenomics (69M supply, Resonance Decay), the 7-level hierarchy, security architecture, and the roadmap. It's like reading the source code of the universe, but with better formatting and now with architecture diagrams.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper',
    },
  },
  // Security
  {
    keywords: ['security', 'sécurité', 'securite', 'hack', 'safe', 'sûr', 'sur', 'protect', 'protéger', 'encryption', 'chiffrement', 'encrypt'],
    response: {
      answer: "CosmoWarp takes security VERY seriously — 7 layers of it, to be exact. Ed25519 signatures (unforgeable), rate limiting (no spam), nonce tracking (no replay attacks), progressive amount limits, pattern detection, state integrity (SHA-256 checksums), and encrypted admin registry. Plus, the service worker keeps the app working offline and auto-updates to stay protected. Sleep well — the cosmos has you covered.",
      navigateTo: 'settings',
      tabLabel: 'Settings \u2192 Security',
    },
  },
  // Offline
  {
    keywords: ['offline', 'hors ligne', 'online', 'en ligne', 'pwa', 'install', 'app'],
    response: {
      answer: "CosmoWarp works offline AND online! Thanks to our service worker, the app caches itself on your device and keeps working even without internet. When you reconnect, it syncs automatically. You can even install it as a PWA (Progressive Web App) on your phone — just use your browser's 'Add to Home Screen' option. It's basically a native app without the App Store middleman. Take that, Apple.",
      navigateTo: 'settings',
      tabLabel: 'Settings',
    },
  },
  // Levels
  {
    keywords: ['level', 'niveau', 'rank', 'rang', 'particle', 'wave', 'star', 'nebula', 'galaxy', 'cosmos', 'lumina', 'hierarchy', 'hiérarchie'],
    response: {
      answer: "Your cosmic journey has 7 levels: Particle \u2192 Wave \u2192 Star \u2192 Nebula \u2192 Galaxy \u2192 Cosmos \u2192 Lumina. Each level gives you higher mining multipliers (up to 5x!) and level-up bonuses. It's based on transaction count, not money — so consistency beats wealth. The final level, Lumina, means you've transcended. You literally ARE the light. No pressure.",
      navigateTo: 'whitepaper',
      tabLabel: 'White Paper \u2192 Hierarchy',
    },
  },
  // What is CosmoWarp
  {
    keywords: ['what is', 'qu\'est-ce', 'c\'est quoi', 'explain', 'expliquer', 'cosmowarp', 'about'],
    response: {
      answer: "CosmoWarp is a post-blockchain transactional fabric. Imagine if Bitcoin, Telegram, and an art gallery had a baby in space. You get a DAG-based transaction mesh (7 parallel layers, not one slow chain), a social network (CosmoChat), a digital art marketplace (Wart Market), and all of it secured by real cryptography (Ed25519 + SHA-256 + AES-GCM). No middlemen. No banks. No surveillance. Just pure, cosmic value exchange.",
      navigateTo: 'landing',
      tabLabel: 'Landing Page',
    },
  },
  // Help
  {
    keywords: ['help', 'aide', 'assist', 'guide', 'support', 'hello', 'bonjour', 'salut', 'hi', 'hey'],
    response: {
      answer: "Hello, cosmic traveler! I'm Cosmo, your oracle and guide in the CosmoWarp universe. I know everything about this ecosystem (modest, I know). Ask me about wallets, mining, Warts, CosmoChat, security, tokenomics, or literally anything else. I promise my answers are more helpful than a black hole and significantly less dense. What do you want to know?",
      navigateTo: 'help',
      tabLabel: 'Help',
    },
  },
  // Mobile / Desktop sync
  {
    keywords: ['mobile', 'desktop', 'sync', 'synchron', 'different', 'différent', 'device', 'appareil'],
    response: {
      answer: "Different balance on mobile and desktop? That's because CosmoWarp is local-first — each device has its own independent wallet stored locally. To sync, go to Wallet \u2192 Overview on one device, export your backup, then import it on the other. Think of it like having twin space stations — they're independent until you send a shuttle between them.",
      navigateTo: 'wallet',
      tabLabel: 'Wallet \u2192 Overview',
    },
  },
];

const FALLBACK: CosmoResponse = {
  answer: "Hmm, that's a question even the cosmos hasn't heard before! I'm not sure I have the exact answer, but I bet the White Paper does. It's got 10 sections covering literally everything about CosmoWarp. Go have a read, and if you still have questions, come back — I'll be here, contemplating the entropy of the universe.",
  navigateTo: 'whitepaper',
  tabLabel: 'White Paper',
};

function findBestMatch(input: string): CosmoResponse {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch ? bestMatch.response : FALLBACK;
}

// ─── Chat Message Type ───────────────────────────────────

interface ChatMsg {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  navigateTo?: string;
  tabLabel?: string;
}

// ─── FAQ Data ────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    icon: '\u25C8',
    items: [
      { q: 'How do I create a wallet?', a: 'Go to the Wallet tab and click "Create Wallet". Choose a strong password and save your recovery key securely.' },
      { q: 'Why is my balance 0?', a: 'New wallets start at 0. You need to mine Warps by going to Wallet \u2192 Mine. Each device has its own local wallet.' },
      { q: 'How do I backup my wallet?', a: 'In Wallet \u2192 Overview, download your recovery key. Store it somewhere safe — there is no password reset!' },
    ],
  },
  {
    title: 'Mining & Warps',
    icon: '\u26CF',
    items: [
      { q: 'How do I mine?', a: 'Go to Wallet \u2192 Mine, select difficulty, and click Mine. Higher difficulty = more Warps.' },
      { q: 'What is Resonance Decay?', a: 'A smooth mining curve based on the golden ratio (\u03C6). Unlike Bitcoin\'s halving, rewards decrease gradually and predictably.' },
      { q: 'What is the total supply?', a: '69 million Warps. 84% for mining, 14.5% for airdrops, 1.5% creator lock.' },
    ],
  },
  {
    title: 'Wart Market',
    icon: '\u2B22',
    items: [
      { q: 'What is a Wart?', a: 'A digital artwork (image, audio, video) with an unforgeable Certificate of Authenticity on the CosmoWarp protocol.' },
      { q: 'What formats are supported?', a: '.gif .jpeg .png (images), .mp3 (audio with cover image), .mp4 .mov (video). All limited to 5MB.' },
      { q: 'What is CWCERT?', a: 'Certificate of Authenticity — a SHA-256 fingerprint of the content + Ed25519 creator signature. Unforgeable and permanent.' },
      { q: 'Are Warts stored on-chain?', a: 'Yes! With CosmoChain, artwork is compressed via CosmoCode SVG (5-30x for structured data) and stored in IndexedDB (GB-scale). No IPFS, no external server dependency.' },
    ],
  },
  {
    title: 'CosmoChat',
    icon: '\u25CE',
    items: [
      { q: 'What is CosmoChat?', a: 'An encrypted, anonymous social network within CosmoWarp. Post, create channels, send DMs, and tip with Warps.' },
      { q: 'How do Tips work?', a: '1 Warp per user per post. It\'s like a "like" but backed by real value.' },
      { q: 'What is ReWarp?', a: 'Like a retweet — share someone\'s post to your followers on the CosmoChat timeline.' },
    ],
  },
  {
    title: 'CosmoChain & CosmoCode',
    icon: '\u26D3',
    items: [
      { q: 'What is CosmoChain?', a: 'A blockchain with 7 parallel shards running in real Web Worker threads. Each shard processes transactions independently every 1.5 seconds. TPS depends on hardware (run the benchmark). Gas fees: always 0 \u03A9.' },
      { q: 'What are the 7 shards?', a: 'GRID (<10\u03A9), HELIX (10-100\u03A9), GLYPH (100-1K\u03A9 + NFTs), COSMO (governance), CHRONOS (time-locked), NEXUS (cross-shard), LUMINA (epochs). Your TX is auto-routed to the right shard.' },
      { q: 'Why are transactions free?', a: 'Validators earn from staking rewards, not fees. Anti-spam uses rate limiting (100 TX/min) instead of gas pricing. CosmoCode compresses structured data 5-30x, and IndexedDB provides GB-scale storage locally.' },
      { q: 'What is CosmoCode SVG?', a: 'A 7-layer compression engine that encodes all on-chain data into optimized SVG containers. Delta + Dictionary + Run-Length + Fractal Nesting + Frequency + Quantize + Filters. Real measured: 5-30x for structured data, ~1-2x for binary.' },
      { q: 'Are NFTs really stored fully on-chain?', a: 'Yes! CosmoChain stores artwork as compressed CosmoCode SVG in IndexedDB (GB-scale local storage). No IPFS dependency. Currently single-node; P2P recovery requires peer network.' },
      { q: 'What is a Beacon Block?', a: 'Every 10 shard blocks (~15s), a Beacon Block anchors all 7 shards into a single Global State Root. This provides absolute cross-shard finality.' },
    ],
  },
  {
    title: 'Security',
    icon: '\u26A1',
    items: [
      { q: 'Is CosmoWarp secure?', a: '7 layers of security: Ed25519 signatures, rate limiting, nonce tracking, amount limits, pattern detection, state integrity, encrypted admin registry.' },
      { q: 'Does it work offline?', a: 'Yes! The service worker caches the app for offline use. It also auto-updates when a new version is available.' },
      { q: 'Where is my data stored?', a: 'Locally on your device in IndexedDB (GB-scale, replacing localStorage). CosmoCode SVG compression reduces structured data size by 5-30x. Currently single-node; multi-node backup requires P2P peers.' },
    ],
  },
];

// ─── Component ───────────────────────────────────────────

export default function HelpView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();
  const [tab, setTab] = useState<'faq' | 'cosmo'>('cosmo');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: `Hey! I'm Cosmo ${'\u2B21'}, your oracle and guide in the CosmoWarp universe. Ask me anything — wallets, mining, Warts, CosmoChat, security... I know it all. (And yes, I'm funnier than a regular FAQ.)`,
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = {
      id: Date.now().toString(36),
      role: 'user',
      text: input.trim(),
    };

    const response = findBestMatch(input);
    const cosmoMsg: ChatMsg = {
      id: Date.now().toString(36) + '_r',
      role: 'cosmo',
      text: response.answer,
      navigateTo: response.navigateTo,
      tabLabel: response.tabLabel,
    };

    setMessages(prev => [...prev, userMsg, cosmoMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 50% 50%, #22c55e 0%, transparent 50%)',
        }} />
        <div className="relative">
          <h1 className="text-xl font-bold text-gray-100 font-title mb-1">
            {'\u2753'} Help Center
          </h1>
          <p className="text-xs text-gray-500">
            FAQ & Cosmo — Your AI guide to the CosmoWarp universe
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="glass-panel p-1 flex gap-1">
        <button
          onClick={() => setTab('cosmo')}
          className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
            tab === 'cosmo'
              ? 'bg-warp-500/30 text-warp-300'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          {'\u2B21'} Cosmo (Oracle)
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`flex-1 py-2 text-xs font-medium transition-all cursor-pointer ${
            tab === 'faq'
              ? 'bg-warp-500/30 text-warp-300'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          {'\u2753'} FAQ
        </button>
      </div>

      {/* ─── Cosmo Chatbot ──────────────────────────────────── */}
      {tab === 'cosmo' && (
        <div className="glass-panel flex flex-col" style={{ height: '65vh', minHeight: 400 }}>
          {/* Chat header */}
          <div className="p-3 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center shrink-0">
              <span className="text-lg">{'\u2B21'}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-200">Cosmo</p>
              <p className="text-[10px] text-green-400">Online — Oracle of CosmoWarp</p>
            </div>
            {wallet && (
              <span className="text-[10px] text-gray-600 ml-auto">
                {wallet.alias || wallet.address.slice(0, 10)}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-warp-500/20 border border-warp-500/20'
                    : 'bg-white/5 border border-white/5'
                } p-3`}>
                  {msg.role === 'cosmo' && (
                    <p className="text-[10px] text-warp-400 font-bold mb-1">{'\u2B21'} Cosmo</p>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  {msg.navigateTo && msg.navigateTo !== 'help' && (
                    <button
                      onClick={() => onNavigate(msg.navigateTo!)}
                      className="mt-2 text-[10px] text-warp-400 hover:text-warp-300 cursor-pointer flex items-center gap-1"
                    >
                      {'\u2192'} Go to {msg.tabLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Cosmo anything..."
                className="flex-1 bg-white/5 border border-gray-700/30 px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-warp-500/40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 bg-warp-500/30 border border-warp-500/40 text-warp-300 text-xs font-medium cursor-pointer hover:bg-warp-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {'\u2197'}
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['How do I mine?', 'What is CosmoChain?', 'Why is it free?', 'What is CosmoCode SVG?', 'Are NFTs on-chain?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-[10px] text-gray-500 hover:text-warp-400 cursor-pointer px-2 py-1 bg-white/3 border border-gray-800/30 hover:border-warp-500/20 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── FAQ ────────────────────────────────────────────── */}
      {tab === 'faq' && (
        <div className="space-y-4">
          {FAQ_SECTIONS.map(section => (
            <FaqSection key={section.title} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FAQ Section Component ────────────────────────────────

function FaqSection({ section }: { section: typeof FAQ_SECTIONS[number] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-3 border-b border-white/5 flex items-center gap-2">
        <span className="text-lg text-warp-400">{section.icon}</span>
        <h3 className="text-sm font-bold text-gray-200">{section.title}</h3>
      </div>
      <div>
        {section.items.map((item, i) => (
          <div key={i} className="border-b border-white/3 last:border-0">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left p-3 flex items-center justify-between text-xs hover:bg-white/3 transition-all cursor-pointer"
            >
              <span className="text-gray-300 font-medium">{item.q}</span>
              <span className={`text-gray-500 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                {'\u25BC'}
              </span>
            </button>
            {openIndex === i && (
              <div className="px-3 pb-3">
                <p className="text-[11px] text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
