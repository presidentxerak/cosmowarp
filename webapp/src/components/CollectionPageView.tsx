import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { SocialEngine } from '../engine/social';
import { shortAddress } from '../engine/crypto';
import HexAvatar from './HexAvatar';
import type { Wart } from '../engine/warts';

type CollectionType = '1of1' | 'pfp' | 'editions';

interface CollectionInfo {
  type: CollectionType;
  title: string;
  description: string;
  creator: string;
  creatorAlias: string;
  items: Wart[];
  coverImage: string;
  floorPrice: number | null;
  totalVolume: number;
}

export default function CollectionPageView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { warts } = useWallet();
  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');

  // Parse which collection to show from sessionStorage
  const collectionKey = sessionStorage.getItem('strangrz_collection_key') || '';

  // Build all collections from warts
  const collections = useMemo(() => {
    const collMap: Record<string, CollectionInfo> = {};

    warts.forEach(w => {
      // 1/1 unique pieces — group by creator
      if (w.editionType === 'unique' && !w.maxEditions) {
        const key = `1of1::${w.creator}`;
        if (!collMap[key]) {
          const social = SocialEngine.load();
          const profile = social.getProfile(w.creator);
          collMap[key] = {
            type: '1of1',
            title: `${profile?.alias || shortAddress(w.creator)} — 1/1s`,
            description: 'Unique one-of-one artworks',
            creator: w.creator,
            creatorAlias: profile?.alias || shortAddress(w.creator),
            items: [],
            coverImage: '',
            floorPrice: null,
            totalVolume: 0,
          };
        }
        collMap[key].items.push(w);
        if (!collMap[key].coverImage && w.imageData) collMap[key].coverImage = w.imageData;
        if (w.price !== null) {
          collMap[key].floorPrice = collMap[key].floorPrice === null
            ? w.price
            : Math.min(collMap[key].floorPrice!, w.price);
        }
        return;
      }

      // Editions / PFP collections — group by base title + creator
      const baseTitle = w.title.replace(/\s*#\d+$/, '').trim();
      const key = `${w.creator}::${baseTitle}`;
      if (!collMap[key]) {
        const social = SocialEngine.load();
        const profile = social.getProfile(w.creator);
        const isPfp = w.mediaType === 'image' && (w.maxEditions || 0) >= 10;
        collMap[key] = {
          type: isPfp ? 'pfp' : 'editions',
          title: baseTitle,
          description: w.description || '',
          creator: w.creator,
          creatorAlias: profile?.alias || shortAddress(w.creator),
          items: [],
          coverImage: '',
          floorPrice: null,
          totalVolume: 0,
        };
      }
      collMap[key].items.push(w);
      if (!collMap[key].coverImage && w.imageData) collMap[key].coverImage = w.imageData;
      if (w.price !== null) {
        collMap[key].floorPrice = collMap[key].floorPrice === null
          ? w.price
          : Math.min(collMap[key].floorPrice!, w.price);
      }
    });

    return Object.entries(collMap)
      .filter(([, c]) => c.items.length >= 1)
      .sort((a, b) => b[1].items.length - a[1].items.length);
  }, [warts]);

  // Load the selected collection
  useEffect(() => {
    if (collectionKey) {
      const found = collections.find(([key]) => key === collectionKey);
      if (found) setSelectedCollection(found[1]);
    }
  }, [collectionKey, collections]);

  const handleViewWart = (wart: Wart) => {
    sessionStorage.setItem('strangrz_open_wart', wart.id);
    onNavigate('gallery');
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    onNavigate('user-profile');
  };

  const openCollection = (key: string, info: CollectionInfo) => {
    sessionStorage.setItem('strangrz_collection_key', key);
    setSelectedCollection(info);
  };

  const sortedItems = useMemo(() => {
    if (!selectedCollection) return [];
    const items = [...selectedCollection.items];
    switch (sortBy) {
      case 'price-asc': return items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case 'price-desc': return items.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      default: return items.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [selectedCollection, sortBy]);

  // ─── Collection Detail Page (Foundation-style) ──────
  if (selectedCollection) {
    return (
      <div className="pb-4">
        {/* Hero banner */}
        <div className="relative w-full h-48 sm:h-72 overflow-hidden">
          {selectedCollection.coverImage ? (
            <img src={selectedCollection.coverImage} alt={selectedCollection.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-current/5 flex items-center justify-center">
              <span className="text-4xl opacity-20">{selectedCollection.type === 'pfp' ? '\u25CE' : '\u25C8'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => { setSelectedCollection(null); sessionStorage.removeItem('strangrz_collection_key'); }}
            className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white/80 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back
          </button>

          {/* Collection info overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider bg-white/10 backdrop-blur-sm text-white/90 mb-2">
              {selectedCollection.type === '1of1' ? '1/1 COLLECTION' : selectedCollection.type === 'pfp' ? 'PFP COLLECTION' : 'EDITION'}
            </span>
            <h1 className="text-title-lg font-bold text-white font-title">{selectedCollection.title}</h1>
          </div>
        </div>

        {/* Creator + stats */}
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleViewUser(selectedCollection.creator)}
            >
              <HexAvatar address={selectedCollection.creator} size={32} />
              <div>
                <p className="text-body-sm opacity-60">Created by</p>
                <p className="text-base font-medium opacity-90">@{selectedCollection.creatorAlias}</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-base font-bold opacity-90">{selectedCollection.items.length}</p>
                <p className="text-label opacity-60">Items</p>
              </div>
              {selectedCollection.floorPrice !== null && (
                <div className="text-center">
                  <p className="text-base font-bold opacity-90">{selectedCollection.floorPrice} {'\u2B23'}</p>
                  <p className="text-label opacity-60">Floor</p>
                </div>
              )}
            </div>
          </div>

          {selectedCollection.description && (
            <p className="text-body-sm opacity-60 mt-3">{selectedCollection.description}</p>
          )}

          {/* Sort & view controls */}
          <div className="flex items-center justify-between mt-4 border-b border-current/10 pb-2">
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-body-sm opacity-70 bg-transparent border border-current/15 px-2 py-1 cursor-pointer"
              >
                <option value="recent">Recent</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 cursor-pointer transition-opacity ${viewMode === 'grid' ? 'opacity-90' : 'opacity-40'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 cursor-pointer transition-opacity ${viewMode === 'list' ? 'opacity-90' : 'opacity-40'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Items grid/list */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {sortedItems.map(wart => (
                <div
                  key={wart.id}
                  className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all"
                  onClick={() => handleViewWart(wart)}
                >
                  <div className="aspect-square overflow-hidden bg-current/5">
                    {wart.imageData ? (
                      <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl opacity-50">{'\u25C8'}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-body-sm font-medium opacity-90 truncate">{wart.title}</p>
                    <p className="text-label opacity-60">{wart.price !== null ? `${wart.price} \u2B23` : 'Not listed'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1 mt-3">
              {sortedItems.map(wart => (
                <div
                  key={wart.id}
                  className="glass-panel flex items-center gap-3 p-2 cursor-pointer hover:bg-current/5 transition-colors"
                  onClick={() => handleViewWart(wart)}
                >
                  <div className="w-14 h-14 shrink-0 overflow-hidden bg-current/5">
                    {wart.imageData ? (
                      <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="opacity-50">{'\u25C8'}</span></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium opacity-90 truncate">{wart.title}</p>
                    <p className="text-label opacity-60">{wart.editionType !== 'unique' ? `Edition #${wart.editionNumber}` : '1/1'}</p>
                  </div>
                  <p className="text-body-sm font-medium opacity-80 shrink-0">
                    {wart.price !== null ? `${wart.price} \u2B23` : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Collections Index Page ─────────────────────────
  const oneOfOnes = collections.filter(([, c]) => c.type === '1of1');
  const pfps = collections.filter(([, c]) => c.type === 'pfp');
  const editions = collections.filter(([, c]) => c.type === 'editions');

  const CollectionCard = ({ collKey, info }: { collKey: string; info: CollectionInfo }) => (
    <div
      className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all"
      onClick={() => openCollection(collKey, info)}
    >
      <div className="aspect-[16/9] overflow-hidden bg-current/5 relative">
        {info.coverImage ? (
          <img src={info.coverImage} alt={info.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-20">{info.type === 'pfp' ? '\u25CE' : '\u25C8'}</span>
          </div>
        )}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-black/60 text-white/80">
          {info.type === '1of1' ? '1/1' : info.type === 'pfp' ? 'PFP' : 'EDITION'}
        </span>
      </div>
      <div className="p-3">
        <p className="text-base font-bold opacity-90 truncate">{info.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <HexAvatar address={info.creator} size={14} />
          <p className="text-label opacity-60 truncate">@{info.creatorAlias}</p>
        </div>
        <div className="flex gap-4 mt-2 text-label opacity-50">
          <span>{info.items.length} items</span>
          {info.floorPrice !== null && <span>Floor: {info.floorPrice} {'\u2B23'}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-4 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between px-2 mb-4">
        <div>
          <h1 className="text-title-md font-bold font-title opacity-100">Collections</h1>
          <p className="text-body-sm opacity-60">Explore dedicated collection pages</p>
        </div>
        <button
          onClick={() => onNavigate('gallery')}
          className="text-body-sm opacity-60 hover:opacity-80 cursor-pointer px-3 py-1.5 border border-current/15"
        >
          Browse All
        </button>
      </div>

      {/* 1/1 Section */}
      {oneOfOnes.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold opacity-80 px-2 mb-2">1/1 Unique Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {oneOfOnes.map(([key, info]) => <CollectionCard key={key} collKey={key} info={info} />)}
          </div>
        </section>
      )}

      {/* PFP Section */}
      {pfps.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold opacity-80 px-2 mb-2">PFP Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pfps.map(([key, info]) => <CollectionCard key={key} collKey={key} info={info} />)}
          </div>
        </section>
      )}

      {/* Editions Section */}
      {editions.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-bold opacity-80 px-2 mb-2">Edition Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editions.map(([key, info]) => <CollectionCard key={key} collKey={key} info={info} />)}
          </div>
        </section>
      )}

      {collections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3 opacity-30">{'\u25C8'}</p>
          <p className="opacity-60 text-base">No collections yet</p>
          <p className="text-body-sm opacity-40 mt-1">Start creating or collecting artworks to build collections</p>
        </div>
      )}
    </div>
  );
}
