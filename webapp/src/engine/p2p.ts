/**
 * CosmoWarp P2P — WebRTC Mesh Network
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

import { sha256, randomHex } from './crypto';
import type { MeshTransaction } from './cosmomesh';
import type { ConsensusVote } from './consensus';

// ─── Peer State ──────────────────────────────────────────

export interface PeerInfo {
  id: string;
  address: string;          // CosmoWarp address
  connectedAt: number;
  lastSeen: number;
  latencyMs: number;
  messagesReceived: number;
  messagesSent: number;
  state: PeerState;
}

export type PeerState = 'connecting' | 'connected' | 'disconnected' | 'failed';

// ─── Message Types ───────────────────────────────────────

export enum MessageType {
  HANDSHAKE         = 'handshake',
  TX_ANNOUNCE       = 'tx_announce',
  TX_REQUEST        = 'tx_request',
  TX_RESPONSE       = 'tx_response',
  VOTE_BROADCAST    = 'vote_broadcast',
  PEER_LIST         = 'peer_list',
  PING              = 'ping',
  PONG              = 'pong',
  SYNC_REQUEST      = 'sync_request',
  SYNC_RESPONSE     = 'sync_response',
}

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
  onMessage?: (msg: P2PMessage, peerId: string) => void;
}

// ─── Signaling Data ──────────────────────────────────────

export interface SignalData {
  type: 'offer' | 'answer';
  sdp: string;
  peerId: string;
  address: string;
}

// ─── CosmoP2P Network ───────────────────────────────────

export class CosmoP2P {
  private localId: string;
  private localAddress: string;
  private peers: Map<string, PeerConnection> = new Map();
  private handlers: P2PEventHandlers = {};
  private seenMessages: Set<string> = new Set(); // Dedup gossip
  private maxPeers: number = 8;
  private seenMessagesTTL: number = 60000; // 1 minute
  private isRunning: boolean = false;

  constructor(address: string) {
    this.localId = randomHex(16);
    this.localAddress = address;
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
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
  }

  // ─── Connection Management ───────────────────────────

  /** Create an offer to connect to a new peer */
  async createOffer(): Promise<SignalData> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    const dataChannel = pc.createDataChannel('cosmomesh', {
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
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
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
