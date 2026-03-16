/**
 * Strangrz — Supabase Database Operations
 *
 * Full CRUD layer for all tables. Each function gracefully returns null/false
 * when the backend is unavailable (offline mode).
 */

import { supabase, isBackendAvailable } from './supabase';
import type { WarpWallet, Transaction } from '../engine/wallet';
import type { Wart, WartCertificate, WartComment, WartTransfer } from '../engine/warts';
import type { UserProfile } from '../engine/social';

// ─── Profiles ────────────────────────────────────────────────

export async function upsertProfile(wallet: WarpWallet): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('profiles').upsert({
    address: wallet.address,
    public_key: wallet.publicKey,
    alias: wallet.alias || null,
    encrypted_private_key: wallet.encryptedPrivateKey,
    balance: wallet.balance,
    level: wallet.level,
    level_name: wallet.levelName,
    level_title: wallet.levelTitle,
    level_symbol: wallet.levelSymbol,
    reward_multiplier: wallet.rewardMultiplier,
    streak_days: wallet.streakDays,
    xp: wallet.xp,
    is_admin: wallet.isAdmin,
    created_at: wallet.createdAt,
    updated_at: Date.now(),
  }, { onConflict: 'address' });

  if (error) console.error('[Supabase] upsertProfile:', error.message);
  return !error;
}

/** Check if an alias is already taken in the cloud (case-insensitive) */
export async function isAliasTakenCloud(alias: string, excludeAddress?: string): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { data, error } = await supabase!
    .from('profiles')
    .select('address')
    .ilike('alias', alias.trim())
    .limit(1);
  if (error || !data || data.length === 0) return false;
  if (excludeAddress && data.length === 1 && data[0].address === excludeAddress) return false;
  return true;
}

export async function fetchProfile(address: string): Promise<WarpWallet | null> {
  if (!isBackendAvailable()) return null;
  const { data, error } = await supabase!
    .from('profiles')
    .select('*')
    .eq('address', address)
    .single();

  if (error || !data) return null;

  return {
    address: data.address,
    privateKey: '',
    publicKey: data.public_key,
    encryptedPrivateKey: data.encrypted_private_key || { ciphertext: '', iv: '', tag: '' },
    balance: Number(data.balance),
    transactions: [],
    createdAt: Number(data.created_at),
    alias: data.alias || undefined,
    level: data.level,
    levelName: data.level_name,
    levelTitle: data.level_title,
    levelSymbol: data.level_symbol,
    rewardMultiplier: Number(data.reward_multiplier),
    streakDays: data.streak_days,
    xp: data.xp,
    isAdmin: data.is_admin,
  };
}

export async function updateBalance(address: string, balance: number): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!
    .from('profiles')
    .update({ balance, updated_at: Date.now() })
    .eq('address', address);
  return !error;
}

// ─── Warts ───────────────────────────────────────────────────

function wartToRow(wart: Wart, mediaPath?: string, audioCoverPath?: string) {
  return {
    id: wart.id,
    title: wart.title,
    description: wart.description,
    media_type: wart.mediaType || 'image',
    creator: wart.creator,
    owner: wart.owner,
    price: wart.price,
    listed: wart.listed,
    royalty_percent: wart.royaltyPercent,
    edition_type: wart.editionType,
    max_editions: wart.maxEditions,
    edition_number: wart.editionNumber,
    available_until: wart.availableUntil,
    cert_id: wart.certId,
    content_fingerprint: wart.contentFingerprint,
    creator_signature: wart.creatorSignature,
    on_chain_svg: wart.onChainSVG,
    strangrz_code_id: wart.strangrzCodeId,
    compression_ratio: wart.compressionRatio,
    on_chain_tx_id: wart.onChainTxId,
    storage_mode: wart.storageMode,
    price_fiat: wart.priceFiat,
    fiat_currency: wart.fiatCurrency,
    vault_backup: wart.vaultBackup,
    media_path: mediaPath || null,
    audio_cover_path: audioCoverPath || null,
    created_at: wart.createdAt,
    updated_at: Date.now(),
  };
}

function rowToWart(row: Record<string, unknown>, imageData: string, audioCover?: string): Wart {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    imageData,
    mediaType: (row.media_type as Wart['mediaType']) || 'image',
    audioCover,
    creator: row.creator as string,
    owner: row.owner as string,
    price: row.price != null ? Number(row.price) : null,
    listed: row.listed as boolean,
    createdAt: Number(row.created_at),
    history: [],
    royaltyPercent: Number(row.royalty_percent) || 5,
    comments: [],
    editionType: (row.edition_type as Wart['editionType']) || 'unique',
    maxEditions: row.max_editions != null ? Number(row.max_editions) : null,
    editionNumber: Number(row.edition_number) || 1,
    availableUntil: row.available_until != null ? Number(row.available_until) : null,
    certId: (row.cert_id as string) || undefined,
    contentFingerprint: (row.content_fingerprint as string) || undefined,
    creatorSignature: (row.creator_signature as string) || undefined,
    onChainSVG: (row.on_chain_svg as string) || undefined,
    strangrzCodeId: (row.strangrz_code_id as string) || undefined,
    compressionRatio: row.compression_ratio != null ? Number(row.compression_ratio) : undefined,
    onChainTxId: (row.on_chain_tx_id as string) || undefined,
    storageMode: (row.storage_mode as Wart['storageMode']) || 'hybrid',
    priceFiat: row.price_fiat != null ? Number(row.price_fiat) : undefined,
    fiatCurrency: (row.fiat_currency as Wart['fiatCurrency']) || undefined,
    vaultBackup: (row.vault_backup as boolean) || false,
  };
}

export async function upsertWart(wart: Wart, mediaPath?: string, audioCoverPath?: string): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!
    .from('warts')
    .upsert(wartToRow(wart, mediaPath, audioCoverPath), { onConflict: 'id' });

  if (error) console.error('[Supabase] upsertWart:', error.message);
  return !error;
}

export async function deleteWartRemote(wartId: string): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('warts').delete().eq('id', wartId);
  return !error;
}

export async function fetchWarts(filters?: {
  listed?: boolean;
  owner?: string;
  creator?: string;
}): Promise<Record<string, unknown>[]> {
  if (!isBackendAvailable()) return [];
  let query = supabase!.from('warts').select('*').order('created_at', { ascending: false });

  if (filters?.listed !== undefined) query = query.eq('listed', filters.listed);
  if (filters?.owner) query = query.eq('owner', filters.owner);
  if (filters?.creator) query = query.eq('creator', filters.creator);

  const { data, error } = await query.limit(500);
  if (error) { console.error('[Supabase] fetchWarts:', error.message); return []; }
  return (data || []) as Record<string, unknown>[];
}

export async function fetchWartById(wartId: string): Promise<Record<string, unknown> | null> {
  if (!isBackendAvailable()) return null;
  const { data, error } = await supabase!
    .from('warts')
    .select('*')
    .eq('id', wartId)
    .single();
  if (error) return null;
  return data as Record<string, unknown>;
}

// ─── Wart History ────────────────────────────────────────────

export async function insertWartHistory(wartId: string, transfer: WartTransfer): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('wart_history').insert({
    wart_id: wartId,
    from_addr: transfer.from,
    to_addr: transfer.to,
    price: transfer.price,
    tx_id: transfer.txId,
    created_at: transfer.timestamp,
  });
  return !error;
}

export async function fetchWartHistory(wartId: string): Promise<WartTransfer[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('wart_history')
    .select('*')
    .eq('wart_id', wartId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    from: row.from_addr as string,
    to: row.to_addr as string,
    price: Number(row.price),
    timestamp: Number(row.created_at),
    txId: (row.tx_id as string) || '',
  }));
}

// ─── Comments ────────────────────────────────────────────────

export async function insertComment(wartId: string, comment: WartComment): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('wart_comments').insert({
    id: comment.id,
    wart_id: wartId,
    author: comment.author,
    author_alias: comment.authorAlias,
    content: comment.content,
    created_at: comment.timestamp,
  });
  return !error;
}

export async function fetchComments(wartId: string): Promise<WartComment[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('wart_comments')
    .select('*')
    .eq('wart_id', wartId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    author: row.author as string,
    authorAlias: (row.author_alias as string) || '',
    content: row.content as string,
    timestamp: Number(row.created_at),
  }));
}

// ─── Transactions ────────────────────────────────────────────

export async function insertTransaction(tx: Transaction): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('transactions').insert({
    id: tx.id,
    from_addr: tx.from,
    to_addr: tx.to,
    amount: tx.amount,
    tx_type: tx.type,
    signature: tx.signature,
    memo: tx.memo,
    resonance_score: tx.resonanceScore,
    confirmations: tx.confirmations,
    layer: tx.layer,
    mesh_depth: tx.meshDepth,
    created_at: tx.timestamp,
  });

  if (error && !error.message.includes('duplicate')) {
    console.error('[Supabase] insertTransaction:', error.message);
  }
  return !error;
}

export async function fetchTransactions(limit = 200): Promise<Transaction[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    from: row.from_addr as string,
    to: row.to_addr as string,
    amount: Number(row.amount),
    timestamp: Number(row.created_at),
    signature: (row.signature as string) || '',
    type: row.tx_type as Transaction['type'],
    memo: (row.memo as string) || undefined,
    resonanceScore: row.resonance_score != null ? Number(row.resonance_score) : undefined,
    confirmations: row.confirmations != null ? Number(row.confirmations) : undefined,
    layer: row.layer != null ? Number(row.layer) : undefined,
    meshDepth: row.mesh_depth != null ? Number(row.mesh_depth) : undefined,
  }));
}

export async function fetchTransactionsForAddress(address: string, limit = 100): Promise<Transaction[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('transactions')
    .select('*')
    .or(`from_addr.eq.${address},to_addr.eq.${address}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    from: row.from_addr as string,
    to: row.to_addr as string,
    amount: Number(row.amount),
    timestamp: Number(row.created_at),
    signature: (row.signature as string) || '',
    type: row.tx_type as Transaction['type'],
    memo: (row.memo as string) || undefined,
    resonanceScore: row.resonance_score != null ? Number(row.resonance_score) : undefined,
    confirmations: row.confirmations != null ? Number(row.confirmations) : undefined,
    layer: row.layer != null ? Number(row.layer) : undefined,
    meshDepth: row.mesh_depth != null ? Number(row.mesh_depth) : undefined,
  }));
}

// ─── Certificates ────────────────────────────────────────────

export async function insertCertificate(cert: WartCertificate): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('certificates').insert({
    cert_id: cert.certId,
    content_fingerprint: cert.contentFingerprint,
    creator_signature: cert.creatorSignature,
    creator: cert.creator,
    wart_id: cert.wartId,
    title: cert.title,
    issued_at: cert.issuedAt,
  });

  if (error && !error.message.includes('duplicate')) {
    console.error('[Supabase] insertCertificate:', error.message);
  }
  return !error;
}

export async function fetchCertificate(certId: string): Promise<WartCertificate | null> {
  if (!isBackendAvailable()) return null;
  const { data, error } = await supabase!
    .from('certificates')
    .select('*')
    .eq('cert_id', certId)
    .single();

  if (error || !data) return null;
  return {
    certId: data.cert_id,
    contentFingerprint: data.content_fingerprint,
    creatorSignature: data.creator_signature || '',
    creator: data.creator,
    wartId: data.wart_id,
    title: data.title,
    issuedAt: Number(data.issued_at),
  };
}

// ─── Social Profiles ─────────────────────────────────────────

export async function upsertSocialProfile(profile: UserProfile): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('social_profiles').upsert({
    address: profile.address,
    alias: profile.alias,
    bio: profile.bio,
    website: profile.website,
    instagram: profile.instagram,
    twitter: profile.twitter,
    joined_at: profile.joinedAt,
    updated_at: Date.now(),
  }, { onConflict: 'address' });
  return !error;
}

export async function fetchSocialProfile(address: string): Promise<Partial<UserProfile> | null> {
  if (!isBackendAvailable()) return null;
  const { data, error } = await supabase!
    .from('social_profiles')
    .select('*')
    .eq('address', address)
    .single();

  if (error || !data) return null;
  return {
    address: data.address,
    alias: data.alias || '',
    bio: data.bio || '',
    profileImage: '',
    website: data.website || '',
    instagram: data.instagram || '',
    twitter: data.twitter || '',
    joinedAt: Number(data.joined_at),
  };
}

// ─── Social Follows ──────────────────────────────────────────

export async function insertFollow(follower: string, following: string, relationship = 'follow'): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('social_follows').insert({
    follower_address: follower,
    following_address: following,
    relationship,
    created_at: Date.now(),
  });
  return !error;
}

export async function deleteFollow(follower: string, following: string, relationship = 'follow'): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!
    .from('social_follows')
    .delete()
    .eq('follower_address', follower)
    .eq('following_address', following)
    .eq('relationship', relationship);
  return !error;
}

export async function fetchFollowers(address: string): Promise<string[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('social_follows')
    .select('follower_address')
    .eq('following_address', address)
    .eq('relationship', 'follow');

  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => r.follower_address as string);
}

export async function fetchFollowing(address: string): Promise<string[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('social_follows')
    .select('following_address')
    .eq('follower_address', address)
    .eq('relationship', 'follow');

  if (error || !data) return [];
  return data.map((r: Record<string, unknown>) => r.following_address as string);
}

// ─── Notifications ───────────────────────────────────────────

export interface Notification {
  id: number;
  recipient: string;
  sender: string | null;
  notif_type: string;
  title: string;
  body: string;
  ref_id: string | null;
  read: boolean;
  created_at: number;
}

export async function insertNotification(notif: Omit<Notification, 'id' | 'read' | 'created_at'>): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('notifications').insert({
    ...notif,
    read: false,
    created_at: Date.now(),
  });
  return !error;
}

export async function fetchNotifications(address: string, limit = 50): Promise<Notification[]> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('notifications')
    .select('*')
    .eq('recipient', address)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Notification[];
}

export async function markNotificationRead(notifId: number): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId);
  return !error;
}

// ─── Atomic Operations (RPC) ─────────────────────────────────

export async function atomicTransfer(from: string, to: string, amount: number): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { data, error } = await supabase!.rpc('transfer_balance', {
    p_from: from,
    p_to: to,
    p_amount: amount,
  });

  if (error) {
    console.error('[Supabase] atomicTransfer:', error.message);
    return false;
  }
  return data === true;
}

export async function atomicPurchaseWart(params: {
  wartId: string;
  buyer: string;
  price: number;
  royaltyAmount: number;
  creator: string;
  seller: string;
  txId: string;
}): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { data, error } = await supabase!.rpc('purchase_wart', {
    p_wart_id: params.wartId,
    p_buyer: params.buyer,
    p_price: params.price,
    p_royalty_amount: params.royaltyAmount,
    p_creator: params.creator,
    p_seller: params.seller,
    p_tx_id: params.txId,
  });

  if (error) {
    console.error('[Supabase] atomicPurchaseWart:', error.message);
    return false;
  }
  return data === true;
}

// ─── Channels & Posts (Global Sync) ─────────────────────────

export async function upsertChannel(channel: {
  id: string; name: string; description: string; createdBy: string;
  createdByAlias: string; members: string[]; createdAt: number; isPublic: boolean;
}): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const { error } = await supabase!.from('chat_channels').upsert({
    id: channel.id,
    name: channel.name,
    description: channel.description,
    created_by: channel.createdBy,
    created_by_alias: channel.createdByAlias,
    members: channel.members,
    created_at: channel.createdAt,
    is_public: channel.isPublic,
    updated_at: Date.now(),
  }, { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertChannel:', error.message);
  return !error;
}

export async function fetchAllChannels(): Promise<Array<{
  id: string; name: string; description: string; createdBy: string;
  createdByAlias: string; members: string[]; createdAt: number; isPublic: boolean;
}>> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('chat_channels')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    createdBy: row.created_by as string,
    createdByAlias: (row.created_by_alias as string) || '',
    members: (row.members as string[]) || [],
    createdAt: Number(row.created_at),
    isPublic: row.is_public !== false,
  }));
}

export async function upsertPost(post: {
  id: string; author: string; authorAlias: string; content: string;
  mediaType?: string; mediaPath?: string; wartLink?: string; timestamp: number;
  tipCount: number; rewarpCount: number; views: number;
}): Promise<boolean> {
  if (!isBackendAvailable()) return false;
  const row: Record<string, unknown> = {
    id: post.id,
    author: post.author,
    author_alias: post.authorAlias,
    content: post.content,
    media_type: post.mediaType || null,
    wart_link: post.wartLink || null,
    timestamp: post.timestamp,
    tip_count: post.tipCount,
    rewarp_count: post.rewarpCount,
    views: post.views,
    updated_at: Date.now(),
  };
  if (post.mediaPath) row.media_path = post.mediaPath;
  const { error } = await supabase!.from('chat_posts').upsert(row, { onConflict: 'id' });
  if (error) console.error('[Supabase] upsertPost:', error.message);
  return !error;
}

export async function fetchAllPosts(): Promise<Array<{
  id: string; author: string; authorAlias: string; content: string;
  mediaType?: string; mediaPath?: string; wartLink?: string; timestamp: number;
  tipCount: number; rewarpCount: number; views: number;
}>> {
  if (!isBackendAvailable()) return [];
  const { data, error } = await supabase!
    .from('chat_posts')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    author: row.author as string,
    authorAlias: (row.author_alias as string) || '',
    content: (row.content as string) || '',
    mediaType: (row.media_type as string) || undefined,
    mediaPath: (row.media_path as string) || undefined,
    wartLink: (row.wart_link as string) || undefined,
    timestamp: Number(row.timestamp),
    tipCount: Number(row.tip_count) || 0,
    rewarpCount: Number(row.rewarp_count) || 0,
    views: Number(row.views) || 0,
  }));
}

// ─── Export rowToWart for sync layer ─────────────────────────
export { rowToWart };
