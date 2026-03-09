import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { computeRarity, RARITY_CONFIG, isExpired, formatTimeRemaining, formatDateFR } from '../engine/warts';
import type { Wart } from '../engine/warts';
import { getCurrencySymbol, type FiatCurrency } from '../engine/fiatgateway';
import { generatePhygitalCert, verifyCert, generatePrintableSVG, generateSignaturePDF, type PhygitalCertificate } from '../engine/phygital';

import PFPCollectionView from './PFPCollectionView';
import MusicView from './MusicView';
type Tab = 'marketplace' | 'collection' | 'create' | 'detail' | 'pfp' | 'rwa-phygital' | 'music';

export default function MarketplaceView() {
  const {
    wallet, unlocked, marketplace, myCollection, myCreated,
    mintWart, buyWart, listWart, delistWart, transferWart,
    deleteWart, editWart, addWartComment, verifyWartCertificate, refreshWarts,
    listWartFiat, buyWartFiat, getWartFiatPrice,
  } = useWallet();

  const [tab, setTab] = useState<Tab>('marketplace');
  const [selectedWart, setSelectedWart] = useState<Wart | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video' | 'svg'>('image');
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

  // Certificate verification
  const [certStatus, setCertStatus] = useState<{ valid: boolean; reason: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Fiat pricing
  const [fiatPriceInput, setFiatPriceInput] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>('EUR');
  const [pricingMode, setPricingMode] = useState<'crypto' | 'fiat'>('crypto');
  const [buyingFiat, setBuyingFiat] = useState(false);

  // Phygital certificate
  const [phygitalCert, setPhygitalCert] = useState<PhygitalCertificate | null>(null);
  const [generatingPhygital, setGeneratingPhygital] = useState(false);
  const [phygitalVerifyInput, setPhygitalVerifyInput] = useState('');
  const [phygitalVerifyResult, setPhygitalVerifyResult] = useState<PhygitalCertificate | null | undefined>(undefined);

  if (!wallet) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Créez un portefeuille pour accéder à la marketplace Cosmorares.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Déverrouillez votre portefeuille pour accéder à la marketplace Cosmorares.</p>
      </div>
    );
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setCreateError('File must be under 50MB');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mType: 'image' | 'audio' | 'video' | 'svg' = 'image';
    if (['mp3', 'wav'].includes(ext)) mType = 'audio';
    else if (['mp4', 'mov'].includes(ext)) mType = 'video';
    else if (['svg'].includes(ext)) mType = 'svg';
    else if (['gif', 'jpeg', 'jpg', 'png'].includes(ext)) mType = 'image';

    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setMediaType(mType);
      setCreateError('');
    };
    reader.onerror = () => setCreateError('Failed to read file');
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
    const timeout = setTimeout(() => {
      setBuying(false);
      setBuyResult({ success: false, message: 'Request timed out — please try again' });
    }, 30000);
    try {
      const result = await buyWart(wart.id);
      clearTimeout(timeout);
      setBuyResult({
        success: result.success,
        message: result.success ? `Bought "${wart.title}"!` : result.error || 'Failed',
      });
      setBuying(false);
      if (result.success) {
        setSelectedWart(null);
        setTimeout(() => setBuyResult(null), 3000);
      }
    } catch {
      clearTimeout(timeout);
      setBuying(false);
      setBuyResult({ success: false, message: 'Purchase failed — please try again' });
    }
  };

  const handleBuyFiat = async (wart: Wart) => {
    setBuyingFiat(true);
    setBuyResult(null);
    const result = await buyWartFiat(wart.id, 'card');
    setBuyResult({
      success: result.success,
      message: result.success
        ? `Bought "${wart.title}" with ${wart.fiatCurrency ? getCurrencySymbol(wart.fiatCurrency) : ''}${wart.priceFiat?.toFixed(2) || ''}!`
        : result.error || 'Failed',
    });
    setBuyingFiat(false);
    if (result.success) {
      setSelectedWart(null);
      setTimeout(() => setBuyResult(null), 3000);
    }
  };

  const handleList = (wart: Wart) => {
    let ok = false;
    if (pricingMode === 'fiat') {
      const fp = parseFloat(fiatPriceInput);
      if (isNaN(fp) || fp <= 0) return;
      ok = listWartFiat(wart.id, fp, fiatCurrency);
      setFiatPriceInput('');
    } else {
      const p = parseFloat(listPrice);
      if (isNaN(p) || p <= 0) return;
      ok = listWart(wart.id, p);
      setListPrice('');
    }
    if (ok) {
      setListSuccess('Listed successfully!');
      setTimeout(() => setListSuccess(''), 3000);
    }
    setSelectedWart(null);
  };

  const handleDelist = (wart: Wart) => {
    const ok = delistWart(wart.id);
    if (ok) {
      setListSuccess('Removed from sale');
      setTimeout(() => setListSuccess(''), 3000);
    }
    setSelectedWart(null);
  };

  const [transferError, setTransferError] = useState('');
  const [listSuccess, setListSuccess] = useState('');

  const handleTransfer = async (wart: Wart) => {
    const addr = transferTo.trim();
    if (!addr) return;
    if (!addr.startsWith('CW') || addr.length < 10) {
      setTransferError('Invalid address — must start with CW');
      return;
    }
    if (addr === wallet.address) {
      setTransferError('Cannot transfer to yourself');
      return;
    }
    setTransferError('');
    const result = await transferWart(wart.id, addr);
    if (result.success) {
      setTransferTo('');
      setSelectedWart(null);
    } else {
      setTransferError(result.error || 'Transfer failed');
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
    setCertStatus(null);
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

  const handleVerifyCert = async (wartId: string) => {
    setVerifying(true);
    setCertStatus(null);
    const result = await verifyWartCertificate(wartId);
    setCertStatus(result);
    setVerifying(false);
  };

  // ─── Media Renderer ───────────────────────────────────────
  const WartMedia = ({ wart, className = '' }: { wart: Wart; className?: string }) => {
    if (wart.mediaType === 'audio') {
      return (
        <div className={`bg-current/5 flex flex-col items-center justify-center p-4 ${className}`}>
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
      <div className={`flex items-center gap-2 flex-wrap ${compact ? 'text-[10px]' : 'text-body-sm'}`}>
        {wart.editionType === 'unique' ? (
          <span className="opacity-80">1/1</span>
        ) : wart.editionType === 'limited' && wart.maxEditions !== null ? (
          <span className="opacity-80">#{wart.editionNumber}/{wart.maxEditions}</span>
        ) : (
          <span className="opacity-40">#{wart.editionNumber}</span>
        )}
        {wart.availableUntil !== null && (
          expired ? (
            <span className="opacity-70">{'\u23F0'} Expired</span>
          ) : (
            <span className="opacity-80">{'\u23F0'} {formatTimeRemaining(wart.availableUntil)}</span>
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
        className={`glass-panel p-3 cursor-pointer hover:border-current/20/40 transition-all ${expired ? 'opacity-50' : ''}`}
        onClick={() => openDetail(wart)}
      >
        <div className="aspect-square mb-2 overflow-hidden rounded-none bg-current/5 relative">
          <WartMedia wart={wart} />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm">
            <RarityBadge wart={wart} />
          </div>
          {wart.certId && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-current/10 border border-current/15">
              <span className="text-[9px] opacity-80">{'\u2714'} Cert</span>
            </div>
          )}
          {expired && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="opacity-70 text-body-sm font-bold">EXPIRED</span>
            </div>
          )}
        </div>
        <h4 className="text-base font-bold opacity-90 truncate">{wart.title}</h4>
        <p className="text-[10px] opacity-40 truncate">
          by {wart.creator === wallet.address ? 'you' : shortAddress(wart.creator)}
        </p>
        <EditionInfo wart={wart} compact />
        <div className="flex items-center justify-between mt-2">
          {wart.listed && wart.price !== null ? (
            <div>
              <span className="text-base font-bold opacity-80">{wart.price} {'\u03A9'}</span>
              {wart.priceFiat && wart.fiatCurrency && (
                <span className="text-[10px] opacity-50 text-current ml-1">
                  ({getCurrencySymbol(wart.fiatCurrency)}{wart.priceFiat.toFixed(2)})
                </span>
              )}
              {!wart.priceFiat && (
                <span className="text-[10px] opacity-40 ml-1">
                  ({getWartFiatPrice(wart.id) || ''})
                </span>
              )}
            </div>
          ) : (
            <span className="text-body-sm opacity-40">Not listed</span>
          )}
          {wart.history.length > 0 && (
            <span className="text-[10px] opacity-40">{wart.history.length} sales</span>
          )}
        </div>
        {showBuy && !expired && wart.listed && wart.price !== null && wart.owner !== wallet.address && (
          <div className="flex gap-1 mt-2">
            <button
              className="warp-button flex-1 text-body-sm py-1.5"
              onClick={e => { e.stopPropagation(); handleBuy(wart); }}
              disabled={buying || wallet.balance < wart.price}
            >
              {wart.price} {'\u03A9'}
            </button>
            {wart.priceFiat && wart.fiatCurrency && (
              <button
                className="flex-1 text-body-sm py-1.5 bg-current/10 opacity-80 border border-current/15 hover:bg-current/15 transition-colors cursor-pointer"
                onClick={e => { e.stopPropagation(); handleBuyFiat(wart); }}
                disabled={buyingFiat}
              >
                {getCurrencySymbol(wart.fiatCurrency)}{wart.priceFiat.toFixed(2)}
              </button>
            )}
          </div>
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
          className="text-body-sm opacity-50 text-current hover:opacity-90 cursor-pointer"
          onClick={() => { setTab('marketplace'); setSelectedWart(null); setEditing(false); setConfirmDelete(false); }}
        >
          {'\u2190'} Back to Marketplace
        </button>

        <div className="glass-panel p-4">
          <div className="max-w-md mx-auto">
            <div className="aspect-square mb-4 overflow-hidden rounded-none bg-current/5 relative">
              <WartMedia wart={wart} />
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="opacity-70 text-title-sm font-bold">EXPIRED</span>
                </div>
              )}
            </div>

            {editing ? (
              /* ─── Edit Mode ─────────────────────────────── */
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] opacity-50 text-current block mb-1">TITLE</label>
                  <input
                    className="warp-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-[10px] opacity-50 text-current block mb-1">DESCRIPTION</label>
                  <textarea
                    className="warp-input min-h-[80px] resize-y"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    maxLength={500}
                  />
                </div>
                <div>
                  <label className="text-[10px] opacity-50 text-current block mb-1">PRICE IN {'\u03A9'} (empty = not for sale)</label>
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
                    <label className="text-[10px] opacity-50 text-current block mb-1">ROYALTY (%)</label>
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
                    className="warp-button flex-1 py-2 text-base"
                    onClick={() => handleSaveEdit(wart)}
                    disabled={!editTitle.trim()}
                  >
                    Save Changes
                  </button>
                  <button
                    className="warp-button flex-1 py-2 text-base opacity-60 hover:opacity-100"
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
                  <span className={`text-base font-bold ${rarityCfg.color}`}>
                    {rarityCfg.badge} {rarityCfg.label}
                  </span>
                  <EditionInfo wart={wart} />
                </div>

                <h2 className="text-title-md font-bold opacity-100 mb-1 font-title">{wart.title}</h2>
                {wart.description && (
                  <p className="text-base opacity-50 text-current mb-3">{wart.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-body-sm mb-4">
                  <div>
                    <span className="opacity-40">Creator:</span>
                    <span className="opacity-80 ml-1">{isCreator ? 'You' : shortAddress(wart.creator)}</span>
                  </div>
                  <div>
                    <span className="opacity-40">Owner:</span>
                    <span className="opacity-80 ml-1">{isMine ? 'You' : shortAddress(wart.owner)}</span>
                  </div>
                  <div>
                    <span className="opacity-40">Royalty:</span>
                    <span className="opacity-80 ml-1">{wart.royaltyPercent}%</span>
                  </div>
                  <div>
                    <span className="opacity-40">Sales:</span>
                    <span className="opacity-80 ml-1">{wart.history.length}</span>
                  </div>
                  <div>
                    <span className="opacity-40">Edition:</span>
                    <span className="opacity-70 ml-1">
                      {wart.editionType === 'unique' ? '1/1 Unique' :
                       wart.editionType === 'limited' ? `#${wart.editionNumber}/${wart.maxEditions}` :
                       `#${wart.editionNumber} (Unlimited)`}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-40">Created:</span>
                    <span className="opacity-70 ml-1">{formatDateFR(wart.createdAt)}</span>
                  </div>
                </div>

                {/* Time limit info */}
                {wart.availableUntil !== null && (
                  <div className={`text-body-sm p-2 mb-3 border ${
                    expired
                      ? 'bg-current/5 border-current/10 opacity-70'
                      : 'bg-current/5 border-current/10 opacity-80'
                  }`}>
                    {expired ? (
                      <>{'\u23F0'} Expired on {formatDateFR(wart.availableUntil)} (Paris)</>
                    ) : (
                      <>{'\u23F0'} Available until {formatDateFR(wart.availableUntil)} (Paris) — {formatTimeRemaining(wart.availableUntil)} remaining</>
                    )}
                  </div>
                )}

                {/* Certificate of Authenticity */}
                {wart.certId && (
                  <div className="glass-panel p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-body-sm font-bold opacity-70">{'\u2726'} Certificate of Authenticity</h4>
                      <button
                        className="text-[10px] opacity-80 hover:opacity-80 cursor-pointer"
                        onClick={() => handleVerifyCert(wart.id)}
                        disabled={verifying}
                      >
                        {verifying ? 'Verifying...' : '\u2714 Verify'}
                      </button>
                    </div>
                    <div className="text-[10px] opacity-40 space-y-1">
                      <p>
                        <span className="opacity-50 text-current">Cert ID:</span>{' '}
                        <span className="opacity-80 font-mono break-all">{wart.certId}</span>
                      </p>
                      <p>
                        <span className="opacity-50 text-current">Fingerprint:</span>{' '}
                        <span className="opacity-70 font-mono">{wart.contentFingerprint?.slice(0, 16)}...</span>
                      </p>
                      {wart.creatorSignature && (
                        <p>
                          <span className="opacity-50 text-current">Signed:</span>{' '}
                          <span className="opacity-80">{'\u2714'} Creator Ed25519 signature</span>
                        </p>
                      )}
                    </div>
                    {certStatus && (
                      <div className={`text-body-sm p-2 border ${
                        certStatus.valid
                          ? 'bg-current/5 border-current/10 opacity-80'
                          : 'bg-current/5 border-current/15 opacity-70'
                      }`}>
                        {certStatus.valid ? '\u2714' : '\u2718'} {certStatus.reason}
                      </div>
                    )}
                  </div>
                )}

                {/* Phygital Authentication */}
                {wart.certId && (isCreator || isMine) && (
                  <div className="glass-panel p-3 mb-3 space-y-2">
                    <h4 className="text-body-sm font-bold opacity-70">{'\u2B22'} Phygital Authentication</h4>
                    <p className="text-[10px] opacity-40">
                      Generate a printable hash signature to physically attach to your artwork and authenticate it.
                    </p>
                    {phygitalCert && phygitalCert.wartId === wart.id ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-current/5 border border-current/10 text-center">
                          <p className="text-label opacity-40 mb-1">VERIFICATION CODE</p>
                          <p className="text-title-md font-bold opacity-90 tracking-widest">{phygitalCert.verificationCode}</p>
                          <p className="text-[10px] opacity-30 mt-1 font-mono break-all">{phygitalCert.certHash}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="warp-button flex-1 text-body-sm py-2"
                            onClick={() => {
                              navigator.clipboard.writeText(phygitalCert.verificationCode);
                            }}
                          >
                            Copy Code
                          </button>
                          <button
                            className="warp-button flex-1 text-body-sm py-2"
                            onClick={() => {
                              const svg = generatePrintableSVG(phygitalCert);
                              const blob = new Blob([svg], { type: 'image/svg+xml' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `phygital-${phygitalCert.verificationCode}.svg`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            Download Print
                          </button>
                        </div>
                        <p className="text-[10px] opacity-30">Print the SVG and attach it to your physical artwork. Anyone can verify with the code above.</p>
                      </div>
                    ) : (
                      <button
                        className="warp-button w-full text-body-sm py-2"
                        onClick={async () => {
                          setGeneratingPhygital(true);
                          try {
                            const cert = await generatePhygitalCert(
                              wart.id,
                              wart.title,
                              wart.creator,
                              wart.owner,
                              wart.contentFingerprint || '',
                              wart.editionNumber,
                              wart.maxEditions,
                            );
                            setPhygitalCert(cert);
                          } catch { setCreateError('Failed to generate phygital certificate'); }
                          setGeneratingPhygital(false);
                        }}
                        disabled={generatingPhygital}
                      >
                        {generatingPhygital ? 'Generating...' : 'Generate Phygital Certificate'}
                      </button>
                    )}
                  </div>
                )}

                {/* Print Signature for 1/1 artworks with physical counterpart */}
                {(wart.editionType === 'unique' || wart.maxEditions === 1) && wart.certId && (isMine || isCreator) && (
                  <div className="glass-panel p-3 mb-3 space-y-2">
                    <h4 className="text-body-sm font-bold opacity-70">{'\u2399'} Physical Artwork Signature</h4>
                    <p className="text-[10px] opacity-40">
                      Print a business card with the transaction signature to authenticate the physical artwork associated with this 1/1 piece.
                    </p>
                    <button
                      className="warp-button w-full py-2.5 text-body-sm font-bold flex items-center justify-center gap-2"
                      onClick={() => {
                        const lastTx = wart.history.length > 0 ? wart.history[wart.history.length - 1] : null;
                        const txId = wart.onChainTxId || lastTx?.txId || wart.certId || wart.id;
                        const artistName = isCreator
                          ? (wallet.alias || shortAddress(wallet.address))
                          : shortAddress(wart.creator);
                        generateSignaturePDF({
                          artworkName: wart.title,
                          artistName,
                          transactionId: txId,
                        });
                      }}
                    >
                      {'\u2399'} Print Signature
                    </button>
                  </div>
                )}

                {/* Phygital Verification (anyone) */}
                <div className="glass-panel p-3 mb-3 space-y-2">
                  <h4 className="text-body-sm font-bold opacity-70">{'\u2714'} Verify Phygital</h4>
                  <p className="text-[10px] opacity-40">Enter a verification code from a physical artwork to check authenticity.</p>
                  <div className="flex gap-2">
                    <input
                      className="warp-input flex-1 text-body-sm py-2"
                      placeholder="XXXX-XXXX-XXXX"
                      value={phygitalVerifyInput}
                      onChange={e => { setPhygitalVerifyInput(e.target.value); setPhygitalVerifyResult(undefined); }}
                    />
                    <button
                      className="warp-button text-body-sm px-3 py-2"
                      onClick={() => {
                        const result = verifyCert(phygitalVerifyInput);
                        setPhygitalVerifyResult(result);
                      }}
                      disabled={!phygitalVerifyInput.trim()}
                    >
                      Verify
                    </button>
                  </div>
                  {phygitalVerifyResult !== undefined && (
                    phygitalVerifyResult ? (
                      <div className="p-2 bg-current/5 border border-current/10 text-body-sm">
                        <p className="opacity-80 font-bold">{'\u2714'} Authentic</p>
                        <p className="text-[10px] opacity-50">Title: {phygitalVerifyResult.wartTitle}</p>
                        <p className="text-[10px] opacity-50">Creator: {shortAddress(phygitalVerifyResult.creatorAddress)}</p>
                        <p className="text-[10px] opacity-50">Edition: {phygitalVerifyResult.editionInfo}</p>
                        <p className="text-[10px] opacity-50">Date: {new Date(phygitalVerifyResult.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                    ) : (
                      <div className="p-2 bg-current/5 border border-current/15 text-body-sm opacity-70">
                        {'\u2718'} No certificate found for this code.
                      </div>
                    )
                  )}
                </div>

                {/* Price & Actions */}
                {wart.listed && wart.price !== null && (
                  <div className="glass-panel p-3 mb-3 text-center">
                    <p className="text-[10px] opacity-40">CURRENT PRICE</p>
                    <p className="text-2xl font-bold opacity-80">{wart.price} {'\u03A9'}</p>
                    {wart.priceFiat && wart.fiatCurrency && (
                      <p className="text-base opacity-50 text-current">
                        {getCurrencySymbol(wart.fiatCurrency)}{wart.priceFiat.toFixed(2)} {wart.fiatCurrency}
                      </p>
                    )}
                    {!wart.priceFiat && (
                      <p className="text-body-sm opacity-40">{getWartFiatPrice(wart.id)}</p>
                    )}
                  </div>
                )}

                {buyResult && (
                  <div className={`text-base p-3 rounded-none mb-3 ${
                    buyResult.success
                      ? 'bg-current/5 border border-current/15 opacity-80'
                      : 'bg-current/5 border border-current/15 opacity-70'
                  }`}>
                    {buyResult.message}
                  </div>
                )}

                {/* Buy buttons (not mine, listed, not expired) */}
                {!isMine && wart.listed && wart.price !== null && !expired && (
                  <div className="space-y-2 mb-3">
                    <button
                      className="warp-button w-full py-3 text-base"
                      onClick={() => handleBuy(wart)}
                      disabled={buying || wallet.balance < wart.price}
                    >
                      {buying ? 'Processing...' : `Buy with ${wart.price} \u03A9`}
                    </button>
                    {wart.priceFiat && wart.fiatCurrency && (
                      <button
                        className="w-full py-3 text-base bg-current/10 opacity-80 border border-current/15 hover:bg-current/15 transition-colors cursor-pointer"
                        onClick={() => handleBuyFiat(wart)}
                        disabled={buyingFiat}
                      >
                        {buyingFiat ? 'Processing payment...' : `Pay ${getCurrencySymbol(wart.fiatCurrency)}${wart.priceFiat.toFixed(2)} (Card/PayPal)`}
                      </button>
                    )}
                  </div>
                )}

                {/* Owner actions */}
                {isMine && (
                  <div className="space-y-3">
                    {/* Edit & Delete buttons */}
                    <div className="flex gap-2">
                      <button
                        className="warp-button flex-1 py-2 text-base"
                        onClick={() => startEditing(wart)}
                      >
                        {'\u270E'} Edit
                      </button>
                      {!confirmDelete ? (
                        <button
                          className="flex-1 py-2 text-base font-bold border transition-all cursor-pointer bg-current/5 border-current/15 opacity-70 hover:bg-current/10"
                          onClick={() => setConfirmDelete(true)}
                        >
                          {'\u2716'} Delete
                        </button>
                      ) : (
                        <button
                          className="flex-1 py-2 text-base font-bold border transition-all cursor-pointer bg-current/10 border-current/20 opacity-70 hover:bg-current/10"
                          onClick={() => handleDelete(wart)}
                        >
                          Confirm Delete?
                        </button>
                      )}
                    </div>

                    {wart.listed ? (
                      <button
                        className="warp-button w-full py-2 text-base"
                        onClick={() => handleDelist(wart)}
                      >
                        Remove from Sale
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {/* Pricing mode toggle */}
                        <div className="flex gap-1">
                          <button
                            className={`flex-1 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${pricingMode === 'crypto' ? 'bg-current/5 opacity-80 border border-current/10' : 'opacity-40 border border-current/10 hover:bg-white/5'}`}
                            onClick={() => setPricingMode('crypto')}
                          >
                            {'\u03A9'} Crypto
                          </button>
                          <button
                            className={`flex-1 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${pricingMode === 'fiat' ? 'bg-current/10 opacity-80 border border-current/15' : 'opacity-40 border border-current/10 hover:bg-white/5'}`}
                            onClick={() => setPricingMode('fiat')}
                          >
                            {'\u20AC'} Fiat
                          </button>
                        </div>

                        {pricingMode === 'crypto' ? (
                          <div className="flex gap-2">
                            <input
                              className="warp-input flex-1 text-base"
                              type="number"
                              placeholder="Price in \u03A9"
                              value={listPrice}
                              onChange={e => setListPrice(e.target.value)}
                            />
                            <button
                              className="warp-button text-base px-4"
                              onClick={() => handleList(wart)}
                              disabled={!listPrice}
                            >
                              List
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              className="warp-input text-base w-20"
                              value={fiatCurrency}
                              onChange={e => setFiatCurrency(e.target.value as FiatCurrency)}
                            >
                              <option value="EUR">{'\u20AC'} EUR</option>
                              <option value="USD">$ USD</option>
                              <option value="GBP">{'\u00A3'} GBP</option>
                            </select>
                            <input
                              className="warp-input flex-1 text-base"
                              type="number"
                              placeholder="Price"
                              value={fiatPriceInput}
                              onChange={e => setFiatPriceInput(e.target.value)}
                            />
                            <button
                              className="text-base px-4 bg-current/10 opacity-80 border border-current/15 hover:bg-current/15 transition-colors cursor-pointer"
                              onClick={() => handleList(wart)}
                              disabled={!fiatPriceInput}
                            >
                              List
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] opacity-40">
                          {pricingMode === 'fiat' ? 'Paiement par carte, PayPal ou virement' : 'Paiement en Cosmorares (\u03A9)'}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        className="warp-input flex-1 text-base"
                        placeholder="CW... (recipient address)"
                        value={transferTo}
                        onChange={e => { setTransferTo(e.target.value); setTransferError(''); }}
                      />
                      <button
                        className="warp-button text-base px-4"
                        onClick={() => handleTransfer(wart)}
                        disabled={!transferTo}
                      >
                        Gift
                      </button>
                    </div>
                    {transferError && (
                      <p className="text-body-sm p-2 bg-current/5 border border-current/15 opacity-70">{transferError}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-3">Comments ({(wart.comments || []).length})</h3>
          <div className="flex gap-2 mb-4">
            <input
              className="warp-input flex-1 text-base"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(wart.id); }}
            />
            <button className="warp-button text-body-sm px-3" onClick={() => handleAddComment(wart.id)} disabled={!commentText.trim()}>
              Post
            </button>
          </div>
          <div className="space-y-3">
            {(!wart.comments || wart.comments.length === 0) ? (
              <p className="text-body-sm opacity-40 text-center py-2">No comments yet</p>
            ) : (
              wart.comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 bg-current/5 border border-current/10 flex items-center justify-center text-[10px] opacity-80 font-bold shrink-0 mt-0.5">
                    {c.authorAlias.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-bold opacity-90">@{c.authorAlias}</span>
                      <span className="text-[10px] opacity-40">{formatDateFR(c.timestamp)}</span>
                    </div>
                    <p className="text-body-sm opacity-50 text-current">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transfer History */}
        {wart.history.length > 0 && (
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Transfer History</h3>
            <div className="space-y-2">
              {wart.history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-none bg-current/5 text-body-sm">
                  <span className="opacity-80">{'\u21C4'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="opacity-70 truncate">
                      {shortAddress(h.from)} {'\u2192'} {shortAddress(h.to)}
                    </p>
                    <p className="text-[10px] opacity-40">
                      {formatDateFR(h.timestamp)}
                    </p>
                  </div>
                  <span className="font-bold opacity-80 shrink-0">
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

  // ─── Category filter ──────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'image', label: 'Art' },
    { id: 'audio', label: 'Music' },
    { id: 'video', label: 'Video' },
    { id: 'unique', label: '1/1' },
    { id: 'limited', label: 'Limited' },
    { id: 'cheap', label: 'Under 10\u03A9' },
  ];

  // ─── Filter expired from marketplace ──────────────────────
  const activeMarketplace = marketplace.filter(w => {
    if (isExpired(w)) return false;
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'image') return w.mediaType === 'image';
    if (categoryFilter === 'audio') return w.mediaType === 'audio';
    if (categoryFilter === 'video') return w.mediaType === 'video';
    if (categoryFilter === 'unique') return w.editionType === 'unique';
    if (categoryFilter === 'limited') return w.editionType === 'limited';
    if (categoryFilter === 'cheap') return w.price !== null && w.price < 10;
    return true;
  });

  // ─── Tab Navigation ────────────────────────────────────
  const tabs: { id: Tab; label: string }[] = [
    { id: 'marketplace', label: '\u2B22 Marketplace' },
    { id: 'collection', label: '\u25C8 My Collection' },
    { id: 'create', label: '+ Create' },
    { id: 'music', label: '\u266B Musique' },
    { id: 'pfp', label: '\u2B21 PFP' },
    { id: 'rwa-phygital', label: '\u2B22 RWA Phygital' },
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
              className={`flex-1 px-3 py-2 rounded-none text-body-sm font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-50 text-current hover:opacity-90 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List/delist success toast */}
      {listSuccess && (
        <div className="text-base p-3 bg-current/5 border border-current/15 opacity-80 text-center">
          {listSuccess}
        </div>
      )}

      {/* ─── Marketplace Tab ───────────────────────────────── */}
      {tab === 'marketplace' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u2B22'} Marketplace Cosmorares</h2>
            <p className="text-body-sm opacity-40">
              Objets rares certifiés sur le protocole Cosmorare. Achetez, vendez et collectionnez.
            </p>
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 text-body-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-current/10 border border-current/20 opacity-80'
                    : 'bg-transparent border border-white/10 opacity-50 text-current hover:border-white/20 hover:opacity-70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {activeMarketplace.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-2xl mb-2">{'\u2742'}</p>
              <p className="opacity-50 text-current text-base">Aucune Cosmorare en vente.</p>
              <p className="text-body-sm opacity-40 mt-1">Soyez le premier à créer et certifier une Cosmorare !</p>
              <button
                className="warp-button text-body-sm mt-3 px-4 py-2"
                onClick={() => setTab('create')}
              >
                Créer une Cosmorare
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
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u25C8'} My Collection</h2>
            <p className="text-body-sm opacity-40">
              Cosmorares que vous possédez ({myCollection.length}) et créées ({myCreated.length})
            </p>
          </div>

          {myCollection.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-current text-base">Vous ne possédez aucune Cosmorare.</p>
              <button
                className="warp-button text-body-sm mt-3 px-4 py-2"
                onClick={() => setTab('marketplace')}
              >
                Parcourir la Marketplace
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
          <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title text-center">{'\u2742'} Créer une Cosmorare</h2>
          <p className="text-body-sm opacity-40 mb-4 text-center">
            Certifiez un objet rare unique sur le protocole Cosmorare.
            Vous toucherez des royalties à chaque revente.
          </p>

          <div className="space-y-4 max-w-md mx-auto">
            {/* Media Upload */}
            <div>
              <label className="text-[10px] opacity-50 text-current block mb-1">MEDIA FILE (max 50MB) — .gif .jpeg .png .svg .mp3 .mp4 .mov</label>
              <input
                ref={fileRef}
                type="file"
                accept=".gif,.jpeg,.jpg,.png,.mp3,.wav,.mp4,.mov,.svg"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <input ref={audioCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAudioCoverUpload} />
              {imageData ? (
                <div className="flex flex-col items-center">
                  {(mediaType === 'image' || mediaType === 'svg') && (
                    <div className="aspect-square max-w-[200px] overflow-hidden rounded-none bg-current/5 mb-2">
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
                          <button className="text-[10px] opacity-40 hover:opacity-70 cursor-pointer" onClick={() => setAudioCover('')}>Remove cover</button>
                        </div>
                      ) : (
                        <button className="text-[10px] opacity-40 hover:opacity-70 cursor-pointer" onClick={() => audioCoverRef.current?.click()}>
                          + Add cover image for audio
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    className="text-body-sm opacity-40 hover:opacity-70 cursor-pointer"
                    onClick={() => { setImageData(''); setMediaType('image'); setAudioCover(''); }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  className="warp-button w-full py-4 text-base border-dashed"
                  onClick={() => fileRef.current?.click()}
                >
                  {'\u2B06'} Upload Media
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] opacity-50 text-current block mb-1">TITLE</label>
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
              <label className="text-[10px] opacity-50 text-current block mb-1">DESCRIPTION (optional)</label>
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
              <label className="text-[10px] opacity-50 text-current block mb-1">EDITION TYPE</label>
              <div className="flex gap-2">
                {(['unique', 'limited', 'unlimited'] as const).map(et => (
                  <button
                    key={et}
                    className={`flex-1 py-2 text-body-sm font-medium border transition-all cursor-pointer ${
                      editionType === et
                        ? 'bg-current/10 border-current/20 opacity-80'
                        : 'bg-transparent border-white/10 opacity-50 text-current hover:border-white/20'
                    }`}
                    onClick={() => { setEditionType(et); if (et !== 'limited') setMaxEditions(''); }}
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
                <label className="text-[10px] opacity-50 text-current block mb-1">MAX EDITIONS</label>
                <input
                  className="warp-input"
                  type="number"
                  placeholder="e.g. 10"
                  min="1"
                  step="1"
                  value={maxEditions}
                  onChange={e => setMaxEditions(e.target.value)}
                />
                <p className="text-[10px] opacity-40 mt-1">
                  How many copies can be minted.
                </p>
              </div>
            )}

            {/* ─── Time Limit ──────────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 text-current block mb-1">TIME LIMIT (optional, in hours)</label>
              <input
                className="warp-input"
                type="number"
                placeholder="e.g. 24 (leave empty = forever)"
                min="0"
                step="1"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
              />
              <p className="text-[10px] opacity-40 mt-1">
                {durationHours
                  ? `Expires ${formatDateFR(Date.now() + parseFloat(durationHours) * 3600000)} (Paris). Rarity increases as deadline approaches.`
                  : 'Laisser vide pour aucune limite. Les Cosmorares à durée limitée gagnent en rareté à l\'approche de la deadline.'}
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="text-[10px] opacity-50 text-current block mb-1">PRICE IN {'\u03A9'} (leave empty = not for sale)</label>
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
              <label className="text-[10px] opacity-50 text-current block mb-1">CREATOR ROYALTY ON RESALE (%)</label>
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
              <p className="text-[10px] opacity-40 mt-1">
                You'll receive {royalty || 5}% of every future resale.
              </p>
            </div>

            {/* Rarity Preview */}
            <div className="text-body-sm p-3 border border-current/10 bg-current/5">
              <span className="opacity-40">Estimated rarity: </span>
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
              {durationHours && <span className="opacity-80 ml-2">(+time bonus near deadline)</span>}
            </div>

            {createError && (
              <div className="text-base p-3 rounded-none bg-current/5 border border-current/15 opacity-70">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="text-base p-3 rounded-none bg-current/5 border border-current/15 opacity-80">
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
                  <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
                  Minting...
                </span>
              ) : (
                <>{'\u2742'} Certifier</>
              )}
            </button>
          </div>

          {/* Protocol info */}
          <div className="mt-6 pt-4 border-t border-current/10 max-w-md mx-auto">
            <h3 className="text-base font-bold opacity-70 mb-2 text-center">Comment ça marche</h3>
            <div className="text-[11px] opacity-40 space-y-1">
              <p>1. Uploadez votre objet rare et donnez-lui un titre</p>
              <p>2. Choisissez le type d'édition : Unique (1/1), Limitée ou Illimitée</p>
              <p>3. Ajoutez une durée limitée (optionnel) — la rareté augmente à l'approche de la deadline</p>
              <p>4. Mettez en vente sur la marketplace au prix de votre choix</p>
              <p>5. L'acheteur paie en Cosmorare ({'\u03A9'}) — le transfert est instantané</p>
              <p>6. Vous touchez des royalties sur chaque revente ({royalty || 5}%)</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Music Tab ─────────────────────────────────────── */}
      {tab === 'music' && <MusicView />}

      {/* ─── PFP Collections Tab ──────────────────────────── */}
      {tab === 'pfp' && <PFPCollectionView />}

      {/* ─── RWA Phygital Tab ────────────────────────────── */}
      {tab === 'rwa-phygital' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u2B22'} RWA Phygital</h2>
            <p className="text-body-sm opacity-40">
              Oeuvres physiques authentifiées sur le protocole Cosmowarp. Imprimez la signature de transaction pour certifier l'oeuvre physique.
            </p>
          </div>

          {(() => {
            // Filter artworks that have phygital certificates or are 1/1 unique editions
            const phygitalWarts = [...myCollection, ...myCreated]
              .filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i)
              .filter(w => w.certId && (w.editionType === 'unique' || w.maxEditions === 1));

            if (phygitalWarts.length === 0) {
              return (
                <div className="glass-panel p-8 text-center">
                  <p className="text-2xl mb-2">{'\u2B22'}</p>
                  <p className="opacity-50 text-current text-base">Aucune oeuvre phygital RWA.</p>
                  <p className="text-body-sm opacity-40 mt-1">
                    Créez une Cosmorare 1/1 avec un certificat pour l'associer à une oeuvre physique.
                  </p>
                  <button
                    className="warp-button text-body-sm mt-3 px-4 py-2"
                    onClick={() => setTab('create')}
                  >
                    Créer une Cosmorare
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {phygitalWarts.map(wart => {
                  const lastTx = wart.history.length > 0
                    ? wart.history[wart.history.length - 1]
                    : null;
                  const txId = wart.onChainTxId || lastTx?.txId || wart.certId || wart.id;
                  const artistName = wart.creator === wallet.address
                    ? (wallet.alias || shortAddress(wallet.address))
                    : shortAddress(wart.creator);

                  return (
                    <div key={wart.id} className="glass-panel p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="w-20 h-20 bg-current/5 overflow-hidden shrink-0">
                          <WartMedia wart={wart} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold opacity-90 truncate">{wart.title}</h4>
                          <p className="text-[10px] opacity-40 truncate">
                            by {wart.creator === wallet.address ? 'you' : shortAddress(wart.creator)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] opacity-80">1/1</span>
                            <RarityBadge wart={wart} />
                          </div>
                          {wart.certId && (
                            <p className="text-[9px] opacity-50 mt-1 font-mono truncate">{wart.certId}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-2 bg-current/5 border border-current/10 text-[10px] opacity-40 space-y-0.5">
                        <p><span className="opacity-60">TX ID:</span> <span className="font-mono">{txId.slice(0, 32)}...</span></p>
                        <p><span className="opacity-60">Artist:</span> {artistName}</p>
                        <p><span className="opacity-60">Created:</span> {formatDateFR(wart.createdAt)}</p>
                      </div>

                      <button
                        className="warp-button w-full py-2.5 text-body-sm font-bold flex items-center justify-center gap-2"
                        onClick={() => {
                          generateSignaturePDF({
                            artworkName: wart.title,
                            artistName,
                            transactionId: txId,
                          });
                        }}
                      >
                        {'\u2399'} Print Signature
                      </button>

                      <button
                        className="w-full py-1.5 text-[11px] opacity-50 border border-current/10 hover:opacity-70 transition-all cursor-pointer"
                        onClick={() => openDetail(wart)}
                      >
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
