/**
 * Strangrz Mesh Network — Integration Layer
 *
 * Wires together all P2P components:
 * - CosmoP2P (WebRTC mesh)
 * - StrangrzMesh (DAG gossip protocol)
 * - SignalingManager (BroadcastChannel + Supabase Realtime + WebSocket)
 * - DiscoveryService (Supabase Presence)
 *
 * This is the single entry point for starting/stopping the P2P network.
 * It bridges gossip messages from StrangrzMesh through CosmoP2P and
 * uses DiscoveryService to find new peers to connect to.
 */

import { CosmoP2P, type P2PEventHandlers } from './p2p';
import type { StrangrzMesh, MeshTransaction, GossipMessage } from './strangrmesh';
import { DiscoveryService } from './discovery';

// ─── Config ──────────────────────────────────────────────

const SIGNALING_SERVER_URL = typeof window !== 'undefined'
  ? ((window as unknown as Record<string, string>).STRANGRZ_SIGNALING_URL || '')
  : '';

// Tip sync interval: periodically broadcast DAG tips for consistency
const TIP_SYNC_INTERVAL_MS = 30_000;
// Mesh summary interval: periodically broadcast mesh state for discovery
const MESH_SUMMARY_INTERVAL_MS = 60_000;
// Discovery-driven connection interval: try connecting to newly discovered peers
const DISCOVERY_CONNECT_INTERVAL_MS = 15_000;

// ─── Mesh Network ────────────────────────────────────────

export interface MeshNetworkStatus {
  p2p: {
    localId: string;
    localAddress: string;
    connectedPeers: number;
    totalPeers: number;
  };
  discovery: {
    active: boolean;
    connected: boolean;
    discoveredPeers: number;
  };
  signaling: {
    local: boolean;
    supabase: boolean;
    websocket: boolean;
  };
  gossip: {
    attached: boolean;
    meshTxCount: number;
  };
}

export class MeshNetwork {
  private p2p: CosmoP2P;
  private mesh: StrangrzMesh;
  private discovery: DiscoveryService | null = null;
  private running: boolean = false;

  private tipSyncTimer: ReturnType<typeof setInterval> | null = null;
  private meshSummaryTimer: ReturnType<typeof setInterval> | null = null;
  private discoveryConnectTimer: ReturnType<typeof setInterval> | null = null;

  constructor(mesh: StrangrzMesh, address: string) {
    this.mesh = mesh;
    this.p2p = new CosmoP2P(address);
  }

  /** Start the full mesh network (P2P + signaling + discovery + gossip) */
  start(handlers?: Partial<P2PEventHandlers>): void {
    if (this.running) return;
    this.running = true;

    // 1. Start P2P with event handlers
    const p2pHandlers: P2PEventHandlers = {
      ...handlers,
      onMeshGossip: (gossipMsg: GossipMessage, fromPeerId: string) => {
        this.mesh.handleGossipMessage(gossipMsg, fromPeerId);
      },
      onTransactionReceived: (tx: MeshTransaction) => {
        handlers?.onTransactionReceived?.(tx);
      },
      onPeerConnected: (peer) => {
        // Update discovery with current peer count
        this.discovery?.updatePeerCount(this.p2p.getConnectedPeerCount());
        // Broadcast mesh summary to new peer for sync
        this.mesh.broadcastMeshSummary();
        handlers?.onPeerConnected?.(peer);
      },
      onPeerDisconnected: (peerId) => {
        this.discovery?.updatePeerCount(this.p2p.getConnectedPeerCount());
        handlers?.onPeerDisconnected?.(peerId);
      },
    };

    this.p2p.start(p2pHandlers);

    // 2. Attach mesh gossip to P2P
    const gossipHandler = this.p2p.createMeshGossipHandler();
    this.mesh.attachGossip(this.p2p.getLocalId(), gossipHandler);

    // 3. Listen for remote TXs applied in the mesh
    this.mesh.onRemoteTx((tx) => {
      handlers?.onTransactionReceived?.(tx);
    });

    // 4. Start signaling (BroadcastChannel + Supabase + optional WebSocket)
    this.p2p.connectViaSignaling(SIGNALING_SERVER_URL || undefined);

    // 5. Start discovery service
    this.discovery = new DiscoveryService(
      this.p2p.getLocalId(),
      this.p2p.getLocalAddress(),
    );
    this.discovery.start({
      onPeerJoined: (peer) => {
        console.log(`[MeshNetwork] Discovered peer: ${peer.peerId.slice(0, 8)}... (${peer.meshStats.txCount} txs)`);
      },
      onPeerLeft: (peerId) => {
        console.log(`[MeshNetwork] Peer left discovery: ${peerId.slice(0, 8)}...`);
      },
    });

    // 6. Periodic tip sync
    this.tipSyncTimer = setInterval(() => {
      if (this.p2p.getConnectedPeerCount() > 0) {
        this.mesh.broadcastTips();
      }
    }, TIP_SYNC_INTERVAL_MS);

    // 7. Periodic mesh summary broadcast
    this.meshSummaryTimer = setInterval(() => {
      this.updateDiscoveryStats();
      if (this.p2p.getConnectedPeerCount() > 0) {
        this.mesh.broadcastMeshSummary();
      }
    }, MESH_SUMMARY_INTERVAL_MS);

    // 8. Periodically try to connect to discovered peers via signaling
    this.discoveryConnectTimer = setInterval(() => {
      this.connectToDiscoveredPeers();
    }, DISCOVERY_CONNECT_INTERVAL_MS);

    console.log('[MeshNetwork] Started — P2P + Signaling + Discovery + Gossip');
  }

  /** Stop the entire mesh network */
  stop(): void {
    this.running = false;

    if (this.tipSyncTimer) { clearInterval(this.tipSyncTimer); this.tipSyncTimer = null; }
    if (this.meshSummaryTimer) { clearInterval(this.meshSummaryTimer); this.meshSummaryTimer = null; }
    if (this.discoveryConnectTimer) { clearInterval(this.discoveryConnectTimer); this.discoveryConnectTimer = null; }

    this.mesh.detachGossip();
    this.discovery?.stop();
    this.discovery = null;
    this.p2p.stop();

    console.log('[MeshNetwork] Stopped');
  }

  // ─── Accessors ─────────────────────────────────────────

  getP2P(): CosmoP2P { return this.p2p; }
  getDiscovery(): DiscoveryService | null { return this.discovery; }
  get isRunning(): boolean { return this.running; }

  getStatus(): MeshNetworkStatus {
    const stats = this.p2p.getNetworkStats();
    const sigStatus = this.p2p.getSignalingStatus();
    const meshStats = this.mesh.getStats();

    return {
      p2p: {
        localId: stats.localId,
        localAddress: stats.localAddress,
        connectedPeers: stats.connectedPeers,
        totalPeers: stats.totalPeers,
      },
      discovery: {
        active: this.discovery?.isActive ?? false,
        connected: this.discovery?.isConnected ?? false,
        discoveredPeers: this.discovery?.peerCount ?? 0,
      },
      signaling: {
        local: sigStatus?.local?.active ?? false,
        supabase: sigStatus?.remote?.connected ?? false,
        websocket: sigStatus?.websocket?.connected ?? false,
      },
      gossip: {
        attached: true,
        meshTxCount: meshStats.totalTransactions,
      },
    };
  }

  // ─── Internal ──────────────────────────────────────────

  private updateDiscoveryStats(): void {
    if (!this.discovery) return;

    const stats = this.mesh.getStats();
    this.discovery.updateMeshStats(
      stats.totalTransactions,
      stats.totalTips,
      stats.maxDepth,
    );
    this.discovery.updatePeerCount(this.p2p.getConnectedPeerCount());
  }

  private connectToDiscoveredPeers(): void {
    if (!this.discovery) return;

    const available = this.discovery.getAvailablePeers();
    const connectedIds = new Set(this.p2p.getPeers().map(p => p.id));
    const maxNewConnections = 3; // Don't spam connections
    let connected = 0;

    for (const peer of available) {
      if (connected >= maxNewConnections) break;
      if (connectedIds.has(peer.peerId)) continue;

      // The signaling layer handles the actual WebRTC connection
      // Discovery just tells us who is available — signaling connects them
      // The announce cycle in signaling will pick up discovered peers
      connected++;
    }
  }
}
