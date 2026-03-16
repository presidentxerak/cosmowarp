import { storage } from './storage';
import { storeMedia, retrieveMedia } from './mediadb';
import { upsertChannel, fetchAllChannels, upsertPost, fetchAllPosts } from '../lib/supabase-db';
import { downloadMediaAsDataUrl } from '../lib/supabase-storage';

// ─── Types ─────────────────────────────────────────────
export interface ChatPost {
  id: string;
  author: string;
  authorAlias: string;
  content: string;
  mediaData?: string;
  mediaType?: 'image' | 'audio' | 'video' | 'cards';
  audioCover?: string;
  timestamp: number;
  tips: Record<string, boolean>;
  tipCount: number;
  rewarps: string[];
  rewarpCount: number;
  views: number;
  comments: ChatComment[];
  bookmarkedBy: string[];
  wartLink?: string;
  isRewarp: boolean;
  originalPostId?: string;
  originalAuthor?: string;
  originalAuthorAlias?: string;
}

export interface ChatComment {
  id: string;
  author: string;
  authorAlias: string;
  content: string;
  timestamp: number;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdByAlias: string;
  members: string[];
  messages: ChatMessage[];
  createdAt: number;
  isPublic: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromAlias: string;
  content: string;
  timestamp: number;
}

export interface DirectThread {
  id: string;
  participants: [string, string];
  messages: ChatMessage[];
  lastActivity: number;
}

// ─── Engine ────────────────────────────────────────────
const STORAGE_POSTS = 'cosmochat_posts';
const STORAGE_CHANNELS = 'cosmochat_channels';
const STORAGE_DMS = 'cosmochat_dms';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class CosmoChatEngine {
  private posts: ChatPost[];
  private channels: ChatChannel[];
  private dms: DirectThread[];

  constructor(posts: ChatPost[], channels: ChatChannel[], dms: DirectThread[]) {
    this.posts = posts;
    this.channels = channels;
    this.dms = dms;
  }

  static load(): CosmoChatEngine {
    const posts = JSON.parse(storage.getItem(STORAGE_POSTS) || '[]');
    const channels = JSON.parse(storage.getItem(STORAGE_CHANNELS) || '[]');
    const dms = JSON.parse(storage.getItem(STORAGE_DMS) || '[]');
    return new CosmoChatEngine(posts, channels, dms);
  }

  private savePosts() {
    // Strip large mediaData from localStorage (stored in IndexedDB instead)
    const slim = this.posts.slice(0, 500).map(p => ({
      ...p,
      mediaData: p.mediaData && p.mediaData.length > 5000 ? undefined : p.mediaData,
    }));
    storage.setItem(STORAGE_POSTS, JSON.stringify(slim));
  }

  private saveChannels() {
    storage.setItem(STORAGE_CHANNELS, JSON.stringify(this.channels));
  }

  private saveDMs() {
    storage.setItem(STORAGE_DMS, JSON.stringify(this.dms.slice(0, 100)));
  }

  // ─── Posts ─────────────────────────────────────────────

  createPost(author: string, authorAlias: string, content: string, mediaData?: string, mediaType?: 'image' | 'audio' | 'video' | 'cards', audioCover?: string, wartLink?: string): ChatPost {
    const post: ChatPost = {
      id: genId(),
      author,
      authorAlias: authorAlias || author.slice(0, 10),
      content,
      mediaData,
      mediaType,
      audioCover,
      timestamp: Date.now(),
      tips: {},
      tipCount: 0,
      rewarps: [],
      rewarpCount: 0,
      views: 0,
      comments: [],
      bookmarkedBy: [],
      wartLink,
      isRewarp: false,
    };
    this.posts.unshift(post);
    // Store large media in IndexedDB
    if (mediaData && mediaData.length > 5000) {
      storeMedia(`post_${post.id}`, mediaData, audioCover).catch(() => {});
    }
    this.savePosts();
    return post;
  }

  /** Rehydrate media from IndexedDB for posts that have mediaType but no mediaData */
  async rehydratePostMedia(): Promise<void> {
    for (const post of this.posts) {
      if (post.mediaType && !post.mediaData) {
        try {
          const media = await retrieveMedia(`post_${post.id}`);
          if (media) {
            post.mediaData = media.imageData;
            if (media.audioCover) post.audioCover = media.audioCover;
          }
        } catch { /* skip */ }
      }
    }
  }

  deletePost(postId: string, author: string): boolean {
    const idx = this.posts.findIndex(p => p.id === postId && p.author === author);
    if (idx === -1) return false;
    this.posts.splice(idx, 1);
    this.savePosts();
    return true;
  }

  tipPost(postId: string, tipper: string): boolean {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return false;
    if (post.tips[tipper]) return false; // already tipped
    if (post.author === tipper) return false; // can't tip yourself
    post.tips[tipper] = true;
    post.tipCount = Object.keys(post.tips).length;
    this.savePosts();
    return true;
  }

  rewarpPost(postId: string, author: string, authorAlias: string): ChatPost | null {
    const original = this.posts.find(p => p.id === postId);
    if (!original) return null;
    if (original.rewarps.includes(author)) return null; // already rewarped

    original.rewarps.push(author);
    original.rewarpCount = original.rewarps.length;

    const rewarp: ChatPost = {
      id: genId(),
      author,
      authorAlias: authorAlias || author.slice(0, 10),
      content: '',
      timestamp: Date.now(),
      tips: {},
      tipCount: 0,
      rewarps: [],
      rewarpCount: 0,
      views: 0,
      comments: [],
      bookmarkedBy: [],
      isRewarp: true,
      originalPostId: postId,
      originalAuthor: original.author,
      originalAuthorAlias: original.authorAlias,
    };
    this.posts.unshift(rewarp);
    this.savePosts();
    return rewarp;
  }

  addComment(postId: string, author: string, authorAlias: string, content: string): ChatComment | null {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;
    const comment: ChatComment = {
      id: genId(),
      author,
      authorAlias: authorAlias || author.slice(0, 10),
      content,
      timestamp: Date.now(),
    };
    post.comments.push(comment);
    this.savePosts();
    return comment;
  }

  bookmarkPost(postId: string, user: string): boolean {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return false;
    const idx = post.bookmarkedBy.indexOf(user);
    if (idx >= 0) {
      post.bookmarkedBy.splice(idx, 1); // un-bookmark
    } else {
      post.bookmarkedBy.push(user); // bookmark
    }
    this.savePosts();
    return true;
  }

  incrementViews(postId: string): void {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.views++;
      this.savePosts();
    }
  }

  getTimeline(): ChatPost[] {
    return [...this.posts];
  }

  getPost(postId: string): ChatPost | null {
    return this.posts.find(p => p.id === postId) || null;
  }

  getOriginalPost(postId: string): ChatPost | null {
    return this.posts.find(p => p.id === postId) || null;
  }

  getUserPosts(author: string): ChatPost[] {
    return this.posts.filter(p => p.author === author);
  }

  getBookmarks(user: string): ChatPost[] {
    return this.posts.filter(p => p.bookmarkedBy.includes(user));
  }

  // ─── Channels ──────────────────────────────────────────

  createChannel(name: string, description: string, createdBy: string, createdByAlias: string, isPublic = true): ChatChannel {
    const channel: ChatChannel = {
      id: genId(),
      name,
      description,
      createdBy,
      createdByAlias,
      members: [createdBy],
      messages: [],
      createdAt: Date.now(),
      isPublic,
    };
    this.channels.push(channel);
    this.saveChannels();
    return channel;
  }

  joinChannel(channelId: string, user: string): boolean {
    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) return false;
    if (ch.members.includes(user)) return false;
    ch.members.push(user);
    this.saveChannels();
    return true;
  }

  leaveChannel(channelId: string, user: string): boolean {
    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) return false;
    ch.members = ch.members.filter(m => m !== user);
    this.saveChannels();
    return true;
  }

  sendChannelMessage(channelId: string, from: string, fromAlias: string, content: string): ChatMessage | null {
    const ch = this.channels.find(c => c.id === channelId);
    if (!ch) return null;
    const msg: ChatMessage = {
      id: genId(),
      from,
      fromAlias: fromAlias || from.slice(0, 10),
      content,
      timestamp: Date.now(),
    };
    ch.messages.push(msg);
    if (ch.messages.length > 200) ch.messages = ch.messages.slice(-200);
    this.saveChannels();
    return msg;
  }

  getChannels(): ChatChannel[] {
    return [...this.channels];
  }

  getChannel(channelId: string): ChatChannel | null {
    return this.channels.find(c => c.id === channelId) || null;
  }

  // ─── Direct Messages ──────────────────────────────────

  sendDM(from: string, fromAlias: string, to: string, content: string): ChatMessage {
    const threadId = [from, to].sort().join('_');
    let thread = this.dms.find(t => t.id === threadId);
    if (!thread) {
      thread = { id: threadId, participants: [from, to], messages: [], lastActivity: Date.now() };
      this.dms.push(thread);
    }
    const msg: ChatMessage = {
      id: genId(),
      from,
      fromAlias: fromAlias || from.slice(0, 10),
      content,
      timestamp: Date.now(),
    };
    thread.messages.push(msg);
    thread.lastActivity = Date.now();
    if (thread.messages.length > 200) thread.messages = thread.messages.slice(-200);
    this.saveDMs();
    return msg;
  }

  getThreads(user: string): DirectThread[] {
    return this.dms
      .filter(t => t.participants.includes(user))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  getThread(user: string, other: string): DirectThread | null {
    const threadId = [user, other].sort().join('_');
    return this.dms.find(t => t.id === threadId) || null;
  }

  // ─── Cloud Sync ────────────────────────────────────────

  async syncChannelsToCloud(): Promise<void> {
    for (const ch of this.channels) {
      await upsertChannel({
        id: ch.id, name: ch.name, description: ch.description,
        createdBy: ch.createdBy, createdByAlias: ch.createdByAlias,
        members: ch.members, createdAt: ch.createdAt, isPublic: ch.isPublic,
      });
    }
  }

  async syncChannelsFromCloud(): Promise<void> {
    const cloudChannels = await fetchAllChannels();
    const localIds = new Set(this.channels.map(c => c.id));
    for (const cc of cloudChannels) {
      if (!localIds.has(cc.id)) {
        this.channels.push({
          ...cc,
          messages: [],
        });
      } else {
        // Merge members
        const local = this.channels.find(c => c.id === cc.id)!;
        const allMembers = new Set([...local.members, ...cc.members]);
        local.members = [...allMembers];
      }
    }
    this.saveChannels();
  }

  async syncPostsToCloud(): Promise<void> {
    for (const post of this.posts.slice(0, 50)) {
      await upsertPost({
        id: post.id, author: post.author, authorAlias: post.authorAlias,
        content: post.content, mediaType: post.mediaType,
        mediaPath: post.mediaType ? `warts/post_${post.id}/main` : undefined,
        wartLink: post.wartLink, timestamp: post.timestamp,
        tipCount: post.tipCount, rewarpCount: post.rewarpCount, views: post.views,
      });
    }
  }

  async syncPostsFromCloud(): Promise<void> {
    const cloudPosts = await fetchAllPosts();
    const localIds = new Set(this.posts.map(p => p.id));
    for (const cp of cloudPosts) {
      if (!localIds.has(cp.id)) {
        const post: ChatPost = {
          ...cp,
          mediaType: cp.mediaType as ChatPost['mediaType'],
          tips: {},
          rewarps: [],
          comments: [],
          bookmarkedBy: [],
          isRewarp: false,
        };
        this.posts.push(post);

        // Try to download media from Supabase Storage for cross-device posts
        if (cp.mediaType && cp.mediaPath) {
          downloadMediaAsDataUrl(cp.mediaPath).then(dataUrl => {
            if (dataUrl) {
              post.mediaData = dataUrl;
              // Cache in IndexedDB for future loads
              storeMedia(`post_${post.id}`, dataUrl).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }
    this.posts.sort((a, b) => b.timestamp - a.timestamp);
    this.savePosts();
  }

  async fullSync(): Promise<void> {
    await this.syncChannelsFromCloud();
    await this.syncPostsFromCloud();
    await this.syncChannelsToCloud();
    await this.syncPostsToCloud();
  }
}
