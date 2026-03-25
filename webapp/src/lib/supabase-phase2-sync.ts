/**
 * Strangrz — Phase 2 Supabase Sync
 *
 * Sync layer for collections, auctions, bids, and wart tags.
 * Same pattern as supabase-sync.ts: write-through to Supabase,
 * localStorage as fallback when offline.
 */

import { supabase, isBackendAvailable } from './supabase';
import type { Collection } from '../engine/collections';
import type { Auction, Bid } from '../engine/auctions';

// ─── Collections ──────────────────────────────────────────

/** Sync a collection to Supabase */
export async function syncCollection(collection: Collection): Promise<boolean> {
  if (!isBackendAvailable() || !supabase) return false;
  try {
    const { error } = await supabase.from('collections').upsert({
      id: collection.id,
      creator: collection.creator,
      title: collection.title,
      description: collection.description,
      cover_wart_id: collection.coverWartId,
      created_at: collection.createdAt,
      updated_at: collection.updatedAt,
    }, { onConflict: 'id' });
    if (error) { console.error('[Sync] syncCollection:', error.message); return false; }

    // Sync wart membership (delete + re-insert for correct ordering)
    await supabase.from('collection_warts').delete().eq('collection_id', collection.id);
    if (collection.wartIds.length > 0) {
      const rows = collection.wartIds.map((wartId, i) => ({
        collection_id: collection.id,
        wart_id: wartId,
        position: i,
        added_at: collection.updatedAt,
      }));
      await supabase.from('collection_warts').insert(rows);
    }
    return true;
  } catch (e) {
    console.error('[Sync] syncCollection failed:', e);
    return false;
  }
}

/** Delete a collection from Supabase */
export async function syncCollectionDelete(collectionId: string): Promise<boolean> {
  if (!isBackendAvailable() || !supabase) return false;
  try {
    // collection_warts cascade-deletes via FK
    const { error } = await supabase.from('collections').delete().eq('id', collectionId);
    if (error) { console.error('[Sync] syncCollectionDelete:', error.message); return false; }
    return true;
  } catch {
    return false;
  }
}

/** Pull all collections from Supabase */
export async function pullCollections(creator?: string): Promise<Collection[]> {
  if (!isBackendAvailable() || !supabase) return [];
  try {
    let query = supabase.from('collections').select('*').order('updated_at', { ascending: false });
    if (creator) query = query.eq('creator', creator);
    const { data, error } = await query;
    if (error || !data) return [];

    // Pull wart membership for each collection
    const collections: Collection[] = [];
    for (const row of data) {
      const { data: warts } = await supabase
        .from('collection_warts')
        .select('wart_id, position')
        .eq('collection_id', row.id)
        .order('position', { ascending: true });

      collections.push({
        id: row.id,
        creator: row.creator,
        title: row.title,
        description: row.description || '',
        coverWartId: row.cover_wart_id || null,
        wartIds: warts?.map((w: { wart_id: string }) => w.wart_id) || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
    return collections;
  } catch {
    return [];
  }
}

// ─── Auctions ─────────────────────────────────────────────

/** Sync an auction to Supabase */
export async function syncAuction(auction: Auction): Promise<boolean> {
  if (!isBackendAvailable() || !supabase) return false;
  try {
    const { error } = await supabase.from('auctions').upsert({
      id: auction.id,
      wart_id: auction.wartId,
      seller: auction.seller,
      start_price: auction.startPrice,
      reserve_price: auction.reservePrice,
      start_time: auction.startTime,
      end_time: auction.endTime,
      original_end_time: auction.originalEndTime,
      status: auction.status,
      highest_bid: auction.highestBid,
      highest_bidder: auction.highestBidder,
      created_at: auction.createdAt,
      settled_at: auction.settledAt,
    }, { onConflict: 'id' });
    if (error) { console.error('[Sync] syncAuction:', error.message); return false; }
    return true;
  } catch {
    return false;
  }
}

/** Sync a bid to Supabase */
export async function syncBid(auctionId: string, bid: Bid): Promise<boolean> {
  if (!isBackendAvailable() || !supabase) return false;
  try {
    const { error } = await supabase.from('bids').insert({
      auction_id: auctionId,
      bidder: bid.bidder,
      amount: bid.amount,
      created_at: bid.timestamp,
    });
    if (error) { console.error('[Sync] syncBid:', error.message); return false; }
    return true;
  } catch {
    return false;
  }
}

/** Pull active auctions from Supabase */
export async function pullActiveAuctions(): Promise<Auction[]> {
  if (!isBackendAvailable() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .in('status', ['active', 'created'])
      .order('end_time', { ascending: true });
    if (error || !data) return [];

    const auctions: Auction[] = [];
    for (const row of data) {
      // Pull bids for this auction
      const { data: bidsData } = await supabase
        .from('bids')
        .select('*')
        .eq('auction_id', row.id)
        .order('created_at', { ascending: true });

      const bids: Bid[] = (bidsData || []).map((b: { bidder: string; amount: number; created_at: number }) => ({
        bidder: b.bidder,
        amount: b.amount,
        timestamp: b.created_at,
      }));

      auctions.push({
        id: row.id,
        wartId: row.wart_id,
        seller: row.seller,
        startPrice: row.start_price,
        reservePrice: row.reserve_price,
        startTime: row.start_time,
        endTime: row.end_time,
        originalEndTime: row.original_end_time,
        status: row.status,
        bids,
        highestBid: row.highest_bid,
        highestBidder: row.highest_bidder,
        createdAt: row.created_at,
        settledAt: row.settled_at,
      });
    }
    return auctions;
  } catch {
    return [];
  }
}

/** Pull auction by ID (with bids) */
export async function pullAuction(auctionId: string): Promise<Auction | null> {
  if (!isBackendAvailable() || !supabase) return null;
  try {
    const { data: row, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();
    if (error || !row) return null;

    const { data: bidsData } = await supabase
      .from('bids')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: true });

    const bids: Bid[] = (bidsData || []).map((b: { bidder: string; amount: number; created_at: number }) => ({
      bidder: b.bidder,
      amount: b.amount,
      timestamp: b.created_at,
    }));

    return {
      id: row.id,
      wartId: row.wart_id,
      seller: row.seller,
      startPrice: row.start_price,
      reservePrice: row.reserve_price,
      startTime: row.start_time,
      endTime: row.end_time,
      originalEndTime: row.original_end_time,
      status: row.status,
      bids,
      highestBid: row.highest_bid,
      highestBidder: row.highest_bidder,
      createdAt: row.created_at,
      settledAt: row.settled_at,
    };
  } catch {
    return null;
  }
}

// ─── Wart Tags ────────────────────────────────────────────

/** Sync tags for a wart to Supabase */
export async function syncWartTags(wartId: string, tags: string[]): Promise<boolean> {
  if (!isBackendAvailable() || !supabase) return false;
  try {
    // Delete existing tags, then insert new ones
    await supabase.from('wart_tags').delete().eq('wart_id', wartId);
    if (tags.length > 0) {
      const rows = tags.map(tag => ({ wart_id: wartId, tag }));
      const { error } = await supabase.from('wart_tags').insert(rows);
      if (error) { console.error('[Sync] syncWartTags:', error.message); return false; }
    }
    return true;
  } catch {
    return false;
  }
}

/** Pull tags for a wart from Supabase */
export async function pullWartTags(wartId: string): Promise<string[]> {
  if (!isBackendAvailable() || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('wart_tags')
      .select('tag')
      .eq('wart_id', wartId);
    if (error || !data) return [];
    return data.map((r: { tag: string }) => r.tag);
  } catch {
    return [];
  }
}

/** Pull all tags across all warts (for tag cloud / autocomplete) */
export async function pullAllTags(): Promise<Array<{ tag: string; count: number }>> {
  if (!isBackendAvailable() || !supabase) return [];
  try {
    // Use RPC or manual grouping since Supabase doesn't have GROUP BY in REST
    const { data, error } = await supabase
      .from('wart_tags')
      .select('tag');
    if (error || !data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const tag = (row as { tag: string }).tag;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

// ─── Full Sync (Phase 2 data) ─────────────────────────────

/**
 * Pull all Phase 2 data for a user from Supabase.
 * Called during login/fullSync to hydrate local state.
 */
export async function pullPhase2Data(address: string): Promise<{
  collections: Collection[];
  auctions: Auction[];
  tagMap: Map<string, string[]>;
}> {
  const [collections, auctions] = await Promise.all([
    pullCollections(address),
    pullActiveAuctions(),
  ]);

  // Pull tags for all warts the user owns or created
  const tagMap = new Map<string, string[]>();
  if (isBackendAvailable() && supabase) {
    try {
      const { data } = await supabase
        .from('wart_tags')
        .select('wart_id, tag');
      if (data) {
        for (const row of data) {
          const r = row as { wart_id: string; tag: string };
          const existing = tagMap.get(r.wart_id) || [];
          existing.push(r.tag);
          tagMap.set(r.wart_id, existing);
        }
      }
    } catch { /* non-critical */ }
  }

  return { collections, auctions, tagMap };
}
