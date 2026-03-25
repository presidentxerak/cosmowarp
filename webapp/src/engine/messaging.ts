/**
 * Strangrz Messaging — Persistent DM system with Supabase sync
 *
 * Extends the existing CosmoChatEngine with:
 * - Message persistence in Supabase (via chat_dms table)
 * - Message types: text, wart_share, transaction_receipt
 * - Conversation list with unread counts
 * - Online/offline status tracking
 */

import { storage } from './storage';
import { upsertDMThread } from '../lib/supabase-db';

// ─── Types ────────────────────────────────────────────────

export type MessageType = 'text' | 'wart_share' | 'transaction_receipt' | 'system';

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  type: MessageType;
  /** Optional reference (wart ID, tx ID) */
  refId?: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  lastActivity: number;
  unreadCount: number;
}

// ─── Storage ──────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_dm_threads';

function loadConversations(): Conversation[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(convos: Conversation[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(convos));
}

// ─── Conversation ID ──────────────────────────────────────

/** Deterministic conversation ID from two addresses (sorted) */
export function getConversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

// ─── Messaging Engine ─────────────────────────────────────

export class MessagingEngine {
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    for (const c of loadConversations()) {
      this.conversations.set(c.id, c);
    }
  }

  static load(): MessagingEngine {
    return new MessagingEngine();
  }

  private save(): void {
    saveConversations([...this.conversations.values()]);
  }

  /** Send a message */
  sendMessage(from: string, to: string, content: string, type: MessageType = 'text', refId?: string): Message {
    const convoId = getConversationId(from, to);
    let convo = this.conversations.get(convoId);

    if (!convo) {
      convo = {
        id: convoId,
        participants: [from, to].sort(),
        messages: [],
        lastActivity: Date.now(),
        unreadCount: 0,
      };
      this.conversations.set(convoId, convo);
    }

    const message: Message = {
      id: `MSG_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      from,
      to,
      content,
      type,
      refId,
      timestamp: Date.now(),
      read: false,
    };

    convo.messages.push(message);
    convo.lastActivity = message.timestamp;
    this.save();

    // Sync to Supabase (non-blocking)
    upsertDMThread({
      id: convoId,
      participants: convo.participants,
      messages: convo.messages,
      lastActivity: convo.lastActivity,
    }).catch(() => {});

    return message;
  }

  /** Get conversation with a specific user */
  getConversation(myAddress: string, otherAddress: string): Conversation | null {
    const id = getConversationId(myAddress, otherAddress);
    return this.conversations.get(id) || null;
  }

  /** Get all conversations for a user, sorted by last activity */
  getConversations(myAddress: string): Conversation[] {
    return [...this.conversations.values()]
      .filter(c => c.participants.includes(myAddress))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /** Get unread count for a conversation */
  getUnreadCount(convoId: string, myAddress: string): number {
    const convo = this.conversations.get(convoId);
    if (!convo) return 0;
    return convo.messages.filter(m => m.to === myAddress && !m.read).length;
  }

  /** Get total unread count across all conversations */
  getTotalUnread(myAddress: string): number {
    let total = 0;
    for (const convo of this.conversations.values()) {
      if (!convo.participants.includes(myAddress)) continue;
      total += convo.messages.filter(m => m.to === myAddress && !m.read).length;
    }
    return total;
  }

  /** Mark all messages in a conversation as read */
  markConversationRead(convoId: string, myAddress: string): void {
    const convo = this.conversations.get(convoId);
    if (!convo) return;
    let changed = false;
    for (const msg of convo.messages) {
      if (msg.to === myAddress && !msg.read) {
        msg.read = true;
        changed = true;
      }
    }
    if (changed) this.save();
  }

  /** Hydrate from cloud data */
  mergeCloud(cloudThreads: Array<{ id: string; participants: string[]; messages: unknown[]; lastActivity: number }>): void {
    for (const thread of cloudThreads) {
      const local = this.conversations.get(thread.id);
      if (!local || thread.lastActivity > local.lastActivity) {
        this.conversations.set(thread.id, {
          id: thread.id,
          participants: thread.participants,
          messages: (thread.messages as Message[]) || [],
          lastActivity: thread.lastActivity,
          unreadCount: 0,
        });
      }
    }
    this.save();
  }

  /** Delete a conversation locally */
  deleteConversation(convoId: string): void {
    this.conversations.delete(convoId);
    this.save();
  }
}

// ─── Online Status ────────────────────────────────────────

const ONLINE_KEY = 'strangrz_online_status';
const ONLINE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Update online presence */
export function setOnline(address: string): void {
  try {
    const raw = storage.getItem(ONLINE_KEY);
    const status: Record<string, number> = raw ? JSON.parse(raw) : {};
    status[address] = Date.now();
    // Cleanup stale entries
    const now = Date.now();
    for (const [addr, ts] of Object.entries(status)) {
      if (now - ts > ONLINE_TTL_MS) delete status[addr];
    }
    storage.setItem(ONLINE_KEY, JSON.stringify(status));
  } catch { /* ignore */ }
}

/** Check if a user is online (active within 5 min) */
export function isOnline(address: string): boolean {
  try {
    const raw = storage.getItem(ONLINE_KEY);
    if (!raw) return false;
    const status: Record<string, number> = JSON.parse(raw);
    return (Date.now() - (status[address] || 0)) < ONLINE_TTL_MS;
  } catch { return false; }
}
