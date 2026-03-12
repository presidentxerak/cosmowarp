import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import { shortAddress } from '../engine/crypto';
import type { Wart } from '../engine/warts';
import HexAvatar from './HexAvatar';

export default function SignetsView() {
  const { wallet, unlocked, marketplace, toggleWartBookmark } = useWallet();
  const [bookmarks, setBookmarks] = useState<ChatPost[]>([]);

  // Bookmarked warts from marketplace
  const bookmarkedWarts = wallet
    ? marketplace.filter(w => w.bookmarks?.includes(wallet.address))
    : [];

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

  const handleRemoveWart = (wartId: string) => {
    if (!wallet) return;
    toggleWartBookmark(wartId);
  };

  const navigateToWart = (wartId: string) => {
    sessionStorage.setItem('strangrz_open_wart', wartId);
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'gallery' }));
  };

  const navigateToPost = (postId: string) => {
    sessionStorage.setItem('strangrz_open_post', postId);
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'wall' }));
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

  const totalCount = bookmarks.length + bookmarkedWarts.length;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="text-title-sm font-bold opacity-100 font-title">Signets</h2>
        <span className="text-body-sm opacity-40">{totalCount} saved</span>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30 mb-3">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="opacity-50 text-base">No signets yet</p>
          <p className="opacity-30 text-body-sm mt-1">Bookmark posts from the Wall or artworks from the Gallery</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Bookmarked Warts */}
          {bookmarkedWarts.length > 0 && (
            <>
              <p className="text-label opacity-40 px-1">{'\u2B22'} Artworks ({bookmarkedWarts.length})</p>
              {bookmarkedWarts.map((wart: Wart) => (
                <div key={wart.id} className="glass-panel p-3 cursor-pointer hover:border-current/10 transition-all" onClick={() => navigateToWart(wart.id)}>
                  <div className="flex items-start gap-3">
                    {wart.imageData && (
                      <img src={wart.imageData} alt={wart.title || ''} className="w-16 h-16 object-cover shrink-0 border border-current/10" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold opacity-90">{wart.title || 'Untitled'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm opacity-50">by {shortAddress(wart.creator)}</span>
                      </div>
                      {wart.description && <p className="text-body-sm opacity-40 mt-1 line-clamp-2">{wart.description}</p>}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveWart(wart.id); }}
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
            </>
          )}

          {/* Bookmarked Posts */}
          {bookmarks.length > 0 && (
            <>
              {bookmarkedWarts.length > 0 && <p className="text-label opacity-40 px-1 mt-2">Wall Posts ({bookmarks.length})</p>}
              {bookmarks.map(post => (
                <div key={post.id} className="glass-panel p-3 cursor-pointer hover:border-current/10 transition-all" onClick={() => navigateToPost(post.id)}>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0">
                      <HexAvatar address={post.author} size={32} />
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
                      onClick={e => { e.stopPropagation(); handleRemove(post.id); }}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
