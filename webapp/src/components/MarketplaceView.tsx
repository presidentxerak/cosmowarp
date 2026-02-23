import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { computeRarity, RARITY_CONFIG, isExpired, formatTimeRemaining, formatDateFR } from '../engine/warts';
import type { Wart } from '../engine/warts';

type Tab = 'marketplace' | 'collection' | 'create' | 'detail';

export default function MarketplaceView() {
  const {
    wallet, unlocked, marketplace, myCollection, myCreated,
    mintWart, buyWart, listWart, delistWart, transferWart,
    deleteWart, editWart, addWartComment, refreshWarts,
  } = useWallet();

  const [tab, setTab] = useState<Tab>('marketplace');
  const [selectedWart, setSelectedWart] = useState<Wart | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video'>('image');
  const [audioCover, setAudioCover] = useState('');
  const [price, setPrice] = useState('');
  const [royalty, setRoyalty] = useState('5');
  const [editionType, setEditionType] = useState<'unique' | 'limited' | 'unlimited'>('unique');
  const [maxEditions, setMaxEditions] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const audioCoverRef = useRef<HTMLInputElement>(null);

  // Comment
  const [commentText, setCommentText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Buy / List state
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [transferTo, setTransferTo] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editRoyalty, setEditRoyalty] = useState('');

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center max-w-md mx-auto">
        <p className="text-gray-400">Create a wallet first to access the Warts marketplace.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center max-w-md mx-auto">
        <p className="text-gray-400">Unlock your wallet to access the Warts marketplace.</p>
      </div>
    );
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCreateError('File must be under 5MB');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mType: 'image' | 'audio' | 'video' = 'image';
    if (['mp3'].includes(ext)) mType = 'audio';
    else if (['mp4', 'mov'].includes(ext)) mType = 'video';
    else if (['gif', 'jpeg', 'jpg', 'png'].includes(ext)) mType = 'image';

    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setMediaType(mType);
      setCreateError('');
    };
    reader.readAsDataURL(file);
  };

  const handleAudioCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setAudioCover(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleMint = async () => {
    if (!title.trim()) { setCreateError('Title required'); return; }
    if (!imageData) { setCreateError('Image required'); return; }
    const priceVal = price ? parseFloat(price) : null;
    if (priceVal !== null && (isNaN(priceVal) || priceVal <= 0)) { setCreateError('Invalid price'); return; }
    const royaltyVal = parseFloat(royalty);
    if (isNaN(royaltyVal) || royaltyVal < 0 || royaltyVal > 50) { setCreateError('Royalty must be 0-50%'); return; }

    const maxEd = editionType === 'limited' ? parseInt(maxEditions) : null;
    if (editionType === 'limited' && (!maxEd || maxEd < 1)) {
      setCreateError('Limited editions require a max count (1+)');
      return;
    }

    const durH = durationHours ? parseFloat(durationHours) : null;
    if (durH !== null && durH <= 0) { setCreateError('Duration must be positive'); return; }

    setCreating(true);
    setCreateError('');
    try {
      const wart = await mintWart(title, description, imageData, priceVal, royaltyVal, editionType, maxEd, durH, mediaType, audioCover || undefined);
      setCreateSuccess(`Minted "${wart.title}" (Edition #${wart.editionNumber})!`);
      setTitle(''); setDescription(''); setImageData(''); setPrice(''); setRoyalty('5');
      setEditionType('unique'); setMaxEditions(''); setDurationHours('');
      setMediaType('image'); setAudioCover('');
      setTimeout(() => setCreateSuccess(''), 3000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      setCreating(false);
    }
  };

  const handleBuy = async (wart: Wart) => {
    setBuying(true);
    setBuyResult(null);
    const result = await buyWart(wart.id);
    setBuyResult({
      success: result.success,
      message: result.success ? `Bought "${wart.title}"!` : result.error || 'Failed',
    });
    setBuying(false);
    if (result.success) {
      setSelectedWart(null);
      setTimeout(() => setBuyResult(null), 3000);
    }
  };

  const handleList = (wart: Wart) => {
    const p = parseFloat(listPrice);
    if (isNaN(p) || p <= 0) return;
    listWart(wart.id, p);
    setListPrice('');
    setSelectedWart(null);
  };

  const handleDelist = (wart: Wart) => {
    delistWart(wart.id);
    setSelectedWart(null);
  };

  const handleTransfer = async (wart: Wart) => {
    if (!transferTo.trim()) return;
    const result = await transferWart(wart.id, transferTo.trim());
    if (result.success) {
      setTransferTo('');
      setSelectedWart(null);
    }
  };

  const handleDelete = (wart: Wart) => {
    deleteWart(wart.id);
    setSelectedWart(null);
    setConfirmDelete(false);
    setTab('collection');
  };

  const startEditing = (wart: Wart) => {
    setEditing(true);
    setEditTitle(wart.title);
    setEditDescription(wart.description);
    setEditPrice(wart.price !== null ? String(wart.price) : '');
    setEditRoyalty(String(wart.royaltyPercent));
  };

  const handleSaveEdit = (wart: Wart) => {
    const priceVal = editPrice ? parseFloat(editPrice) : null;
    if (priceVal !== null && (isNaN(priceVal) || priceVal <= 0)) return;
    const royaltyVal = parseFloat(editRoyalty);
    if (isNaN(royaltyVal) || royaltyVal < 0 || royaltyVal > 50) return;

    editWart(wart.id, {
      title: editTitle,
      description: editDescription,
      price: priceVal,
      royaltyPercent: royaltyVal,
    });
    setEditing(false);
    setSelectedWart({
      ...wart,
      title: editTitle,
      description: editDescription,
      price: priceVal,
      listed: priceVal !== null,
      royaltyPercent: wart.creator === wallet.address ? royaltyVal : wart.royaltyPercent,
    });
  };

  const openDetail = (wart: Wart) => {
    setSelectedWart(wart);
    setTab('detail');
    setBuyResult(null);
    setListPrice('');
    setTransferTo('');
    setEditing(false);
    setConfirmDelete(false);
  };

  const handleAddComment = (wartId: string) => {
    if (!commentText.trim()) return;
    addWartComment(wartId, commentText);
    setCommentText('');
    refreshWarts();
    // Refresh selected wart
    const updated = [...marketplace, ...myCollection].find(w => w.id === wartId);
    if (updated) setSelectedWart({ ...updated });
  };

  // ─── Media Renderer ───────────────────────────────────────
  const WartMedia = ({ wart, className = '' }: { wart: Wart; className?: string }) => {
    if (wart.mediaType === 'audio') {
      return (
        <div className={`bg-cosmic-900/60 flex flex-col items-center justify-center p-4 ${className}`}>
          {wart.audioCover ? (
            <img src={wart.audioCover} alt={wart.title} className="w-full h-auto max-h-[200px] object-cover mb-2" />
          ) : (
            <div className="text-4xl mb-2">{'\u266B'}</div>
          )}
          <audio controls className="w-full h-8" src={wart.imageData} />
        </div>
      );
    }
    if (wart.mediaType === 'video') {
      return <video controls className={`w-full bg-black ${className}`} src={wart.imageData} />;
    }
    return <img src={wart.imageData} alt={wart.title} className={`w-full h-full object-cover ${className}`} />;
  };

  // ─── Rarity Badge ────────────────────────────────────────
  const RarityBadge = ({ wart }: { wart: Wart }) => {
    const rarity = computeRarity(wart);
    const cfg = RARITY_CONFIG[rarity];
    return (
      <span className={`text-[10px] font-bold ${cfg.color}`}>
        {cfg.badge} {cfg.label}
      </span>
    );
  };

  // ─── Edition Info ─────────────────────────────────────────
  const EditionInfo = ({ wart, compact = false }: { wart: Wart; compact?: boolean }) => {
    const expired = isExpired(wart);
    return (
      <div className={`flex items-center gap-2 flex-wrap ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {wart.editionType === 'unique' ? (
          <span className="text-amber-400">1/1</span>
        ) : wart.editionType === 'limited' && wart.maxEditions !== null ? (
          <span className="text-purple-400">#{wart.editionNumber}/{wart.maxEditions}</span>
        ) : (
          <span className="text-gray-500">#{wart.editionNumber}</span>
        )}
        {wart.availableUntil !== null && (
          expired ? (
            <span className="text-red-400">{'\u23F0'} Expired</span>
          ) : (
            <span className="text-energy-400">{'\u23F0'} {formatTimeRemaining(wart.availableUntil)}</span>
          )
        )}
      </div>
    );
  };

  // ─── Wart Card ─────────────────────────────────────────
  const WartCard = ({ wart, showBuy = false }: { wart: Wart; showBuy?: boolean }) => {
    const expired = isExpired(wart);

    return (
      <div
        className={`glass-panel p-3 cursor-pointer hover:border-warp-400/40 transition-all ${expired ? 'opacity-50' : ''}`}
        onClick={() => openDetail(wart)}
      >
        <div className="aspect-square mb-2 overflow-hidden rounded-none bg-cosmic-900/60 relative">
          <WartMedia wart={wart} />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm">
            <RarityBadge wart={wart} />
          </div>
          {expired && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-red-400 text-xs font-bold">EXPIRED</span>
            </div>
          )}
        </div>
        <h4 className="text-sm font-bold text-gray-200 truncate">{wart.title}</h4>
        <p className="text-[10px] text-gray-500 truncate">
          by {wart.creator === wallet.address ? 'you' : shortAddress(wart.creator)}
        </p>
        <EditionInfo wart={wart} compact />
        <div className="flex items-center justify-between mt-2">
          {wart.listed && wart.price !== null ? (
            <span className="text-sm font-bold text-energy-400">{wart.price} {'\u03A9'}</span>
          ) : (
            <span className="text-xs text-gray-500">Not listed</span>
          )}
          {wart.history.length > 0 && (
            <span className="text-[10px] text-gray-500">{wart.history.length} sales</span>
          )}
        </div>
        {showBuy && !expired && wart.listed && wart.price !== null && wart.owner !== wallet.address && (
          <button
            className="warp-button w-full text-xs mt-2 py-1.5"
            onClick={e => { e.stopPropagation(); handleBuy(wart); }}
            disabled={buying || wallet.balance < wart.price}
          >
            Buy for {wart.price} {'\u03A9'}
          </button>
        )}
      </div>
    );
  };

  // ─── Detail View ───────────────────────────────────────
  if (tab === 'detail' && selectedWart) {
    const wart = selectedWart;
    const isMine = wart.owner === wallet.address;
    const isCreator = wart.creator === wallet.address;
    const expired = isExpired(wart);
    const rarity = computeRarity(wart);
    const rarityCfg = RARITY_CONFIG[rarity];

    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <button
          className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
          onClick={() => { setTab('marketplace'); setSelectedWart(null); setEditing(false); setConfirmDelete(false); }}
        >
          {'\u2190'} Back to Marketplace
        </button>

        <div className="glass-panel p-4">
          <div className="max-w-md mx-auto">
            <div className="aspect-square mb-4 overflow-hidden rounded-none bg-cosmic-900/60 relative">
              <WartMedia wart={wart} />
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-red-400 text-lg font-bold">EXPIRED</span>
                </div>
              )}
            </div>

            {editing ? (
              /* ─── Edit Mode ─────────────────────────────── */
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">TITLE</label>
                  <input
                    className="warp-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">DESCRIPTION</label>
                  <textarea
                    className="warp-input min-h-[80px] resize-y"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">PRICE IN {'\u03A9'} (empty = not for sale)</label>
                  <input
                    className="warp-input"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="1"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                  />
                </div>
                {isCreator && (
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">ROYALTY (%)</label>
                    <input
                      className="warp-input"
                      type="number"
                      min="0"
                      max="50"
                      step="1"
                      value={editRoyalty}
                      onChange={e => setEditRoyalty(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    className="warp-button flex-1 py-2 text-sm"
                    onClick={() => handleSaveEdit(wart)}
                    disabled={!editTitle.trim()}
                  >
                    Save Changes
                  </button>
                  <button
                    className="warp-button flex-1 py-2 text-sm opacity-60 hover:opacity-100"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ─── View Mode ─────────────────────────────── */
              <>
                {/* Rarity + Edition header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-sm font-bold ${rarityCfg.color}`}>
                    {rarityCfg.badge} {rarityCfg.label}
                  </span>
                  <EditionInfo wart={wart} />
                </div>

                <h2 className="text-xl font-bold text-gray-100 mb-1 font-title">{wart.title}</h2>
                {wart.description && (
                  <p className="text-sm text-gray-400 mb-3">{wart.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <span className="text-gray-500">Creator:</span>
                    <span className="text-warp-400 ml-1">{isCreator ? 'You' : shortAddress(wart.creator)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Owner:</span>
                    <span className="text-energy-400 ml-1">{isMine ? 'You' : shortAddress(wart.owner)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Royalty:</span>
                    <span className="text-star-400 ml-1">{wart.royaltyPercent}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sales:</span>
                    <span className="text-nebula-400 ml-1">{wart.history.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Edition:</span>
                    <span className="text-gray-300 ml-1">
                      {wart.editionType === 'unique' ? '1/1 Unique' :
                       wart.editionType === 'limited' ? `#${wart.editionNumber}/${wart.maxEditions}` :
                       `#${wart.editionNumber} (Unlimited)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-300 ml-1">{formatDateFR(wart.createdAt)}</span>
                  </div>
                </div>

                {/* Time limit info */}
                {wart.availableUntil !== null && (
                  <div className={`text-xs p-2 mb-3 border ${
                    expired
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-energy-500/10 border-energy-500/20 text-energy-400'
                  }`}>
                    {expired ? (
                      <>{'\u23F0'} Expired on {formatDateFR(wart.availableUntil)} (Paris)</>
                    ) : (
                      <>{'\u23F0'} Available until {formatDateFR(wart.availableUntil)} (Paris) — {formatTimeRemaining(wart.availableUntil)} remaining</>
                    )}
                  </div>
                )}

                {/* Price & Actions */}
                {wart.listed && wart.price !== null && (
                  <div className="glass-panel p-3 mb-3 text-center">
                    <p className="text-[10px] text-gray-500">CURRENT PRICE</p>
                    <p className="text-2xl font-bold text-energy-400">{wart.price} {'\u03A9'}</p>
                  </div>
                )}

                {buyResult && (
                  <div className={`text-sm p-3 rounded-none mb-3 ${
                    buyResult.success
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}>
                    {buyResult.message}
                  </div>
                )}

                {/* Buy button (not mine, listed, not expired) */}
                {!isMine && wart.listed && wart.price !== null && !expired && (
                  <button
                    className="warp-button w-full py-3 text-base mb-3"
                    onClick={() => handleBuy(wart)}
                    disabled={buying || wallet.balance < wart.price}
                  >
                    {buying ? 'Processing...' : `Buy for ${wart.price} \u03A9`}
                  </button>
                )}

                {/* Owner actions */}
                {isMine && (
                  <div className="space-y-3">
                    {/* Edit & Delete buttons */}
                    <div className="flex gap-2">
                      <button
                        className="warp-button flex-1 py-2 text-sm"
                        onClick={() => startEditing(wart)}
                      >
                        {'\u270E'} Edit
                      </button>
                      {!confirmDelete ? (
                        <button
                          className="flex-1 py-2 text-sm font-bold border transition-all cursor-pointer bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          onClick={() => setConfirmDelete(true)}
                        >
                          {'\u2716'} Delete
                        </button>
                      ) : (
                        <button
                          className="flex-1 py-2 text-sm font-bold border transition-all cursor-pointer bg-red-500/30 border-red-500/50 text-red-300 hover:bg-red-500/40"
                          onClick={() => handleDelete(wart)}
                        >
                          Confirm Delete?
                        </button>
                      )}
                    </div>

                    {wart.listed ? (
                      <button
                        className="warp-button w-full py-2 text-sm"
                        onClick={() => handleDelist(wart)}
                      >
                        Remove from Sale
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="warp-input flex-1 text-sm"
                          type="number"
                          placeholder="Price in \u03A9"
                          value={listPrice}
                          onChange={e => setListPrice(e.target.value)}
                        />
                        <button
                          className="warp-button text-sm px-4"
                          onClick={() => handleList(wart)}
                          disabled={!listPrice}
                        >
                          List for Sale
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        className="warp-input flex-1 text-sm"
                        placeholder="CW... (recipient address)"
                        value={transferTo}
                        onChange={e => setTransferTo(e.target.value)}
                      />
                      <button
                        className="warp-button text-sm px-4"
                        onClick={() => handleTransfer(wart)}
                        disabled={!transferTo}
                      >
                        Gift
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Comments ({(wart.comments || []).length})</h3>
          <div className="flex gap-2 mb-4">
            <input
              className="warp-input flex-1 text-sm"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(wart.id); }}
            />
            <button className="warp-button text-xs px-3" onClick={() => handleAddComment(wart.id)} disabled={!commentText.trim()}>
              Post
            </button>
          </div>
          <div className="space-y-3">
            {(!wart.comments || wart.comments.length === 0) ? (
              <p className="text-xs text-gray-500 text-center py-2">No comments yet</p>
            ) : (
              wart.comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-warp-500/20 border border-warp-500/30 flex items-center justify-center text-[10px] text-warp-300 font-bold shrink-0 mt-0.5">
                    {c.authorAlias.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200">@{c.authorAlias}</span>
                      <span className="text-[10px] text-gray-500">{formatDateFR(c.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transfer History */}
        {wart.history.length > 0 && (
          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Transfer History</h3>
            <div className="space-y-2">
              {wart.history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40 text-xs">
                  <span className="text-energy-400">{'\u21C4'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 truncate">
                      {shortAddress(h.from)} {'\u2192'} {shortAddress(h.to)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {formatDateFR(h.timestamp)}
                    </p>
                  </div>
                  <span className="font-bold text-energy-400 shrink-0">
                    {h.price > 0 ? `${h.price} \u03A9` : 'Gift'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Filter expired from marketplace ──────────────────────
  const activeMarketplace = marketplace.filter(w => !isExpired(w));

  // ─── Tab Navigation ────────────────────────────────────
  const tabs: { id: Tab; label: string }[] = [
    { id: 'marketplace', label: '\u2B22 Marketplace' },
    { id: 'collection', label: '\u25C8 My Collection' },
    { id: 'create', label: '+ Create' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="glass-panel p-2">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 rounded-none text-xs font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Marketplace Tab ───────────────────────────────── */}
      {tab === 'marketplace' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u2B22'} Warts Marketplace</h2>
            <p className="text-xs text-gray-500">
              Unique digital artworks stored on the CosmoWarp protocol. Buy, sell, and collect Warts.
            </p>
          </div>

          {activeMarketplace.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-2xl mb-2">{'\u2742'}</p>
              <p className="text-gray-400 text-sm">No Warts listed yet.</p>
              <p className="text-xs text-gray-500 mt-1">Be the first to create and list a Wart!</p>
              <button
                className="warp-button text-xs mt-3 px-4 py-2"
                onClick={() => setTab('create')}
              >
                Create a Wart
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeMarketplace.map(wart => (
                <WartCard key={wart.id} wart={wart} showBuy />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Collection Tab ────────────────────────────────── */}
      {tab === 'collection' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u25C8'} My Collection</h2>
            <p className="text-xs text-gray-500">
              Warts you own ({myCollection.length}) and created ({myCreated.length})
            </p>
          </div>

          {myCollection.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-400 text-sm">You don't own any Warts yet.</p>
              <button
                className="warp-button text-xs mt-3 px-4 py-2"
                onClick={() => setTab('marketplace')}
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myCollection.map(wart => (
                <WartCard key={wart.id} wart={wart} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Create Tab ────────────────────────────────────── */}
      {tab === 'create' && (
        <div className="glass-panel p-5">
          <h2 className="text-lg font-bold text-gray-100 mb-1 font-title text-center">{'\u2742'} Create a Wart</h2>
          <p className="text-xs text-gray-500 mb-4 text-center">
            Mint a unique digital artwork on the CosmoWarp protocol.
            You'll earn royalties on every resale.
          </p>

          <div className="space-y-4 max-w-md mx-auto">
            {/* Media Upload */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">MEDIA FILE (max 5MB) — .gif .jpeg .png .mp3 .mp4 .mov</label>
              <input
                ref={fileRef}
                type="file"
                accept=".gif,.jpeg,.jpg,.png,.mp3,.mp4,.mov"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <input ref={audioCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAudioCoverUpload} />
              {imageData ? (
                <div className="flex flex-col items-center">
                  {mediaType === 'image' && (
                    <div className="aspect-square max-w-[200px] overflow-hidden rounded-none bg-cosmic-900/60 mb-2">
                      <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {mediaType === 'video' && (
                    <video src={imageData} controls className="max-w-[200px] max-h-[200px] mb-2 bg-black" />
                  )}
                  {mediaType === 'audio' && (
                    <div className="mb-2 space-y-2 w-full">
                      <audio src={imageData} controls className="w-full h-8" />
                      {audioCover ? (
                        <div className="flex items-center gap-2">
                          <img src={audioCover} alt="Cover" className="w-12 h-12 object-cover" />
                          <button className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => setAudioCover('')}>Remove cover</button>
                        </div>
                      ) : (
                        <button className="text-[10px] text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => audioCoverRef.current?.click()}>
                          + Add cover image for audio
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
                    onClick={() => { setImageData(''); setMediaType('image'); setAudioCover(''); }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  className="warp-button w-full py-4 text-sm border-dashed"
                  onClick={() => fileRef.current?.click()}
                >
                  {'\u2B06'} Upload Media
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">TITLE</label>
              <input
                className="warp-input"
                placeholder="Name your artwork"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">DESCRIPTION (optional)</label>
              <textarea
                className="warp-input min-h-[80px] resize-y"
                placeholder="Tell the story behind your art..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* ─── Edition Type ─────────────────────────── */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">EDITION TYPE</label>
              <div className="flex gap-2">
                {(['unique', 'limited', 'unlimited'] as const).map(et => (
                  <button
                    key={et}
                    className={`flex-1 py-2 text-xs font-medium border transition-all cursor-pointer ${
                      editionType === et
                        ? 'bg-warp-500/30 border-warp-500/50 text-warp-300'
                        : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                    onClick={() => setEditionType(et)}
                  >
                    {et === 'unique' ? '\u2726 Unique (1/1)' :
                     et === 'limited' ? '\u2605 Limited' :
                     '\u25CE Unlimited'}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Editions (only for limited) */}
            {editionType === 'limited' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">MAX EDITIONS</label>
                <input
                  className="warp-input"
                  type="number"
                  placeholder="e.g. 10"
                  min="1"
                  step="1"
                  value={maxEditions}
                  onChange={e => setMaxEditions(e.target.value)}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  How many copies can be minted.
                </p>
              </div>
            )}

            {/* ─── Time Limit ──────────────────────────── */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">TIME LIMIT (optional, in hours)</label>
              <input
                className="warp-input"
                type="number"
                placeholder="e.g. 24 (leave empty = forever)"
                min="0"
                step="1"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                {durationHours
                  ? `Expires ${formatDateFR(Date.now() + parseFloat(durationHours) * 3600000)} (Paris). Rarity increases as deadline approaches.`
                  : 'Leave empty for no time limit. Time-limited Warts gain rarity as deadline approaches.'}
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">PRICE IN {'\u03A9'} (leave empty = not for sale)</label>
              <input
                className="warp-input"
                type="number"
                placeholder="0"
                min="0"
                step="1"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            {/* Royalty */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">CREATOR ROYALTY ON RESALE (%)</label>
              <input
                className="warp-input"
                type="number"
                placeholder="5"
                min="0"
                max="50"
                step="1"
                value={royalty}
                onChange={e => setRoyalty(e.target.value)}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                You'll receive {royalty || 5}% of every future resale.
              </p>
            </div>

            {/* Rarity Preview */}
            <div className="text-xs p-3 border border-white/5 bg-cosmic-900/40">
              <span className="text-gray-500">Estimated rarity: </span>
              {(() => {
                const previewRarity = editionType === 'unique' ? 'legendary'
                  : editionType === 'limited' && maxEditions
                    ? parseInt(maxEditions) <= 10 ? 'epic'
                    : parseInt(maxEditions) <= 50 ? 'rare'
                    : parseInt(maxEditions) <= 200 ? 'uncommon'
                    : 'common'
                  : 'common';
                const cfg = RARITY_CONFIG[previewRarity];
                return <span className={`font-bold ${cfg.color}`}>{cfg.badge} {cfg.label}</span>;
              })()}
              {durationHours && <span className="text-energy-400 ml-2">(+time bonus near deadline)</span>}
            </div>

            {createError && (
              <div className="text-sm p-3 rounded-none bg-red-500/10 border border-red-500/30 text-red-400">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="text-sm p-3 rounded-none bg-green-500/10 border border-green-500/30 text-green-400">
                {createSuccess}
              </div>
            )}

            <button
              className="warp-button w-full py-3 text-base"
              onClick={handleMint}
              disabled={creating || !title || !imageData}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
                  Minting...
                </span>
              ) : (
                <>{'\u2742'} Mint Wart</>
              )}
            </button>
          </div>

          {/* Protocol info */}
          <div className="mt-6 pt-4 border-t border-white/5 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-gray-300 mb-2 text-center">How Warts Work</h3>
            <div className="text-[11px] text-gray-500 space-y-1">
              <p>1. Upload your artwork and set a title</p>
              <p>2. Choose edition type: Unique (1/1), Limited, or Unlimited</p>
              <p>3. Set an optional time limit — rarity increases as deadline approaches</p>
              <p>4. List it for sale on the marketplace at your price</p>
              <p>5. Buyers pay in Warp ({'\u03A9'}) — ownership transfers instantly</p>
              <p>6. You earn royalties on every future resale ({royalty || 5}%)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
