import { useState, useEffect, useRef } from 'react';
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
  // Links
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [editingLinks, setEditingLinks] = useState(false);
  const [linkWebsite, setLinkWebsite] = useState('');
  const [linkInstagram, setLinkInstagram] = useState('');
  const [linkTwitter, setLinkTwitter] = useState('');
  // Profile image upload
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!wallet) return;
    const social = SocialEngine.load();
    const profile = social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    setBio(profile.bio);
    setFollowersCount(profile.followers.length);
    setFollowingCount(profile.following.length);
    setFollowersList(social.getFollowers(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
    setFollowingList(social.getFollowing(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
    setWebsite(profile.website);
    setInstagram(profile.instagram);
    setTwitter(profile.twitter);

    const chatEngine = CosmoChatEngine.load();
    setPosts(chatEngine.getUserPosts(wallet.address));
  }, [wallet, tab]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <HexAvatar address="default" size={64} className="mx-auto mb-4" />
          <p className="opacity-50 text-base">Unlock your wallet to view profile</p>
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

  const handleSaveLinks = () => {
    const social = SocialEngine.load();
    social.updateLinks(wallet.address, { website: linkWebsite, instagram: linkInstagram, twitter: linkTwitter });
    setWebsite(linkWebsite);
    setInstagram(linkInstagram);
    setTwitter(linkTwitter);
    setEditingLinks(false);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return; // Max 2MB
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const social = SocialEngine.load();
      social.updateProfileImage(wallet.address, data);
      // Force re-render by navigating to self
      onNavigate('profile');
    };
    reader.readAsDataURL(file);
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('cosmorare_view_user', address);
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
    <div className="space-y-0 pb-4 max-w-2xl mx-auto">
      {/* Profile header - centered */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          {/* Avatar with upload */}
          <div className="relative group mb-3">
            <HexAvatar address={wallet.address} size={80} animate className="mx-auto" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Upload profile picture"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
          </div>

          <h2 className="text-title-md font-bold opacity-100 font-title">{alias}</h2>
          <p className="text-[11px] opacity-40 font-mono mt-0.5">{wallet.address}</p>

          {/* Balance & Level */}
          <div className="flex gap-4 mt-2 items-center">
            <span className="text-base font-bold opacity-80">{wallet.balance.toFixed(2)} {'\u03A9'}</span>
            <span className="text-body-sm opacity-40">|</span>
            <span className="text-base font-bold opacity-80">Lv.{wallet.level || 1}</span>
            <span className="text-label opacity-40">{wallet.levelName}</span>
          </div>

          {/* Bio */}
          <div className="mt-3 w-full max-w-sm">
            {editingBio ? (
              <div className="flex gap-2">
                <input
                  className="warp-input flex-1 text-body-sm py-1.5"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={280}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBio(); }}
                  autoFocus
                />
                <button onClick={handleSaveBio} className="warp-button text-body-sm px-3 py-1.5">Save</button>
                <button onClick={() => setEditingBio(false)} className="text-body-sm opacity-40 cursor-pointer">Cancel</button>
              </div>
            ) : (
              <p
                className="text-body-sm opacity-50 cursor-pointer hover:opacity-70 transition-colors"
                onClick={() => { setBioInput(bio); setEditingBio(true); }}
              >
                {bio || 'Tap to add a bio...'}
              </p>
            )}
          </div>

          {/* Social links */}
          <div className="mt-2 flex flex-wrap gap-3 justify-center items-center">
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-90 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                {website.replace(/^https?:\/\//, '').slice(0, 30)}
              </a>
            )}
            {instagram && (
              <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-80 flex items-center gap-1">
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
            <button
              onClick={() => { setLinkWebsite(website); setLinkInstagram(instagram); setLinkTwitter(twitter); setEditingLinks(!editingLinks); }}
              className="text-label opacity-30 hover:opacity-50 cursor-pointer"
            >
              {editingLinks ? 'Cancel' : (website || instagram || twitter ? 'Edit links' : '+ Add links')}
            </button>
          </div>

          {/* Edit links form */}
          {editingLinks && (
            <div className="mt-3 w-full max-w-sm space-y-2">
              <input className="warp-input text-body-sm py-1.5" value={linkWebsite} onChange={e => setLinkWebsite(e.target.value)} placeholder="Website URL" />
              <input className="warp-input text-body-sm py-1.5" value={linkInstagram} onChange={e => setLinkInstagram(e.target.value)} placeholder="Instagram username" />
              <input className="warp-input text-body-sm py-1.5" value={linkTwitter} onChange={e => setLinkTwitter(e.target.value)} placeholder="X (Twitter) username" />
              <button onClick={handleSaveLinks} className="warp-button text-body-sm w-full py-1.5">Save Links</button>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-6 mt-4 text-body-sm">
            <button onClick={() => setTab('followers')} className="cursor-pointer hover:opacity-80 transition-colors text-center">
              <span className="block font-bold opacity-90 text-base">{followersCount}</span>
              <span className="opacity-40">Followers</span>
            </button>
            <button onClick={() => setTab('following')} className="cursor-pointer hover:opacity-80 transition-colors text-center">
              <span className="block font-bold opacity-90 text-base">{followingCount}</span>
              <span className="opacity-40">Following</span>
            </button>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{posts.length}</span>
              <span className="opacity-40">Posts</span>
            </div>
          </div>
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
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-40 hover:opacity-70'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-label opacity-30">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-0 pt-2">
        {/* Posts */}
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No posts yet</p>
              <button onClick={() => onNavigate('wall')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Go to Wall</button>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-3">
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

        {/* Created Warts */}
        {tab === 'warts' && (
          myCreated.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No Warts created yet</p>
              <button onClick={() => onNavigate('gallery')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Go to Gallery</button>
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
                  <p className="text-body-sm font-medium opacity-90 mt-1 truncate">{wart.title}</p>
                  <p className="text-label opacity-40">{wart.price !== null ? `${wart.price} \u03A9` : 'Not listed'}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Collection */}
        {tab === 'collected' && (
          myCollection.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No Warts in collection</p>
              <button onClick={() => onNavigate('gallery')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Browse Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {myCollection.map((wart: Wart) => (
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

        {/* Followers */}
        {tab === 'followers' && (
          followersList.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No followers yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {followersList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                    <p className="text-label opacity-40 truncate">{shortAddress(user.address)}</p>
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
              <p className="opacity-40 text-base">Not following anyone yet</p>
              <button onClick={() => onNavigate('discover')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Discover users</button>
            </div>
          ) : (
            <div className="space-y-1">
              {followingList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                    <p className="text-label opacity-40 truncate">{shortAddress(user.address)}</p>
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
          className="w-full text-left px-3 py-2.5 text-base opacity-70 hover:bg-current/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-40">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock Wallet
        </button>
        <button
          onClick={() => { if (confirm('Sign out? Make sure you have a backup.')) signOut(); }}
          className="w-full text-left px-3 py-2.5 text-base opacity-70 hover:bg-current/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-70/70">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
