/**
 * Strangrz Signaling — WebRTC Peer Discovery
 *
 * Two complementary signaling channels for WebRTC peer discovery:
 *
 * 1. LocalSignaling (BroadcastChannel API)
 *    - Discovers peers across browser tabs on the same origin
 *    - No server required — uses the browser's built-in BroadcastChannel API
 *    - Perfect for multi-node testing: open 3 tabs = 3 independent nodes
 *    - REAL cross-tab P2P communication, not a mock
 *
 * 2. RemoteSignaling (Supabase Realtime Broadcast)
 *    - Uses Supabase Realtime Channels for remote peer discovery
 *    - No custom WebSocket server needed — runs on Supabase free tier
 *    - Auto-reconnect handled by Supabase client
 *    - Serverless-compatible (works with Vercel)
 *
 * 3. SignalingManager
 *    - Orchestrates both local and remote signaling
 *    - Always enables BroadcastChannel (cross-tab)
 *    - Auto-connects to Supabase Realtime if backend is available
 */

import type { CosmoP2P, SignalData } from './p2p';
import { supabase, isBackendAvailable } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

const LOCAL_CHANNEL_NAME = 'strangrz-signaling';

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

// ─── RemoteSignaling (Supabase Realtime Broadcast) ───────

const SUPABASE_SIGNAL_CHANNEL = 'strangrz-signaling';

export class RemoteSignaling {
  private channel: RealtimeChannel | null = null;
  private localId: string;
  private p2p: CosmoP2P;
  private active: boolean = false;
  private connected: boolean = false;
  private announceInterval: ReturnType<typeof setInterval> | null = null;

  constructor(_serverUrl: string, localId: string, p2p: CosmoP2P) {
    this.localId = localId;
    this.p2p = p2p;
  }

  start(): void {
    if (this.active) return;
    if (!isBackendAvailable() || !supabase) {
      console.warn('[RemoteSignaling] Supabase not available — remote signaling disabled');
      return;
    }

    this.active = true;

    this.channel = supabase.channel(SUPABASE_SIGNAL_CHANNEL, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'signal' }, (payload) => {
        const msg = payload.payload as SignalingMessage;
        this.handleMessage(msg);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connected = true;
          console.log('[RemoteSignaling] Connected via Supabase Realtime');
          this.announce();
          this.announceInterval = setInterval(() => this.announce(), 5000);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.connected = false;
        }
      });
  }

  stop(): void {
    this.active = false;
    this.connected = false;
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
    if (this.channel) {
      this.broadcast({
        type: 'leave',
        senderId: this.localId,
        payload: null,
        timestamp: Date.now(),
      });
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get attempts(): number {
    return 0;
  }

  get url(): string {
    return 'supabase-realtime';
  }

  private announce(): void {
    this.broadcast({
      type: 'announce',
      senderId: this.localId,
      payload: { address: this.p2p.getLocalAddress() },
      timestamp: Date.now(),
    });
  }

  private async handleMessage(msg: SignalingMessage): Promise<void> {
    if (msg.senderId === this.localId) return;

    switch (msg.type) {
      case 'announce': {
        if (this.localId < msg.senderId) {
          try {
            const offer = await this.p2p.createOffer();
            this.broadcast({
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
          this.broadcast({
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

  private broadcast(msg: SignalingMessage): void {
    if (this.channel && this.connected) {
      this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: msg,
      });
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

    // Auto-connect to Supabase Realtime if backend is available
    if (signalingServerUrl || isBackendAvailable()) {
      this.remote = new RemoteSignaling(signalingServerUrl || 'supabase', this.localId, p2p);
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

  /** Connect to remote signaling (uses Supabase Realtime) */
  connectRemote(serverUrl: string): void {
    this.remote?.stop();
    this.remote = new RemoteSignaling(serverUrl, this.localId, this.p2p);
    this.remote.start();
  }

  /** Disconnect from remote signaling */
  disconnectRemote(): void {
    this.remote?.stop();
    this.remote = null;
  }
}
