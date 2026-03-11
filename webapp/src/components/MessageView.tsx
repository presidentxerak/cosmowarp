import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { CosmoChatEngine } from '../engine/cosmochat';
import { SocialEngine } from '../engine/social';
import type { DirectThread, ChatChannel } from '../engine/cosmochat';
import type { UserProfile } from '../engine/social';
import HexAvatar from './HexAvatar';

type View = 'list' | 'thread' | 'channel' | 'new-dm' | 'new-group' | 'friends';
type ListTab = 'messages' | 'groups' | 'friends';

export default function MessageView() {
  const { wallet, unlocked } = useWallet();
  const [view, setView] = useState<View>('list');
  const [listTab, setListTab] = useState<ListTab>('messages');
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedThread, setSelectedThread] = useState<DirectThread | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [dmText, setDmText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [following, setFollowing] = useState<UserProfile[]>([]);
  // New group state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPublic, setNewGroupPublic] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    if (!wallet) return;
    const e = CosmoChatEngine.load();
    setThreads(e.getThreads(wallet.address));
    setChannels(e.getChannels().filter(c => c.isPublic || c.members.includes(wallet.address)));
    const social = SocialEngine.load();
    setFriends(social.getMutuals(wallet.address));
    setFollowing(social.getFollowing(wallet.address));
  };

  useEffect(() => {
    refresh();
    // Auto-open DM if navigated from user profile
    if (wallet) {
      const dmTo = sessionStorage.getItem('strangrz_dm_to');
      if (dmTo) {
        sessionStorage.removeItem('strangrz_dm_to');
        const e = CosmoChatEngine.load();
        const alias = wallet.alias || shortAddress(wallet.address);
        const existingThreads = e.getThreads(wallet.address);
        const existing = existingThreads.find(t => t.participants.includes(dmTo));
        if (existing) {
          setSelectedThread(existing);
          setView('thread');
        } else {
          e.sendDM(wallet.address, alias, dmTo, 'Hey!');
          const updated = e.getThreads(wallet.address);
          const newThread = updated.find(t => t.participants.includes(dmTo));
          if (newThread) {
            setSelectedThread(newThread);
            setView('thread');
          }
          setThreads(updated);
        }
      }
    }
  }, [wallet]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [selectedThread?.messages.length, selectedChannel?.messages.length]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-30 mb-3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="opacity-50 text-base">Débloquez votre wallet pour accéder aux messages</p>
          <p className="opacity-30 text-body-sm mt-1">Messages directs chiffrés de bout en bout</p>
        </div>
      </div>
    );
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const social = SocialEngine.load();
    const results = social.searchProfiles(query.trim());
    setSearchResults(results.filter(p => p.address !== wallet.address));
  };

  const handleSendDm = () => {
    if (!dmText.trim() || !wallet) return;
    const e = CosmoChatEngine.load();
    const alias = wallet.alias || shortAddress(wallet.address);

    if (view === 'thread' && selectedThread) {
      const peer = selectedThread.participants.find(p => p !== wallet.address) || selectedThread.participants[0];
      e.sendDM(wallet.address, alias, peer, dmText.trim());
      setDmText('');
      refresh();
      const updatedThreads = CosmoChatEngine.load().getThreads(wallet.address);
      const updated = updatedThreads.find(t => t.id === selectedThread.id);
      if (updated) setSelectedThread(updated);
    } else if (view === 'channel' && selectedChannel) {
      e.sendChannelMessage(selectedChannel.id, wallet.address, alias, dmText.trim());
      setDmText('');
      refresh();
      const updatedChannel = CosmoChatEngine.load().getChannel(selectedChannel.id);
      if (updatedChannel) setSelectedChannel(updatedChannel);
    }
  };

  const startDmWith = (address: string) => {
    const e = CosmoChatEngine.load();
    const alias = wallet.alias || shortAddress(wallet.address);
    // Check if thread already exists
    const existingThreads = e.getThreads(wallet.address);
    const existing = existingThreads.find(t => t.participants.includes(address));
    if (existing) {
      setSelectedThread(existing);
      setView('thread');
    } else {
      e.sendDM(wallet.address, alias, address, 'Hey!');
      refresh();
      const updated = CosmoChatEngine.load().getThreads(wallet.address);
      const newThread = updated.find(t => t.participants.includes(address));
      if (newThread) {
        setSelectedThread(newThread);
        setView('thread');
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !wallet) return;
    const e = CosmoChatEngine.load();
    const alias = wallet.alias || shortAddress(wallet.address);
    const channel = e.createChannel(newGroupName.trim(), newGroupDesc.trim(), wallet.address, alias, newGroupPublic);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupPublic(true);
    refresh();
    setSelectedChannel(channel);
    setView('channel');
  };

  const handleJoinChannel = (channelId: string) => {
    const e = CosmoChatEngine.load();
    e.joinChannel(channelId, wallet.address);
    refresh();
    const ch = CosmoChatEngine.load().getChannel(channelId);
    if (ch) {
      setSelectedChannel(ch);
      setView('channel');
    }
  };

  const handleLeaveChannel = (channelId: string) => {
    const e = CosmoChatEngine.load();
    e.leaveChannel(channelId, wallet.address);
    refresh();
    setView('list');
    setSelectedChannel(null);
  };

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getProfileAlias = (address: string): string => {
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  // ─── Back button ──────────────────────────────────────
  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="w-8 h-8 flex items-center justify-center opacity-50 hover:opacity-90 cursor-pointer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );

  // ─── Thread detail view ───────────────────────────────
  if (view === 'thread' && selectedThread) {
    const peer = selectedThread.participants.find(p => p !== wallet.address) || selectedThread.participants[0];
    const peerAlias = getProfileAlias(peer);
    return (
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        <div className="flex items-center gap-3 p-3 border-b border-current/10">
          <BackButton onClick={() => { setView('list'); setSelectedThread(null); }} />
          <div className="flex items-center gap-2">
            <HexAvatar address={peer} size={32} />
            <div>
              <p className="text-base font-medium opacity-90">{peerAlias}</p>
              <p className="text-label opacity-40">Chiffré</p>
            </div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {selectedThread.messages.map((msg, i) => {
            const isMe = msg.from === wallet.address;
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 ${isMe ? 'bg-current/8 border border-current/12' : 'bg-current/5 border border-current/10'}`}>
                  <p className="text-base opacity-90">{msg.content}</p>
                  <p className="text-label opacity-30 mt-0.5 text-right">{timeAgo(msg.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-current/10">
          <div className="flex gap-2">
            <input type="text" value={dmText} onChange={(e) => setDmText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendDm(); }} placeholder="Message..." className="flex-1 warp-input py-2.5" />
            <button onClick={handleSendDm} disabled={!dmText.trim()} className="warp-button px-3 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Channel (Group) detail view ──────────────────────
  if (view === 'channel' && selectedChannel) {
    const isMember = selectedChannel.members.includes(wallet.address);
    return (
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        <div className="flex items-center gap-3 p-3 border-b border-current/10">
          <BackButton onClick={() => { setView('list'); setSelectedChannel(null); setListTab('groups'); }} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-current/5 flex items-center justify-center text-body-sm">
                {selectedChannel.isPublic ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                )}
              </div>
              <div>
                <p className="text-base font-medium opacity-90">{selectedChannel.name}</p>
                <p className="text-label opacity-40">{selectedChannel.members.length} membres · {selectedChannel.isPublic ? 'Public' : 'Privé'}</p>
              </div>
            </div>
          </div>
          {isMember && (
            <button onClick={() => handleLeaveChannel(selectedChannel.id)} className="text-label opacity-40 hover:opacity-80 cursor-pointer px-2">
              Quitter
            </button>
          )}
        </div>

        {!isMember ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="opacity-50 mb-3">{selectedChannel.description}</p>
              <button onClick={() => handleJoinChannel(selectedChannel.id)} className="warp-button px-6 py-2">
                Rejoindre le groupe
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {selectedChannel.messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="opacity-30 text-body-sm">Aucun message. Soyez le premier !</p>
                </div>
              ) : (
                selectedChannel.messages.map((msg, i) => {
                  const isMe = msg.from === wallet.address;
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 ${isMe ? 'bg-current/8 border border-current/12' : 'bg-current/5 border border-current/10'}`}>
                        {!isMe && <p className="text-label opacity-50 mb-0.5">{msg.fromAlias}</p>}
                        <p className="text-base opacity-90">{msg.content}</p>
                        <p className="text-label opacity-30 mt-0.5 text-right">{timeAgo(msg.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-current/10">
              <div className="flex gap-2">
                <input type="text" value={dmText} onChange={(e) => setDmText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendDm(); }} placeholder="Message..." className="flex-1 warp-input py-2.5" />
                <button onClick={handleSendDm} disabled={!dmText.trim()} className="warp-button px-3 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── New group creation view ──────────────────────────
  if (view === 'new-group') {
    return (
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        <div className="flex items-center gap-3 p-3 border-b border-current/10">
          <BackButton onClick={() => { setView('list'); setListTab('groups'); }} />
          <h2 className="text-base font-bold opacity-100 font-title">Créer un groupe</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-body-sm opacity-50 mb-1 block">Nom du groupe</label>
            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ex: Art Digital FR" className="warp-input w-full py-2.5" maxLength={40} />
          </div>
          <div>
            <label className="text-body-sm opacity-50 mb-1 block">Description</label>
            <input type="text" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="De quoi parle ce groupe ?" className="warp-input w-full py-2.5" maxLength={120} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-body-sm opacity-50">Visibilité :</label>
            <button
              onClick={() => setNewGroupPublic(true)}
              className={`px-3 py-1.5 text-body-sm cursor-pointer transition-all ${newGroupPublic ? 'bg-current/10 opacity-90' : 'opacity-40 hover:opacity-70'}`}
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              Public
            </button>
            <button
              onClick={() => setNewGroupPublic(false)}
              className={`px-3 py-1.5 text-body-sm cursor-pointer transition-all ${!newGroupPublic ? 'bg-current/10 opacity-90' : 'opacity-40 hover:opacity-70'}`}
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Privé
            </button>
          </div>
          <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="warp-button w-full py-3 mt-2">
            Créer le groupe
          </button>
        </div>
      </div>
    );
  }

  // ─── Friends / Search view ────────────────────────────
  if (view === 'friends' || view === 'new-dm') {
    return (
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        <div className="flex items-center gap-3 p-3 border-b border-current/10">
          <BackButton onClick={() => { setView('list'); setSearchQuery(''); setSearchResults([]); }} />
          <h2 className="text-base font-bold opacity-100 font-title">
            {view === 'new-dm' ? 'Nouveau message' : 'Amis'}
          </h2>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b border-current/10">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Rechercher par pseudo ou CosmoID..."
              className="warp-input w-full py-2.5 pl-10"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Following section (when no search) */}
          {!searchQuery.trim() && friends.length === 0 && following.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="opacity-50 text-base">Aucun ami pour le moment</p>
              <p className="opacity-30 text-body-sm mt-1">Suivez des utilisateurs pour les voir ici</p>
            </div>
          )}

          {/* Friends (mutual follows) */}
          {!searchQuery.trim() && friends.length > 0 && (
            <div>
              <p className="px-3 pt-3 pb-1 text-label opacity-40 uppercase tracking-wider">Amis ({friends.length})</p>
              {friends.map(friend => (
                <button
                  key={friend.address}
                  onClick={() => startDmWith(friend.address)}
                  className="w-full flex items-center gap-3 p-3 border-b border-current/5 hover:bg-white/3 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={friend.address} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium opacity-90 truncate">{friend.alias}</p>
                    <p className="text-label opacity-30 truncate">{shortAddress(friend.address)}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30 shrink-0">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Following (not mutual) */}
          {!searchQuery.trim() && following.length > 0 && (
            <div>
              <p className="px-3 pt-3 pb-1 text-label opacity-40 uppercase tracking-wider">Abonnements ({following.length})</p>
              {following.filter(f => !friends.some(fr => fr.address === f.address)).map(user => (
                <button
                  key={user.address}
                  onClick={() => startDmWith(user.address)}
                  className="w-full flex items-center gap-3 p-3 border-b border-current/5 hover:bg-white/3 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                    <p className="text-label opacity-30 truncate">{shortAddress(user.address)}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30 shrink-0">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          {searchQuery.trim() && (
            <div>
              {searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="opacity-40 text-body-sm">Aucun résultat pour "{searchQuery}"</p>
                </div>
              ) : (
                <>
                  <p className="px-3 pt-3 pb-1 text-label opacity-40 uppercase tracking-wider">Résultats ({searchResults.length})</p>
                  {searchResults.map(user => (
                    <button
                      key={user.address}
                      onClick={() => startDmWith(user.address)}
                      className="w-full flex items-center gap-3 p-3 border-b border-current/5 hover:bg-white/3 transition-colors cursor-pointer text-left"
                    >
                      <HexAvatar address={user.address} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                        <p className="text-label opacity-30 truncate">{shortAddress(user.address)}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-30 shrink-0">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main list view ───────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* Header with tabs */}
      <div className="border-b border-current/10">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-base font-bold opacity-100 font-title">Messages</h2>
          <div className="flex gap-1">
            <button
              onClick={() => { setView('new-dm'); }}
              className="warp-button text-body-sm px-3 py-1.5"
              title="Nouveau message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Nouveau
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-current/5">
          {([
            { id: 'messages' as const, label: 'Messages', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
            { id: 'groups' as const, label: 'Groupes', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
            { id: 'friends' as const, label: 'Amis', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => { if (tab.id === 'friends') { setView('friends'); } else { setListTab(tab.id); } }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-body-sm cursor-pointer transition-all ${
                listTab === tab.id && view === 'list' ? 'opacity-90 border-b-2 border-current' : 'opacity-40 hover:opacity-70'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Messages tab */}
        {listTab === 'messages' && (
          <>
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="opacity-50 text-base">Aucun message</p>
                <p className="opacity-30 text-body-sm mt-1">Envoyez un message à un ami</p>
                <button onClick={() => setView('new-dm')} className="warp-button mt-4 px-4 py-2 text-body-sm">
                  Démarrer une conversation
                </button>
              </div>
            ) : (
              threads.map((thread) => {
                const peer = thread.participants.find(p => p !== wallet.address) || thread.participants[0];
                const peerAlias = getProfileAlias(peer);
                const lastMsg = thread.messages[thread.messages.length - 1];
                return (
                  <button
                    key={thread.id}
                    onClick={() => { setSelectedThread(thread); setView('thread'); }}
                    className="w-full flex items-center gap-3 p-3 border-b border-current/10 hover:bg-white/3 transition-colors cursor-pointer text-left"
                  >
                    <HexAvatar address={peer} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-medium opacity-90 truncate">{peerAlias}</p>
                        {lastMsg && <span className="text-label opacity-30 shrink-0">{timeAgo(lastMsg.timestamp)}</span>}
                      </div>
                      {lastMsg && (
                        <p className="text-body-sm opacity-40 truncate mt-0.5">{lastMsg.content}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}

        {/* Groups tab */}
        {listTab === 'groups' && (
          <>
            <div className="p-3 border-b border-current/5">
              <button onClick={() => setView('new-group')} className="warp-button w-full py-2.5 text-body-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><path d="M12 5v14M5 12h14" /></svg>
                Créer un groupe
              </button>
            </div>
            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="opacity-50 text-base">Aucun groupe</p>
                <p className="opacity-30 text-body-sm mt-1">Créez un groupe public ou privé</p>
              </div>
            ) : (
              channels.map(ch => {
                const isMember = ch.members.includes(wallet.address);
                const lastMsg = ch.messages[ch.messages.length - 1];
                return (
                  <button
                    key={ch.id}
                    onClick={() => { setSelectedChannel(ch); setView('channel'); }}
                    className="w-full flex items-center gap-3 p-3 border-b border-current/10 hover:bg-white/3 transition-colors cursor-pointer text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-current/5 flex items-center justify-center shrink-0">
                      {ch.isPublic ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-medium opacity-90 truncate">{ch.name}</p>
                        {lastMsg && <span className="text-label opacity-30 shrink-0">{timeAgo(lastMsg.timestamp)}</span>}
                      </div>
                      <p className="text-body-sm opacity-40 truncate mt-0.5">
                        {lastMsg ? lastMsg.content : ch.description || 'Aucun message'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-label opacity-30">{ch.members.length} membres</span>
                        {!isMember && <span className="text-label opacity-50 text-amber-400">Rejoindre</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
