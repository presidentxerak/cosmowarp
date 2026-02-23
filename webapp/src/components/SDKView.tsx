import { useState } from 'react';

type Tab = 'overview' | 'wallet' | 'crypto' | 'mining' | 'events' | 'extension';

export default function SDKView() {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'wallet', label: 'Wallet API' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'mining', label: 'Mining' },
    { id: 'events', label: 'Events' },
    { id: 'extension', label: 'Extension' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{'\u2B21'}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-100 font-title">CosmoWarp SDK</h2>
            <p className="text-xs text-gray-500">Developer API & Extension Guide</p>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          Build apps, extensions, and integrations on the CosmoWarp ecosystem.
          The SDK provides wallet creation, cryptographic utilities, mining calculators,
          and an event system.
        </p>
      </div>

      {/* Tab Nav */}
      <div className="glass-panel p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-none text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="glass-panel p-5 sm:p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'wallet' && <WalletTab />}
        {tab === 'crypto' && <CryptoTab />}
        {tab === 'mining' && <MiningTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'extension' && <ExtensionTab />}
      </div>
    </div>
  );
}

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="rounded-none bg-cosmic-900/60 border border-gray-700/20 overflow-hidden mb-4">
      {title && (
        <div className="px-3 py-1.5 border-b border-gray-700/20">
          <span className="text-[10px] text-gray-500">{title}</span>
        </div>
      )}
      <pre className="p-3 text-[11px] text-energy-400 overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function ApiMethod({ name, desc, params, returns }: {
  name: string; desc: string; params?: string[]; returns: string;
}) {
  return (
    <div className="p-3 rounded-none bg-cosmic-900/40 mb-3">
      <code className="text-sm text-warp-400 font-bold">{name}</code>
      <p className="text-xs text-gray-400 mt-1 mb-2">{desc}</p>
      {params && params.length > 0 && (
        <div className="text-[10px] text-gray-500 mb-1">
          <span className="text-gray-400">Params:</span> {params.join(', ')}
        </div>
      )}
      <div className="text-[10px]">
        <span className="text-gray-400">Returns:</span> <span className="text-energy-400">{returns}</span>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Getting Started</h3>
      <p className="text-sm text-gray-400 mb-4">
        The CosmoWarp SDK is a JavaScript/TypeScript library for building applications
        on the CosmoWarp ecosystem.
      </p>

      <CodeBlock title="Installation" code={`import { CosmoWarpSDK } from 'cosmowarp-sdk';

const cosmo = new CosmoWarpSDK();`} />

      <CodeBlock title="Quick Start" code={`// Create a wallet
const wallet = await cosmo.createWallet('MyApp User');
console.log(wallet.address); // CW...

// Get protocol info
const info = cosmo.getProtocolInfo();
console.log(info.totalSupply); // 69000000
console.log(info.layers);      // ['GRID', 'HELIX', ...]

// Hash data
const hash = await cosmo.hash('hello world');

// Calculate mining reward
const reward = cosmo.calculateReward(0); // 50 CW

// Listen for events
cosmo.on('balance_changed', (event) => {
  console.log('Balance changed:', event.data);
});`} />

      <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">Protocol Constants</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {[
          ['Total Supply', '69,000,000 CW'],
          ['Airdrop/Wallet', '1,000 CW'],
          ['Base Mining Reward', '50 CW'],
          ['Decay Constant', '5,000,000'],
          ['Golden Ratio', '1.618033...'],
          ['Streak Reward', '10,000 CW'],
          ['Streak Days', '365'],
          ['Hierarchy Levels', '7'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between p-2 rounded-none bg-cosmic-900/40">
            <span className="text-gray-500">{k}</span>
            <span className="text-warp-400">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WalletTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Wallet API</h3>
      <ApiMethod
        name="cosmo.createWallet(alias?)"
        desc="Create a new Ed25519 wallet with optional alias."
        params={['alias?: string']}
        returns="Promise<SDKWallet>"
      />
      <ApiMethod
        name="cosmo.validateAddress(address)"
        desc="Check if an address has valid CosmoWarp format (CW + 40 hex chars)."
        params={['address: string']}
        returns="boolean"
      />
      <ApiMethod
        name="cosmo.formatAddress(address)"
        desc="Shorten an address for display (e.g. CW1234...abcd)."
        params={['address: string']}
        returns="string"
      />

      <CodeBlock title="SDKWallet Interface" code={`interface SDKWallet {
  address: string;    // CW + 40 hex chars
  publicKey: string;  // Ed25519 public key (hex)
  privateKey: string; // Ed25519 private key (hex)
  alias?: string;
  createdAt: number;  // Unix timestamp
}`} />
    </div>
  );
}

function CryptoTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Cryptographic Utilities</h3>
      <ApiMethod
        name="cosmo.hash(data)"
        desc="Compute SHA-256 hash of string data."
        params={['data: string']}
        returns="Promise<string> (64-char hex)"
      />
      <ApiMethod
        name="cosmo.generateKeys()"
        desc="Generate a new Ed25519 keypair."
        returns="Promise<CosmoKeyPair>"
      />

      <CodeBlock title="Example" code={`// Hash data
const hash = await cosmo.hash('transaction data');
// => "2cf24dba5fb0a30e26e83b2ac5b9e29e..."

// Generate keys
const keys = await cosmo.generateKeys();
console.log(keys.address);    // CW...
console.log(keys.publicKey);  // hex string
console.log(keys.privateKey); // hex string`} />
    </div>
  );
}

function MiningTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Mining Calculator</h3>
      <ApiMethod
        name="cosmo.calculateReward(totalMined)"
        desc="Calculate the current mining reward based on total CW already mined (Resonance Decay)."
        params={['totalMined: number']}
        returns="number (CW reward)"
      />
      <ApiMethod
        name="cosmo.getRewardCurve(points?)"
        desc="Generate the full Resonance Decay curve for visualization."
        params={['points?: number (default 100)']}
        returns="Array<{ mined: number; reward: number }>"
      />
      <ApiMethod
        name="cosmo.getLayerForAmount(amount)"
        desc="Determine which mesh layer a transaction amount falls into."
        params={['amount: number']}
        returns="string ('GRID' | 'HELIX' | 'GLYPH')"
      />

      <CodeBlock title="Resonance Decay Formula" code={`// reward = 50 * \u03C6^(-totalMined / 5,000,000)
// where \u03C6 = 1.618033988749895 (golden ratio)

cosmo.calculateReward(0);          // 50.00 CW
cosmo.calculateReward(5_000_000);  // ~30.90 CW
cosmo.calculateReward(10_000_000); // ~19.10 CW
cosmo.calculateReward(20_000_000); // ~7.30 CW
cosmo.calculateReward(58_000_000); // 0 (pool exhausted)`} />
    </div>
  );
}

function EventsTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Event System</h3>
      <ApiMethod
        name="cosmo.on(event, callback)"
        desc="Subscribe to protocol events."
        params={['event: SDKEventType', 'callback: (event: SDKEvent) => void']}
        returns="void"
      />
      <ApiMethod
        name="cosmo.off(event, callback)"
        desc="Unsubscribe from protocol events."
        params={['event: SDKEventType', 'callback: function']}
        returns="void"
      />

      <h3 className="text-sm font-bold text-energy-400 mt-5 mb-2">Event Types</h3>
      <div className="space-y-1 mb-4">
        {[
          ['transaction_received', 'When a transaction is received'],
          ['transaction_confirmed', 'When a transaction reaches finality'],
          ['balance_changed', 'When wallet balance changes'],
          ['level_up', 'When account reaches a new hierarchy level'],
          ['streak_milestone', 'When a streak milestone is reached'],
        ].map(([name, desc]) => (
          <div key={name} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40 text-xs">
            <code className="text-warp-400 shrink-0">{name}</code>
            <span className="text-gray-500">{desc}</span>
          </div>
        ))}
      </div>

      <CodeBlock title="Example" code={`cosmo.on('level_up', (event) => {
  console.log('Level up!', event.data.newLevel);
  showNotification(\`Congratulations! Level \${event.data.newLevel}\`);
});

cosmo.on('transaction_received', (event) => {
  console.log(\`Received \${event.data.amount} \u03A9 from \${event.address}\`);
});`} />
    </div>
  );
}

function ExtensionTab() {
  return (
    <div>
      <h3 className="text-lg font-bold text-warp-300 mb-3">Chrome Extension</h3>
      <p className="text-sm text-gray-400 mb-4">
        The CosmoWarp Chrome Extension provides a popup wallet interface directly in your browser.
        It uses Manifest V3 and the Web Crypto API for Ed25519 operations.
      </p>

      <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">Structure</h3>
      <CodeBlock code={`extension/
  manifest.json      # Manifest V3 configuration
  popup.html         # Popup UI (HTML + CSS)
  src/
    popup.js         # Popup controller (wallet, send, info)
    background.js    # Service worker (storage management)`} />

      <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">Installation (Developer)</h3>
      <div className="text-xs text-gray-400 space-y-2 mb-4">
        <p>1. Open Chrome and navigate to <code className="text-energy-400">chrome://extensions</code></p>
        <p>2. Enable "Developer mode" (top right toggle)</p>
        <p>3. Click "Load unpacked" and select the <code className="text-energy-400">extension/</code> folder</p>
        <p>4. The CosmoWarp icon appears in your toolbar</p>
      </div>

      <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">Features</h3>
      <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
        <li>Ed25519 wallet creation with 1,000 CW airdrop</li>
        <li>Send transactions with recipient validation</li>
        <li>Balance display with hierarchy level</li>
        <li>Transaction history</li>
        <li>Protocol info and hierarchy reference</li>
        <li>Persistent storage via chrome.storage.local</li>
      </ul>

      <h3 className="text-sm font-bold text-energy-400 mb-2 mt-5">Building Your Own Extension</h3>
      <CodeBlock title="Communicate with CosmoWarp" code={`// From your extension's content script:
chrome.runtime.sendMessage(
  { type: 'GET_WALLET' },
  (response) => {
    if (response.wallet) {
      console.log('Address:', response.wallet.address);
      console.log('Balance:', response.wallet.balance);
    }
  }
);`} />
    </div>
  );
}
