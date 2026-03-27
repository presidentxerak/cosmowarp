import { useState, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { computeRarity, RARITY_CONFIG, isExpired } from '../engine/warts';
import type { Wart } from '../engine/warts';
import { SocialEngine } from '../engine/social';
import InfoTooltip from './InfoTooltip';

// ─── Types ────────────────────────────────────────────────

type TradingTab = 'overview' | 'live-listings' | 'activity' | 'collections' | 'portfolio';
type SortBy = 'price-asc' | 'price-desc' | 'recent' | 'popular' | 'volume';
type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all';

// ─── Component ────────────────────────────────────────────

export default function TradingView() {
  const {
    wallet, unlocked, marketplace, myCollection, myCreated,
    buyWart, listWart, delistWart,
  } = useWallet();

  const [tab, setTab] = useState<TradingTab>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);

  // All warts
  const allWarts = useMemo(() => {
    const combined = [...marketplace, ...myCollection, ...myCreated];
    return combined.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i).filter(w => !isExpired(w));
  }, [marketplace, myCollection, myCreated]);

  // Listed warts (active marketplace)
  const listedWarts = useMemo(() => {
    return allWarts.filter(w => w.listed && w.price !== null);
  }, [allWarts]);

  // Sort listed warts
  const sortedListings = useMemo(() => {
    const sorted = [...listedWarts];
    switch (sortBy) {
      case 'price-asc': return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc': return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'recent': return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'popular': return sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      case 'volume': return sorted.sort((a, b) => {
        const volA = (a.history || []).reduce((s, h) => s + h.price, 0);
        const volB = (b.history || []).reduce((s, h) => s + h.price, 0);
        return volB - volA;
      });
      default: return sorted;
    }
  }, [listedWarts, sortBy]);

  // Recent activity (all transfers)
  const recentActivity = useMemo(() => {
    const activities: { wart: Wart; transfer: Wart['history'][0]; type: 'sale' | 'transfer' | 'mint' }[] = [];
    const now = Date.now();
    const rangeMs = timeRange === '1h' ? 3600000 : timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : timeRange === '30d' ? 2592000000 : Infinity;

    allWarts.forEach(w => {
      (w.history || []).forEach((h, idx) => {
        if (now - h.timestamp > rangeMs) return;
        const type = idx === 0 ? 'mint' : h.price > 0 ? 'sale' : 'transfer';
        activities.push({ wart: w, transfer: h, type });
      });
    });

    return activities.sort((a, b) => b.transfer.timestamp - a.transfer.timestamp).slice(0, 100);
  }, [allWarts, timeRange]);

  // Market stats
  const marketStats = useMemo(() => {
    const totalListings = listedWarts.length;
    const totalVolume = allWarts.reduce((s, w) => s + (w.history || []).reduce((sum, h) => sum + h.price, 0), 0);
    const floorPrice = listedWarts.length > 0 ? Math.min(...listedWarts.map(w => w.price || Infinity)) : 0;
    const avgPrice = listedWarts.length > 0 ? listedWarts.reduce((s, w) => s + (w.price || 0), 0) / listedWarts.length : 0;
    const totalArtworks = allWarts.length;
    const uniqueOwners = new Set(allWarts.map(w => w.owner)).size;
    const uniqueCreators = new Set(allWarts.map(w => w.creator)).size;
    return { totalListings, totalVolume, floorPrice, avgPrice, totalArtworks, uniqueOwners, uniqueCreators };
  }, [allWarts, listedWarts]);

  // Collection rankings
  const collectionRankings = useMemo(() => {
    const collMap: Record<string, { name: string; creator: string; items: Wart[]; volume: number; floorPrice: number; change24h: number }> = {};
    allWarts.forEach(w => {
      const baseName = w.title.replace(/\s*#\d+$/, '');
      const key = `${w.creator}::${baseName}`;
      if (!collMap[key]) collMap[key] = { name: baseName, creator: w.creator, items: [], volume: 0, floorPrice: Infinity, change24h: 0 };
      collMap[key].items.push(w);
      if (w.listed && w.price !== null && w.price < collMap[key].floorPrice) collMap[key].floorPrice = w.price;
      (w.history || []).forEach(h => { collMap[key].volume += h.price; });
    });
    return Object.values(collMap)
      .filter(c => c.items.length >= 2)
      .map(c => ({ ...c, floorPrice: c.floorPrice === Infinity ? null : c.floorPrice }))
      .sort((a, b) => b.volume - a.volume);
  }, [allWarts]);

  // Portfolio value
  const portfolioStats = useMemo(() => {
    if (!wallet) return { totalValue: 0, unrealized: 0, items: 0, spent: 0 };
    const owned = allWarts.filter(w => w.owner === wallet.address);
    const totalValue = owned.reduce((s, w) => s + (w.price || 0), 0);
    const spent = owned.reduce((s, w) => {
      const buyH = (w.history || []).filter(h => h.to === wallet.address && h.price > 0);
      return s + buyH.reduce((sum, h) => sum + h.price, 0);
    }, 0);
    return { totalValue, unrealized: totalValue - spent, items: owned.length, spent };
  }, [allWarts, wallet]);

  const getCreatorName = (address: string): string => {
    if (wallet && address === wallet.address) return 'you';
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  const handleBuy = async (wart: Wart) => {
    if (!wallet || buying) return;
    setBuying(true);
    try {
      const result = await buyWart(wart.id);
      setBuyResult({ success: result.success, message: result.error || 'Purchase complete!' });
    } catch (err) {
      setBuyResult({ success: false, message: 'Transaction failed' });
    }
    setBuying(false);
    setTimeout(() => setBuyResult(null), 3000);
  };

  const handleViewWart = (wartId: string) => {
    sessionStorage.setItem('strangrz_open_wart', wartId);
    sessionStorage.setItem('strangrz_gallery_tab', 'detail');
    window.dispatchEvent(new CustomEvent('strangrz_gallery_tab', { detail: 'detail' }));
  };

  const navigateToProfile = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'user-profile' }));
  };

  if (!wallet || !unlocked) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Unlock your wallet to access trading features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pb-4">
      {/* Trading Header */}
      <div className="glass-panel p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-title-sm font-bold font-title opacity-95 flex items-center gap-2">
              Trading Floor
              <InfoTooltip text="The Strangrz Trading Floor gives you a real-time view of all marketplace activity. Track prices, volume, collection rankings, and manage your portfolio — all powered by STRNGRZ (⬣), the native currency for digital art." />
            </h2>
            <p className="text-body-sm opacity-60">Powered by STRNGRZ {'\u2B23'}</p>
          </div>
        </div>

        {/* Market Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Volume', value: `${marketStats.totalVolume.toFixed(1)} \u2B23`, sub: `${marketStats.totalArtworks} artworks` },
            { label: 'Active Listings', value: `${marketStats.totalListings}`, sub: `Floor: ${marketStats.floorPrice.toFixed(1)} \u2B23` },
            { label: 'Unique Owners', value: `${marketStats.uniqueOwners}`, sub: `${marketStats.uniqueCreators} creators` },
            { label: 'Avg Price', value: `${marketStats.avgPrice.toFixed(1)} \u2B23`, sub: 'per artwork' },
          ].map(stat => (
            <div key={stat.label} className="p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] opacity-50 uppercase tracking-wider">{stat.label}</p>
              <p className="text-base font-bold opacity-90 mt-0.5">{stat.value}</p>
              <p className="text-[10px] opacity-50">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { id: 'overview' as TradingTab, label: 'Overview' },
          { id: 'live-listings' as TradingTab, label: 'Live Listings' },
          { id: 'activity' as TradingTab, label: 'Activity' },
          { id: 'collections' as TradingTab, label: 'Collections' },
          { id: 'portfolio' as TradingTab, label: 'My Portfolio' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id ? 'border-current/20 opacity-80' : 'border-transparent opacity-60 hover:opacity-70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview ──────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="pt-4 space-y-4">
          {/* Trending Artworks */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 mb-2 px-1">Trending</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sortedListings.slice(0, 8).map(wart => (
                <div key={wart.id} className="glass-panel p-2 cursor-pointer hover:border-current/20 transition-all" onClick={() => handleViewWart(wart.id)}>
                  {wart.imageData && wart.mediaType !== 'audio' ? (
                    <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-2xl opacity-40">{wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
                    </div>
                  )}
                  <p className="text-body-sm font-medium opacity-80 mt-1 truncate">{wart.title}</p>
                  <div className="flex justify-between items-center mt-0.5">
                    <p className="text-label opacity-60">{getCreatorName(wart.creator)}</p>
                    <p className="text-body-sm font-bold opacity-70">{wart.price} {'\u2B23'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-current/5">
                    <span className="text-[10px] opacity-50">{'\u2665'} {wart.likes?.length || 0}</span>
                    <span className={`text-[10px] px-1 py-0.5 ${RARITY_CONFIG[computeRarity(wart)].color}`}>{computeRarity(wart)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sales */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 mb-2 px-1">Recent Sales</p>
            <div className="space-y-1">
              {recentActivity.filter(a => a.type === 'sale').slice(0, 10).map((act, i) => (
                <div key={`${act.wart.id}-${i}`} className="glass-panel p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => handleViewWart(act.wart.id)}>
                  {act.wart.imageData && act.wart.mediaType !== 'audio' && (
                    <img src={act.wart.imageData} alt="" className="w-10 h-10 object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium opacity-80 truncate">{act.wart.title}</p>
                    <p className="text-label opacity-50">{getCreatorName(act.transfer.from)} {'\u2192'} {getCreatorName(act.transfer.to)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-body-sm font-bold opacity-80">{act.transfer.price.toFixed(1)} {'\u2B23'}</p>
                    <p className="text-[10px] opacity-50">{new Date(act.transfer.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {recentActivity.filter(a => a.type === 'sale').length === 0 && (
                <p className="text-center py-8 opacity-50 text-body-sm">No recent sales</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Live Listings ─────────────────────────────────── */}
      {tab === 'live-listings' && (
        <div className="pt-4 space-y-3">
          {/* Sort controls */}
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'recent' as SortBy, label: 'Recent' },
              { id: 'price-asc' as SortBy, label: 'Price: Low' },
              { id: 'price-desc' as SortBy, label: 'Price: High' },
              { id: 'popular' as SortBy, label: 'Popular' },
              { id: 'volume' as SortBy, label: 'Volume' },
            ]).map(s => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={`px-3 py-1 text-[11px] cursor-pointer transition-all ${
                  sortBy === s.id ? 'opacity-80 bg-current/10 border border-current/20' : 'opacity-60 border border-current/5 hover:opacity-60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {sortedListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No active listings</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedListings.map(wart => (
                <div key={wart.id} className="glass-panel p-3 flex items-center gap-3 hover:bg-current/5 transition-colors">
                  <div className="w-14 h-14 shrink-0 overflow-hidden cursor-pointer" onClick={() => handleViewWart(wart.id)}>
                    {wart.imageData && wart.mediaType !== 'audio' ? (
                      <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-lg opacity-40">{wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewWart(wart.id)}>
                    <p className="text-base font-medium opacity-90 truncate">{wart.title}</p>
                    <div className="flex items-center gap-2 text-label opacity-60">
                      <span>{getCreatorName(wart.creator)}</span>
                      <span className={`px-1 py-0.5 text-[9px] ${RARITY_CONFIG[computeRarity(wart)].color}`}>{computeRarity(wart)}</span>
                      <span>{'\u2665'} {wart.likes?.length || 0}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold opacity-90">{wart.price} {'\u2B23'}</p>
                    {wart.owner !== wallet.address ? (
                      <button
                        onClick={() => handleBuy(wart)}
                        disabled={buying}
                        className="warp-button text-[11px] px-3 py-1 mt-1"
                      >
                        {buying ? 'Buying...' : 'Buy Now'}
                      </button>
                    ) : (
                      <button
                        onClick={() => delistWart(wart.id)}
                        className="text-[11px] opacity-60 hover:opacity-70 cursor-pointer mt-1"
                      >
                        Delist
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Activity Feed ─────────────────────────────────── */}
      {tab === 'activity' && (
        <div className="pt-4 space-y-3">
          {/* Time range filter */}
          <div className="flex gap-2">
            {(['1h', '24h', '7d', '30d', 'all'] as TimeRange[]).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1 text-[11px] cursor-pointer transition-all ${
                  timeRange === t ? 'opacity-80 bg-current/10 border border-current/20' : 'opacity-60 border border-current/5 hover:opacity-60'
                }`}
              >
                {t === 'all' ? 'All Time' : t}
              </button>
            ))}
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No activity in this period</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((act, i) => (
                <div key={`${act.wart.id}-${i}`} className="glass-panel p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => handleViewWart(act.wart.id)}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{
                    background: act.type === 'sale' ? '#51cf66' : act.type === 'mint' ? '#339af0' : '#fcc419',
                  }} />
                  {act.wart.imageData && act.wart.mediaType !== 'audio' && (
                    <img src={act.wart.imageData} alt="" className="w-8 h-8 object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm opacity-80">
                      <span className="font-medium">{act.wart.title}</span>
                      <span className="opacity-50"> — {act.type === 'sale' ? 'Sold' : act.type === 'mint' ? 'Minted' : 'Transferred'}</span>
                    </p>
                    <p className="text-label opacity-50">
                      {getCreatorName(act.transfer.from)} {'\u2192'} {getCreatorName(act.transfer.to)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {act.transfer.price > 0 && (
                      <p className="text-body-sm font-bold opacity-70">{act.transfer.price.toFixed(1)} {'\u2B23'}</p>
                    )}
                    <p className="text-[10px] opacity-25">{new Date(act.transfer.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Collections Rankings ──────────────────────────── */}
      {tab === 'collections' && (
        <div className="pt-4 space-y-2">
          <div className="glass-panel p-3">
            <div className="grid grid-cols-12 gap-2 text-[10px] opacity-50 uppercase tracking-wider px-1">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Collection</span>
              <span className="col-span-2 text-right">Floor</span>
              <span className="col-span-2 text-right">Volume</span>
              <span className="col-span-1 text-right">Items</span>
              <span className="col-span-2 text-right">Creator</span>
            </div>
          </div>
          {collectionRankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No collections yet</p>
            </div>
          ) : (
            collectionRankings.slice(0, 50).map((coll, idx) => (
              <div key={`${coll.creator}-${coll.name}`} className="glass-panel p-3 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => navigateToProfile(coll.creator)}>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-body-sm font-bold opacity-60">{idx + 1}</span>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    {coll.items[0]?.imageData && (
                      <img src={coll.items[0].imageData} alt="" className="w-8 h-8 object-cover shrink-0" />
                    )}
                    <p className="text-body-sm font-medium opacity-80 truncate">{coll.name}</p>
                  </div>
                  <p className="col-span-2 text-right text-body-sm opacity-70">{coll.floorPrice !== null ? `${coll.floorPrice} \u2B23` : '—'}</p>
                  <p className="col-span-2 text-right text-body-sm font-bold opacity-80">{coll.volume.toFixed(1)} {'\u2B23'}</p>
                  <p className="col-span-1 text-right text-body-sm opacity-50">{coll.items.length}</p>
                  <p className="col-span-2 text-right text-label opacity-60 truncate">{getCreatorName(coll.creator)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Portfolio ─────────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div className="pt-4 space-y-4">
          {/* Portfolio Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Portfolio Value', value: `${portfolioStats.totalValue.toFixed(1)} \u2B23` },
              { label: 'Items Owned', value: `${portfolioStats.items}` },
              { label: 'Total Spent', value: `${portfolioStats.spent.toFixed(1)} \u2B23` },
              { label: 'Unrealized P&L', value: `${portfolioStats.unrealized >= 0 ? '+' : ''}${portfolioStats.unrealized.toFixed(1)} \u2B23` },
            ].map(stat => (
              <div key={stat.label} className="glass-panel p-3 text-center">
                <p className="text-[10px] opacity-50 uppercase tracking-wider">{stat.label}</p>
                <p className={`text-base font-bold mt-0.5 ${stat.label === 'Unrealized P&L' ? (portfolioStats.unrealized >= 0 ? 'opacity-80' : 'opacity-70') : 'opacity-90'}`} style={stat.label === 'Unrealized P&L' ? { color: portfolioStats.unrealized >= 0 ? '#51cf66' : '#ff6b6b' } : {}}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Owned items */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase opacity-50 mb-2 px-1">Your Collection</p>
            {allWarts.filter(w => w.owner === wallet.address).length === 0 ? (
              <div className="text-center py-12">
                <p className="opacity-60 text-base">No artworks in your portfolio</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allWarts.filter(w => w.owner === wallet.address).map(wart => (
                  <div key={wart.id} className="glass-panel p-2 cursor-pointer hover:border-current/20 transition-all" onClick={() => handleViewWart(wart.id)}>
                    {wart.imageData && wart.mediaType !== 'audio' ? (
                      <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-2xl opacity-40">{wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
                      </div>
                    )}
                    <p className="text-body-sm font-medium opacity-80 mt-1 truncate">{wart.title}</p>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className={`text-[10px] px-1 py-0.5 ${RARITY_CONFIG[computeRarity(wart)].color}`}>{computeRarity(wart)}</span>
                      <span className="text-body-sm font-bold opacity-70">{wart.price !== null ? `${wart.price} \u2B23` : '—'}</span>
                    </div>
                    <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-current/5">
                      {wart.listed ? (
                        <button onClick={e => { e.stopPropagation(); delistWart(wart.id); }} className="flex-1 text-[10px] opacity-60 hover:opacity-70 cursor-pointer py-1">Delist</button>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); const p = prompt('List price in STRNGRZ:'); if (p) listWart(wart.id, parseFloat(p)); }} className="flex-1 text-[10px] opacity-60 hover:opacity-70 cursor-pointer py-1">List for sale</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buy result toast */}
      {buyResult && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 text-body-sm font-medium" style={{ background: buyResult.success ? 'rgba(81,207,102,0.9)' : 'rgba(255,107,107,0.9)', color: '#000' }}>
          {buyResult.message}
        </div>
      )}
    </div>
  );
}
