import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { SocialEngine, type UserProfile } from '../engine/social';
import HexAvatar from './HexAvatar';

export default function DiscoverView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, unlocked } = useWallet();
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!wallet) return;
    const social = SocialEngine.load();
    social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    setSuggestions(social.getSuggestions(wallet.address, 20));
    setAllUsers(social.getAllProfiles().filter(p => p.address !== wallet.address));

    const map: Record<string, boolean> = {};
    const me = social.getProfile(wallet.address);
    if (me) me.following.forEach(a => { map[a] = true; });
    setFollowedMap(map);
  }, [wallet]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <p className="opacity-50 text-base">Unlock your wallet to discover users</p>
      </div>
    );
  }

  const handleFollow = (address: string) => {
    const social = SocialEngine.load();
    social.follow(wallet.address, address);
    setFollowedMap(prev => ({ ...prev, [address]: true }));
  };

  const handleUnfollow = (address: string) => {
    const social = SocialEngine.load();
    social.unfollow(wallet.address, address);
    setFollowedMap(prev => { const next = { ...prev }; delete next[address]; return next; });
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('cosmorare_view_user', address);
    onNavigate('user-profile');
  };

  const filteredUsers = searchQuery
    ? allUsers.filter(u =>
        u.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestions;

  const displayUsers = filteredUsers.length > 0 ? filteredUsers : allUsers;

  return (
    <div className="space-y-3 pb-4">
      <div className="px-1 pt-2">
        <h2 className="text-title-sm font-bold opacity-100 font-title">Discover</h2>
        <p className="text-body-sm opacity-40">Find artists and collectors to follow</p>
      </div>

      {/* Search */}
      <div className="px-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="warp-input text-base py-2"
        />
      </div>

      {/* Suggestions */}
      {!searchQuery && suggestions.length > 0 && (
        <div className="px-1">
          <p className="text-body-sm opacity-40 mb-2">Suggested for you</p>
        </div>
      )}

      {displayUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="opacity-40 text-base">
            {searchQuery ? 'No users found' : 'No users to discover yet'}
          </p>
          <p className="opacity-30 text-body-sm mt-1">
            Post on the Wall to let others find you
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayUsers.map(user => (
            <div key={user.address} className="glass-panel p-3 flex items-center gap-3">
              <button onClick={() => handleViewUser(user.address)} className="shrink-0 cursor-pointer">
                <HexAvatar address={user.address} size={40} />
              </button>
              <button
                onClick={() => handleViewUser(user.address)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                <p className="text-label opacity-40 truncate">{shortAddress(user.address)}</p>
                {user.bio && (
                  <p className="text-[11px] opacity-50 mt-0.5 truncate">{user.bio}</p>
                )}
                <p className="text-label opacity-30 mt-0.5">
                  {user.followers.length} followers
                </p>
              </button>
              <div className="shrink-0">
                {followedMap[user.address] ? (
                  <button
                    onClick={() => handleUnfollow(user.address)}
                    className="text-body-sm px-3 py-1.5 border border-current/10 opacity-80 cursor-pointer hover:bg-current/5 transition-colors"
                  >
                    Following
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(user.address)}
                    className="warp-button text-body-sm px-4 py-1.5"
                  >
                    Follow
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
