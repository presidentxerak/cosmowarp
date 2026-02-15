/**
 * CosmoWarp Chrome Extension — Popup Controller
 *
 * Manages the popup UI, wallet creation, transactions,
 * and communication with background service worker.
 */

// ─── Storage Abstraction (chrome.storage.local) ─────────

const Storage = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  },
  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },
};

// ─── Crypto Helpers (Web Crypto API) ────────────────────

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const pubHex = bufToHex(pubRaw);
  const privHex = bufToHex(privRaw);
  const address = 'CW' + pubHex.slice(0, 40);

  return { address, publicKey: pubHex, privateKey: privHex };
}

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(data) {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return bufToHex(hash);
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr;
  return addr.slice(0, 8) + '...' + addr.slice(-4);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Tokenomics Constants ───────────────────────────────

const TOTAL_SUPPLY = 69_000_000;
const AIRDROP_AMOUNT = 1_000;
const GOLDEN_RATIO = 1.618033988749895;
const DECAY_CONSTANT = 5_000_000;
const BASE_MINING_REWARD = 50;

function calculateMiningReward(totalMined) {
  if (totalMined >= 58_000_000) return 0;
  const decayFactor = Math.pow(GOLDEN_RATIO, -(totalMined / DECAY_CONSTANT));
  return Math.max(0.1, Math.round(BASE_MINING_REWARD * decayFactor * 100) / 100);
}

// ─── Hierarchy ──────────────────────────────────────────

const LEVELS = [
  { name: 'Particle', title: 'Quantum Seed', symbol: '\u2022', mult: 1.0, minTx: 0 },
  { name: 'Wave', title: 'Harmonic Traveler', symbol: '\u223F', mult: 1.2, minTx: 10 },
  { name: 'Star', title: 'Stellar Navigator', symbol: '\u2605', mult: 1.5, minTx: 50 },
  { name: 'Nebula', title: 'Nebula Architect', symbol: '\u2604', mult: 2.0, minTx: 200 },
  { name: 'Galaxy', title: 'Galactic Guardian', symbol: '\u269B', mult: 2.5, minTx: 500 },
  { name: 'Cosmos', title: 'Cosmic Sovereign', symbol: '\u2726', mult: 3.5, minTx: 2000 },
  { name: 'Lumina', title: 'Lumina Transcendent', symbol: '\u2600', mult: 5.0, minTx: 10000 },
];

function getLevel(totalTx) {
  let level = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalTx >= LEVELS[i].minTx) { level = i; break; }
  }
  return level;
}

// ─── Wallet State ───────────────────────────────────────

let wallet = null;

async function loadWallet() {
  const raw = await Storage.get('cosmowarp_wallet');
  if (raw) {
    try {
      wallet = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      wallet = null;
    }
  }
  return wallet;
}

async function saveWallet() {
  if (wallet) {
    await Storage.set('cosmowarp_wallet', wallet);
  }
}

async function createWallet(alias) {
  const keyPair = await generateKeyPair();
  wallet = {
    address: keyPair.address,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    balance: AIRDROP_AMOUNT,
    transactions: [{
      id: genId(),
      from: 'COSMO_GENESIS',
      to: keyPair.address,
      amount: AIRDROP_AMOUNT,
      timestamp: Date.now(),
      type: 'airdrop',
      memo: `Welcome to CosmoWarp! Airdrop: ${AIRDROP_AMOUNT} \u03A9`,
    }],
    createdAt: Date.now(),
    alias: alias || undefined,
    level: 0,
    xp: 0,
    streakDays: 0,
    totalMined: 0,
    isAdmin: false,
  };
  await saveWallet();
  return wallet;
}

async function sendWarps(toAddress, amount, memo) {
  if (!wallet) return { success: false, error: 'No wallet' };
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  if (amount > wallet.balance) return { success: false, error: 'Insufficient Warps' };
  if (toAddress === wallet.address) return { success: false, error: 'Cannot send to yourself' };
  if (!toAddress.startsWith('CW') || toAddress.length < 10) return { success: false, error: 'Invalid address' };

  wallet.balance -= amount;
  const tx = {
    id: genId(),
    from: wallet.address,
    to: toAddress,
    amount,
    timestamp: Date.now(),
    type: 'send',
    memo,
  };
  wallet.transactions.unshift(tx);
  wallet.xp += 10;

  // Check level up
  const newLevel = getLevel(wallet.transactions.length);
  if (newLevel > wallet.level) {
    wallet.level = newLevel;
  }

  await saveWallet();
  return { success: true, tx };
}

// ─── UI Rendering ───────────────────────────────────────

function renderWalletCreate() {
  document.getElementById('wallet-create').classList.remove('hidden');
  document.getElementById('wallet-view').classList.add('hidden');
}

function renderWallet() {
  if (!wallet) return renderWalletCreate();

  document.getElementById('wallet-create').classList.add('hidden');
  document.getElementById('wallet-view').classList.remove('hidden');

  const level = LEVELS[wallet.level];
  document.getElementById('w-symbol').textContent = level.symbol;
  document.getElementById('w-title').textContent = level.title;
  document.getElementById('w-alias').textContent = wallet.alias ? `@${wallet.alias}` : '';
  document.getElementById('w-balance').textContent = wallet.balance.toLocaleString();
  document.getElementById('w-address').textContent = wallet.address;

  if (wallet.isAdmin) {
    document.getElementById('w-admin').classList.remove('hidden');
  }

  document.getElementById('w-level-symbol').textContent = level.symbol;
  document.getElementById('w-level-num').textContent = wallet.level;
  document.getElementById('w-level-name').textContent = level.name;
  document.getElementById('w-xp').textContent = wallet.xp;
  document.getElementById('w-multiplier').textContent = level.mult + 'x';
  document.getElementById('w-streak').textContent = (wallet.streakDays || 0) + ' days';

  // Progress
  const nextLevel = wallet.level < 6 ? LEVELS[wallet.level + 1] : null;
  const progress = nextLevel
    ? Math.min(100, Math.round(((wallet.transactions.length - level.minTx) / (nextLevel.minTx - level.minTx)) * 100))
    : 100;
  document.getElementById('w-progress-pct').textContent = progress + '%';
  document.getElementById('w-progress-bar').style.width = progress + '%';

  // Stats
  document.getElementById('w-txs').textContent = wallet.transactions.length;
  document.getElementById('w-mined').textContent = wallet.transactions.filter(t => t.type === 'mine').length;
  document.getElementById('w-sent').textContent = wallet.transactions.filter(t => t.type === 'send').reduce((a, t) => a + t.amount, 0);

  // Transaction list
  const txList = document.getElementById('w-txlist');
  const txEmpty = document.getElementById('w-txempty');
  const recentTxs = wallet.transactions.slice(0, 6);

  if (recentTxs.length === 0) {
    txList.innerHTML = '';
    txEmpty.classList.remove('hidden');
  } else {
    txEmpty.classList.add('hidden');
    txList.innerHTML = recentTxs.map(tx => {
      const icon = tx.type === 'mine' ? '\u26CF' : tx.type === 'send' ? '\u2197' : tx.type === 'airdrop' ? '\u2726' : '\u2199';
      const iconColor = tx.type === 'mine' ? 'text-star' : tx.type === 'send' ? 'text-nebula' : 'text-warp';
      const title = tx.type === 'airdrop' ? 'Airdrop' : tx.type === 'mine' ? 'Mining Reward' : tx.type === 'send' ? `To ${shortAddr(tx.to)}` : `From ${shortAddr(tx.from)}`;
      const sign = tx.type === 'send' ? '-' : '+';
      const amtColor = tx.type === 'send' ? 'text-nebula' : 'text-energy';
      return `<div class="tx-item"><span class="tx-icon ${iconColor}">${icon}</span><div class="tx-info"><div class="title">${title}</div></div><div class="tx-amount ${amtColor}">${sign}${tx.amount} \u03A9</div></div>`;
    }).join('');
  }

  // Send tab balance
  document.getElementById('s-balance').textContent = wallet.balance.toLocaleString() + ' \u03A9';
}

function renderInfo() {
  const totalMined = wallet?.totalMined || 0;
  const reward = calculateMiningReward(totalMined);
  const items = [
    ['Total Supply', TOTAL_SUPPLY.toLocaleString()],
    ['Airdrop', AIRDROP_AMOUNT.toLocaleString() + ' CW'],
    ['Mining Reward', reward.toFixed(2) + ' CW'],
    ['Decay System', 'Resonance Decay (\u03C6)'],
  ];
  document.getElementById('info-supply').innerHTML = items.map(([label, value]) =>
    `<div class="supply-item"><span class="label">${label}:</span> <span class="text-warp">${value}</span></div>`
  ).join('');
}

// ─── Tab Navigation ─────────────────────────────────────

const tabs = document.querySelectorAll('.tab');
const tabContents = {
  wallet: document.getElementById('tab-wallet'),
  send: document.getElementById('tab-send'),
  info: document.getElementById('tab-info'),
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(tabContents).forEach(c => c.classList.add('hidden'));
    tabContents[tab.dataset.tab].classList.remove('hidden');
  });
});

// ─── Event Handlers ─────────────────────────────────────

document.getElementById('btn-create').addEventListener('click', async () => {
  const alias = document.getElementById('create-alias').value.trim();
  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generating...';
  try {
    await createWallet(alias || undefined);
    renderWallet();
    renderInfo();
  } finally {
    btn.disabled = false;
    btn.textContent = '\u2726 Initialize Wallet';
  }
});

document.getElementById('btn-copy').addEventListener('click', () => {
  if (wallet) {
    navigator.clipboard.writeText(wallet.address);
    const btn = document.getElementById('btn-copy');
    btn.textContent = '\u2713';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  }
});

document.getElementById('btn-send').addEventListener('click', async () => {
  const to = document.getElementById('s-to').value.trim();
  const amount = parseFloat(document.getElementById('s-amount').value);
  const memo = document.getElementById('s-memo').value.trim();
  const resultEl = document.getElementById('s-result');
  const btn = document.getElementById('btn-send');

  if (!to || isNaN(amount)) {
    resultEl.textContent = 'Please fill in address and amount';
    resultEl.className = 'result-msg result-error';
    resultEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing...';

  const result = await sendWarps(to, amount, memo || undefined);

  if (result.success) {
    resultEl.textContent = `Sent ${amount} \u03A9 via CosmoMesh!`;
    resultEl.className = 'result-msg result-success';
    document.getElementById('s-to').value = '';
    document.getElementById('s-amount').value = '';
    document.getElementById('s-memo').value = '';
    renderWallet();
  } else {
    resultEl.textContent = result.error;
    resultEl.className = 'result-msg result-error';
  }

  resultEl.classList.remove('hidden');
  btn.disabled = false;
  btn.textContent = '\u26A1 Send Transaction';
  setTimeout(() => resultEl.classList.add('hidden'), 4000);
});

// ─── Init ───────────────────────────────────────────────

(async () => {
  await loadWallet();
  renderWallet();
  renderInfo();
})();
