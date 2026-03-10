/**
 * CosmoWarp Chrome Extension — Popup Controller
 *
 * Manages the popup UI, wallet creation, transactions,
 * and communication with background service worker.
 *
 * Security: Private keys are encrypted with AES-GCM via user password.
 * Transactions are signed locally with Ed25519.
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
  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve);
    });
  },
};

// ─── Crypto Helpers (Web Crypto API) ────────────────────

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function strToBuf(str) {
  return new TextEncoder().encode(str).buffer;
}

async function sha256(data) {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return bufToHex(hash);
}

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const pubHex = bufToHex(pubRaw);
  const privHex = bufToHex(privPkcs8);

  // Address = CW + SHA-256(publicKey)[0:40] — matches webapp format
  const addressHash = await sha256(pubHex);
  const address = 'CW' + addressHash.slice(0, 40);

  return { address, publicKey: pubHex, privateKey: privHex };
}

async function signData(data, privateKeyHex) {
  const privKey = await crypto.subtle.importKey(
    'pkcs8',
    hexToBuf(privateKeyHex),
    { name: 'Ed25519' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privKey,
    strToBuf(data)
  );
  return bufToHex(signature);
}

// ─── AES-GCM Key Encryption ────────────────────────────

async function deriveAesKey(password) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBuf(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: strToBuf('CosmoWarp-Extension-Salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPrivateKey(privateKeyHex, password) {
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    strToBuf(privateKeyHex)
  );
  return {
    ciphertext: bufToHex(ciphertext),
    iv: bufToHex(iv.buffer),
  };
}

async function decryptPrivateKey(encrypted, password) {
  const key = await deriveAesKey(password);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBuf(encrypted.iv) },
      key,
      hexToBuf(encrypted.ciphertext)
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Wrong password');
  }
}

// ─── HTML Sanitization ──────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return escapeHtml(addr);
  return escapeHtml(addr.slice(0, 8) + '...' + addr.slice(-4));
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

function isValidAddress(addr) {
  return /^CW[a-f0-9]{40}$/.test(addr);
}

// ─── Wallet State ───────────────────────────────────────

let wallet = null;
let unlockedPrivateKey = null; // Decrypted key, only in memory while popup open

async function loadWallet() {
  const raw = await Storage.get('cosmowarp_wallet');
  if (raw) {
    try {
      wallet = typeof raw === 'string' ? JSON.parse(raw) : raw;
      unlockedPrivateKey = null;
    } catch {
      wallet = null;
    }
  }
  return wallet;
}

async function saveWallet() {
  if (wallet) {
    const toSave = { ...wallet };
    delete toSave.privateKey; // Never persist decrypted key
    await Storage.set('cosmowarp_wallet', toSave);
  }
}

async function createWallet(alias, password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const keyPair = await generateKeyPair();
  const encrypted = await encryptPrivateKey(keyPair.privateKey, password);

  wallet = {
    address: keyPair.address,
    publicKey: keyPair.publicKey,
    encryptedPrivateKey: encrypted,
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

  unlockedPrivateKey = keyPair.privateKey;
  await saveWallet();
  return wallet;
}

async function unlockWallet(password) {
  if (!wallet?.encryptedPrivateKey) throw new Error('No encrypted key found');
  unlockedPrivateKey = await decryptPrivateKey(wallet.encryptedPrivateKey, password);
  return true;
}

function lockWallet() {
  unlockedPrivateKey = null;
}

async function sendWarps(toAddress, amount, memo) {
  if (!wallet) return { success: false, error: 'No wallet' };
  if (!unlockedPrivateKey) return { success: false, error: 'Wallet is locked — unlock first' };
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  if (amount > wallet.balance) return { success: false, error: 'Insufficient Warps' };
  if (toAddress === wallet.address) return { success: false, error: 'Cannot send to yourself' };
  if (!isValidAddress(toAddress)) return { success: false, error: 'Invalid address (must be CW + 40 hex chars)' };

  // Sign the transaction
  const txData = `${wallet.address}:${toAddress}:${amount}:${Date.now()}`;
  const signature = await signData(txData, unlockedPrivateKey);

  wallet.balance -= amount;
  const tx = {
    id: genId(),
    from: wallet.address,
    to: toAddress,
    amount,
    timestamp: Date.now(),
    type: 'send',
    memo,
    signature: signature.slice(0, 32),
  };
  wallet.transactions.unshift(tx);
  wallet.xp += 10;

  const newLevel = getLevel(wallet.transactions.length);
  if (newLevel > wallet.level) wallet.level = newLevel;

  await saveWallet();
  return { success: true, tx };
}

// ─── Import / Export ────────────────────────────────────

function getExportData() {
  if (!wallet) return null;
  return {
    version: 2,
    address: wallet.address,
    publicKey: wallet.publicKey,
    encryptedPrivateKey: wallet.encryptedPrivateKey,
    alias: wallet.alias,
    createdAt: wallet.createdAt,
  };
}

async function importFromData(data, password) {
  await decryptPrivateKey(data.encryptedPrivateKey, password); // Verify password
  wallet = {
    address: data.address,
    publicKey: data.publicKey,
    encryptedPrivateKey: data.encryptedPrivateKey,
    balance: 0,
    transactions: [],
    createdAt: data.createdAt,
    alias: data.alias,
    level: 0, xp: 0, streakDays: 0, totalMined: 0, isAdmin: false,
  };
  unlockedPrivateKey = await decryptPrivateKey(data.encryptedPrivateKey, password);
  await saveWallet();
  return wallet;
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

  const lockEl = document.getElementById('w-lock-status');
  if (lockEl) lockEl.textContent = unlockedPrivateKey ? '\uD83D\uDD13' : '\uD83D\uDD12';

  if (wallet.isAdmin) {
    document.getElementById('w-admin').classList.remove('hidden');
  }

  document.getElementById('w-level-symbol').textContent = level.symbol;
  document.getElementById('w-level-num').textContent = wallet.level;
  document.getElementById('w-level-name').textContent = level.name;
  document.getElementById('w-xp').textContent = wallet.xp;
  document.getElementById('w-multiplier').textContent = level.mult + 'x';
  document.getElementById('w-streak').textContent = (wallet.streakDays || 0) + ' days';

  const nextLevel = wallet.level < 6 ? LEVELS[wallet.level + 1] : null;
  const progress = nextLevel
    ? Math.min(100, Math.round(((wallet.transactions.length - level.minTx) / (nextLevel.minTx - level.minTx)) * 100))
    : 100;
  document.getElementById('w-progress-pct').textContent = progress + '%';
  document.getElementById('w-progress-bar').style.width = progress + '%';

  document.getElementById('w-txs').textContent = wallet.transactions.length;
  document.getElementById('w-mined').textContent = wallet.transactions.filter(t => t.type === 'mine').length;
  document.getElementById('w-sent').textContent = wallet.transactions.filter(t => t.type === 'send').reduce((a, t) => a + t.amount, 0);

  // Transaction list — sanitized rendering
  const txList = document.getElementById('w-txlist');
  const txEmpty = document.getElementById('w-txempty');
  const recentTxs = wallet.transactions.slice(0, 6);

  txList.innerHTML = '';
  if (recentTxs.length === 0) {
    txEmpty.classList.remove('hidden');
  } else {
    txEmpty.classList.add('hidden');
    for (const tx of recentTxs) {
      const icon = tx.type === 'mine' ? '\u26CF' : tx.type === 'send' ? '\u2197' : tx.type === 'airdrop' ? '\u2726' : '\u2199';
      const iconColor = tx.type === 'mine' ? 'text-star' : tx.type === 'send' ? 'text-nebula' : 'text-warp';
      const title = tx.type === 'airdrop' ? 'Airdrop' : tx.type === 'mine' ? 'Mining Reward' : tx.type === 'send' ? `To ${shortAddr(tx.to)}` : `From ${shortAddr(tx.from)}`;
      const sign = tx.type === 'send' ? '-' : '+';
      const amtColor = tx.type === 'send' ? 'text-nebula' : 'text-energy';

      const div = document.createElement('div');
      div.className = 'tx-item';

      const iconSpan = document.createElement('span');
      iconSpan.className = `tx-icon ${iconColor}`;
      iconSpan.textContent = icon;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'tx-info';
      const titleDiv = document.createElement('div');
      titleDiv.className = 'title';
      titleDiv.textContent = title;
      infoDiv.appendChild(titleDiv);

      const amtDiv = document.createElement('div');
      amtDiv.className = `tx-amount ${amtColor}`;
      amtDiv.textContent = `${sign}${tx.amount} \u03A9`;

      div.appendChild(iconSpan);
      div.appendChild(infoDiv);
      div.appendChild(amtDiv);
      txList.appendChild(div);
    }
  }

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
  const container = document.getElementById('info-supply');
  container.innerHTML = '';
  for (const [label, value] of items) {
    const div = document.createElement('div');
    div.className = 'supply-item';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = label + ':';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'text-warp';
    valueSpan.textContent = value;
    div.appendChild(labelSpan);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(valueSpan);
    container.appendChild(div);
  }
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

function showResult(message, isError) {
  const el = document.getElementById('s-result');
  if (!el) return;
  el.textContent = message;
  el.className = `result-msg ${isError ? 'result-error' : 'result-success'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

document.getElementById('btn-create').addEventListener('click', async () => {
  const alias = document.getElementById('create-alias').value.trim();
  const password = document.getElementById('create-password')?.value || '';
  const btn = document.getElementById('btn-create');

  if (password.length < 6) {
    showResult('Password must be at least 6 characters', true);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Generating...';
  try {
    await createWallet(alias || undefined, password);
    renderWallet();
    renderInfo();
  } catch (err) {
    showResult(err.message, true);
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
  const btn = document.getElementById('btn-send');

  if (!to || isNaN(amount)) {
    showResult('Please fill in address and amount', true);
    return;
  }

  if (!unlockedPrivateKey) {
    showResult('Unlock your wallet first (click \uD83D\uDD12)', true);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Signing...';

  const result = await sendWarps(to, amount, memo || undefined);

  if (result.success) {
    showResult(`Sent ${amount} \u03A9 via CosmoMesh!`, false);
    document.getElementById('s-to').value = '';
    document.getElementById('s-amount').value = '';
    document.getElementById('s-memo').value = '';
    renderWallet();
  } else {
    showResult(result.error, true);
  }

  btn.disabled = false;
  btn.textContent = '\u26A1 Send Transaction';
});

// Lock/Unlock toggle
document.getElementById('btn-lock')?.addEventListener('click', async () => {
  if (unlockedPrivateKey) {
    lockWallet();
    renderWallet();
    showResult('Wallet locked', false);
  } else {
    const password = prompt('Enter your wallet password:');
    if (!password) return;
    try {
      await unlockWallet(password);
      renderWallet();
      showResult('Wallet unlocked', false);
    } catch {
      showResult('Wrong password', true);
    }
  }
});

// Export
document.getElementById('btn-export')?.addEventListener('click', () => {
  const data = getExportData();
  if (data) {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showResult('Wallet export copied to clipboard', false);
  }
});

// Import
document.getElementById('btn-import')?.addEventListener('click', async () => {
  const jsonStr = prompt('Paste your wallet export JSON:');
  if (!jsonStr) return;
  const password = prompt('Enter the wallet password:');
  if (!password) return;
  try {
    await importFromData(JSON.parse(jsonStr), password);
    renderWallet();
    renderInfo();
    showResult('Wallet imported!', false);
  } catch (err) {
    showResult(err.message || 'Import failed', true);
  }
});

// ─── Init ───────────────────────────────────────────────

(async () => {
  await loadWallet();
  renderWallet();
  renderInfo();
})();
