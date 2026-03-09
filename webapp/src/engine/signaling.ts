/**
 * Cosmorare Signaling — WebRTC Peer Discovery
 *
 * Two complementary signaling channels for WebRTC peer discovery:
 *
 * 1. LocalSignaling (BroadcastChannel API)
 *    - Discovers peers across browser tabs on the same origin
 *    - No server required — uses the browser's built-in BroadcastChannel API
 *    - Perfect for multi-node testing: open 3 tabs = 3 independent nodes
 *    - REAL cross-tab P2P communication, not a mock
 *
 * 2. RemoteSignaling (WebSocket client)
 *    - Connects to a WebSocket signaling relay server
 *    - For remote peer discovery across different machines
 *    - Auto-reconnect with exponential backoff
 *    - Ready to use when a signaling server is deployed
 *
 * 3. SignalingManager
 *    - Orchestrates both local and remote signaling
 *    - Always enables BroadcastChannel (cross-tab)
 *    - Optionally connects to remote signaling server
 */

import type { CosmoP2P, SignalData } from './p2p';

// ─── Types ───────────────────────────────────────────────

export interface SignalingStatus {
  local: {
    active: boolean;
    peersDiscovered: number;
  };
  remote: {
    active: boolean;
    connected: boolean;
    serverUrl: string | null;
    reconnectAttempts: number;
  };
}

interface SignalingMessage {
  type: 'announce' | 'offer' | 'answer' | 'ice-candidate' | 'leave';
  senderId: string;
  targetId?: string;
  payload: unknown;
  timestamp: number;
}

// ─── LocalSignaling (BroadcastChannel) ───────────────────

const LOCAL_CHANNEL_NAME = 'cosmorare-signaling';

export class LocalSignaling {
  private channel: BroadcastChannel | null = null;
  private localId: string;
  private p2p: CosmoP2P;
  private knownPeers: Set<string> = new Set();
  private pendingOffers: Map<string, boolean> = new Map(); // peerId -> true if we initiated
  private active: boolean = false;
  private announceInterval: ReturnType<typeof setInterval> | null = null;

  constructor(localId: string, p2p: CosmoP2P) {
    this.localId = localId;
    this.p2p = p2p;
  }

  start(): void {
    if (this.active) return;
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[LocalSignaling] BroadcastChannel API not available');
      return;
    }

    this.channel = new BroadcastChannel(LOCAL_CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as SignalingMessage);
    };
    this.active = true;

    // Announce presence immediately and periodically
    this.announce();
    this.announceInterval = setInterval(() => this.announce(), 5000);
  }

  stop(): void {
    this.active = false;
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
    if (this.channel) {
      // Notify peers we're leaving
      this.send({
        type: 'leave',
        senderId: this.localId,
        payload: null,
        timestamp: Date.now(),
      });
      this.channel.close();
      this.channel = null;
    }
    this.knownPeers.clear();
    this.pendingOffers.clear();
  }

  get peersDiscovered(): number {
    return this.knownPeers.size;
  }

  get isActive(): boolean {
    return this.active;
  }

  private announce(): void {
    this.send({
      type: 'announce',
      senderId: this.localId,
      payload: { address: this.p2p.getLocalAddress() },
      timestamp: Date.now(),
    });
  }

  private async handleMessage(msg: SignalingMessage): Promise<void> {
    // Ignore our own messages
    if (msg.senderId === this.localId) return;

    switch (msg.type) {
      case 'announce':
        await this.handleAnnounce(msg);
        break;

      case 'offer':
        await this.handleOffer(msg);
        break;

      case 'answer':
        await this.handleAnswer(msg);
        break;

      case 'leave':
        this.knownPeers.delete(msg.senderId);
        this.pendingOffers.delete(msg.senderId);
        break;
    }
  }

  private async handleAnnounce(msg: SignalingMessage): Promise<void> {
    const peerId = msg.senderId;

    // Already connected or connecting to this peer
    if (this.knownPeers.has(peerId)) return;
    if (this.pendingOffers.has(peerId)) return;

    this.knownPeers.add(peerId);

    // Deterministic initiator: the peer with the "lower" ID creates the offer.
    // This prevents both sides from simultaneously creating offers.
    if (this.localId < peerId) {
      await this.initiateConnection(peerId);
    }
    // If our ID is higher, we wait for the other peer to send us an offer.
  }

  private async initiateConnection(targetPeerId: string): Promise<void> {
    if (this.pendingOffers.has(targetPeerId)) return;
    this.pendingOffers.set(targetPeerId, true);

    try {
      const offer = await this.p2p.createOffer();
      this.send({
        type: 'offer',
        senderId: this.localId,
        targetId: targetPeerId,
        payload: offer,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[LocalSignaling] Failed to create offer:', err);
      this.pendingOffers.delete(targetPeerId);
    }
  }

  private async handleOffer(msg: SignalingMessage): Promise<void> {
    // Only accept offers addressed to us (or broadcast offers)
    if (msg.targetId && msg.targetId !== this.localId) return;

    try {
      const offer = msg.payload as SignalData;
      const answer = await this.p2p.acceptOffer(offer);
      this.send({
        type: 'answer',
        senderId: this.localId,
        targetId: msg.senderId,
        payload: answer,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[LocalSignaling] Failed to accept offer:', err);
    }
  }

  private async handleAnswer(msg: SignalingMessage): Promise<void> {
    // Only accept answers addressed to us
    if (msg.targetId && msg.targetId !== this.localId) return;

    try {
      const answer = msg.payload as SignalData;
      await this.p2p.completeConnection(answer);
      this.pendingOffers.delete(msg.senderId);
    } catch (err) {
      console.error('[LocalSignaling] Failed to complete connection:', err);
      this.pendingOffers.delete(msg.senderId);
    }
  }

  private send(msg: SignalingMessage): void {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }
}

// ─── RemoteSignaling (WebSocket Client) ──────────────────

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const RECONNECT_BACKOFF_MULTIPLIER = 2;

export class RemoteSignaling {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private localId: string;
  private p2p: CosmoP2P;
  private active: boolean = false;
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectDelay: number = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(serverUrl: string, localId: string, p2p: CosmoP2P) {
    this.serverUrl = serverUrl;
    this.localId = localId;
    this.p2p = p2p;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.connect();
  }

  stop(): void {
    this.active = false;
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Send leave message before closing
      this.sendToServer({
        type: 'leave',
        senderId: this.localId,
        payload: null,
        timestamp: Date.now(),
      });
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get attempts(): number {
    return this.reconnectAttempts;
  }

  get url(): string {
    return this.serverUrl;
  }

  private connect(): void {
    if (!this.active) return;

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
        console.log(`[RemoteSignaling] Connected to ${this.serverUrl}`);

        // Announce to the signaling server
        this.sendToServer({
          type: 'announce',
          senderId: this.localId,
          payload: { address: this.p2p.getLocalAddress() },
          timestamp: Date.now(),
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as SignalingMessage;
          this.handleMessage(msg);
        } catch (err) {
          console.error('[RemoteSignaling] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('[RemoteSignaling] Disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[RemoteSignaling] WebSocket error:', err);
        // onclose will fire after onerror, triggering reconnect
      };
    } catch (err) {
      console.error('[RemoteSignaling] Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.active) return;

    this.reconnectAttempts++;
    console.log(
      `[RemoteSignaling] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_BACKOFF_MULTIPLIER,
      MAX_RECONNECT_DELAY_MS
    );
  }

  private async handleMessage(msg: SignalingMessage): Promise<void> {
    if (msg.senderId === this.localId) return;

    switch (msg.type) {
      case 'announce': {
        // Another peer announced — if our ID is lower, we initiate
        if (this.localId < msg.senderId) {
          try {
            const offer = await this.p2p.createOffer();
            this.sendToServer({
              type: 'offer',
              senderId: this.localId,
              targetId: msg.senderId,
              payload: offer,
              timestamp: Date.now(),
            });
          } catch (err) {
            console.error('[RemoteSignaling] Failed to create offer:', err);
          }
        }
        break;
      }

      case 'offer': {
        if (msg.targetId && msg.targetId !== this.localId) return;
        try {
          const offer = msg.payload as SignalData;
          const answer = await this.p2p.acceptOffer(offer);
          this.sendToServer({
            type: 'answer',
            senderId: this.localId,
            targetId: msg.senderId,
            payload: answer,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('[RemoteSignaling] Failed to accept offer:', err);
        }
        break;
      }

      case 'answer': {
        if (msg.targetId && msg.targetId !== this.localId) return;
        try {
          const answer = msg.payload as SignalData;
          await this.p2p.completeConnection(answer);
        } catch (err) {
          console.error('[RemoteSignaling] Failed to complete connection:', err);
        }
        break;
      }
    }
  }

  private sendToServer(msg: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

// ─── SignalingManager ────────────────────────────────────

export class SignalingManager {
  private local: LocalSignaling;
  private remote: RemoteSignaling | null = null;
  private p2p: CosmoP2P;
  private localId: string;

  constructor(p2p: CosmoP2P, signalingServerUrl?: string) {
    this.p2p = p2p;
    this.localId = p2p.getLocalId();

    // Always set up local (BroadcastChannel) signaling
    this.local = new LocalSignaling(this.localId, p2p);

    // Optionally set up remote (WebSocket) signaling
    if (signalingServerUrl) {
      this.remote = new RemoteSignaling(signalingServerUrl, this.localId, p2p);
    }
  }

  /** Start all signaling channels */
  start(): void {
    this.local.start();
    this.remote?.start();
  }

  /** Stop all signaling channels */
  stop(): void {
    this.local.stop();
    this.remote?.stop();
  }

  /** Get status of all signaling channels */
  getStatus(): SignalingStatus {
    return {
      local: {
        active: this.local.isActive,
        peersDiscovered: this.local.peersDiscovered,
      },
      remote: {
        active: this.remote?.isActive ?? false,
        connected: this.remote?.isConnected ?? false,
        serverUrl: this.remote?.url ?? null,
        reconnectAttempts: this.remote?.attempts ?? 0,
      },
    };
  }

  /** Connect to a remote signaling server (can be called after construction) */
  connectRemote(serverUrl: string): void {
    // Stop existing remote signaling if any
    this.remote?.stop();
    this.remote = new RemoteSignaling(serverUrl, this.localId, this.p2p);
    this.remote.start();
  }

  /** Disconnect from remote signaling server */
  disconnectRemote(): void {
    this.remote?.stop();
    this.remote = null;
  }
}
