import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { CosmoChatEngine } from '../engine/cosmochat';
import { SocialEngine } from '../engine/social';
import { FiatGateway, getCurrencySymbol } from '../engine/fiatgateway';
import type { Wart } from '../engine/warts';

const _fg = new FiatGateway();
function getEurPrice(wart: Wart): number {
  if (wart.priceFiat && wart.fiatCurrency) return wart.priceFiat;
  if (wart.price != null) return _fg.warpsToFiat(wart.price, 'EUR');
  return 0;
}
function getEurSym(wart: Wart): string { return getCurrencySymbol(wart.fiatCurrency || 'EUR'); }
import type { ChatPost, ChatChannel } from '../engine/cosmochat';
import { uploadMedia as uploadMediaToStorage, downloadMediaAsDataUrl } from '../lib/supabase-storage';
import { isBackendAvailable } from '../lib/supabase';
import HexAvatar from './HexAvatar';
import { copyToClipboard } from '../lib/clipboard';

type Tab = 'feed' | 'timeline' | 'explore' | 'channels';
type LeaderboardTab = 'artists' | 'buyers';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function formatViews(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function CosmoChatView() {
  const { wallet, unlocked, send, myCreated, myCollection, marketplace, warts: allWarts, buyWart, toggleWartLike, toggleWartBookmark } = useWallet();
  const [engine] = useState(() => CosmoChatEngine.load());
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);

  // Compose
  const [composeText, setComposeText] = useState('');
  const [composeMedia, setComposeMedia] = useState('');
  const [composeMediaType, setComposeMediaType] = useState<'image' | 'audio' | 'video' | ''>('');
  const [composeAudioCover, setComposeAudioCover] = useState('');
  const [composeWartLink, setComposeWartLink] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioCoverRef = useRef<HTMLInputElement>(null);

  // Post detail
  const [selectedPost, setSelectedPost] = useState<ChatPost | null>(null);
  const [commentText, setCommentText] = useState('');

  // Channel
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [channelMsg, setChannelMsg] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  const channelScrollRef = useRef<HTMLDivElement>(null);

  // Share modal
  const [sharePost, setSharePost] = useState<ChatPost | null>(null);

  // Artwork picker
  const [showArtPicker, setShowArtPicker] = useState(false);

  // Media upload state (must be before early return)
  const [mediaError, setMediaError] = useState('');

  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('artists');

  // Feed share modal
  const [feedShareWart, setFeedShareWart] = useState<Wart | null>(null);

  const refresh = () => {
    const e = CosmoChatEngine.load();
    setPosts(e.getTimeline());
    setChannels(e.getChannels());
  };

  useEffect(() => { refresh(); }, [tab]);

  // ─── Leaderboard data (last 7 days) ─────────────────────
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const topArtists = useMemo(() => {
    const map: Record<string, { address: string; count: number }> = {};
    allWarts.filter(w => w.createdAt > sevenDaysAgo).forEach(w => {
      if (!map[w.creator]) map[w.creator] = { address: w.creator, count: 0 };
      map[w.creator].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [allWarts]);

  const topBuyers = useMemo(() => {
    const map: Record<string, { address: string; spent: number }> = {};
    allWarts.forEach(w => {
      (w.history || []).filter(h => h.timestamp > sevenDaysAgo && h.price > 0).forEach(h => {
        if (!map[h.to]) map[h.to] = { address: h.to, spent: 0 };
        map[h.to].spent += h.price;
      });
    });
    return Object.values(map).sort((a, b) => b.spent - a.spent).slice(0, 3);
  }, [allWarts]);

  // Sync channels & posts from cloud on mount, rehydrate media from IndexedDB + Supabase Storage
  useEffect(() => {
    const e = CosmoChatEngine.load();
    e.rehydratePostMedia().then(() => {
      setPosts(e.getTimeline());
      return e.fullSync(wallet?.address);
    }).then(() => {
      refresh();
      // For posts with mediaType but no mediaData, try fetching from Supabase Storage
      if (isBackendAvailable()) {
        const timeline = e.getTimeline();
        const postsNeedingMedia = timeline.filter(p => p.mediaType && !p.mediaData).slice(0, 20);
        for (const post of postsNeedingMedia) {
          // Try multiple path patterns for compatibility
          downloadMediaAsDataUrl(`warts/post_${post.id}/main`).then(dataUrl => {
            if (dataUrl) {
              setPosts(prev => prev.map(p => p.id === post.id ? { ...p, mediaData: dataUrl } : p));
            }
          }).catch(() => {});
        }
      }
    }).catch(() => {});
  }, []);

  // Open post from deep link (e.g. from Signets)
  useEffect(() => {
    const postId = sessionStorage.getItem('strangrz_open_post');
    if (postId) {
      sessionStorage.removeItem('strangrz_open_post');
      const e = CosmoChatEngine.load();
      const post = e.getPost(postId);
      if (post) setSelectedPost(post);
    }
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      channelScrollRef.current?.scrollTo(0, channelScrollRef.current.scrollHeight);
    }
  }, [selectedChannel?.messages.length]);

  // Ensure social profile exists + sync relationships from cloud
  useEffect(() => {
    if (!wallet || !unlocked) return;
    const social = SocialEngine.load();
    social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    social.syncFromCloud(wallet.address).catch(() => {});
  }, [wallet?.address, wallet?.alias, unlocked]);

  // ─── TikTok-style feed for unauthenticated users ─────
  const feedWarts = useMemo(() => {
    const all = [...allWarts].filter(w => w.imageData && w.listed && w.price !== null);
    // Sort by newest first, then shuffle slightly for variety
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }, [allWarts]);

  const feedScrollRef = useRef<HTMLDivElement>(null);
  const [currentFeedIdx, setCurrentFeedIdx] = useState(0);

  const handleFeedScroll = useCallback(() => {
    const el = feedScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setCurrentFeedIdx(idx);
  }, []);

  const getCreatorNameForFeed = (address: string): string => {
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  const requireAuth = () => {
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'wallet' }));
  };

  const isAuth = !!(wallet && unlocked);

  // Redirect to auth only when trying to use authenticated features
  if (!isAuth && tab !== 'feed') {
    setTab('feed');
  }

  // ─── Render TikTok Feed ──────────────────────────────
  const renderFeed = () => {
    if (feedWarts.length === 0) {
      return (
        <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-5xl mb-4">{'\u2B21'}</p>
          <h2 className="text-title-lg font-bold font-title mb-3">Bienvenue sur Strangrz</h2>
          <p className="text-base opacity-60 mb-8 max-w-sm">Découvrez, achetez et collectionnez des oeuvres d'art uniques. Connectez-vous avec les artistes.</p>
          <button onClick={requireAuth} className="cta-gradient-btn px-8 py-4 text-base font-bold">
            Créer un compte gratuit
          </button>
          {!isAuth && (
            <button onClick={requireAuth} className="mt-3 text-body-sm opacity-50 cursor-pointer hover:opacity-80">
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>
      );
    }

    const handleFeedAction = (action: () => void) => {
      if (!isAuth) { requireAuth(); return; }
      action();
    };

    const openWartDetail = (wartId: string) => {
      sessionStorage.setItem('strangrz_open_wart', wartId);
      sessionStorage.setItem('strangrz_gallery_tab', 'detail');
      window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'gallery' }));
    };

    return (
      <div className="fixed inset-0 z-40 bg-black">
        {/* Feed share modal */}
        {feedShareWart && (
          <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setFeedShareWart(null)}>
            <div className="glass-panel p-5 max-w-sm w-full space-y-3 text-white" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold opacity-90">Partager</h3>
              <p className="text-body-sm opacity-60 truncate">{feedShareWart.title}</p>
              <button className="warp-button w-full text-body-sm py-2" onClick={() => {
                const url = `${window.location.origin}/gallery?wart=${feedShareWart.id}`;
                navigator.clipboard?.writeText(url).catch(() => {});
                setFeedShareWart(null);
              }}>{'\u2398'} Copier le lien</button>
              <button className="warp-button w-full text-body-sm py-2" onClick={() => {
                window.open(`mailto:?subject=${encodeURIComponent(feedShareWart.title)}&body=${encodeURIComponent(`${feedShareWart.title} — ${window.location.origin}/gallery?wart=${feedShareWart.id}`)}`, '_blank');
                setFeedShareWart(null);
              }}>{'\u2709'} Email</button>
              <button className="warp-button w-full text-body-sm py-2" onClick={() => {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${feedShareWart.title} — ${window.location.origin}/gallery?wart=${feedShareWart.id}`)}`, '_blank');
                setFeedShareWart(null);
              }}>Partager sur X</button>
              <button className="text-body-sm opacity-60 hover:opacity-70 cursor-pointer w-full text-center" onClick={() => setFeedShareWart(null)}>Annuler</button>
            </div>
          </div>
        )}

        <div
          ref={feedScrollRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
          onScroll={handleFeedScroll}
        >
          {feedWarts.map((wart, idx) => {
            const liked = isAuth && wart.likes?.includes(wallet!.address);
            return (
              <div key={wart.id} className="h-screen w-full snap-start relative flex items-end">
                {/* Full-screen media */}
                {wart.mediaType === 'video' ? (
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    src={wart.imageData}
                    autoPlay={idx === currentFeedIdx}
                    muted
                    loop
                    playsInline
                    preload={Math.abs(idx - currentFeedIdx) <= 1 ? 'auto' : 'none'}
                  />
                ) : (
                  <img
                    src={wart.imageData}
                    alt={wart.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={Math.abs(idx - currentFeedIdx) <= 2 ? 'eager' : 'lazy'}
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)' }} />

                {/* Right side actions */}
                <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
                  <button onClick={() => handleFeedAction(() => {
                    sessionStorage.setItem('strangrz_view_user', wart.creator);
                    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'user-profile' }));
                  })} className="flex flex-col items-center gap-1 cursor-pointer">
                    <HexAvatar address={wart.creator} size={40} />
                    <span className="text-[9px] text-white/70 font-bold">+</span>
                  </button>
                  <button onClick={() => handleFeedAction(() => { if (wallet) toggleWartLike(wart.id); })} className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={liked ? 'white' : 'none'} stroke="white" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    <span className="text-[10px] text-white/80">{wart.likes?.length || 0}</span>
                  </button>
                  <button onClick={() => handleFeedAction(() => openWartDetail(wart.id))} className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-[10px] text-white/80">{wart.comments?.length || 0}</span>
                  </button>
                  <button onClick={() => setFeedShareWart(wart)} className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  </button>
                  <button onClick={() => handleFeedAction(() => { if (wallet) toggleWartBookmark(wart.id); })} className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill={wallet && wart.bookmarks?.includes(wallet.address) ? 'white' : 'none'} stroke="white" strokeWidth="1.8"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>

                {/* Bottom info */}
                <div className="relative w-full px-4 pb-24 pr-16 z-10">
                  <button onClick={() => handleFeedAction(() => {
                    sessionStorage.setItem('strangrz_view_user', wart.creator);
                    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'user-profile' }));
                  })} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <span className="text-white text-sm font-bold">@{getCreatorNameForFeed(wart.creator)}</span>
                  </button>
                  <h3 className="text-white text-lg font-bold mb-1">{wart.title}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-white font-bold text-base">{getEurSym(wart)}{getEurPrice(wart).toFixed(2)}</span>
                    {wart.editionType === 'limited' && wart.maxEditions && (
                      <span className="text-white/60 text-xs px-2 py-0.5 border border-white/20">{wart.editionNumber}/{wart.maxEditions}</span>
                    )}
                    {wart.editionType === 'unique' && (
                      <span className="text-white/60 text-xs px-2 py-0.5 border border-white/20">1/1</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFeedAction(() => openWartDetail(wart.id))}
                      className="flex-1 py-3 text-sm font-bold text-center cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #d4af37 100%)', color: '#fff' }}
                    >
                      Collect {getEurSym(wart)}{getEurPrice(wart).toFixed(2)}
                    </button>
                    <button
                      onClick={() => openWartDetail(wart.id)}
                      className="py-3 px-4 text-sm text-white/70 cursor-pointer border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      Voir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If on feed tab, render it (both auth and unauth)
  if (tab === 'feed') {
    return renderFeed();
  }

  // Below this point: authenticated Wall only
  if (!isAuth) {
    return renderFeed();
  }

  const alias = wallet.alias || shortAddress(wallet.address);

  // Resolve display handle for any address (prefer social profile alias)
  const getHandle = (address: string, fallbackAlias?: string): string => {
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    if (profile?.alias) return profile.alias;
    if (fallbackAlias && fallbackAlias !== address && fallbackAlias.length <= 30) return fallbackAlias;
    return shortAddress(address);
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    // Navigate to user-profile - we need a way to do this
    // Use a custom event that App.tsx listens to
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'user-profile' }));
  };

  // ─── Media upload ──────────────────────────────────────
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setMediaError('File must be under 50MB'); setTimeout(() => setMediaError(''), 3000); return; }
    setMediaError('');

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mType: 'image' | 'audio' | 'video' = 'image';
    if (['mp3'].includes(ext)) mType = 'audio';
    else if (['mp4', 'mov'].includes(ext)) mType = 'video';
    else if (['gif', 'jpeg', 'jpg', 'png'].includes(ext)) mType = 'image';

    const reader = new FileReader();
    reader.onload = () => {
      setComposeMedia(reader.result as string);
      setComposeMediaType(mType);
    };
    reader.readAsDataURL(file);
  };

  const handleAudioCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setComposeAudioCover(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Post Actions ──────────────────────────────────────
  const handlePost = async () => {
    if (!composeText.trim() && !composeMedia) return;
    setPosting(true);
    const post = engine.createPost(
      wallet.address, alias, composeText,
      composeMedia || undefined,
      composeMediaType || undefined,
      composeAudioCover || undefined,
      composeWartLink || undefined,
    );
    setComposeText(''); setComposeMedia(''); setComposeMediaType('');
    setComposeAudioCover(''); setComposeWartLink('');
    refresh();

    // Upload post media to Supabase Storage for cross-device visibility
    if (composeMedia && isBackendAvailable()) {
      uploadMediaToStorage(composeMedia, `post_${post.id}`, 'main').catch(() => {});
    }
    engine.syncPostsToCloud().catch(() => {});
    setPosting(false);
  };

  const handleTip = async (post: ChatPost) => {
    const ok = engine.tipPost(post.id, wallet.address);
    if (ok) {
      await send(post.author, 1, `Wall tip for post`);
      refresh();
      if (selectedPost?.id === post.id) setSelectedPost(engine.getPost(post.id));
    }
  };

  const handleRewarp = (post: ChatPost) => {
    engine.rewarpPost(post.id, wallet.address, alias);
    refresh();
  };

  const handleBookmark = (post: ChatPost) => {
    engine.bookmarkPost(post.id, wallet.address);
    refresh();
    if (selectedPost?.id === post.id) setSelectedPost(engine.getPost(post.id));
  };

  const handleComment = (postId: string) => {
    if (!commentText.trim()) return;
    engine.addComment(postId, wallet.address, alias, commentText);
    setCommentText('');
    setSelectedPost(engine.getPost(postId));
    refresh();
  };

  const handleDeletePost = (post: ChatPost) => {
    engine.deletePost(post.id, wallet.address);
    setSelectedPost(null);
    refresh();
  };

  const handleShare = (post: ChatPost) => {
    setSharePost(post);
  };

  const copyPostLink = (post: ChatPost) => {
    copyToClipboard(`CosmoChat by @${post.authorAlias}: "${post.content.slice(0, 100)}"`);;
    setSharePost(null);
  };

  // ─── Channel actions ───────────────────────────────────
  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    engine.createChannel(newChannelName, newChannelDesc, wallet.address, alias);
    setNewChannelName(''); setNewChannelDesc('');
    setShowCreateChannel(false);
    refresh();
    engine.syncChannelsToCloud().catch(() => {});
  };

  const handleSendChannelMsg = () => {
    if (!channelMsg.trim() || !selectedChannel) return;
    engine.sendChannelMessage(selectedChannel.id, wallet.address, alias, channelMsg);
    setChannelMsg('');
    setSelectedChannel(engine.getChannel(selectedChannel.id));
  };

  const handleJoinChannel = (ch: ChatChannel) => {
    engine.joinChannel(ch.id, wallet.address);
    refresh();
  };

  // ─── Media Renderer ────────────────────────────────────
  const MediaContent = ({ post }: { post: ChatPost }) => {
    // Resolve media: use inline mediaData, or look up wart image from all available warts
    let mediaSrc = post.mediaData;
    let mediaType = post.mediaType;
    if (!mediaSrc && post.wartLink) {
      const wart = [...allWarts, ...marketplace, ...myCreated, ...myCollection].find(w => w.id === post.wartLink);
      if (wart) {
        mediaSrc = wart.imageData;
        mediaType = mediaType || (wart.mediaType === 'svg' ? 'image' : wart.mediaType) || 'image';
      }
    }
    if (!mediaSrc) {
      // Show placeholder if wart exists but image not loaded yet
      if (post.wartLink) {
        const wartExists = [...allWarts, ...marketplace, ...myCreated, ...myCollection].some(w => w.id === post.wartLink);
        if (wartExists) {
          return (
            <div className="mt-2 aspect-square max-h-80 bg-current/5 flex items-center justify-center animate-pulse">
              <span className="text-body-sm opacity-30">Loading artwork...</span>
            </div>
          );
        }
      }
      return null;
    }
    if (mediaType === 'audio') {
      return (
        <div className="mt-2 p-3 bg-current/5 flex items-center gap-3">
          {post.audioCover && (
            <img src={post.audioCover} alt="" className="w-12 h-12 object-cover shrink-0" />
          )}
          <audio controls className="w-full h-8" src={mediaSrc} />
        </div>
      );
    }
    if (mediaType === 'video') {
      // Convert base64 to blob URL for reliable video playback
      let videoSrc = mediaSrc;
      if (mediaSrc.startsWith('data:')) {
        try {
          const [header, b64] = mediaSrc.split(',');
          const mime = header.match(/data:(.*?);/)?.[1] || 'video/mp4';
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          videoSrc = URL.createObjectURL(new Blob([bytes], { type: mime }));
        } catch { /* fallback to data URL */ }
      }
      return (
        <video controls playsInline preload="auto" className="mt-2 w-full max-h-[500px] bg-black object-contain" src={videoSrc} />
      );
    }
    return (
      <img src={mediaSrc} alt="" className="mt-2 w-full max-h-[500px] object-contain" />
    );
  };

  // ─── Post Card (X-style) ──────────────────────────────
  const PostCard = ({ post }: { post: ChatPost }) => {
    const isMine = post.author === wallet.address;
    const hasTipped = post.tips[wallet.address];
    const hasBookmarked = post.bookmarkedBy.includes(wallet.address);

    // Increment views
    useEffect(() => { engine.incrementViews(post.id); }, [post.id]);

    // If rewarp, show original
    if (post.isRewarp && post.originalPostId) {
      const original = engine.getOriginalPost(post.originalPostId);
      return (
        <div className="glass-panel p-3">
          <p className="text-label opacity-60 mb-2">
            {'\u21C4'} <span className="opacity-80 cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); handleViewUser(post.author); }}>@{getHandle(post.author, post.authorAlias)}</span> ReCosmo
          </p>
          {original ? <PostCard post={original} /> : (
            <p className="text-body-sm opacity-60 italic">Publication originale supprimée</p>
          )}
        </div>
      );
    }

    return (
      <div className="glass-panel p-3 cursor-pointer hover:border-current/10 transition-all" onClick={() => setSelectedPost(post)}>
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1">
          <div className="shrink-0" onClick={e => { e.stopPropagation(); handleViewUser(post.author); }}>
            <HexAvatar address={post.author} size={32} className="cursor-pointer" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-base font-bold opacity-90 cursor-pointer hover:opacity-80 hover:underline" onClick={e => { e.stopPropagation(); handleViewUser(post.author); }}>@{getHandle(post.author, post.authorAlias)}</span>
            <span className="text-label opacity-60 ml-2">{timeAgo(post.timestamp)}</span>
          </div>
          {isMine && (
            <button
              className="opacity-50 hover:opacity-70 text-body-sm cursor-pointer"
              onClick={e => { e.stopPropagation(); handleDeletePost(post); }}
              title="Delete"
            >
              {'\u2716'}
            </button>
          )}
        </div>

        {/* Content */}
        {post.content && <p className="text-base opacity-70 mb-1 whitespace-pre-wrap">{post.content}</p>}
        <MediaContent post={post} />

        {/* Collect button (if post links to a wart with a price) */}
        {(() => {
          if (!post.wartLink) return null;
          const linkedWart = [...allWarts, ...marketplace, ...myCreated, ...myCollection].find(w => w.id === post.wartLink);
          if (!linkedWart || linkedWart.price === null) return null;
          const isOwner = linkedWart.owner === wallet.address;
          if (isOwner) return null;
          return (
            <button
              className="warp-button w-full text-body-sm py-2 mt-2"
              onClick={e => { e.stopPropagation(); buyWart(linkedWart.id); }}
              disabled={wallet.balance < linkedWart.price}
            >
              Collect {linkedWart.price} {'\u2B23'}
            </button>
          );
        })()}

        {/* Action bar (icon-only) */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
          {/* Comments */}
          <button className="flex items-center gap-1 opacity-60 hover:opacity-80 cursor-pointer" onClick={e => { e.stopPropagation(); setSelectedPost(post); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-body-sm">{post.comments.length || ''}</span>
          </button>

          {/* ReCosmo */}
          <button
            className={`flex items-center gap-1 cursor-pointer ${
              post.rewarps.includes(wallet.address) ? 'opacity-80' : 'opacity-60 hover:opacity-80'
            }`}
            onClick={e => { e.stopPropagation(); handleRewarp(post); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <span className="text-body-sm">{post.rewarpCount || ''}</span>
          </button>

          {/* Tip */}
          <button
            className={`flex items-center gap-1 cursor-pointer ${
              hasTipped ? 'opacity-80' : 'opacity-60 hover:opacity-80'
            }`}
            onClick={e => { e.stopPropagation(); handleTip(post); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={hasTipped ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {post.tipCount > 0 && <span className="text-body-sm">Tip {post.tipCount}{'\u2B23'}</span>}
          </button>

          {/* Views */}
          <span className="flex items-center gap-1 opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span className="text-body-sm">{formatViews(post.views)}</span>
          </span>

          {/* Share */}
          <button
            className="opacity-60 hover:opacity-80 cursor-pointer"
            onClick={e => { e.stopPropagation(); handleShare(post); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>

          {/* Bookmark */}
          <button
            className={`cursor-pointer ${
              hasBookmarked ? 'opacity-80' : 'opacity-60 hover:opacity-80'
            }`}
            onClick={e => { e.stopPropagation(); handleBookmark(post); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={hasBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    );
  };

  // ─── Post Detail (with comments) ──────────────────────
  if (selectedPost) {
    const post = selectedPost;
    const hasTipped = post.tips[wallet.address];
    const hasBookmarked = post.bookmarkedBy.includes(wallet.address);

    return (
      <div className="space-y-4">
        <button className="text-body-sm opacity-50 hover:opacity-90 cursor-pointer" onClick={() => setSelectedPost(null)}>
          {'\u2190'} Retour
        </button>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="cursor-pointer" onClick={() => handleViewUser(post.author)}>
              <HexAvatar address={post.author} size={40} />
            </div>
            <div>
              <p className="text-base font-bold opacity-90 cursor-pointer hover:opacity-80 hover:underline" onClick={() => handleViewUser(post.author)}>@{getHandle(post.author, post.authorAlias)}</p>
              <p className="text-label opacity-60">{new Date(post.timestamp).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
            </div>
          </div>

          {post.content && <p className="text-base opacity-70 whitespace-pre-wrap mb-3">{post.content}</p>}
          <MediaContent post={post} />

          {/* Stats bar */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-current/10 text-body-sm opacity-60">
            <span>{post.rewarpCount} ReCosmo</span>
            <span>{post.tipCount} Tip{post.tipCount !== 1 ? 's' : ''} ({post.tipCount}{'\u2B23'})</span>
            <span>{formatViews(post.views)} vues</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-current/10">
            <button className={`flex items-center gap-1 cursor-pointer ${hasTipped ? 'opacity-80' : 'opacity-60 hover:opacity-80'}`} onClick={() => handleTip(post)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={hasTipped ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {post.tipCount > 0 && <span className="text-body-sm">{post.tipCount}{'\u2B23'}</span>}
            </button>
            <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={() => handleRewarp(post)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={() => handleShare(post)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
            <button className={`cursor-pointer ${hasBookmarked ? 'opacity-80' : 'opacity-60 hover:opacity-80'}`} onClick={() => handleBookmark(post)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={hasBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-3">Comments ({post.comments.length})</h3>

          <div className="flex gap-2 mb-4">
            <input
              className="warp-input flex-1 text-base"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
            />
            <button className="warp-button text-body-sm px-3" onClick={() => handleComment(post.id)} disabled={!commentText.trim()}>
              Post
            </button>
          </div>

          <div className="space-y-3">
            {post.comments.length === 0 ? (
              <p className="text-body-sm opacity-60 text-center py-2">No comments yet</p>
            ) : (
              post.comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="shrink-0 mt-0.5">
                    <HexAvatar address={c.author} size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-bold opacity-90 cursor-pointer hover:underline" onClick={() => handleViewUser(c.author)}>@{getHandle(c.author, c.authorAlias)}</span>
                      <span className="text-label opacity-60">{timeAgo(c.timestamp)}</span>
                    </div>
                    <p className="text-body-sm opacity-50">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Computed values for modals ────────────────────────
  const allPickerWarts = [...(allWarts || []), ...(marketplace || []), ...(myCreated || []), ...(myCollection || [])].filter(
    (w, i, arr) => arr.findIndex(x => x.id === w.id) === i
  );

  // ─── Channel Detail ────────────────────────────────────
  if (selectedChannel) {
    const ch = selectedChannel;
    const isMember = ch.members.includes(wallet.address);

    return (
      <div className="space-y-4">
        <button className="text-body-sm opacity-50 hover:opacity-90 cursor-pointer" onClick={() => setSelectedChannel(null)}>
          {'\u2190'} Retour to Channels
        </button>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold opacity-90">#{ch.name}</h3>
              <p className="text-label opacity-60">{ch.description} &middot; {ch.members.length} members</p>
            </div>
            {!isMember && (
              <button className="warp-button text-body-sm px-3" onClick={() => { handleJoinChannel(ch); setSelectedChannel(engine.getChannel(ch.id)); }}>
                Join
              </button>
            )}
          </div>

          <div ref={channelScrollRef} className="bg-current/5 p-3 h-64 overflow-y-auto space-y-2 mb-3">
            {ch.messages.length === 0 ? (
              <p className="text-body-sm opacity-50 text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              ch.messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.from === wallet.address ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] p-2 text-body-sm ${
                    m.from === wallet.address
                      ? 'bg-current/5 border border-current/10 opacity-90'
                      : 'bg-current/5 border border-current/10 opacity-70'
                  }`}>
                    <span className="text-label font-bold opacity-80 cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); handleViewUser(m.from); }}>@{getHandle(m.from, m.fromAlias)}</span>
                    <p className="mt-0.5">{m.content}</p>
                    <span className="text-label opacity-50 block text-right mt-1">{timeAgo(m.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {isMember && (
            <div className="flex gap-2">
              <input
                className="warp-input flex-1 text-base"
                placeholder="Type a message..."
                value={channelMsg}
                onChange={e => setChannelMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChannelMsg(); }}
              />
              <button className="warp-button text-body-sm px-3" onClick={handleSendChannelMsg} disabled={!channelMsg.trim()}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Tab Bar ───────────────────────────────────────────
  const tabList: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'timeline', label: 'For You' },
    { id: 'explore', label: 'Explore' },
    { id: 'channels', label: 'Channels' },
  ];

  const displayPosts = posts;

  return (
    <div className="space-y-4">
      {/* Share modal */}
      {sharePost && (
        <div className="fixed inset-0 sm:left-[56px] bg-black/60 z-50 flex items-center justify-center p-[10px]" onClick={() => setSharePost(null)}>
          <div className="glass-panel p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold opacity-90">Share Post</h3>
            <button className="warp-button w-full text-body-sm py-2" onClick={() => copyPostLink(sharePost)}>{'\u2398'} Copy Link</button>
            <button className="warp-button w-full text-body-sm py-2" onClick={() => { window.open(`mailto:?subject=CosmoChat Post&body=${encodeURIComponent(sharePost.content)}`, '_blank'); setSharePost(null); }}>{'\u2709'} Email</button>
            <button className="warp-button w-full text-body-sm py-2" onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePost.content.slice(0, 280))}`, '_blank'); setSharePost(null); }}>Share on X</button>
            <button className="text-body-sm opacity-60 hover:opacity-70 cursor-pointer w-full text-center" onClick={() => setSharePost(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Artwork picker modal */}
      {showArtPicker && (
        <div className="fixed inset-0 sm:left-[56px] bg-black/60 z-50 flex items-center justify-center p-[10px]" onClick={() => setShowArtPicker(false)}>
          <div className="glass-panel p-5 max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold opacity-90 mb-3">Select an artwork to post</h3>
            {allPickerWarts.length === 0 ? (
              <p className="text-body-sm opacity-60 text-center py-6">No artworks found in your profile.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {allPickerWarts.map(w => (
                  <div key={w.id} className="cursor-pointer border border-current/10 hover:border-current/30 transition-all overflow-hidden" onClick={() => { setComposeMedia(''); setComposeMediaType('image'); setComposeWartLink(w.id); setShowArtPicker(false); }}>
                    <img src={w.imageData} alt={w.title || ''} className="w-full aspect-square object-cover" />
                    {w.title && <p className="text-label opacity-60 p-1 truncate">{w.title}</p>}
                  </div>
                ))}
              </div>
            )}
            <button className="text-body-sm opacity-60 hover:opacity-70 cursor-pointer w-full text-center mt-3" onClick={() => setShowArtPicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-current/10 px-2 pt-2">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-50 hover:opacity-90 hover:bg-current/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Timeline / Explore ─────────────── */}
      {(tab === 'timeline' || tab === 'explore') && (
        <>
          {/* Compose */}
          {(
            <div className="glass-panel p-4">
              <div className="flex gap-3">
                <HexAvatar address={wallet.address} size={32} className="shrink-0" />
                <div className="flex-1 space-y-2">
                  <textarea
                    className="warp-input min-h-[60px] resize-y text-base"
                    placeholder="What's happening in the cosmos?"
                    value={composeText}
                    onChange={e => setComposeText(e.target.value)}
                    maxLength={500}
                  />
                  {composeMedia && (
                    <div className="relative inline-block">
                      {composeMediaType === 'image' && <img src={composeMedia} alt="" className="max-h-32 object-cover" />}
                      {composeMediaType === 'video' && <video src={composeMedia} className="max-h-32" muted playsInline />}
                      {composeMediaType === 'audio' && <audio src={composeMedia} controls className="h-8" />}
                      <button
                        className="absolute top-0 right-0 bg-black/70 text-white text-body-sm px-1 cursor-pointer"
                        onClick={() => { setComposeMedia(''); setComposeMediaType(''); setComposeWartLink(''); }}
                      >
                        {'\u2716'}
                      </button>
                    </div>
                  )}
                  {!composeMedia && composeWartLink && (() => {
                    const linkedWart = [...allWarts, ...marketplace, ...myCreated, ...myCollection].find(w => w.id === composeWartLink);
                    return linkedWart ? (
                      <div className="relative inline-block">
                        <img src={linkedWart.imageData} alt={linkedWart.title || ''} className="max-h-32 object-cover" />
                        <button
                          className="absolute top-0 right-0 bg-black/70 text-white text-body-sm px-1 cursor-pointer"
                          onClick={() => { setComposeWartLink(''); setComposeMediaType(''); }}
                        >
                          {'\u2716'}
                        </button>
                        <span className="absolute bottom-0 left-0 bg-black/70 text-white text-label px-1">{'\u2B22'} {linkedWart.title}</span>
                      </div>
                    ) : null;
                  })()}
                  {composeMediaType === 'audio' && (
                    <div>
                      <input ref={audioCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAudioCoverUpload} />
                      <button className="text-label opacity-60 hover:opacity-70 cursor-pointer" onClick={() => audioCoverRef.current?.click()}>
                        + Add cover image for audio
                      </button>
                    </div>
                  )}
                  {mediaError && <p className="text-body-sm p-2 bg-current/5 border border-current/15 opacity-70 mb-1">{mediaError}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={fileRef} type="file" accept=".gif,.jpeg,.jpg,.png,.mp3,.mp4,.mov" className="hidden" onChange={handleMediaUpload} />
                    <button className="text-body-sm opacity-60 hover:opacity-80 cursor-pointer" onClick={() => fileRef.current?.click()}>
                      {'\u2B06'} Media
                    </button>
                    <button className="text-body-sm opacity-60 hover:opacity-80 cursor-pointer" onClick={() => setShowArtPicker(true)}>
                      {'\u2B22'} Artwork
                    </button>
                    <input
                      className="warp-input text-label py-1 px-2 w-36"
                      placeholder="Lien Strangrz (optionnel)"
                      value={composeWartLink}
                      onChange={e => setComposeWartLink(e.target.value)}
                    />
                    <button
                      className="warp-button text-body-sm px-4 py-1.5 ml-auto"
                      onClick={handlePost}
                      disabled={posting || (!composeText.trim() && !composeMedia && !composeWartLink)}
                    >
                      {posting ? '...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Leaderboard ───────────────────────────── */}
          {(topArtists.length > 0 || topBuyers.length > 0) && (
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold opacity-90">Leaderboard</h3>
                  <span className="text-[10px] opacity-40">Last 7 days</span>
                </div>
                <button className="text-[11px] opacity-60 hover:opacity-80 cursor-pointer" onClick={() => {
                  sessionStorage.setItem('strangrz_gallery_tab', 'top-creators');
                  window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'gallery' }));
                }}>View more</button>
              </div>
              <div className="flex gap-1">
                <button
                  className={`px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                    leaderboardTab === 'artists' ? 'bg-current/10 border border-current/20 opacity-80' : 'border border-current/10 opacity-50 hover:opacity-70'
                  }`}
                  onClick={() => setLeaderboardTab('artists')}
                >
                  Top artists
                </button>
                <button
                  className={`px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                    leaderboardTab === 'buyers' ? 'bg-current/10 border border-current/20 opacity-80' : 'border border-current/10 opacity-50 hover:opacity-70'
                  }`}
                  onClick={() => setLeaderboardTab('buyers')}
                >
                  Top buyers
                </button>
              </div>
              <div className="flex items-end justify-center gap-6 py-4">
                {(leaderboardTab === 'artists' ? topArtists : topBuyers).map((entry, idx) => {
                  const addr = entry.address;
                  const badgeColors = ['bg-yellow-500/20 border-yellow-500/40 text-yellow-400', 'bg-gray-400/20 border-gray-400/40 text-gray-300', 'bg-amber-700/20 border-amber-700/40 text-amber-600'];
                  const badgeLabels = ['1st', '2nd', '3rd'];
                  return (
                    <div key={addr} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => handleViewUser(addr)}>
                      <div className="relative">
                        <HexAvatar address={addr} size={idx === 0 ? 56 : 48} />
                        <span className={`absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center text-[10px] font-bold border rounded-full ${badgeColors[idx]}`}>
                          {badgeLabels[idx]}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold opacity-70 truncate max-w-[100px] text-center">
                        {getHandle(addr)}
                      </span>
                      <span className="text-[10px] opacity-40">
                        {leaderboardTab === 'artists'
                          ? `${(entry as { count: number }).count} created`
                          : `${(entry as { spent: number }).spent.toFixed(0)} \u2B23`
                        }
                      </span>
                    </div>
                  );
                })}
                {(leaderboardTab === 'artists' ? topArtists : topBuyers).length === 0 && (
                  <p className="text-[11px] opacity-40 py-4">No activity in the last 7 days</p>
                )}
              </div>
            </div>
          )}

          {/* Posts feed */}
          {displayPosts.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-title-lg mb-2">{'\u25CE'}</p>
              <p className="opacity-50 text-base">
                {'No posts yet. Be the first to post!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayPosts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Channels ────────────────────────────────────── */}
      {tab === 'channels' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold opacity-70">Channels</h3>
            <button className="warp-button text-body-sm px-3 py-1.5" onClick={() => setShowCreateChannel(!showCreateChannel)}>
              + New
            </button>
          </div>

          {showCreateChannel && (
            <div className="glass-panel p-4 space-y-3">
              <input
                className="warp-input text-base"
                placeholder="Channel name"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                maxLength={30}
              />
              <input
                className="warp-input text-base"
                placeholder="Description (optional)"
                value={newChannelDesc}
                onChange={e => setNewChannelDesc(e.target.value)}
                maxLength={100}
              />
              <button className="warp-button w-full text-body-sm py-2" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                Create Channel
              </button>
            </div>
          )}

          {channels.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-base">No channels yet. Create the first one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map(ch => (
                <div
                  key={ch.id}
                  className="glass-panel p-3 cursor-pointer hover:border-current/10 transition-all"
                  onClick={() => setSelectedChannel(ch)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold opacity-90">#{ch.name}</h4>
                      <p className="text-label opacity-60">{ch.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-label opacity-60">{ch.members.length} members</p>
                      <p className="text-label opacity-50">{ch.messages.length} msgs</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
