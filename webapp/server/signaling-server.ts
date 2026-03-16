/**
 * Strangrz Signaling Server — WebSocket Relay for WebRTC Peer Discovery
 *
 * Production-ready signaling relay that enables CosmoP2P nodes to discover
 * each other across different machines/networks.
 *
 * Usage:
 *   npx ts-node server/signaling-server.ts
 *   # or
 *   SIGNALING_PORT=8787 node server/signaling-server.js
 *
 * Clients connect via:
 *   ws://localhost:8787  (dev)
 *   wss://signal.strangrz.com  (prod — deploy behind nginx/caddy with TLS)
 *
 * Protocol:
 *   - Client sends JSON messages: { type, senderId, targetId?, payload, timestamp }
 *   - Server relays messages to the target peer (unicast) or all peers (broadcast)
 *   - Server tracks connected peers and removes stale ones after timeout
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

// ─── Config ───────────────────────────────────────────────

const PORT = parseInt(process.env.SIGNALING_PORT || '8787', 10);
const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_PEER_TIMEOUT_MS = 90_000;
const MAX_PEERS = 10_000;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB max message
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'https://strangrz.com').split(',').map(s => s.trim());
const PEERS_API_KEY = process.env.PEERS_API_KEY; // Optional: protect /peers endpoint

// ─── Types ────────────────────────────────────────────────

interface SignalingMessage {
  type: 'announce' | 'offer' | 'answer' | 'ice-candidate' | 'leave' | 'peer-list';
  senderId: string;
  targetId?: string;
  payload: unknown;
  timestamp: number;
}

interface ConnectedPeer {
  id: string;
  address: string;
  ws: WebSocket;
  lastSeen: number;
  connectedAt: number;
}

// ─── State ────────────────────────────────────────────────

const peers = new Map<string, ConnectedPeer>();
let totalConnectionsServed = 0;
let totalMessagesRelayed = 0;

// ─── HTTP Health Check ────────────────────────────────────

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      peers: peers.size,
      totalConnectionsServed,
      totalMessagesRelayed,
      uptime: process.uptime(),
    }));
    return;
  }

  if (req.url === '/peers') {
    // Protect peer list with optional API key
    if (PEERS_API_KEY && req.headers['x-api-key'] !== PEERS_API_KEY) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Only expose peer count and anonymized IDs (not wallet addresses)
    res.end(JSON.stringify({
      count: peers.size,
      peers: Array.from(peers.values()).map(p => ({
        id: p.id.slice(0, 8) + '...',
        connectedAt: p.connectedAt,
        lastSeen: p.lastSeen,
      })),
    }));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Strangrz Signaling Server\n');
});

// ─── WebSocket Server ─────────────────────────────────────

const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: MAX_MESSAGE_SIZE,
});

wss.on('connection', (ws: WebSocket, req) => {
  const remoteIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let peerId: string | null = null;

  // Origin validation: reject connections from unauthorized origins
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes('*') && !ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  totalConnectionsServed++;

  // Rate limit: max MAX_PEERS concurrent connections
  if (peers.size >= MAX_PEERS) {
    ws.close(1013, 'Server at capacity');
    return;
  }

  ws.on('message', (rawData: Buffer) => {
    let msg: SignalingMessage;
    try {
      msg = JSON.parse(rawData.toString('utf-8'));
    } catch {
      return; // Invalid JSON — ignore
    }

    // Validate message structure
    if (!msg.type || !msg.senderId || typeof msg.senderId !== 'string') return;
    if (msg.senderId.length > 64) return; // Sanity check

    // Register peer on first message
    if (!peerId) {
      peerId = msg.senderId;

      // If a peer with this ID already exists, disconnect the old one
      const existing = peers.get(peerId);
      if (existing && existing.ws !== ws) {
        existing.ws.close(1000, 'Replaced by new connection');
        peers.delete(peerId);
      }

      const peerAddress = (msg.payload as { address?: string })?.address || '';
      peers.set(peerId, {
        id: peerId,
        address: peerAddress,
        ws,
        lastSeen: Date.now(),
        connectedAt: Date.now(),
      });

      console.log(`[Signal] Peer ${peerId.slice(0, 8)}... connected from ${remoteIp} (${peers.size} total)`);
    }

    // Update last seen
    const peer = peers.get(peerId);
    if (peer) peer.lastSeen = Date.now();

    totalMessagesRelayed++;

    // Route message
    switch (msg.type) {
      case 'announce': {
        // Broadcast announce to all other peers
        broadcastExcept(peerId, msg);

        // Send the new peer a list of existing peers
        const peerList: SignalingMessage = {
          type: 'peer-list',
          senderId: 'server',
          payload: Array.from(peers.keys()).filter(id => id !== peerId),
          timestamp: Date.now(),
        };
        sendTo(ws, peerList);
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        // Unicast to the target peer
        if (msg.targetId) {
          const target = peers.get(msg.targetId);
          if (target) {
            sendTo(target.ws, msg);
          }
        } else {
          // Broadcast if no specific target
          broadcastExcept(peerId, msg);
        }
        break;
      }

      case 'leave': {
        if (peerId) {
          peers.delete(peerId);
          broadcastExcept(peerId, msg);
          console.log(`[Signal] Peer ${peerId.slice(0, 8)}... left (${peers.size} remaining)`);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      // Notify remaining peers
      broadcastExcept(peerId, {
        type: 'leave',
        senderId: peerId,
        payload: null,
        timestamp: Date.now(),
      });
      console.log(`[Signal] Peer ${peerId.slice(0, 8)}... disconnected (${peers.size} remaining)`);
    }
  });

  ws.on('error', (err) => {
    console.error(`[Signal] WebSocket error for peer ${peerId?.slice(0, 8) || 'unknown'}:`, err.message);
  });
});

// ─── Helpers ──────────────────────────────────────────────

function sendTo(ws: WebSocket, msg: SignalingMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastExcept(excludeId: string, msg: SignalingMessage): void {
  const data = JSON.stringify(msg);
  for (const [id, peer] of peers) {
    if (id !== excludeId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(data);
    }
  }
}

// ─── Heartbeat / Stale Peer Cleanup ──────────────────────

setInterval(() => {
  const now = Date.now();
  for (const [id, peer] of peers) {
    if (now - peer.lastSeen > STALE_PEER_TIMEOUT_MS) {
      console.log(`[Signal] Removing stale peer ${id.slice(0, 8)}...`);
      peer.ws.close(1000, 'Stale');
      peers.delete(id);
    }
  }
}, HEARTBEAT_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────┐
│  Strangrz Signaling Server                 │
│  WebSocket: ws://0.0.0.0:${PORT}              │
│  Health:    http://0.0.0.0:${PORT}/health      │
│  Peers:    http://0.0.0.0:${PORT}/peers        │
│                                             │
│  Deploy behind nginx/caddy with TLS for     │
│  wss:// in production.                      │
└─────────────────────────────────────────────┘
  `);
});

export { wss, httpServer };
