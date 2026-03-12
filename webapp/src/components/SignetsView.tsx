import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import { shortAddress } from '../engine/crypto';

export default function SignetsView() {
  const { wallet, unlocked } = useWallet();
  const [bookmarks, setBookmarks] = useState<ChatPost[]>([]);

  useEffect(() => {
    if (wallet) {
      const engine = CosmoChatEngine.load();
      setBookmarks(engine.getBookmarks(wallet.address));
    }
  }, [wallet]);

  const handleRemove = (postId: string) => {
    if (!wallet) return;
    const engine = CosmoChatEngine.load();
    engine.bookmarkPost(postId, wallet.address);
    setBookmarks(engine.getBookmarks(wallet.address));
  };

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-30 mb-3">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="opacity-50 text-base">Unlock your wallet to view signets</p>
          <p className="opacity-30 text-body-sm mt-1">Your saved posts and bookmarks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="text-title-sm font-bold opacity-100 font-title">Signets</h2>
        <span className="text-body-sm opacity-40">{bookmarks.length} saved</span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="opacity-50 text-base">No signets yet</p>
          <p className="opacity-30 text-body-sm mt-1">Bookmark posts from the Wall to save them here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map(post => (
            <div key={post.id} className="glass-panel p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-current/5 flex items-center justify-center text-body-sm opacity-80 shrink-0" style={{ clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' }}>
                  {shortAddress(post.author).slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-medium opacity-90">{shortAddress(post.author)}</span>
                    <span className="text-label opacity-30">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-base opacity-70 mt-1">{post.content}</p>
                  {post.mediaData && post.mediaType === 'image' && (
                    <img src={post.mediaData} alt="" className="mt-2 max-h-48 w-auto object-cover border border-current/10" />
                  )}
                </div>
                <button
                  onClick={() => handleRemove(post.id)}
                  className="shrink-0 p-1.5 opacity-80 hover:opacity-80 cursor-pointer transition-colors"
                  title="Remove signet"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
