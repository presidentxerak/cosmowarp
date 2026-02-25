import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import type { Wart } from '../engine/warts';
import HexAvatar from './HexAvatar';

type Tab = 'posts' | 'warts' | 'collected' | 'followers' | 'following';

export default function ProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, unlocked, lock, signOut, myCreated, myCollection } = useWallet();
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<{ address: string; alias: string }[]>([]);
  const [followingList, setFollowingList] = useState<{ address: string; alias: string }[]>([]);

  useEffect(() => {
    if (!wallet) return;
    const social = SocialEngine.load();
    const profile = social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    setBio(profile.bio);
    setFollowersCount(profile.followers.length);
    setFollowingCount(profile.following.length);
    setFollowersList(social.getFollowers(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
    setFollowingList(social.getFollowing(wallet.address).map(p => ({ address: p.address, alias: p.alias })));

    const chatEngine = CosmoChatEngine.load();
    setPosts(chatEngine.getUserPosts(wallet.address));
  }, [wallet, tab]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <HexAvatar address="default" size={64} className="mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Unlock your wallet to view profile</p>
        </div>
      </div>
    );
  }

  const alias = wallet.alias || shortAddress(wallet.address);

  const handleSaveBio = () => {
    const social = SocialEngine.load();
    social.updateBio(wallet.address, bioInput);
    setBio(bioInput);
    setEditingBio(false);
  };

  const handleViewUser = (address: string) => {
    // Store target user address for UserProfileView
    sessionStorage.setItem('cosmowarp_view_user', address);
    onNavigate('user-profile');
  };

  const tabList: { id: Tab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'warts', label: 'Created', count: myCreated.length },
    { id: 'collected', label: 'Collection', count: myCollection.length },
    { id: 'followers', label: 'Followers', count: followersCount },
    { id: 'following', label: 'Following', count: followingCount },
  ];

  return (
    <div className="space-y-0 pb-4">
      {/* Profile header */}
      <div className="glass-panel p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <HexAvatar address={wallet.address} size={64} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-100 font-title truncate">{alias}</h2>
            <p className="text-[11px] text-gray-500 font-mono truncate">{wallet.address}</p>
            <div className="flex gap-4 mt-2">
              <div>
                <span className="text-sm font-bold text-energy-400">{wallet.balance.toFixed(2)}</span>
                <span className="text-[10px] text-gray-500 ml-1">{'\u03A9'}</span>
              </div>
              <div>
                <span className="text-sm font-bold text-warp-400">Lv.{wallet.level || 1}</span>
                <span className="text-[10px] text-gray-500 ml-1">{wallet.levelName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mt-3">
          {editingBio ? (
            <div className="flex gap-2">
              <input
                className="warp-input flex-1 text-xs py-1.5"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={280}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBio(); }}
                autoFocus
              />
              <button onClick={handleSaveBio} className="warp-button text-xs px-3 py-1.5">Save</button>
              <button onClick={() => setEditingBio(false)} className="text-xs text-gray-500 cursor-pointer">Cancel</button>
            </div>
          ) : (
            <p
              className="text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
              onClick={() => { setBioInput(bio); setEditingBio(true); }}
            >
              {bio || 'Tap to add a bio...'}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mt-3 text-xs">
          <button onClick={() => setTab('followers')} className="cursor-pointer hover:text-warp-300 transition-colors">
            <span className="font-bold text-gray-200">{followersCount}</span>{' '}
            <span className="text-gray-500">Followers</span>
          </button>
          <button onClick={() => setTab('following')} className="cursor-pointer hover:text-warp-300 transition-colors">
            <span className="font-bold text-gray-200">{followingCount}</span>{' '}
            <span className="text-gray-500">Following</span>
          </button>
          <span>
            <span className="font-bold text-gray-200">{posts.length}</span>{' '}
            <span className="text-gray-500">Posts</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 overflow-x-auto">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-warp-400 text-warp-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-[10px] text-gray-600">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-0 pt-2">
        {/* Posts */}
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No posts yet</p>
              <button onClick={() => onNavigate('wall')} className="text-xs text-warp-400 mt-2 cursor-pointer">Go to Wall</button>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-3">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{post.content}</p>
                  {post.mediaData && post.mediaType === 'image' && (
                    <img src={post.mediaData} alt="" className="mt-2 w-full max-h-64 object-cover" />
                  )}
                  <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                    <span>{post.tipCount} tips</span>
                    <span>{post.rewarpCount} rewarps</span>
                    <span>{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Created Warts */}
        {tab === 'warts' && (
          myCreated.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No Warts created yet</p>
              <button onClick={() => onNavigate('gallery')} className="text-xs text-warp-400 mt-2 cursor-pointer">Go to Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {myCreated.map((wart: Wart) => (
                <div key={wart.id} className="glass-panel p-2">
                  {wart.mediaType !== 'audio' && wart.imageData && (
                    <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  {wart.mediaType === 'audio' && wart.audioCover && (
                    <img src={wart.audioCover} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  <p className="text-xs font-medium text-gray-200 mt-1 truncate">{wart.title}</p>
                  <p className="text-[10px] text-gray-500">{wart.price !== null ? `${wart.price} \u03A9` : 'Not listed'}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Collection */}
        {tab === 'collected' && (
          myCollection.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No Warts in collection</p>
              <button onClick={() => onNavigate('gallery')} className="text-xs text-warp-400 mt-2 cursor-pointer">Browse Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {myCollection.map((wart: Wart) => (
                <div key={wart.id} className="glass-panel p-2">
                  {wart.mediaType !== 'audio' && wart.imageData && (
                    <img src={wart.imageData} alt={wart.title} className="w-full aspect-square object-cover" />
                  )}
                  <p className="text-xs font-medium text-gray-200 mt-1 truncate">{wart.title}</p>
                  <p className="text-[10px] text-gray-500">by {shortAddress(wart.creator)}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Followers */}
        {tab === 'followers' && (
          followersList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No followers yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {followersList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">{user.alias}</p>
                    <p className="text-[10px] text-gray-500 truncate">{shortAddress(user.address)}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Following */}
        {tab === 'following' && (
          followingList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Not following anyone yet</p>
              <button onClick={() => onNavigate('discover')} className="text-xs text-warp-400 mt-2 cursor-pointer">Discover users</button>
            </div>
          ) : (
            <div className="space-y-1">
              {followingList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-200 truncate">{user.alias}</p>
                    <p className="text-[10px] text-gray-500 truncate">{shortAddress(user.address)}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Account actions */}
      <div className="glass-panel p-4 space-y-2 mt-4">
        <button
          onClick={lock}
          className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gray-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock Wallet
        </button>
        <button
          onClick={() => { if (confirm('Sign out? Make sure you have a backup.')) signOut(); }}
          className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-red-400/70">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
