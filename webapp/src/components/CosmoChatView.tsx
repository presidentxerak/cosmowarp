import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost, ChatChannel, ChatMessage, DirectThread } from '../engine/cosmochat';

type Tab = 'timeline' | 'explore' | 'channels' | 'messages' | 'bookmarks';

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
  const { wallet, unlocked, send } = useWallet();
  const [engine] = useState(() => CosmoChatEngine.load());
  const [tab, setTab] = useState<Tab>('timeline');
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [threads, setThreads] = useState<DirectThread[]>([]);

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

  // DM
  const [selectedThread, setSelectedThread] = useState<DirectThread | null>(null);
  const [dmText, setDmText] = useState('');
  const [dmTo, setDmTo] = useState('');
  const channelScrollRef = useRef<HTMLDivElement>(null);
  const dmScrollRef = useRef<HTMLDivElement>(null);

  // Share modal
  const [sharePost, setSharePost] = useState<ChatPost | null>(null);

  const refresh = () => {
    const e = CosmoChatEngine.load();
    setPosts(e.getTimeline());
    setChannels(e.getChannels());
    if (wallet) setThreads(e.getThreads(wallet.address));
  };

  useEffect(() => { refresh(); }, [tab]);

  useEffect(() => {
    if (selectedChannel) {
      channelScrollRef.current?.scrollTo(0, channelScrollRef.current.scrollHeight);
    }
  }, [selectedChannel?.messages.length]);

  useEffect(() => {
    if (selectedThread) {
      dmScrollRef.current?.scrollTo(0, dmScrollRef.current.scrollHeight);
    }
  }, [selectedThread?.messages.length]);

  if (!wallet || !unlocked) {
    return (
      <div className="glass-panel p-6 text-center max-w-md mx-auto">
        <div className="text-3xl mb-3">{'\u25CE'}</div>
        <h2 className="text-lg font-bold text-gray-100 mb-2 font-title">CosmoChat</h2>
        <p className="text-gray-400 text-sm">Create and unlock your wallet to access CosmoChat.</p>
      </div>
    );
  }

  const alias = wallet.alias || shortAddress(wallet.address);

  // ─── Media upload ──────────────────────────────────────
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); return; }

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
  const handlePost = () => {
    if (!composeText.trim() && !composeMedia) return;
    setPosting(true);
    engine.createPost(
      wallet.address, alias, composeText,
      composeMedia || undefined,
      composeMediaType || undefined,
      composeAudioCover || undefined,
      composeWartLink || undefined,
    );
    setComposeText(''); setComposeMedia(''); setComposeMediaType('');
    setComposeAudioCover(''); setComposeWartLink('');
    refresh();
    setPosting(false);
  };

  const handleTip = async (post: ChatPost) => {
    const ok = engine.tipPost(post.id, wallet.address);
    if (ok) {
      await send(post.author, 1, `CosmoChat tip for post`);
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
    navigator.clipboard.writeText(`CosmoChat by @${post.authorAlias}: "${post.content.slice(0, 100)}"`);
    setSharePost(null);
  };

  // ─── Channel actions ───────────────────────────────────
  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    engine.createChannel(newChannelName, newChannelDesc, wallet.address, alias);
    setNewChannelName(''); setNewChannelDesc('');
    setShowCreateChannel(false);
    refresh();
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

  // ─── DM actions ────────────────────────────────────────
  const handleSendDM = () => {
    if (!dmText.trim()) return;
    if (selectedThread) {
      const other = selectedThread.participants.find(p => p !== wallet.address) || '';
      engine.sendDM(wallet.address, alias, other, dmText);
      setDmText('');
      setSelectedThread(engine.getThread(wallet.address, other));
    }
  };

  const handleNewDM = () => {
    if (!dmTo.trim()) return;
    engine.sendDM(wallet.address, alias, dmTo.trim(), 'Hello!');
    setDmTo('');
    refresh();
    const thread = engine.getThread(wallet.address, dmTo.trim());
    if (thread) setSelectedThread(thread);
  };

  // ─── Media Renderer ────────────────────────────────────
  const MediaContent = ({ post }: { post: ChatPost }) => {
    if (!post.mediaData) return null;
    if (post.mediaType === 'audio') {
      return (
        <div className="mt-2 p-3 bg-cosmic-900/60 flex items-center gap-3">
          {post.audioCover && (
            <img src={post.audioCover} alt="" className="w-12 h-12 object-cover shrink-0" />
          )}
          <audio controls className="w-full h-8" src={post.mediaData} />
        </div>
      );
    }
    if (post.mediaType === 'video') {
      return (
        <video controls className="mt-2 w-full max-h-[300px] bg-black" src={post.mediaData} />
      );
    }
    return (
      <img src={post.mediaData} alt="" className="mt-2 w-full max-h-[400px] object-cover" />
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
          <p className="text-[10px] text-gray-500 mb-2">
            {'\u21C4'} <span className="text-warp-400">@{post.authorAlias}</span> ReWarped
          </p>
          {original ? <PostCard post={original} /> : (
            <p className="text-xs text-gray-500 italic">Original post deleted</p>
          )}
        </div>
      );
    }

    return (
      <div className="glass-panel p-3 cursor-pointer hover:border-warp-400/20 transition-all" onClick={() => setSelectedPost(post)}>
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center text-xs text-warp-300 font-bold shrink-0">
            {post.authorAlias.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-gray-200">@{post.authorAlias}</span>
            <span className="text-[10px] text-gray-500 ml-2">{timeAgo(post.timestamp)}</span>
          </div>
          {isMine && (
            <button
              className="text-gray-600 hover:text-red-400 text-xs cursor-pointer"
              onClick={e => { e.stopPropagation(); handleDeletePost(post); }}
              title="Delete"
            >
              {'\u2716'}
            </button>
          )}
        </div>

        {/* Content */}
        {post.content && <p className="text-sm text-gray-300 mb-1 whitespace-pre-wrap">{post.content}</p>}
        {post.wartLink && (
          <p className="text-xs text-warp-400 mb-1">{'\u2B22'} Wart: {post.wartLink}</p>
        )}
        <MediaContent post={post} />

        {/* Action bar (X-style) */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
          {/* Comments */}
          <button className="flex items-center gap-1 text-gray-500 hover:text-warp-300 text-xs cursor-pointer" onClick={e => { e.stopPropagation(); setSelectedPost(post); }}>
            <span>{'\u25CB'}</span>
            <span>{post.comments.length || ''}</span>
          </button>

          {/* ReWarp */}
          <button
            className={`flex items-center gap-1 text-xs cursor-pointer ${
              post.rewarps.includes(wallet.address) ? 'text-green-400' : 'text-gray-500 hover:text-green-400'
            }`}
            onClick={e => { e.stopPropagation(); handleRewarp(post); }}
          >
            <span>{'\u21C4'}</span>
            <span>{post.rewarpCount || ''}</span>
          </button>

          {/* Tip (heart) */}
          <button
            className={`flex items-center gap-1 text-xs cursor-pointer ${
              hasTipped ? 'text-energy-400' : 'text-gray-500 hover:text-energy-400'
            }`}
            onClick={e => { e.stopPropagation(); handleTip(post); }}
          >
            <span>{hasTipped ? '\u2665' : '\u2661'}</span>
            <span>{post.tipCount || ''}</span>
            {post.tipCount > 0 && <span className="text-[10px] text-energy-400">{'\u03A9'}</span>}
          </button>

          {/* Views */}
          <span className="flex items-center gap-1 text-gray-600 text-xs">
            <span>{'\u25C9'}</span>
            <span>{formatViews(post.views)}</span>
          </span>

          {/* Share */}
          <button
            className="text-gray-500 hover:text-warp-300 text-xs cursor-pointer"
            onClick={e => { e.stopPropagation(); handleShare(post); }}
          >
            {'\u2197'}
          </button>

          {/* Bookmark */}
          <button
            className={`text-xs cursor-pointer ${
              hasBookmarked ? 'text-star-400' : 'text-gray-500 hover:text-star-400'
            }`}
            onClick={e => { e.stopPropagation(); handleBookmark(post); }}
          >
            {hasBookmarked ? '\u2605' : '\u2606'}
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
      <div className="space-y-4 max-w-lg mx-auto">
        <button className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer" onClick={() => setSelectedPost(null)}>
          {'\u2190'} Back
        </button>

        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center text-sm text-warp-300 font-bold">
              {post.authorAlias.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-200">@{post.authorAlias}</p>
              <p className="text-[10px] text-gray-500">{new Date(post.timestamp).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
            </div>
          </div>

          {post.content && <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3">{post.content}</p>}
          {post.wartLink && <p className="text-xs text-warp-400 mb-2">{'\u2B22'} Wart: {post.wartLink}</p>}
          <MediaContent post={post} />

          {/* Stats bar */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
            <span>{post.rewarpCount} ReWarps</span>
            <span>{post.tipCount} Tips ({post.tipCount} {'\u03A9'})</span>
            <span>{formatViews(post.views)} views</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <button className={`text-xs cursor-pointer ${hasTipped ? 'text-energy-400' : 'text-gray-500 hover:text-energy-400'}`} onClick={() => handleTip(post)}>
              {hasTipped ? '\u2665' : '\u2661'} Tip 1{'\u03A9'}
            </button>
            <button className="text-xs text-gray-500 hover:text-green-400 cursor-pointer" onClick={() => handleRewarp(post)}>
              {'\u21C4'} ReWarp
            </button>
            <button className="text-xs text-gray-500 hover:text-warp-300 cursor-pointer" onClick={() => handleShare(post)}>
              {'\u2197'} Share
            </button>
            <button className={`text-xs cursor-pointer ${hasBookmarked ? 'text-star-400' : 'text-gray-500 hover:text-star-400'}`} onClick={() => handleBookmark(post)}>
              {hasBookmarked ? '\u2605' : '\u2606'} Save
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Comments ({post.comments.length})</h3>

          <div className="flex gap-2 mb-4">
            <input
              className="warp-input flex-1 text-sm"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleComment(post.id); }}
            />
            <button className="warp-button text-xs px-3" onClick={() => handleComment(post.id)} disabled={!commentText.trim()}>
              Post
            </button>
          </div>

          <div className="space-y-3">
            {post.comments.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No comments yet</p>
            ) : (
              post.comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center text-[10px] text-warp-300 font-bold shrink-0 mt-0.5">
                    {c.authorAlias.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">@{c.authorAlias}</span>
                      <span className="text-[10px] text-gray-500">{timeAgo(c.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Share modal ───────────────────────────────────────
  const ShareModal = () => {
    if (!sharePost) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSharePost(null)}>
        <div className="glass-panel p-5 max-w-sm w-full space-y-3" onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-gray-200">Share Post</h3>
          <button className="warp-button w-full text-xs py-2" onClick={() => copyPostLink(sharePost)}>
            {'\u2398'} Copy Link
          </button>
          <button className="warp-button w-full text-xs py-2" onClick={() => {
            window.open(`mailto:?subject=CosmoChat Post&body=${encodeURIComponent(sharePost.content)}`, '_blank');
            setSharePost(null);
          }}>
            {'\u2709'} Email
          </button>
          <button className="warp-button w-full text-xs py-2" onClick={() => {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(sharePost.content.slice(0, 280))}`, '_blank');
            setSharePost(null);
          }}>
            Share on X
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer w-full text-center" onClick={() => setSharePost(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ─── Channel Detail ────────────────────────────────────
  if (selectedChannel) {
    const ch = selectedChannel;
    const isMember = ch.members.includes(wallet.address);

    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <button className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer" onClick={() => setSelectedChannel(null)}>
          {'\u2190'} Back to Channels
        </button>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-200">#{ch.name}</h3>
              <p className="text-[10px] text-gray-500">{ch.description} &middot; {ch.members.length} members</p>
            </div>
            {!isMember && (
              <button className="warp-button text-xs px-3" onClick={() => { handleJoinChannel(ch); setSelectedChannel(engine.getChannel(ch.id)); }}>
                Join
              </button>
            )}
          </div>

          <div ref={channelScrollRef} className="bg-cosmic-900/60 p-3 h-64 overflow-y-auto space-y-2 mb-3">
            {ch.messages.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">No messages yet. Start the conversation!</p>
            ) : (
              ch.messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.from === wallet.address ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] p-2 text-xs ${
                    m.from === wallet.address
                      ? 'bg-warp-500/20 border border-warp-500/30 text-gray-200'
                      : 'bg-cosmic-900/80 border border-white/5 text-gray-300'
                  }`}>
                    <span className="text-[10px] font-bold text-warp-400">@{m.fromAlias}</span>
                    <p className="mt-0.5">{m.content}</p>
                    <span className="text-[9px] text-gray-600 block text-right mt-1">{timeAgo(m.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {isMember && (
            <div className="flex gap-2">
              <input
                className="warp-input flex-1 text-sm"
                placeholder="Type a message..."
                value={channelMsg}
                onChange={e => setChannelMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChannelMsg(); }}
              />
              <button className="warp-button text-xs px-3" onClick={handleSendChannelMsg} disabled={!channelMsg.trim()}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DM Thread ─────────────────────────────────────────
  if (selectedThread) {
    const other = selectedThread.participants.find(p => p !== wallet.address) || '';

    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <button className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer" onClick={() => setSelectedThread(null)}>
          {'\u2190'} Back to Messages
        </button>

        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-200 mb-2">{shortAddress(other)}</h3>

          <div ref={dmScrollRef} className="bg-cosmic-900/60 p-3 h-64 overflow-y-auto space-y-2 mb-3">
            {selectedThread.messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.from === wallet.address ? 'justify-end' : ''}`}>
                <div className={`max-w-[80%] p-2 text-xs ${
                  m.from === wallet.address
                    ? 'bg-warp-500/20 border border-warp-500/30 text-gray-200'
                    : 'bg-cosmic-900/80 border border-white/5 text-gray-300'
                }`}>
                  <p>{m.content}</p>
                  <span className="text-[9px] text-gray-600 block text-right mt-1">{timeAgo(m.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="warp-input flex-1 text-sm"
              placeholder="Type a message..."
              value={dmText}
              onChange={e => setDmText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendDM(); }}
            />
            <button className="warp-button text-xs px-3" onClick={handleSendDM} disabled={!dmText.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tab Bar ───────────────────────────────────────────
  const tabList: { id: Tab; label: string; icon: string }[] = [
    { id: 'timeline', label: 'Home', icon: '\u2302' },
    { id: 'explore', label: 'Explore', icon: '\u2316' },
    { id: 'channels', label: 'Channels', icon: '#' },
    { id: 'messages', label: 'DMs', icon: '\u2709' },
    { id: 'bookmarks', label: 'Saved', icon: '\u2606' },
  ];

  const displayPosts = tab === 'bookmarks'
    ? posts.filter(p => p.bookmarkedBy.includes(wallet.address))
    : posts;

  return (
    <div className="space-y-4">
      <ShareModal />

      {/* Header */}
      <div className="glass-panel p-4 text-center">
        <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u25CE'} CosmoChat</h2>
        <p className="text-xs text-gray-500">Encrypted anonymous social network</p>
      </div>

      {/* Sub-tabs */}
      <div className="glass-panel p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabList.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-2 py-2 rounded-none text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Timeline / Explore / Bookmarks ─────────────── */}
      {(tab === 'timeline' || tab === 'explore' || tab === 'bookmarks') && (
        <>
          {/* Compose */}
          {tab !== 'bookmarks' && (
            <div className="glass-panel p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center text-xs text-warp-300 font-bold shrink-0">
                  {alias.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    className="warp-input min-h-[60px] resize-y text-sm"
                    placeholder="What's happening in the cosmos?"
                    value={composeText}
                    onChange={e => setComposeText(e.target.value)}
                    maxLength={500}
                  />
                  {composeMedia && (
                    <div className="relative inline-block">
                      {composeMediaType === 'image' && <img src={composeMedia} alt="" className="max-h-32 object-cover" />}
                      {composeMediaType === 'video' && <video src={composeMedia} className="max-h-32" />}
                      {composeMediaType === 'audio' && <audio src={composeMedia} controls className="h-8" />}
                      <button
                        className="absolute top-0 right-0 bg-black/70 text-white text-xs px-1 cursor-pointer"
                        onClick={() => { setComposeMedia(''); setComposeMediaType(''); }}
                      >
                        {'\u2716'}
                      </button>
                    </div>
                  )}
                  {composeMediaType === 'audio' && (
                    <div>
                      <input ref={audioCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAudioCoverUpload} />
                      <button className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => audioCoverRef.current?.click()}>
                        + Add cover image for audio
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={fileRef} type="file" accept=".gif,.jpeg,.jpg,.png,.mp3,.mp4,.mov" className="hidden" onChange={handleMediaUpload} />
                    <button className="text-xs text-gray-500 hover:text-warp-300 cursor-pointer" onClick={() => fileRef.current?.click()}>
                      {'\u2B06'} Media
                    </button>
                    <input
                      className="warp-input text-[10px] py-1 px-2 w-36"
                      placeholder="Wart link (optional)"
                      value={composeWartLink}
                      onChange={e => setComposeWartLink(e.target.value)}
                    />
                    <button
                      className="warp-button text-xs px-4 py-1.5 ml-auto"
                      onClick={handlePost}
                      disabled={posting || (!composeText.trim() && !composeMedia)}
                    >
                      {posting ? '...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts feed */}
          {displayPosts.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-2xl mb-2">{'\u25CE'}</p>
              <p className="text-gray-400 text-sm">
                {tab === 'bookmarks' ? 'No saved posts yet.' : 'No posts yet. Be the first to post!'}
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
            <h3 className="text-sm font-bold text-gray-300">Channels</h3>
            <button className="warp-button text-xs px-3 py-1.5" onClick={() => setShowCreateChannel(!showCreateChannel)}>
              + New
            </button>
          </div>

          {showCreateChannel && (
            <div className="glass-panel p-4 space-y-3">
              <input
                className="warp-input text-sm"
                placeholder="Channel name"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                maxLength={30}
              />
              <input
                className="warp-input text-sm"
                placeholder="Description (optional)"
                value={newChannelDesc}
                onChange={e => setNewChannelDesc(e.target.value)}
                maxLength={100}
              />
              <button className="warp-button w-full text-xs py-2" onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
                Create Channel
              </button>
            </div>
          )}

          {channels.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-400 text-sm">No channels yet. Create the first one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map(ch => (
                <div
                  key={ch.id}
                  className="glass-panel p-3 cursor-pointer hover:border-warp-400/20 transition-all"
                  onClick={() => setSelectedChannel(ch)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-200">#{ch.name}</h4>
                      <p className="text-[10px] text-gray-500">{ch.description || 'No description'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">{ch.members.length} members</p>
                      <p className="text-[10px] text-gray-600">{ch.messages.length} msgs</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Messages (DMs) ──────────────────────────────── */}
      {tab === 'messages' && (
        <>
          <div className="glass-panel p-3">
            <div className="flex gap-2">
              <input
                className="warp-input flex-1 text-sm"
                placeholder="CW... (address to message)"
                value={dmTo}
                onChange={e => setDmTo(e.target.value)}
              />
              <button className="warp-button text-xs px-3" onClick={handleNewDM} disabled={!dmTo.trim()}>
                New DM
              </button>
            </div>
          </div>

          {threads.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-400 text-sm">No conversations yet. Start a new DM!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map(t => {
                const other = t.participants.find(p => p !== wallet.address) || '';
                const lastMsg = t.messages[t.messages.length - 1];
                return (
                  <div
                    key={t.id}
                    className="glass-panel p-3 cursor-pointer hover:border-warp-400/20 transition-all"
                    onClick={() => setSelectedThread(t)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-200">{shortAddress(other)}</p>
                        {lastMsg && (
                          <p className="text-xs text-gray-500 truncate">{lastMsg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(t.lastActivity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
