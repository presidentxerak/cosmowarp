import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { DirectThread } from '../engine/cosmochat';

export default function MessageView() {
  const { wallet, unlocked } = useWallet();
  useState(() => CosmoChatEngine.load());
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<DirectThread | null>(null);
  const [dmText, setDmText] = useState('');
  const [dmTo, setDmTo] = useState('');
  const [showNewDm, setShowNewDm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    if (wallet) {
      const e = CosmoChatEngine.load();
      setThreads(e.getThreads(wallet.address));
    }
  };

  useEffect(() => { refresh(); }, [wallet]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [selectedThread?.messages.length]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-30 mb-3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="opacity-50 text-base">Unlock your wallet to access messages</p>
          <p className="opacity-30 text-body-sm mt-1">End-to-end encrypted direct messages</p>
        </div>
      </div>
    );
  }

  const handleSendDm = () => {
    if (!dmText.trim() || !selectedThread || !wallet) return;
    const e = CosmoChatEngine.load();
    const peer = selectedThread.participants.find(p => p !== wallet.address) || selectedThread.participants[0];
    const alias = wallet.alias || shortAddress(wallet.address);
    e.sendDM(wallet.address, alias, peer, dmText.trim());
    setDmText('');
    refresh();
    const updatedThreads = CosmoChatEngine.load().getThreads(wallet.address);
    const updated = updatedThreads.find(t => t.id === selectedThread.id);
    if (updated) setSelectedThread(updated);
  };

  const handleNewDm = () => {
    if (!dmTo.trim() || !wallet) return;
    const e = CosmoChatEngine.load();
    const alias = wallet.alias || shortAddress(wallet.address);
    e.sendDM(wallet.address, alias, dmTo.trim(), 'Hey!');
    setDmTo('');
    setShowNewDm(false);
    refresh();
  };

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  // Thread detail view
  if (selectedThread) {
    const peer = selectedThread.participants.find(p => p !== wallet.address) || selectedThread.participants[0];
    return (
      <div className="flex flex-col h-[calc(100dvh-120px)]">
        {/* Thread header */}
        <div className="flex items-center gap-3 p-3 border-b border-current/10">
          <button
            onClick={() => setSelectedThread(null)}
            className="w-8 h-8 flex items-center justify-center opacity-50 hover:opacity-90 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-current/5 flex items-center justify-center text-body-sm opacity-80">
              {shortAddress(peer).slice(0, 2)}
            </div>
            <div>
              <p className="text-base font-medium opacity-90">{shortAddress(peer)}</p>
              <p className="text-label opacity-40">Encrypted</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {selectedThread.messages.map((msg, i) => {
            const isMe = msg.from === wallet.address;
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 ${
                  isMe
                    ? 'bg-current/5 border border-current/10'
                    : 'bg-current/5 border border-current/10'
                }`}>
                  <p className="text-base opacity-90">{msg.content}</p>
                  <p className="text-label opacity-30 mt-0.5 text-right">{timeAgo(msg.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-current/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendDm(); }}
              placeholder="Message..."
              className="flex-1 warp-input py-2.5"
            />
            <button onClick={handleSendDm} disabled={!dmText.trim()} className="warp-button px-3 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Thread list view
  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      <div className="flex items-center justify-between p-3 border-b border-current/10">
        <h2 className="text-base font-bold opacity-100 font-title">Messages</h2>
        <button
          onClick={() => setShowNewDm(!showNewDm)}
          className="warp-button text-body-sm px-3 py-1.5"
        >
          New
        </button>
      </div>

      {showNewDm && (
        <div className="p-3 border-b border-current/10 flex gap-2">
          <input
            type="text"
            value={dmTo}
            onChange={(e) => setDmTo(e.target.value)}
            placeholder="Recipient address..."
            className="flex-1 warp-input text-body-sm py-2"
          />
          <button onClick={handleNewDm} disabled={!dmTo.trim()} className="warp-button text-body-sm px-3">
            Start
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="opacity-50 text-base">No messages yet</p>
            <p className="opacity-30 text-body-sm mt-1">Start an encrypted conversation</p>
          </div>
        ) : (
          threads.map((thread) => {
            const peer = thread.participants.find(p => p !== wallet.address) || thread.participants[0];
            const lastMsg = thread.messages[thread.messages.length - 1];
            return (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className="w-full flex items-center gap-3 p-3 border-b border-current/10 hover:bg-white/3 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-full bg-current/5 flex items-center justify-center text-base opacity-80 shrink-0">
                  {shortAddress(peer).slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-medium opacity-90 truncate">{shortAddress(peer)}</p>
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
      </div>
    </div>
  );
}
