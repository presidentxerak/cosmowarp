import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import { WartEngine } from '../engine/warts';
import type { ChatPost } from '../engine/cosmochat';
import type { Wart } from '../engine/warts';
import HexAvatar from './HexAvatar';

type Tab = 'posts' | 'created' | 'collection';

export default function UserProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();
  const [targetAddress, setTargetAddress] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [alias, setAlias] = useState('');
  const [bio, setBio] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [created, setCreated] = useState<Wart[]>([]);
  const [collection, setCollection] = useState<Wart[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<string[]>([]);
  // Social links
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  // Follow dropdown state
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const addr = sessionStorage.getItem('cosmowarp_view_user');
    if (!addr) return;
    setTargetAddress(addr);
    refresh(addr);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFollowMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFollowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFollowMenu]);

  const refresh = (addr: string) => {
    const social = SocialEngine.load();
    const profile = social.getProfile(addr);
    if (profile) {
      setAlias(profile.alias);
      setBio(profile.bio);
      setFollowersCount(profile.followers.length);
      setFollowingCount(profile.following.length);
      setWebsite(profile.website);
      setInstagram(profile.instagram);
      setTwitter(profile.twitter);
    } else {
      setAlias(shortAddress(addr));
    }

    if (wallet) {
      setIsFollowing(social.isFollowing(wallet.address, addr));
      setIsBlocked(social.isBlocked(wallet.address, addr));
      setIsCloseFriend(social.isCloseFriend(wallet.address, addr));
      setIsFavorite(social.isFavorite(wallet.address, addr));
      setIsMuted(social.isMuted(wallet.address, addr));
      setIsRestricted(social.isRestricted(wallet.address, addr));
      // Mutual followers
      const myProfile = social.getProfile(wallet.address);
      if (myProfile && profile) {
        const mutuals = myProfile.following.filter(a => profile.followers.includes(a));
        setMutualFollowers(mutuals);
      }
    }

    const chatEngine = CosmoChatEngine.load();
    setPosts(chatEngine.getUserPosts(addr));

    const wartEngine = WartEngine.load();
    setCreated(wartEngine.getCreated(addr));
    setCollection(wartEngine.getCollection(addr));
  };

  const handleFollow = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    social.ensureProfile(targetAddress, alias);
    social.follow(wallet.address, targetAddress);
    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);
  };

  const handleUnfollow = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.unfollow(wallet.address, targetAddress);
    setIsFollowing(false);
    setIsCloseFriend(false);
    setIsFavorite(false);
    setFollowersCount(prev => Math.max(0, prev - 1));
    setShowFollowMenu(false);
  };

  const handleBlock = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.block(wallet.address, targetAddress);
    setIsBlocked(true);
    setIsFollowing(false);
  };

  const handleUnblock = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.unblock(wallet.address, targetAddress);
    setIsBlocked(false);
  };

  const handleMessage = () => {
    sessionStorage.setItem('cosmowarp_dm_to', targetAddress);
    onNavigate('message');
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('cosmowarp_view_user', address);
    setTargetAddress(address);
    setTab('posts');
    refresh(address);
  };

  const toggleCloseFriend = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isCloseFriend) {
      social.removeFromCloseFriends(wallet.address, targetAddress);
    } else {
      social.addToCloseFriends(wallet.address, targetAddress);
    }
    setIsCloseFriend(!isCloseFriend);
  };

  const toggleFavorite = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isFavorite) {
      social.removeFromFavorites(wallet.address, targetAddress);
    } else {
      social.addToFavorites(wallet.address, targetAddress);
    }
    setIsFavorite(!isFavorite);
  };

  const toggleMute = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isMuted) {
      social.unmuteUser(wallet.address, targetAddress);
    } else {
      social.muteUser(wallet.address, targetAddress);
    }
    setIsMuted(!isMuted);
  };

  const toggleRestrict = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isRestricted) {
      social.unrestrictUser(wallet.address, targetAddress);
    } else {
      social.restrictUser(wallet.address, targetAddress);
    }
    setIsRestricted(!isRestricted);
  };

  if (!targetAddress) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <p className="opacity-40 text-base">No user selected</p>
      </div>
    );
  }

  const isMe = wallet?.address === targetAddress;

  const tabList: { id: Tab; label: string; count: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'created', label: 'Created', count: created.length },
    { id: 'collection', label: 'Collection', count: collection.length },
  ];

  return (
    <div className="space-y-0 pb-4 max-w-2xl mx-auto">
      {/* Back button */}
      <div className="px-3 py-2">
        <button
          onClick={() => onNavigate('wall')}
          className="flex items-center gap-1.5 text-body-sm opacity-50 hover:opacity-90 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Profile header - centered */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <HexAvatar address={targetAddress} size={80} animate className="mb-3" />
          <h2 className="text-title-md font-bold opacity-100 font-title">{alias}</h2>
          <p className="text-[11px] opacity-40 font-mono mt-0.5">{targetAddress}</p>

          {/* Social links */}
          {(website || instagram || twitter) && (
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              {website && (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:text-energy-300 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {website.replace(/^https?:\/\//, '').slice(0, 30)}
                </a>
              )}
              {instagram && (
                <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:text-nebula-500 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                  @{instagram.replace('@', '')}
                </a>
              )}
              {twitter && (
                <a href={`https://x.com/${twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-80 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @{twitter.replace('@', '')}
                </a>
              )}
            </div>
          )}

          {/* Bio */}
          {bio && <p className="text-body-sm opacity-50 mt-3 max-w-sm">{bio}</p>}

          {/* Action buttons */}
          {!isMe && wallet && (
            <div className="flex gap-2 mt-4 items-center">
              {isBlocked ? (
                <button onClick={handleUnblock} className="text-body-sm px-4 py-2 border border-red-500/30 opacity-70 cursor-pointer hover:bg-current/5 transition-colors">
                  Unblock
                </button>
              ) : isFollowing ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowFollowMenu(!showFollowMenu)}
                    className="text-body-sm px-4 py-2 border border-current/10 opacity-80 cursor-pointer hover:bg-current/5 transition-colors flex items-center gap-1"
                  >
                    Following
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {/* Instagram-style dropdown */}
                  {showFollowMenu && (
                    <div className="absolute top-full left-0 mt-1 w-52 glass-panel border border-current/15 z-50 follow-dropdown">
                      <button
                        onClick={toggleCloseFriend}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Close friends</span>
                        {isCloseFriend && <span className="opacity-80">{'\u2713'}</span>}
                      </button>
                      <button
                        onClick={toggleFavorite}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Favorites</span>
                        {isFavorite && <span className="text-star-400">{'\u2605'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button
                        onClick={toggleMute}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Mute</span>
                        {isMuted && <span className="opacity-40">{'\u2713'}</span>}
                      </button>
                      <button
                        onClick={toggleRestrict}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Restrict</span>
                        {isRestricted && <span className="opacity-40">{'\u2713'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button
                        onClick={handleUnfollow}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors opacity-70"
                      >
                        Unfollow
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleFollow} className="warp-button text-body-sm px-5 py-2">
                  Follow
                </button>
              )}
              <button onClick={handleMessage} className="text-body-sm px-4 py-2 border border-current/15 opacity-70 cursor-pointer hover:bg-current/5 transition-colors">
                Message
              </button>
              {!isBlocked && (
                <button onClick={handleBlock} className="text-body-sm px-2 py-2 opacity-30 cursor-pointer hover:opacity-70 transition-colors" title="Block">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-body-sm">
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{followersCount}</span>
              <span className="opacity-40">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{followingCount}</span>
              <span className="opacity-40">Following</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{posts.length}</span>
              <span className="opacity-40">Posts</span>
            </div>
          </div>

          {/* Mutual followers */}
          {mutualFollowers.length > 0 && (
            <p className="text-label opacity-40 mt-2">
              Followed by {mutualFollowers.length} {mutualFollowers.length === 1 ? 'person' : 'people'} you follow
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-current/10 overflow-x-auto">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-warp-400 opacity-80'
                : 'border-transparent opacity-40 hover:opacity-70'
            }`}
          >
            {t.label} <span className="text-label opacity-30 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-2">
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <HexAvatar address={post.author} size={24} onClick={() => handleViewUser(post.author)} />
                    <span className="text-body-sm font-medium opacity-90 cursor-pointer hover:opacity-80" onClick={() => handleViewUser(post.author)}>@{post.authorAlias}</span>
                  </div>
                  <p className="text-base opacity-70 whitespace-pre-wrap">{post.content}</p>
                  {post.mediaData && post.mediaType === 'image' && (
                    <img src={post.mediaData} alt="" className="mt-2 w-full max-h-64 object-cover" />
                  )}
                  <div className="flex gap-4 mt-2 text-label opacity-40">
                    <span>{post.tipCount} tips</span>
                    <span>{post.rewarpCount} rewarps</span>
                    <span>{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'created' && (
          created.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No Warts created</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {created.map(wart => (
                <div key={wart.id} className="glass-panel p-2">
                  {wart.mediaType !== 'audio' && wart.imageData && (
                    <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  {wart.mediaType === 'audio' && wart.audioCover && (
                    <img src={wart.audioCover} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  <p className="text-body-sm font-medium opacity-90 mt-1 truncate">{wart.title}</p>
                  <p className="text-label opacity-40">{wart.price !== null ? `${wart.price} \u03A9` : 'Not listed'}</p>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'collection' && (
          collection.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">Empty collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {collection.map(wart => (
                <div key={wart.id} className="glass-panel p-2">
                  {wart.mediaType !== 'audio' && wart.imageData && (
                    <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  <p className="text-body-sm font-medium opacity-90 mt-1 truncate">{wart.title}</p>
                  <p className="text-label opacity-40">by {shortAddress(wart.creator)}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
