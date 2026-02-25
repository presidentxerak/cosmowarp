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
        <p className="text-gray-400 text-sm">Unlock your wallet to discover users</p>
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
    sessionStorage.setItem('cosmowarp_view_user', address);
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
        <h2 className="text-lg font-bold text-gray-100 font-title">Discover</h2>
        <p className="text-xs text-gray-500">Find artists and collectors to follow</p>
      </div>

      {/* Search */}
      <div className="px-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="warp-input text-sm py-2"
        />
      </div>

      {/* Suggestions */}
      {!searchQuery && suggestions.length > 0 && (
        <div className="px-1">
          <p className="text-xs text-gray-500 mb-2">Suggested for you</p>
        </div>
      )}

      {displayUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">
            {searchQuery ? 'No users found' : 'No users to discover yet'}
          </p>
          <p className="text-gray-600 text-xs mt-1">
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
                <p className="text-sm font-medium text-gray-200 truncate">{user.alias}</p>
                <p className="text-[10px] text-gray-500 truncate">{shortAddress(user.address)}</p>
                {user.bio && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{user.bio}</p>
                )}
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {user.followers.length} followers
                </p>
              </button>
              <div className="shrink-0">
                {followedMap[user.address] ? (
                  <button
                    onClick={() => handleUnfollow(user.address)}
                    className="text-xs px-3 py-1.5 border border-warp-500/30 text-warp-300 cursor-pointer hover:bg-warp-500/10 transition-colors"
                  >
                    Following
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(user.address)}
                    className="warp-button text-xs px-4 py-1.5"
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
