/**
 * Strangrz P2P — WebRTC Mesh Network
 *
 * Browser-native peer-to-peer networking using WebRTC DataChannels.
 * No server required for data transfer (only signaling).
 *
 * Architecture:
 * - Each peer connects to multiple other peers (mesh topology)
 * - Gossip protocol for transaction propagation
 * - Layer-based routing: transactions for specific layers route to
 *   validators with high affinity for those layers
 * - Automatic peer discovery and connection management
 *
 * Signaling:
 * - For development: manual copy-paste of SDP offers/answers
 * - For production: WebSocket signaling relay
 * - Future: could use WebTorrent-style DHT for fully decentralized signaling
 */

import { randomHex } from './crypto';
import type { MeshTransaction } from './strangrmesh';
import type { ConsensusVote } from './consensus';
import type { ShardBlock, BeaconBlock } from './cosmochain';
import { blockDB, beaconDB } from './chaindb';
import { SignalingManager } from './signaling';

// ─── Peer State ──────────────────────────────────────────

export interface PeerInfo {
  id: string;
  address: string;          // Strangrz address
  connectedAt: number;
  lastSeen: number;
  latencyMs: number;
  messagesReceived: number;
  messagesSent: number;
  state: PeerState;
}

export type PeerState = 'connecting' | 'connected' | 'disconnected' | 'failed';

// ─── Message Types ───────────────────────────────────────

export const MessageType = {
  HANDSHAKE:         'handshake',
  TX_ANNOUNCE:       'tx_announce',
  TX_REQUEST:        'tx_request',
  TX_RESPONSE:       'tx_response',
  VOTE_BROADCAST:    'vote_broadcast',
  PEER_LIST:         'peer_list',
  PING:              'ping',
  PONG:              'pong',
  SYNC_REQUEST:      'sync_request',
  SYNC_RESPONSE:     'sync_response',
  // StrangrzChain block propagation
  SHARD_BLOCK:       'shard_block',
  BEACON_BLOCK:      'beacon_block',
  STRANGRZCODE_SVG:     'strangrzcode_svg',
  // Block/state sync
  BLOCK_SYNC_REQUEST:  'block_sync_request',
  BLOCK_SYNC_RESPONSE: 'block_sync_response',
  STATE_SYNC_REQUEST:  'state_sync_request',
  STATE_SYNC_RESPONSE: 'state_sync_response',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface P2PMessage {
  type: MessageType;
  senderId: string;
  timestamp: number;
  payload: unknown;
  nonce: string;           // Prevent replay attacks
}

// ─── Event Callbacks ─────────────────────────────────────

export interface P2PEventHandlers {
  onPeerConnected?: (peer: PeerInfo) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onTransactionReceived?: (tx: MeshTransaction) => void;
  onVoteReceived?: (vote: ConsensusVote) => void;
  onSyncRequest?: (peerId: string) => void;
  onShardBlockReceived?: (block: ShardBlock) => void;
  onBeaconBlockReceived?: (beacon: BeaconBlock) => void;
  onBlockSyncRequest?: (peerId: string, shard: number, fromHeight: number) => void;
  onStateSyncRequest?: (peerId: string, shard: number) => void;
  onMessage?: (msg: P2PMessage, peerId: string) => void;
}

// ─── Signaling Data ──────────────────────────────────────

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: string;
  peerId: string;
  address: string;
}

// ─── ICE Server Configuration ─────────────────────────────
//
// STUN servers: free, used for NAT discovery (works ~80% of the time)
// TURN servers: relay traffic when direct P2P fails (symmetric NAT, firewalls)
//
// For production, deploy your own TURN server (coturn) or use a service:
//   - Twilio TURN: https://www.twilio.com/stun-turn
//   - Metered TURN: https://www.metered.ca/turn
//   - Cloudflare TURN: https://developers.cloudflare.com/calls/turn/
//
// Set TURN credentials via environment or config:
//   window.STRANGRZ_TURN_URL, STRANGRZ_TURN_USER, STRANGRZ_TURN_CREDENTIAL

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    // Public STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  // Add TURN server if configured (required for ~20% of connections behind symmetric NAT)
  const w = typeof window !== 'undefined' ? (window as unknown as Record<string, string>) : {};
  const turnUrl = w.STRANGRZ_TURN_URL || '';
  const turnUser = w.STRANGRZ_TURN_USER || '';
  const turnCredential = w.STRANGRZ_TURN_CREDENTIAL || '';

  if (turnUrl) {
    servers.push({
      urls: turnUrl, // e.g. 'turn:turn.strangrz.com:3478'
      username: turnUser,
      credential: turnCredential,
    });
    // Also add TURNS (TLS) variant if using standard port
    if (turnUrl.startsWith('turn:')) {
      servers.push({
        urls: turnUrl.replace('turn:', 'turns:').replace(':3478', ':5349'),
        username: turnUser,
        credential: turnCredential,
      });
    }
  }

  return servers;
}

// ─── CosmoP2P Network ───────────────────────────────────

export class CosmoP2P {
  private localId: string;
  private localAddress: string;
  private peers: Map<string, PeerConnection> = new Map();
  private handlers: P2PEventHandlers = {};
  private seenMessages: Set<string> = new Set(); // Dedup gossip
  private isRunning: boolean = false;
  private signalingManager: SignalingManager | null = null;

  constructor(address: string) {
    this.localId = randomHex(16);
    this.localAddress = address;
  }

  // ─── Accessors (used by SignalingManager) ─────────────

  getLocalId(): string {
    return this.localId;
  }

  getLocalAddress(): string {
    return this.localAddress;
  }

  // ─── Lifecycle ───────────────────────────────────────

  start(handlers: P2PEventHandlers): void {
    this.handlers = handlers;
    this.isRunning = true;

    // Start periodic cleanup
    this.cleanupLoop();
  }

  stop(): void {
    this.isRunning = false;
    this.signalingManager?.stop();
    this.signalingManager = null;
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
  }

  // ─── Signaling ──────────────────────────────────────────

  /**
   * Connect via signaling for automatic peer discovery.
   * Always enables BroadcastChannel for cross-tab P2P.
   * Optionally connects to a remote WebSocket signaling server.
   */
  connectViaSignaling(signalingServerUrl?: string): void {
    // Stop existing signaling if any
    this.signalingManager?.stop();
    this.signalingManager = new SignalingManager(this, signalingServerUrl);
    this.signalingManager.start();
  }

  /** Get the current signaling status */
  getSignalingStatus() {
    return this.signalingManager?.getStatus() ?? null;
  }

  // ─── Connection Management ───────────────────────────

  /** Create an offer to connect to a new peer */
  async createOffer(): Promise<SignalData> {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    const dataChannel = pc.createDataChannel('strangrmesh', {
      ordered: true,
    });

    const peerId = randomHex(16);
    const peerConn = new PeerConnection(peerId, pc, dataChannel, this);
    this.peers.set(peerId, peerConn);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await this.waitForIce(pc);

    return {
      type: 'offer',
      sdp: pc.localDescription!.sdp,
      peerId,
      address: this.localAddress,
    };
  }

  /** Accept an offer from a remote peer */
  async acceptOffer(signal: SignalData): Promise<SignalData> {
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    const peerConn = new PeerConnection(signal.peerId, pc, null, this);

    pc.ondatachannel = (event) => {
      peerConn.setDataChannel(event.channel);
      peerConn.peerAddress = signal.address;
      this.onPeerReady(peerConn);
    };

    this.peers.set(signal.peerId, peerConn);

    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: signal.sdp,
    }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await this.waitForIce(pc);

    return {
      type: 'answer',
      sdp: pc.localDescription!.sdp,
      peerId: this.localId,
      address: this.localAddress,
    };
  }

  /** Complete the connection with an answer from the remote peer */
  async completeConnection(signal: SignalData): Promise<void> {
    const peer = this.peers.get(signal.peerId) || Array.from(this.peers.values()).find(
      p => p.state === 'connecting'
    );

    if (!peer) throw new Error('No pending connection found');

    peer.peerAddress = signal.address;

    await peer.rtcConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: signal.sdp,
    }));

    this.onPeerReady(peer);
  }

  // ─── Message Broadcasting ────────────────────────────

  /** Broadcast a new transaction to all peers */
  broadcastTransaction(tx: MeshTransaction): void {
    this.broadcast({
      type: MessageType.TX_ANNOUNCE,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: tx,
      nonce: randomHex(8),
    });
  }

  /** Broadcast a consensus vote to all peers */
  broadcastVote(vote: ConsensusVote): void {
    this.broadcast({
      type: MessageType.VOTE_BROADCAST,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: vote,
      nonce: randomHex(8),
    });
  }

  /** Request missing transactions from peers */
  requestSync(since: number): void {
    this.broadcast({
      type: MessageType.SYNC_REQUEST,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: { since },
      nonce: randomHex(8),
    });
  }

  /** Broadcast a shard block to all peers */
  broadcastBlock(block: ShardBlock): void {
    this.broadcast({
      type: MessageType.SHARD_BLOCK,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: block,
      nonce: randomHex(8),
    });
  }

  /** Broadcast a beacon block to all peers */
  broadcastBeacon(beacon: BeaconBlock): void {
    this.broadcast({
      type: MessageType.BEACON_BLOCK,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: beacon,
      nonce: randomHex(8),
    });
  }

  /** Request block sync from peers for a specific shard starting at a height */
  requestBlockSync(shard: number, fromHeight: number): void {
    this.broadcast({
      type: MessageType.BLOCK_SYNC_REQUEST,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: { shard, fromHeight },
      nonce: randomHex(8),
    });
  }

  /** Send a block sync response to a specific peer */
  sendBlockSyncResponse(peerId: string, blocks: ShardBlock[]): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.state === 'connected') {
      peer.send(JSON.stringify({
        type: MessageType.BLOCK_SYNC_RESPONSE,
        senderId: this.localId,
        timestamp: Date.now(),
        payload: { blocks },
        nonce: randomHex(8),
      }));
    }
  }

  /** Send a state sync response to a specific peer */
  sendStateSyncResponse(peerId: string, shard: number, state: unknown): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.state === 'connected') {
      peer.send(JSON.stringify({
        type: MessageType.STATE_SYNC_RESPONSE,
        senderId: this.localId,
        timestamp: Date.now(),
        payload: { shard, state },
        nonce: randomHex(8),
      }));
    }
  }

  // ─── Internal ────────────────────────────────────────

  private broadcast(msg: P2PMessage): void {
    const msgKey = `${msg.senderId}:${msg.nonce}`;
    this.seenMessages.add(msgKey);

    const data = JSON.stringify(msg);
    for (const peer of this.peers.values()) {
      if (peer.state === 'connected') {
        peer.send(data);
      }
    }
  }

  /** Handle incoming message from a peer */
  handleMessage(data: string, peerId: string): void {
    let msg: P2PMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // Dedup: skip if we've seen this message
    const msgKey = `${msg.senderId}:${msg.nonce}`;
    if (this.seenMessages.has(msgKey)) return;
    this.seenMessages.add(msgKey);

    // Handle by type
    switch (msg.type) {
      case MessageType.TX_ANNOUNCE:
        this.handlers.onTransactionReceived?.(msg.payload as MeshTransaction);
        // Gossip to other peers
        this.gossipForward(data, peerId);
        break;

      case MessageType.VOTE_BROADCAST:
        this.handlers.onVoteReceived?.(msg.payload as ConsensusVote);
        this.gossipForward(data, peerId);
        break;

      case MessageType.PING: {
        const peer = this.peers.get(peerId);
        if (peer) {
          peer.send(JSON.stringify({
            type: MessageType.PONG,
            senderId: this.localId,
            timestamp: Date.now(),
            payload: { pingTimestamp: msg.timestamp },
            nonce: randomHex(8),
          }));
        }
        break;
      }

      case MessageType.PONG: {
        const peer = this.peers.get(peerId);
        if (peer) {
          const pingTs = (msg.payload as { pingTimestamp: number }).pingTimestamp;
          peer.latency = Date.now() - pingTs;
          peer.info.lastSeen = Date.now();
          peer.info.latencyMs = peer.latency;
        }
        break;
      }

      case MessageType.PEER_LIST: {
        // Could use this for peer discovery
        break;
      }

      case MessageType.SYNC_REQUEST:
        this.handlers.onSyncRequest?.(peerId);
        break;

      case MessageType.SHARD_BLOCK: {
        const block = msg.payload as ShardBlock;
        // Validate basic structure before storing
        if (block && typeof block.number === 'number' && typeof block.shard === 'number' && block.hash) {
          // Store in IndexedDB
          blockDB.put({
            key: `${block.shard}:${block.number}`,
            shard: block.shard,
            number: block.number,
            parentHash: block.parentHash,
            stateRoot: block.stateRoot,
            transactionsRoot: block.transactionsRoot,
            timestamp: block.timestamp,
            validator: block.validator,
            hash: block.hash,
            txCount: block.txCount,
            processingTimeMs: block.processingTimeMs,
            strangrzCodeSVG: block.strangrzCodeSVG,
            rawSize: JSON.stringify(block).length,
            compressedSize: block.strangrzCodeSVG?.length ?? JSON.stringify(block).length,
          }).catch(err => console.error('[P2P] Failed to store shard block:', err));

          this.handlers.onShardBlockReceived?.(block);
          // Gossip forward
          this.gossipForward(data, peerId);
        }
        break;
      }

      case MessageType.BEACON_BLOCK: {
        const beacon = msg.payload as BeaconBlock;
        // Validate basic structure before storing
        if (beacon && typeof beacon.number === 'number' && beacon.hash) {
          // Store in IndexedDB
          beaconDB.put({
            number: beacon.number,
            shardRoots: beacon.shardRoots,
            shardHeads: beacon.shardHeads,
            globalStateRoot: beacon.globalStateRoot,
            timestamp: beacon.timestamp,
            validator: beacon.validator,
            hash: beacon.hash,
          }).catch(err => console.error('[P2P] Failed to store beacon block:', err));

          this.handlers.onBeaconBlockReceived?.(beacon);
          // Gossip forward
          this.gossipForward(data, peerId);
        }
        break;
      }

      case MessageType.BLOCK_SYNC_REQUEST: {
        const req = msg.payload as { shard: number; fromHeight: number };
        if (req && typeof req.shard === 'number' && typeof req.fromHeight === 'number') {
          this.handlers.onBlockSyncRequest?.(peerId, req.shard, req.fromHeight);
        }
        break;
      }

      case MessageType.BLOCK_SYNC_RESPONSE: {
        const resp = msg.payload as { blocks: ShardBlock[] };
        if (resp?.blocks?.length) {
          // Store all received blocks in IndexedDB
          for (const block of resp.blocks) {
            if (block && typeof block.number === 'number' && block.hash) {
              blockDB.put({
                key: `${block.shard}:${block.number}`,
                shard: block.shard,
                number: block.number,
                parentHash: block.parentHash,
                stateRoot: block.stateRoot,
                transactionsRoot: block.transactionsRoot,
                timestamp: block.timestamp,
                validator: block.validator,
                hash: block.hash,
                txCount: block.txCount,
                processingTimeMs: block.processingTimeMs,
                strangrzCodeSVG: block.strangrzCodeSVG,
                rawSize: JSON.stringify(block).length,
                compressedSize: block.strangrzCodeSVG?.length ?? JSON.stringify(block).length,
              }).catch(err => console.error('[P2P] Failed to store synced block:', err));

              this.handlers.onShardBlockReceived?.(block);
            }
          }
        }
        break;
      }

      case MessageType.STATE_SYNC_REQUEST: {
        const stateReq = msg.payload as { shard: number };
        if (stateReq && typeof stateReq.shard === 'number') {
          this.handlers.onStateSyncRequest?.(peerId, stateReq.shard);
        }
        break;
      }

      case MessageType.STATE_SYNC_RESPONSE: {
        // State sync responses are forwarded to the generic handler
        // since shard state structure is managed by StrangrzChain
        this.handlers.onMessage?.(msg, peerId);
        break;
      }

      default:
        this.handlers.onMessage?.(msg, peerId);
    }
  }

  /** Forward a gossip message to all peers except the sender */
  private gossipForward(data: string, excludePeerId: string): void {
    for (const [id, peer] of this.peers) {
      if (id !== excludePeerId && peer.state === 'connected') {
        peer.send(data);
      }
    }
  }

  private onPeerReady(peer: PeerConnection): void {
    peer.state = 'connected';
    peer.info.state = 'connected';
    peer.info.connectedAt = Date.now();
    peer.info.lastSeen = Date.now();
    this.handlers.onPeerConnected?.(peer.info);

    // Send handshake
    peer.send(JSON.stringify({
      type: MessageType.HANDSHAKE,
      senderId: this.localId,
      timestamp: Date.now(),
      payload: { address: this.localAddress },
      nonce: randomHex(8),
    }));
  }

  private async waitForIce(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') return;

    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 3000);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  private cleanupLoop(): void {
    if (!this.isRunning) return;

    // Clean up old seen messages
    // In production, use a proper TTL-based cache
    if (this.seenMessages.size > 10000) {
      this.seenMessages.clear();
    }

    // Ping connected peers
    for (const peer of this.peers.values()) {
      if (peer.state === 'connected') {
        peer.send(JSON.stringify({
          type: MessageType.PING,
          senderId: this.localId,
          timestamp: Date.now(),
          payload: null,
          nonce: randomHex(8),
        }));
      }
    }

    setTimeout(() => this.cleanupLoop(), 30000);
  }

  // ─── Queries ─────────────────────────────────────────

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values()).map(p => ({ ...p.info }));
  }

  getConnectedPeerCount(): number {
    return Array.from(this.peers.values()).filter(p => p.state === 'connected').length;
  }

  getNetworkStats(): NetworkStats {
    let totalLatency = 0;
    let connectedCount = 0;
    let totalMsgRecv = 0;
    let totalMsgSent = 0;

    for (const peer of this.peers.values()) {
      if (peer.state === 'connected') {
        connectedCount++;
        totalLatency += peer.latency;
        totalMsgRecv += peer.info.messagesReceived;
        totalMsgSent += peer.info.messagesSent;
      }
    }

    return {
      localId: this.localId,
      localAddress: this.localAddress,
      connectedPeers: connectedCount,
      totalPeers: this.peers.size,
      avgLatencyMs: connectedCount > 0 ? totalLatency / connectedCount : 0,
      totalMessagesReceived: totalMsgRecv,
      totalMessagesSent: totalMsgSent,
      seenMessagesCount: this.seenMessages.size,
    };
  }
}

// ─── Peer Connection Wrapper ─────────────────────────────

class PeerConnection {
  public info: PeerInfo;
  public state: PeerState = 'connecting';
  public latency: number = 0;
  public peerAddress: string = '';
  public rtcConnection: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null;
  private network: CosmoP2P;

  constructor(
    peerId: string,
    rtcConnection: RTCPeerConnection,
    dataChannel: RTCDataChannel | null,
    network: CosmoP2P
  ) {
    this.rtcConnection = rtcConnection;
    this.dataChannel = dataChannel;
    this.network = network;

    this.info = {
      id: peerId,
      address: '',
      connectedAt: 0,
      lastSeen: 0,
      latencyMs: 0,
      messagesReceived: 0,
      messagesSent: 0,
      state: 'connecting',
    };

    if (dataChannel) {
      this.setupDataChannel(dataChannel);
    }

    rtcConnection.oniceconnectionstatechange = () => {
      if (rtcConnection.iceConnectionState === 'disconnected' ||
          rtcConnection.iceConnectionState === 'failed') {
        this.state = 'disconnected';
        this.info.state = 'disconnected';
      }
    };
  }

  setDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    this.setupDataChannel(channel);
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.state = 'connected';
      this.info.state = 'connected';
    };

    channel.onmessage = (event) => {
      this.info.messagesReceived++;
      this.info.lastSeen = Date.now();
      this.network.handleMessage(event.data, this.info.id);
    };

    channel.onclose = () => {
      this.state = 'disconnected';
      this.info.state = 'disconnected';
    };
  }

  send(data: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
      this.info.messagesSent++;
    }
  }

  close(): void {
    this.dataChannel?.close();
    this.rtcConnection.close();
    this.state = 'disconnected';
    this.info.state = 'disconnected';
  }
}

// ─── Types ───────────────────────────────────────────────

export interface NetworkStats {
  localId: string;
  localAddress: string;
  connectedPeers: number;
  totalPeers: number;
  avgLatencyMs: number;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  seenMessagesCount: number;
}
