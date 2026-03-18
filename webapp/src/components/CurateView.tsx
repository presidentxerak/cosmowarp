import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { SocialEngine } from '../engine/social';
import { shortAddress } from '../engine/crypto';
import type { Wart } from '../engine/warts';
import HexAvatar from './HexAvatar';
import InfoTooltip from './InfoTooltip';
import { storage } from '../engine/storage';

// ─── Types ────────────────────────────────────────────────

interface CuratorArticle {
  id: string;
  authorAddress: string;
  authorAlias: string;
  title: string;
  subtitle: string;
  coverWartId: string;
  body: string;
  featuredWartIds: string[];
  featuredArtists: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  likes: string[];
  views: number;
}

interface CuratorProfile {
  address: string;
  alias: string;
  curatorSince: number;
  articlesCount: number;
  totalViews: number;
  totalLikes: number;
  featuredCollections: string[];
  bio: string;
}

type CurateTab = 'magazine' | 'curators' | 'my-articles' | 'create' | 'article-detail';

// ─── Storage ──────────────────────────────────────────────

const ARTICLES_KEY = 'strangrz_curator_articles';

function loadArticles(): CuratorArticle[] {
  try {
    const raw = storage.getItem(ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveArticles(articles: CuratorArticle[]): void {
  storage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

// ─── Component ────────────────────────────────────────────

export default function CurateView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, marketplace, myCollection, myCreated } = useWallet();
  const [tab, setTab] = useState<CurateTab>('magazine');
  const [articles, setArticles] = useState<CuratorArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<CuratorArticle | null>(null);

  // Create article form
  const [artTitle, setArtTitle] = useState('');
  const [artSubtitle, setArtSubtitle] = useState('');
  const [artBody, setArtBody] = useState('');
  const [artTags, setArtTags] = useState('');
  const [artFeaturedWarts, setArtFeaturedWarts] = useState<string[]>([]);
  const [artFeaturedArtists, setArtFeaturedArtists] = useState<string[]>([]);
  const [artCoverWartId, setArtCoverWartId] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // All warts combined
  const allWarts = useMemo(() => {
    const combined = [...marketplace, ...myCollection, ...myCreated];
    return combined.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
  }, [marketplace, myCollection, myCreated]);

  // Check if user qualifies as curator (100+ collected)
  const isCurator = myCollection.length >= 100;
  const progressToCurator = Math.min(100, Math.round((myCollection.length / 100) * 100));

  useEffect(() => {
    setArticles(loadArticles());
  }, []);

  // ─── Curator rankings ──────────────────────────────────

  const topCurators = useMemo((): CuratorProfile[] => {
    const curatorMap: Record<string, CuratorProfile> = {};
    articles.forEach(a => {
      if (!curatorMap[a.authorAddress]) {
        const social = SocialEngine.load();
        const profile = social.getProfile(a.authorAddress);
        curatorMap[a.authorAddress] = {
          address: a.authorAddress,
          alias: profile?.alias || a.authorAlias,
          curatorSince: a.createdAt,
          articlesCount: 0,
          totalViews: 0,
          totalLikes: 0,
          featuredCollections: [],
          bio: profile?.bio || '',
        };
      }
      curatorMap[a.authorAddress].articlesCount++;
      curatorMap[a.authorAddress].totalViews += a.views;
      curatorMap[a.authorAddress].totalLikes += a.likes.length;
    });
    return Object.values(curatorMap).sort((a, b) => b.totalLikes - a.totalLikes || b.articlesCount - a.articlesCount);
  }, [articles]);

  // ─── Handlers ──────────────────────────────────────────

  const getWartById = (id: string): Wart | undefined => allWarts.find(w => w.id === id);

  const getCreatorName = (address: string): string => {
    if (wallet && address === wallet.address) return 'you';
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  const handleCreateArticle = () => {
    if (!wallet || !isCurator) return;
    if (!artTitle.trim()) { setCreateError('Title is required'); return; }
    if (!artBody.trim()) { setCreateError('Article body is required'); return; }
    if (artFeaturedWarts.length === 0) { setCreateError('Select at least one artwork to feature'); return; }

    const article: CuratorArticle = {
      id: `ART_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      authorAddress: wallet.address,
      authorAlias: wallet.alias || shortAddress(wallet.address),
      title: artTitle.trim(),
      subtitle: artSubtitle.trim(),
      coverWartId: artCoverWartId || artFeaturedWarts[0],
      body: artBody.trim(),
      featuredWartIds: artFeaturedWarts,
      featuredArtists: artFeaturedArtists,
      tags: artTags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: [],
      views: 0,
    };

    const updated = [article, ...articles];
    saveArticles(updated);
    setArticles(updated);
    setArtTitle('');
    setArtSubtitle('');
    setArtBody('');
    setArtTags('');
    setArtFeaturedWarts([]);
    setArtFeaturedArtists([]);
    setArtCoverWartId('');
    setCreateError('');
    setCreateSuccess('Article published successfully!');
    setTimeout(() => setCreateSuccess(''), 3000);
    setTab('magazine');
  };

  const handleLikeArticle = (articleId: string) => {
    if (!wallet) return;
    const updated = articles.map(a => {
      if (a.id !== articleId) return a;
      const liked = a.likes.includes(wallet.address);
      return { ...a, likes: liked ? a.likes.filter(l => l !== wallet.address) : [...a.likes, wallet.address] };
    });
    saveArticles(updated);
    setArticles(updated);
  };

  const handleViewArticle = (article: CuratorArticle) => {
    // Increment view count
    const updated = articles.map(a => a.id === article.id ? { ...a, views: a.views + 1 } : a);
    saveArticles(updated);
    setArticles(updated);
    setSelectedArticle({ ...article, views: article.views + 1 });
    setTab('article-detail');
  };

  const handleDeleteArticle = (articleId: string) => {
    if (!confirm('Delete this article?')) return;
    const updated = articles.filter(a => a.id !== articleId);
    saveArticles(updated);
    setArticles(updated);
    if (selectedArticle?.id === articleId) {
      setSelectedArticle(null);
      setTab('magazine');
    }
  };

  const toggleFeaturedWart = (wartId: string) => {
    setArtFeaturedWarts(prev =>
      prev.includes(wartId) ? prev.filter(id => id !== wartId) : [...prev, wartId]
    );
  };

  const toggleFeaturedArtist = (address: string) => {
    setArtFeaturedArtists(prev =>
      prev.includes(address) ? prev.filter(a => a !== address) : [...prev, address]
    );
  };

  const navigateToProfile = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    onNavigate('user-profile');
  };

  const handleViewWart = (wartId: string) => {
    sessionStorage.setItem('strangrz_open_wart', wartId);
    onNavigate('gallery');
  };

  // ─── Magazine Cover Card ───────────────────────────────

  const MagazineCover = ({ article, featured }: { article: CuratorArticle; featured?: boolean }) => {
    const coverWart = getWartById(article.coverWartId);
    return (
      <article
        className={`group cursor-pointer transition-all duration-300 hover:scale-[1.01] ${featured ? 'col-span-full' : ''}`}
        onClick={() => handleViewArticle(article)}
      >
        <div className={`relative overflow-hidden ${featured ? 'aspect-[21/9]' : 'aspect-[4/3]'}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
          {coverWart?.imageData && coverWart.mediaType !== 'audio' ? (
            <img src={coverWart.imageData} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(100,50,150,0.1))' }}>
              <span className="text-4xl opacity-40">{'\u2B21'}</span>
            </div>
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, transparent 60%)' }} />
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            {article.tags.length > 0 && (
              <div className="flex gap-2 mb-2">
                {article.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] tracking-[0.15em] uppercase opacity-60 px-2 py-0.5" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>{tag}</span>
                ))}
              </div>
            )}
            <h3 className={`font-title font-bold opacity-95 leading-tight ${featured ? 'text-title-lg sm:text-title-xl' : 'text-title-sm'}`} style={{ color: '#ffffff' }}>
              {article.title}
            </h3>
            {article.subtitle && (
              <p className={`opacity-60 mt-1 ${featured ? 'text-base' : 'text-body-sm'}`} style={{ color: '#ffffff' }}>{article.subtitle}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <HexAvatar address={article.authorAddress} size={20} />
              <span className="text-[11px] opacity-50" style={{ color: '#ffffff' }}>by {article.authorAlias}</span>
              <span className="text-[11px] opacity-50" style={{ color: '#ffffff' }}>{'\u2022'}</span>
              <span className="text-[11px] opacity-60" style={{ color: '#ffffff' }}>{new Date(article.createdAt).toLocaleDateString()}</span>
              <span className="text-[11px] opacity-50" style={{ color: '#ffffff' }}>{'\u2022'}</span>
              <span className="text-[11px] opacity-60" style={{ color: '#ffffff' }}>{'\u2665'} {article.likes.length}</span>
            </div>
          </div>
        </div>
      </article>
    );
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-0 pb-4">
      {/* Magazine Header */}
      <div className="text-center py-6 sm:py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] tracking-[0.4em] uppercase opacity-50 mb-1">Strangrz</p>
        <h1 className="text-title-xl sm:text-[2.5rem] font-title font-bold tracking-tight opacity-95" style={{ letterSpacing: '-0.02em' }}>
          CURATE
        </h1>
        <p className="text-body-sm opacity-60 mt-1 max-w-md mx-auto">
          The art magazine for collectors and curators
        </p>
        <InfoTooltip text="Curate is Strangrz's editorial platform. Collectors who own 100+ artworks become Curators and can write articles, highlight artists, and curate collections like an art magazine." align="center" />
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {([
          { id: 'magazine' as CurateTab, label: 'Magazine' },
          { id: 'curators' as CurateTab, label: 'Top Curators' },
          ...(isCurator ? [
            { id: 'my-articles' as CurateTab, label: 'My Articles' },
            { id: 'create' as CurateTab, label: '+ New Article' },
          ] : []),
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-60 hover:opacity-70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Magazine Tab ──────────────────────────────────── */}
      {tab === 'magazine' && (
        <div className="pt-4">
          {articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl opacity-10 mb-4">{'\u2B21'}</div>
              <h3 className="text-title-sm font-title font-bold opacity-60 mb-2">No articles yet</h3>
              <p className="text-body-sm opacity-50 max-w-sm mx-auto">
                {isCurator
                  ? 'Be the first to publish a curated article! Highlight your favorite artists and artworks.'
                  : `Collect ${100 - myCollection.length} more artworks to become a Curator and start publishing.`
                }
              </p>
              {!isCurator && (
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progressToCurator}%`, background: 'linear-gradient(90deg, #d4af37, #c0a030)' }} />
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">{myCollection.length}/100 artworks collected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Featured article (first) */}
              {articles.length > 0 && <MagazineCover article={articles[0]} featured />}

              {/* Grid of other articles */}
              {articles.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {articles.slice(1).map(article => (
                    <MagazineCover key={article.id} article={article} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Top Curators Tab ──────────────────────────────── */}
      {tab === 'curators' && (
        <div className="pt-4 space-y-2">
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">Top Curators</h2>
            <p className="text-body-sm opacity-60">The most influential art curators on Strangrz</p>
          </div>
          {topCurators.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No curators yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topCurators.map((curator, idx) => (
                <button
                  key={curator.address}
                  onClick={() => navigateToProfile(curator.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <span className="text-label opacity-50 w-6 text-center font-bold">#{idx + 1}</span>
                  <HexAvatar address={curator.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium opacity-90 truncate">{curator.alias}</p>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wide" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        CURATOR
                      </span>
                    </div>
                    <div className="flex gap-3 text-label opacity-60">
                      <span>{curator.articlesCount} articles</span>
                      <span>{curator.totalLikes} likes</span>
                      <span>{curator.totalViews} views</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── My Articles Tab ───────────────────────────────── */}
      {tab === 'my-articles' && wallet && (
        <div className="pt-4 space-y-2">
          {articles.filter(a => a.authorAddress === wallet.address).length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">You haven't published any articles yet</p>
              <button onClick={() => setTab('create')} className="warp-button px-4 py-2 mt-4 text-body-sm">Write your first article</button>
            </div>
          ) : (
            <div className="space-y-2">
              {articles.filter(a => a.authorAddress === wallet.address).map(article => (
                <div key={article.id} className="glass-panel p-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold opacity-90 truncate cursor-pointer hover:opacity-100" onClick={() => handleViewArticle(article)}>{article.title}</h4>
                    <p className="text-body-sm opacity-60 truncate">{article.subtitle}</p>
                    <div className="flex gap-3 text-label opacity-50 mt-1">
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      <span>{'\u2665'} {article.likes.length}</span>
                      <span>{article.views} views</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteArticle(article.id)} className="opacity-50 hover:opacity-70 cursor-pointer text-label self-start">Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Create Article Tab ────────────────────────────── */}
      {tab === 'create' && wallet && isCurator && (
        <div className="pt-4 space-y-4 max-w-2xl mx-auto">
          <div className="glass-panel p-4 sm:p-6 space-y-4">
            <h3 className="text-title-sm font-title font-bold opacity-90">New Curated Article</h3>
            <p className="text-body-sm opacity-60">Share your perspective on the art world. Feature artists and artworks from your collection.</p>

            {createError && <p className="text-body-sm" style={{ color: '#ff6b6b' }}>{createError}</p>}
            {createSuccess && <p className="text-body-sm" style={{ color: '#51cf66' }}>{createSuccess}</p>}

            <input
              className="warp-input text-base py-2"
              value={artTitle}
              onChange={e => setArtTitle(e.target.value)}
              placeholder="Article title"
              maxLength={120}
            />
            <input
              className="warp-input text-body-sm py-2"
              value={artSubtitle}
              onChange={e => setArtSubtitle(e.target.value)}
              placeholder="Subtitle (optional)"
              maxLength={200}
            />
            <textarea
              className="warp-input text-body-sm py-2 min-h-[200px] resize-y"
              value={artBody}
              onChange={e => setArtBody(e.target.value)}
              placeholder="Write your article... Share your insights about the artists, their vision, and why these works matter."
              maxLength={5000}
            />
            <input
              className="warp-input text-body-sm py-2"
              value={artTags}
              onChange={e => setArtTags(e.target.value)}
              placeholder="Tags (comma-separated): digital art, contemporary, photography..."
              maxLength={200}
            />

            {/* Select featured artworks from collection */}
            <div>
              <p className="text-body-sm font-medium opacity-70 mb-2">
                Featured Artworks ({artFeaturedWarts.length} selected)
                <InfoTooltip text="Select artworks from your collection to feature in this article. These will appear as a curated gallery within your article." />
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {myCollection.map(wart => (
                  <button
                    key={wart.id}
                    onClick={() => { toggleFeaturedWart(wart.id); if (!artCoverWartId && !artFeaturedWarts.includes(wart.id)) setArtCoverWartId(wart.id); }}
                    className={`relative aspect-square overflow-hidden cursor-pointer transition-all ${artFeaturedWarts.includes(wart.id) ? 'ring-2' : 'opacity-50 hover:opacity-80'}`}
                    style={artFeaturedWarts.includes(wart.id) ? { boxShadow: '0 0 0 2px #d4af37' } : {}}
                  >
                    {wart.imageData && wart.mediaType !== 'audio' ? (
                      <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <span className="text-lg opacity-50">{wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
                      </div>
                    )}
                    {artFeaturedWarts.includes(wart.id) && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]" style={{ background: '#d4af37', color: '#000' }}>{'\u2713'}</div>
                    )}
                    {artCoverWartId === wart.id && (
                      <div className="absolute bottom-0 left-0 right-0 text-[8px] text-center py-0.5 font-bold" style={{ background: 'rgba(212,175,55,0.8)', color: '#000' }}>COVER</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Select featured artists */}
            <div>
              <p className="text-body-sm font-medium opacity-70 mb-2">
                Featured Artists ({artFeaturedArtists.length} selected)
                <InfoTooltip text="Highlight specific artists in your article. Their profiles will be linked and they'll be notified of the feature." />
              </p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {[...new Set(myCollection.map(w => w.creator))].map(address => (
                  <button
                    key={address}
                    onClick={() => toggleFeaturedArtist(address)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-body-sm transition-all cursor-pointer ${artFeaturedArtists.includes(address) ? 'opacity-90' : 'opacity-60 hover:opacity-60'}`}
                    style={artFeaturedArtists.includes(address) ? { background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' } : { border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <HexAvatar address={address} size={16} />
                    {getCreatorName(address)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateArticle}
              className="warp-button w-full py-3 text-base font-medium"
            >
              Publish Article
            </button>
          </div>
        </div>
      )}

      {/* ─── Not a Curator Yet ─────────────────────────────── */}
      {tab === 'create' && wallet && !isCurator && (
        <div className="text-center py-16 px-4">
          <div className="max-w-md mx-auto glass-panel p-6 sm:p-8">
            <div className="text-4xl opacity-40 mb-4">{'\u2B21'}</div>
            <h3 className="text-title-sm font-title font-bold opacity-80 mb-2">Become a Curator</h3>
            <p className="text-body-sm opacity-60 mb-4">
              Collect 100 artworks to unlock Curator status. Curators can write editorial articles, feature artists, and create curated collections.
            </p>
            <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressToCurator}%`, background: 'linear-gradient(90deg, #d4af37, #c0a030)' }} />
            </div>
            <p className="text-label opacity-60">{myCollection.length}/100 artworks collected ({progressToCurator}%)</p>
            <button onClick={() => onNavigate('gallery')} className="warp-button px-6 py-2 mt-4 text-body-sm">Browse Gallery</button>
          </div>
        </div>
      )}

      {/* ─── Article Detail ────────────────────────────────── */}
      {tab === 'article-detail' && selectedArticle && (
        <div className="pt-0 max-w-3xl mx-auto">
          {/* Back button */}
          <button onClick={() => { setSelectedArticle(null); setTab('magazine'); }} className="text-body-sm opacity-60 hover:opacity-70 cursor-pointer py-3 flex items-center gap-1">
            {'\u2190'} Back to Magazine
          </button>

          {/* Article cover */}
          {(() => {
            const coverWart = getWartById(selectedArticle.coverWartId);
            return coverWart?.imageData && coverWart.mediaType !== 'audio' ? (
              <div className="relative aspect-[21/9] overflow-hidden mb-6">
                <img src={coverWart.imageData} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
              </div>
            ) : null;
          })()}

          {/* Article header */}
          <div className="px-0 sm:px-4 mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem' }}>
            {selectedArticle.tags.length > 0 && (
              <div className="flex gap-2 mb-3">
                {selectedArticle.tags.map(tag => (
                  <span key={tag} className="text-[10px] tracking-[0.15em] uppercase opacity-60 px-2 py-0.5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>{tag}</span>
                ))}
              </div>
            )}
            <h1 className="text-title-lg sm:text-title-xl font-title font-bold opacity-95 leading-tight">{selectedArticle.title}</h1>
            {selectedArticle.subtitle && (
              <p className="text-base opacity-50 mt-2 italic">{selectedArticle.subtitle}</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <HexAvatar address={selectedArticle.authorAddress} size={28} />
              <div>
                <button onClick={() => navigateToProfile(selectedArticle.authorAddress)} className="text-body-sm font-medium opacity-80 hover:opacity-100 cursor-pointer">{selectedArticle.authorAlias}</button>
                <div className="flex gap-3 text-label opacity-50">
                  <span>{new Date(selectedArticle.createdAt).toLocaleDateString()}</span>
                  <span>{selectedArticle.views} views</span>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <button
                  onClick={() => handleLikeArticle(selectedArticle.id)}
                  className="flex items-center gap-1.5 opacity-50 hover:opacity-80 cursor-pointer transition-colors text-body-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={wallet && selectedArticle.likes.includes(wallet.address) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  {selectedArticle.likes.length}
                </button>
                <button
                  onClick={() => navigator.share?.({ title: selectedArticle.title, text: `${selectedArticle.title} — Curated on Strangrz` }).catch(() => {})}
                  className="opacity-50 hover:opacity-80 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Article body */}
          <div className="px-0 sm:px-4 text-base opacity-70 leading-relaxed whitespace-pre-wrap mb-8" style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', lineHeight: '1.8' }}>
            {selectedArticle.body}
          </div>

          {/* Featured artworks gallery */}
          {selectedArticle.featuredWartIds.length > 0 && (
            <div className="px-0 sm:px-4 mb-8">
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-50 mb-3">Featured Works</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedArticle.featuredWartIds.map(wartId => {
                  const wart = getWartById(wartId);
                  if (!wart) return null;
                  return (
                    <div key={wartId} className="cursor-pointer group" onClick={() => handleViewWart(wartId)}>
                      <div className="relative aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {wart.imageData && wart.mediaType !== 'audio' ? (
                          <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl opacity-40">{wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-body-sm font-medium opacity-80 mt-1 truncate">{wart.title}</p>
                      <p className="text-label opacity-50">by {getCreatorName(wart.creator)}</p>
                      {wart.price !== null && <p className="text-label opacity-60">{wart.price} {'\u2B23'}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured artists */}
          {selectedArticle.featuredArtists.length > 0 && (
            <div className="px-0 sm:px-4 mb-8">
              <p className="text-[10px] tracking-[0.3em] uppercase opacity-50 mb-3">Featured Artists</p>
              <div className="flex flex-wrap gap-2">
                {selectedArticle.featuredArtists.map(address => (
                  <button
                    key={address}
                    onClick={() => navigateToProfile(address)}
                    className="flex items-center gap-2 px-3 py-2 glass-panel hover:bg-current/5 transition-colors cursor-pointer"
                  >
                    <HexAvatar address={address} size={28} />
                    <div className="text-left">
                      <p className="text-body-sm font-medium opacity-80">{getCreatorName(address)}</p>
                      <p className="text-label opacity-50">{shortAddress(address)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
