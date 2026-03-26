/**
 * Strangrz Discovery Service — Peer Registry via Supabase
 *
 * Uses Supabase Realtime Presence to enable mesh nodes to discover each other.
 * Each node registers its presence with metadata (address, capabilities, mesh stats)
 * and discovers other active nodes in the network.
 *
 * Architecture:
 * - Supabase Realtime Presence for live peer tracking (no extra DB table needed)
 * - Heartbeat-based: peers auto-expire when they disconnect
 * - Capability-based discovery: nodes advertise what layers they validate
 * - Region hints for latency-aware peer selection
 *
 * Integration:
 * - Works alongside BroadcastChannel (same-origin tabs) and WebSocket signaling
 * - Provides the "phone book" layer: who's online? what do they validate?
 * - CosmoP2P uses discovered peers to initiate WebRTC connections via signaling
 */

import { supabase, isBackendAvailable } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MeshLayer } from './strangrmesh';

// ─── Types ────────────────────────────────────────────────

export interface PeerPresence {
  peerId: string;
  address: string;
  joinedAt: number;
  lastSeen: number;
  meshStats: {
    txCount: number;
    tipCount: number;
    maxDepth: number;
  };
  capabilities: {
    layers: MeshLayer[];     // Which mesh layers this peer validates
    maxPeers: number;        // How many peer connections this node can handle
    currentPeers: number;    // Current connected peers
  };
  version: string;           // Protocol version for compatibility
}

export interface DiscoveryEvents {
  onPeerJoined?: (peer: PeerPresence) => void;
  onPeerLeft?: (peerId: string) => void;
  onPeerUpdated?: (peer: PeerPresence) => void;
  onPeerListChanged?: (peers: PeerPresence[]) => void;
}

// ─── Discovery Service ───────────────────────────────────

const DISCOVERY_CHANNEL = 'strangrz-mesh-discovery';
const PRESENCE_UPDATE_INTERVAL_MS = 10_000; // Update presence every 10s
const PROTOCOL_VERSION = '2.0';

export class DiscoveryService {
  private channel: RealtimeChannel | null = null;
  private localPeerId: string;
  private localAddress: string;
  private active: boolean = false;
  private connected: boolean = false;
  private events: DiscoveryEvents = {};
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private discoveredPeers: Map<string, PeerPresence> = new Map();

  // Current local state (updated externally)
  private meshTxCount: number = 0;
  private meshTipCount: number = 0;
  private meshMaxDepth: number = 0;
  private activeLayers: MeshLayer[] = [0, 1, 2]; // Default: GRID, HELIX, GLYPH
  private maxPeers: number = 20;
  private currentPeers: number = 0;

  constructor(peerId: string, address: string) {
    this.localPeerId = peerId;
    this.localAddress = address;
  }

  /** Start the discovery service */
  start(events?: DiscoveryEvents): void {
    if (this.active) return;
    if (!isBackendAvailable() || !supabase) {
      console.warn('[Discovery] Supabase not available — discovery disabled');
      return;
    }

    this.active = true;
    if (events) this.events = events;

    this.channel = supabase.channel(DISCOVERY_CHANNEL, {
      config: {
        presence: { key: this.localPeerId },
      },
    });

    // Track presence joins
    this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      for (const presence of newPresences) {
        const peer = presence as unknown as PeerPresence;
        if (peer.peerId === this.localPeerId) continue;

        this.discoveredPeers.set(peer.peerId, peer);
        this.events.onPeerJoined?.(peer);
      }
      this.events.onPeerListChanged?.(this.getActivePeers());
    });

    // Track presence leaves
    this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const presence of leftPresences) {
        const peer = presence as unknown as PeerPresence;
        this.discoveredPeers.delete(peer.peerId);
        this.events.onPeerLeft?.(peer.peerId);
      }
      this.events.onPeerListChanged?.(this.getActivePeers());
    });

    // Track presence syncs (initial state)
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel?.presenceState() ?? {};
      this.discoveredPeers.clear();

      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          const peer = presence as unknown as PeerPresence;
          if (peer.peerId === this.localPeerId) continue;
          this.discoveredPeers.set(peer.peerId, peer);
        }
      }
      this.events.onPeerListChanged?.(this.getActivePeers());
    });

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.connected = true;
        console.log('[Discovery] Connected — tracking presence');

        // Announce our presence
        await this.trackPresence();

        // Periodically update presence with fresh mesh stats
        this.updateInterval = setInterval(() => {
          this.trackPresence();
        }, PRESENCE_UPDATE_INTERVAL_MS);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.connected = false;
      }
    });
  }

  /** Stop the discovery service */
  stop(): void {
    this.active = false;
    this.connected = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.channel) {
      this.channel.untrack();
      supabase?.removeChannel(this.channel);
      this.channel = null;
    }

    this.discoveredPeers.clear();
  }

  // ─── State Updates ──────────────────────────────────────

  /** Update local mesh stats (called from wallet/mesh engine) */
  updateMeshStats(txCount: number, tipCount: number, maxDepth: number): void {
    this.meshTxCount = txCount;
    this.meshTipCount = tipCount;
    this.meshMaxDepth = maxDepth;
  }

  /** Update peer connection count */
  updatePeerCount(current: number): void {
    this.currentPeers = current;
  }

  /** Update which layers this node validates */
  updateActiveLayers(layers: MeshLayer[]): void {
    this.activeLayers = layers;
  }

  // ─── Queries ────────────────────────────────────────────

  /** Get all currently discovered peers */
  getActivePeers(): PeerPresence[] {
    return Array.from(this.discoveredPeers.values());
  }

  /** Get peers that validate a specific layer */
  getPeersByLayer(layer: MeshLayer): PeerPresence[] {
    return this.getActivePeers().filter(p =>
      p.capabilities.layers.includes(layer)
    );
  }

  /** Get peers with available connection slots */
  getAvailablePeers(): PeerPresence[] {
    return this.getActivePeers().filter(p =>
      p.capabilities.currentPeers < p.capabilities.maxPeers
    );
  }

  /** Get peers sorted by mesh depth (prefer peers with more data for sync) */
  getPeersForSync(): PeerPresence[] {
    return this.getActivePeers()
      .filter(p => p.meshStats.txCount > 0)
      .sort((a, b) => b.meshStats.txCount - a.meshStats.txCount);
  }

  /** Get the total number of discovered peers */
  get peerCount(): number {
    return this.discoveredPeers.size;
  }

  get isActive(): boolean { return this.active; }
  get isConnected(): boolean { return this.connected; }

  // ─── Internal ──────────────────────────────────────────

  private async trackPresence(): Promise<void> {
    if (!this.channel || !this.connected) return;

    const presence: PeerPresence = {
      peerId: this.localPeerId,
      address: this.localAddress,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      meshStats: {
        txCount: this.meshTxCount,
        tipCount: this.meshTipCount,
        maxDepth: this.meshMaxDepth,
      },
      capabilities: {
        layers: this.activeLayers,
        maxPeers: this.maxPeers,
        currentPeers: this.currentPeers,
      },
      version: PROTOCOL_VERSION,
    };

    await this.channel.track(presence as unknown as Record<string, unknown>);
  }
}
