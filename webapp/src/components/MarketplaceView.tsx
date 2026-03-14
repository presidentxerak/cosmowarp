import { useState, useRef, useMemo, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { computeRarity, RARITY_CONFIG, isExpired, formatTimeRemaining, formatDateFR } from '../engine/warts';
import type { Wart } from '../engine/warts';
import { getCurrencySymbol, type FiatCurrency } from '../engine/fiatgateway';
import { generatePhygitalCert, verifyCert, generatePrintableSVG, generateSignaturePDF, type PhygitalCertificate } from '../engine/phygital';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import { getVobjctEngine } from '../engine/vobjct';
import HexAvatar from './HexAvatar';

import PFPCollectionView from './PFPCollectionView';
import MusicView from './MusicView';

/**
 * Convert a data URL to a blob URL for reliable video/audio playback.
 * Browsers struggle with large base64 data URLs in <video> src.
 */
function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!header || !base64) return dataUrl;
    const mime = header.match(/:(.*?);/)?.[1] || 'video/mp4';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

/** Hook: convert a data URL to a blob URL, cleaning up on unmount */
function useBlobUrl(dataUrl: string | undefined): string {
  const [blobUrl, setBlobUrl] = useState('');
  const urlRef = useRef('');
  useEffect(() => {
    if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch {} }
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      urlRef.current = '';
      setBlobUrl(dataUrl || '');
      return;
    }
    const url = dataUrlToBlobUrl(dataUrl);
    urlRef.current = url;
    setBlobUrl(url);
    return () => { if (urlRef.current) { try { URL.revokeObjectURL(urlRef.current); } catch {} urlRef.current = ''; } };
  }, [dataUrl]);
  return blobUrl;
}
type GalleryTab = 'all' | 'art' | 'video' | 'music' | 'cards' | 'rwa' | 'phygital' | 'pfp' | 'top-creators' | 'top-collectors' | 'top-sales' | 'top-collections' | 'create' | 'detail';
type EditionFilter = 'all' | 'unique' | 'collection' | 'limited';
type SalesMarketFilter = '1st' | '2nd';

export default function MarketplaceView() {
  const {
    wallet, unlocked, marketplace, myCollection, myCreated,
    mintWart, buyWart, listWart, delistWart, transferWart, send,
    deleteWart, editWart, addWartComment, toggleWartLike, toggleWartBookmark, verifyWartCertificate, refreshWarts,
    listWartFiat, buyWartFiat, getWartFiatPrice,
  } = useWallet();

  const [tab, setTab] = useState<GalleryTab>(() => {
    const stored = sessionStorage.getItem('strangrz_gallery_tab');
    if (stored) {
      sessionStorage.removeItem('strangrz_gallery_tab');
      return stored as GalleryTab;
    }
    return 'all';
  });
  const [selectedWart, setSelectedWart] = useState<Wart | null>(null);
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all');
  const [salesMarketFilter, setSalesMarketFilter] = useState<SalesMarketFilter>('1st');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferWartId, setTransferWartId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'audio' | 'video' | 'svg' | 'cards'>('image');
  const [audioCover, setAudioCover] = useState('');
  const [price, setPrice] = useState('');
  const [royalty, setRoyalty] = useState('5');
  const [editionType, setEditionType] = useState<'unique' | 'limited' | 'unlimited'>('unique');
  const [maxEditions, setMaxEditions] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [mintChain, setMintChain] = useState<'strangrz' | 'ethereum'>('strangrz');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const audioCoverRef = useRef<HTMLInputElement>(null);

  // Comment
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Blob URL for create form video/audio preview
  const createVideoBlobUrl = useBlobUrl(mediaType === 'video' ? imageData : undefined);
  const createAudioBlobUrl = useBlobUrl(mediaType === 'audio' ? imageData : undefined);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

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

  // Transfer & list state (must be before early returns to respect hooks rules)
  const [transferError, setTransferError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');
  const [listSuccess, setListSuccess] = useState('');

  // ─── All warts (marketplace + collections) ──────────────
  const allWarts = useMemo(() => {
    const combined = [...marketplace, ...myCollection, ...myCreated];
    const unique = combined.filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
    return unique.filter(w => !isExpired(w));
  }, [marketplace, myCollection, myCreated]);

  // ─── RWA filter ───────────────────────────────────────
  const rwaWarts = useMemo(() => {
    return allWarts.filter(w => w.certId && (w.editionType === 'unique' || w.maxEditions === 1));
  }, [allWarts]);

  // ─── Phygital filter ──────────────────────────────────
  const phygitalWarts = useMemo(() => {
    return [...myCollection, ...myCreated]
      .filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i)
      .filter(w => w.certId && (w.editionType === 'unique' || w.maxEditions === 1));
  }, [myCollection, myCreated]);

  // ─── Top Creators ─────────────────────────────────────
  const topCreators = useMemo(() => {
    const creatorMap: Record<string, { address: string; count: number; totalVolume: number; warts: Wart[] }> = {};
    allWarts.forEach(w => {
      if (!creatorMap[w.creator]) creatorMap[w.creator] = { address: w.creator, count: 0, totalVolume: 0, warts: [] };
      creatorMap[w.creator].count++;
      creatorMap[w.creator].warts.push(w);
      (w.history || []).forEach(h => { creatorMap[w.creator].totalVolume += h.price; });
    });
    return Object.values(creatorMap).sort((a, b) => b.totalVolume - a.totalVolume || b.count - a.count);
  }, [allWarts]);

  // ─── Top Collectors ───────────────────────────────────
  const topCollectors = useMemo(() => {
    const collectorMap: Record<string, { address: string; count: number; totalSpent: number }> = {};
    allWarts.forEach(w => {
      if (!collectorMap[w.owner]) collectorMap[w.owner] = { address: w.owner, count: 0, totalSpent: 0 };
      collectorMap[w.owner].count++;
      (w.history || []).forEach(h => {
        if (h.to === w.owner && h.price > 0) collectorMap[w.owner].totalSpent += h.price;
      });
    });
    return Object.values(collectorMap).sort((a, b) => b.totalSpent - a.totalSpent || b.count - a.count);
  }, [allWarts]);

  // ─── Top Sales ────────────────────────────────────────
  const topSales = useMemo(() => {
    const sales: { wart: Wart; transfer: Wart['history'][0]; isFirstSale: boolean }[] = [];
    allWarts.forEach(w => {
      (w.history || []).forEach((h, idx) => {
        if (h.price > 0) {
          sales.push({ wart: w, transfer: h, isFirstSale: idx === 0 });
        }
      });
    });
    const filtered = salesMarketFilter === '1st'
      ? sales.filter(s => s.isFirstSale)
      : sales.filter(s => !s.isFirstSale);
    return filtered.sort((a, b) => b.transfer.price - a.transfer.price);
  }, [allWarts, salesMarketFilter]);

  // ─── Top Collections ──────────────────────────────────
  const topCollections = useMemo(() => {
    const collMap: Record<string, { title: string; creator: string; count: number; totalVolume: number; floorPrice: number; warts: Wart[] }> = {};
    allWarts.forEach(w => {
      if (w.editionType === 'unique' && !w.maxEditions) return; // skip isolated uniques
      // Group by creator + title base (remove edition suffix like " #2")
      const baseTitle = w.title.replace(/\s*#\d+$/, '');
      const key = `${w.creator}::${baseTitle}`;
      if (!collMap[key]) collMap[key] = { title: baseTitle, creator: w.creator, count: 0, totalVolume: 0, floorPrice: Infinity, warts: [] };
      collMap[key].count++;
      collMap[key].warts.push(w);
      if (w.price !== null && w.listed && w.price < collMap[key].floorPrice) collMap[key].floorPrice = w.price;
      (w.history || []).forEach(h => { collMap[key].totalVolume += h.price; });
    });
    return Object.values(collMap)
      .filter(c => c.count >= 2)
      .map(c => ({ ...c, floorPrice: c.floorPrice === Infinity ? null : c.floorPrice }))
      .sort((a, b) => b.totalVolume - a.totalVolume || b.count - a.count);
  }, [allWarts]);

  // ─── Resolve creator alias ─────────────────────────────
  const getCreatorName = (address: string): string => {
    if (wallet && address === wallet.address) return 'you';
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  const navigateToProfile = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'user-profile' }));
  };

  // Auto-open wart detail when navigating from profile
  useEffect(() => {
    const wartId = sessionStorage.getItem('strangrz_open_wart');
    if (wartId) {
      sessionStorage.removeItem('strangrz_open_wart');
      const wart = allWarts.find(w => w.id === wartId);
      if (wart) {
        setSelectedWart(wart);
        setTab('detail');
      }
    }
  }, [allWarts]);

  if (!wallet) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Créez un portefeuille pour accéder à la marketplace Strangrz.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Déverrouillez votre portefeuille pour accéder à la marketplace Strangrz.</p>
      </div>
    );
  }

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setCreateError('Fichier trop lourd (max 50MB)');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let mType: 'image' | 'audio' | 'video' | 'svg' | 'cards' = mediaType;
    if (['mp3', 'wav'].includes(ext)) mType = 'audio';
    else if (['mp4', 'mov'].includes(ext)) mType = 'video';
    else if (['svg'].includes(ext)) mType = 'svg';
    else if (mediaType !== 'cards') mType = 'image';

    setUploadProgress(0);
    setUploadStatus(`Lecture de ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);

    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    reader.onload = () => {
      setUploadProgress(100);
      setUploadStatus('');
      setImageData(reader.result as string);
      setMediaType(mType);
      setCreateError('');
    };
    reader.onerror = () => {
      setUploadProgress(0);
      setUploadStatus('');
      setCreateError('Échec de lecture du fichier');
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
    setUploadProgress(0);

    try {
      // Step 1: Fingerprinting
      setUploadStatus('Calcul de l\'empreinte SHA-256...');
      setUploadProgress(15);
      await new Promise(r => setTimeout(r, 100)); // yield to UI

      // Step 2: Certificate
      setUploadStatus('Génération du certificat d\'authenticité...');
      setUploadProgress(30);
      await new Promise(r => setTimeout(r, 100));

      // Step 3: Signature
      setUploadStatus('Signature cryptographique Ed25519...');
      setUploadProgress(50);
      await new Promise(r => setTimeout(r, 100));

      // Step 4: Mint
      setUploadStatus(mintChain === 'ethereum'
        ? 'Inscription ERC-721 sur Ethereum...'
        : 'Inscription sur le protocole Strangrz...');
      setUploadProgress(70);

      const wart = await mintWart(title, description, imageData, priceVal, royaltyVal, editionType, maxEd, durH, mediaType, audioCover || undefined, mintChain);

      // Step 5: Done
      setUploadProgress(100);
      setUploadStatus('');
      setCreateSuccess(`"${wart.title}" certifié avec succès sur ${mintChain === 'ethereum' ? 'Ethereum (ERC-721)' : 'Strangrz (CW-721)'} (Édition #${wart.editionNumber}) !`);
      setTitle(''); setDescription(''); setImageData(''); setPrice(''); setRoyalty('5');
      setEditionType('unique'); setMaxEditions(''); setDurationHours(''); setMintChain('strangrz');
      setMediaType('image'); setAudioCover('');
      setTimeout(() => { setCreateSuccess(''); setUploadProgress(0); }, 5000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Échec du minting');
      setUploadProgress(0);
      setUploadStatus('');
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
    setTab('all');
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
    const videoBlobUrl = useBlobUrl(wart.mediaType === 'video' ? wart.imageData : undefined);
    const audioBlobUrl = useBlobUrl(wart.mediaType === 'audio' ? wart.imageData : undefined);
    if (!wart.imageData) {
      return (
        <div className={`bg-current/5 flex items-center justify-center ${className}`}>
          <span className="text-2xl opacity-30">
            {wart.mediaType === 'video' ? '\u25B6' : wart.mediaType === 'audio' ? '\u266B' : wart.mediaType === 'cards' ? '\uD83C\uDCCF' : '\u25C8'}
          </span>
        </div>
      );
    }
    if (wart.mediaType === 'audio') {
      return (
        <div className={`bg-current/5 flex flex-col items-center justify-center p-4 ${className}`}>
          {wart.audioCover ? (
            <img src={wart.audioCover} alt={wart.title} className="w-full h-auto max-h-[200px] object-cover mb-2" />
          ) : (
            <div className="text-4xl mb-2">{'\u266B'}</div>
          )}
          <audio controls className="w-full h-8" src={audioBlobUrl} />
        </div>
      );
    }
    if (wart.mediaType === 'video') {
      return (
        <video
          controls
          playsInline
          preload="auto"
          className={`w-full bg-black ${className}`}
          src={videoBlobUrl}
        />
      );
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
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <div className="px-1.5 py-0.5 bg-current/10 border border-current/15">
                <span className="text-[9px] opacity-80">{'\u2714'} Cert</span>
              </div>
              {wart.vobjctProtected && (
                <div className="px-1.5 py-0.5 bg-current/10 border border-current/15">
                  <span className="text-[9px] opacity-80">{'\u26E8'} Safe</span>
                </div>
              )}
            </div>
          )}
          {expired && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="opacity-70 text-body-sm font-bold">EXPIRED</span>
            </div>
          )}
        </div>
        <h4 className="text-base font-bold opacity-90 truncate">{wart.title}</h4>
        <div
          className="flex items-center gap-1 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); if (wart.creator !== wallet.address) navigateToProfile(wart.creator); }}
        >
          <HexAvatar address={wart.creator} size={16} />
          <p className="text-[10px] opacity-40 truncate">
            {getCreatorName(wart.creator)} · {shortAddress(wart.creator)}
          </p>
        </div>
        <EditionInfo wart={wart} compact />
        <div className="flex items-center justify-between mt-2">
          {wart.listed && wart.price !== null ? (
            <div>
              <span className="text-base font-bold opacity-80">{wart.price} {'\u2B23'}</span>
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
        {/* Social bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
          {/* Tip 1 STRNGRZ */}
          <button
            className={`flex items-center gap-1 cursor-pointer transition-all ${wart.likes?.includes(wallet.address) ? 'opacity-90' : 'opacity-40 hover:opacity-80'}`}
            onClick={e => { e.stopPropagation(); if (!wart.likes?.includes(wallet.address) && wart.creator !== wallet.address) { send(wart.creator, 1, `Tip for ${wart.title}`); } toggleWartLike(wart.id); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={wart.likes?.includes(wallet.address) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {(wart.likes?.length || 0) > 0 && <span className="text-[10px]">{wart.likes!.length}{'\u2B23'}</span>}
          </button>
          {/* Share to Wall */}
          <button className="opacity-40 hover:opacity-80 cursor-pointer" title="Share to Wall" onClick={e => {
            e.stopPropagation();
            const chatEngine = CosmoChatEngine.load();
            const creatorName = getCreatorName(wart.creator);
            chatEngine.createPost(wallet.address, wallet.alias || shortAddress(wallet.address), `${wart.title} by ${creatorName}`, undefined, 'image', undefined, wart.id);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          {/* Comment — go to detail + focus input */}
          <button className="flex items-center gap-1 opacity-40 hover:opacity-80 cursor-pointer" onClick={e => {
            e.stopPropagation();
            openDetail(wart);
            setTimeout(() => commentInputRef.current?.focus(), 300);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {wart.comments?.length > 0 && <span className="text-[10px]">{wart.comments.length}</span>}
          </button>
          {/* Bookmark */}
          <button className={`cursor-pointer transition-all ${wart.bookmarks?.includes(wallet.address) ? 'opacity-90' : 'opacity-40 hover:opacity-80'}`} onClick={e => { e.stopPropagation(); toggleWartBookmark(wart.id); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={wart.bookmarks?.includes(wallet.address) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
        {showBuy && !expired && wart.listed && wart.price !== null && wart.owner !== wallet.address && (
          <div className="flex gap-1 mt-2">
            <button
              className="warp-button flex-1 text-body-sm py-1.5"
              onClick={e => { e.stopPropagation(); handleBuy(wart); }}
              disabled={buying || wallet.balance < wart.price}
            >
              Collect {wart.price} {'\u2B23'}
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
        {wart.owner === wallet.address && (
          <div className="flex gap-1 mt-2">
            {!wart.listed && (
              <button
                className="flex-1 py-1.5 text-[11px] opacity-60 border border-current/10 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer"
                onClick={e => { e.stopPropagation(); openDetail(wart); }}
              >
                List
              </button>
            )}
            <button
              className={`${!wart.listed ? 'flex-1' : 'w-full'} py-1.5 text-[11px] opacity-40 border border-current/10 hover:opacity-70 hover:bg-current/5 transition-all cursor-pointer`}
              onClick={e => { e.stopPropagation(); setTransferWartId(wart.id); setShowTransferModal(true); setTransferTo(''); setTransferError(''); }}
            >
              Transfer
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Detail View ───────────────────────────────────────
  if (tab === 'detail' && selectedWart && wallet) {
    const wart = selectedWart;
    const isMine = wart.owner === wallet.address;
    const isCreator = wart.creator === wallet.address;
    const expired = isExpired(wart);
    const rarity = computeRarity(wart);
    const rarityCfg = RARITY_CONFIG[rarity];

    return (
      <div className="space-y-4 px-[10px] sm:px-0">
        <button
          className="text-body-sm opacity-50 text-current hover:opacity-90 cursor-pointer"
          onClick={() => { setTab('all'); setSelectedWart(null); setEditing(false); setConfirmDelete(false); }}
        >
          {'\u2190'} Back to Gallery
        </button>

        <div className="glass-panel p-4">
          <div className="max-w-2xl mx-auto">
            <div className={`${wart.mediaType === 'video' ? '' : 'aspect-square'} mb-4 overflow-hidden rounded-none bg-current/5 relative`}>
              <WartMedia wart={wart} className="w-full h-full object-contain" />
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
                  <label className="text-[10px] opacity-50 text-current block mb-1">PRICE IN {'\u2B23'} (empty = not for sale)</label>
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
                    <span
                      className={`opacity-80 ml-1 inline-flex items-center gap-1 ${!isCreator ? 'cursor-pointer hover:opacity-100' : ''}`}
                      onClick={() => { if (!isCreator) navigateToProfile(wart.creator); }}
                    >
                      <HexAvatar address={wart.creator} size={16} />
                      {isCreator ? 'You' : `${getCreatorName(wart.creator)} · ${shortAddress(wart.creator)}`}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-40">Owner:</span>
                    <span
                      className={`opacity-80 ml-1 inline-flex items-center gap-1 ${!isMine ? 'cursor-pointer hover:opacity-100' : ''}`}
                      onClick={() => { if (!isMine) navigateToProfile(wart.owner); }}
                    >
                      <HexAvatar address={wart.owner} size={16} />
                      {isMine ? 'You' : `${getCreatorName(wart.owner)} · ${shortAddress(wart.owner)}`}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-40">Royalty:</span>
                    <span className="opacity-80 ml-1">{wart.royaltyPercent}%</span>
                  </div>
                  <div>
                    <span className="opacity-40">Chain:</span>
                    <span className="opacity-80 ml-1">{wart.mintChain === 'ethereum' ? 'Ethereum (ERC-721)' : 'Strangrz (CW-721)'}</span>
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

                {/* Vobjct Trust Signals */}
                {wart.vobjctProtected && (() => {
                  const vobjct = getVobjctEngine();
                  const badges = vobjct.getTrustBadges(wart.id);
                  const manifest = vobjct.getManifest(wart.id);
                  return (
                    <div className="glass-panel p-3 mb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-body-sm font-bold opacity-70">{'\u26E8'} Vobjct Safe</h4>
                        <span className="text-[9px] opacity-50">v{manifest?.vobjct_version || '1.0.0'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {badges.map((badge, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-current/5 border border-current/10 opacity-70">
                            {badge === 'Integrity Verified' ? '\u2714' :
                             badge === 'Permanent Storage' ? '\u221E' :
                             badge === 'Multi-Network Backup' ? '\u2726' :
                             badge === 'Safe Protected' ? '\u26E8' :
                             badge === 'Rights Embedded' ? '\u00A9' :
                             badge === 'Recovery Active' ? '\u21BB' : '\u2022'} {badge}
                          </span>
                        ))}
                      </div>
                      {manifest && (
                        <div className="text-[10px] opacity-40 space-y-1">
                          <p>
                            <span className="opacity-50">Object ID:</span>{' '}
                            <span className="opacity-70 font-mono break-all">{manifest.object_id}</span>
                          </p>
                          <p>
                            <span className="opacity-50">Storage:</span>{' '}
                            <span className="opacity-70">{manifest.storage_routes.length} route(s)</span>
                            {manifest.storage_routes.map((r, i) => (
                              <span key={i} className={`ml-1 ${r.status === 'active' ? 'opacity-70' : 'opacity-40'}`}>
                                [{r.network}]
                              </span>
                            ))}
                          </p>
                          <p>
                            <span className="opacity-50">Policy:</span>{' '}
                            <span className="opacity-70">{manifest.policy.mutability}</span>
                          </p>
                          <p>
                            <span className="opacity-50">Rights:</span>{' '}
                            <span className="opacity-70">Display: {manifest.rights.display} | Commercial: {manifest.rights.commercial_use}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                    <p className="text-2xl font-bold opacity-80">{wart.price} {'\u2B23'}</p>
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
                      {buying ? 'Processing...' : `Collect ${wart.price} \u2B23`}
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
                            {'\u2B23'} Crypto
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
                              placeholder="Price in \u2B23"
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
                          {pricingMode === 'fiat' ? 'Paiement par carte, PayPal ou virement' : 'Paiement en Strangrz (\u2B23)'}
                        </p>
                      </div>
                    )}

                    <button
                      className="warp-button w-full py-2 text-base"
                      onClick={() => { setTransferWartId(wart.id); setShowTransferModal(true); setTransferTo(''); setTransferError(''); }}
                    >
                      Transfer to Another Wallet
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Share to Wall */}
        <div className="glass-panel p-3 flex items-center gap-3">
          <button
            className="warp-button flex-1 py-2 text-base flex items-center justify-center gap-2"
            onClick={() => {
              const chatEngine = CosmoChatEngine.load();
              const creatorName = getCreatorName(wart.creator);
              const content = `${wart.title} by ${creatorName}`;
              chatEngine.createPost(
                wallet.address,
                wallet.alias || shortAddress(wallet.address),
                content,
                undefined,
                'image',
                undefined,
                wart.id
              );
              setShareSuccess('Shared to Wall!');
              setTimeout(() => setShareSuccess(''), 3000);
            }}
          >
            {'\u2197'} Share to Wall
          </button>
          {shareSuccess && (
            <span className="text-body-sm opacity-70">{'\u2714'} {shareSuccess}</span>
          )}
        </div>

        {/* Comments */}
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-3">Comments ({(wart.comments || []).length})</h3>
          <div className="flex gap-2 mb-4">
            <input
              ref={commentInputRef}
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
                    {h.price > 0 ? `${h.price} \u2B23` : 'Gift'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Edition filter logic ──────────────────────────────────
  const applyEditionFilter = (warts: Wart[]) => {
    if (editionFilter === 'all') return warts;
    if (editionFilter === 'unique') return warts.filter(w => w.editionType === 'unique' && w.maxEditions === 1);
    if (editionFilter === 'collection') {
      const creatorCounts: Record<string, number> = {};
      warts.forEach(w => {
        if (w.editionType === 'unique') {
          creatorCounts[w.creator] = (creatorCounts[w.creator] || 0) + 1;
        }
      });
      return warts.filter(w => w.editionType === 'unique' && (creatorCounts[w.creator] || 0) > 1);
    }
    if (editionFilter === 'limited') return warts.filter(w => w.editionType === 'limited');
    return warts;
  };

  // ─── Filter by media type ──────────────────────────────
  const filterByMedia = (warts: Wart[], type: string) => {
    if (type === 'art') return warts.filter(w => w.mediaType === 'image' || w.mediaType === 'svg');
    if (type === 'video') return warts.filter(w => w.mediaType === 'video');
    if (type === 'music') return warts.filter(w => w.mediaType === 'audio');
    if (type === 'cards') return warts.filter(w => w.mediaType === 'cards');
    return warts;
  };

  // ─── Get current filtered warts for tab ─────────────────
  const getTabWarts = (): Wart[] => {
    let base: Wart[] = [];
    if (tab === 'all') base = allWarts;
    else if (tab === 'art') base = filterByMedia(allWarts, 'art');
    else if (tab === 'video') base = filterByMedia(allWarts, 'video');
    else if (tab === 'music') base = filterByMedia(allWarts, 'music');
    else if (tab === 'cards') base = filterByMedia(allWarts, 'cards');
    else if (tab === 'rwa') base = rwaWarts;
    else if (tab === 'phygital') base = phygitalWarts;
    else return [];
    let filtered = applyEditionFilter(base);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(w =>
        w.title.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q) ||
        w.creator.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const showEditionFilters = ['all', 'art', 'video', 'music', 'cards', 'rwa', 'phygital'].includes(tab);

  // ─── Tab Navigation ────────────────────────────────────
  const galleryTabs: { id: GalleryTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'art', label: 'Art' },
    { id: 'video', label: 'Video' },
    { id: 'music', label: 'Music' },
    { id: 'rwa', label: 'RWA' },
    { id: 'phygital', label: 'Phygital' },
    { id: 'cards', label: 'Cards' },
    { id: 'pfp', label: 'Collections PFP' },
    { id: 'top-creators', label: 'Top Creators' },
    { id: 'top-collectors', label: 'Top Collectors' },
    { id: 'top-sales', label: 'Top Sales' },
    { id: 'top-collections', label: 'Top Collections' },
  ];

  const editionFilters: { id: EditionFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unique', label: 'Unique Piece' },
    { id: 'collection', label: 'Collection of Unique Pieces' },
    { id: 'limited', label: 'Limited Editions' },
  ];

  // ─── Transfer Modal ─────────────────────────────────────
  const TransferModal = () => {
    if (!showTransferModal || !transferWartId) return null;
    const wart = [...myCollection, ...myCreated].find(w => w.id === transferWartId);
    if (!wart) return null;

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={() => { setShowTransferModal(false); setTransferWartId(null); setTransferTo(''); setTransferError(''); }} />
        <div className="glass-panel p-6 w-full max-w-md relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-sm font-bold opacity-90 font-title">Transfer Artwork</h3>
            <button
              className="w-8 h-8 flex items-center justify-center opacity-40 hover:opacity-80 cursor-pointer"
              onClick={() => { setShowTransferModal(false); setTransferWartId(null); setTransferTo(''); setTransferError(''); }}
            >
              {'\u2716'}
            </button>
          </div>

          <div className="flex gap-3 p-3 bg-current/5 border border-current/10">
            <div className="w-16 h-16 bg-current/5 overflow-hidden shrink-0">
              <WartMedia wart={wart} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold opacity-90 truncate">{wart.title}</h4>
              <div className="flex items-center gap-1 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigateToProfile(wart.creator)}>
                <HexAvatar address={wart.creator} size={16} />
                <p className="text-[10px] opacity-40 truncate">
                  {getCreatorName(wart.creator)} · {shortAddress(wart.creator)}
                </p>
              </div>
              <EditionInfo wart={wart} compact />
            </div>
          </div>

          <div>
            <label className="text-[10px] opacity-50 block mb-1.5">RECIPIENT WALLET ADDRESS</label>
            <input
              className="warp-input w-full text-base"
              placeholder="CW..."
              value={transferTo}
              onChange={e => { setTransferTo(e.target.value); setTransferError(''); }}
            />
          </div>

          {transferError && (
            <div className="text-body-sm p-2.5 bg-current/5 border border-current/15 opacity-70">{transferError}</div>
          )}

          <div className="flex gap-2">
            <button
              className="warp-button flex-1 py-2.5 text-base font-bold"
              onClick={() => handleTransfer(wart)}
              disabled={!transferTo.trim()}
            >
              Transfer
            </button>
            <button
              className="flex-1 py-2.5 text-base opacity-50 border border-current/10 hover:opacity-70 transition-all cursor-pointer"
              onClick={() => { setShowTransferModal(false); setTransferWartId(null); setTransferTo(''); setTransferError(''); }}
            >
              Cancel
            </button>
          </div>

          <p className="text-[10px] opacity-30 text-center">
            This action is irreversible. The artwork will be transferred to the recipient wallet.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <TransferModal />

      {/* ─── Search Bar ─────────────────────────────────────── */}
      <div className="glass-panel p-2 flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Rechercher une Strangrz..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="warp-input w-full text-body-sm py-2 pl-8 pr-3"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30 text-body-sm">{'\u2315'}</span>
        </div>
      </div>

      {/* ─── Gallery Tabs (scrollable) ──────────────────────── */}
      <div className="glass-panel p-1.5">
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {galleryTabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setEditionFilter('all'); }}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                tab === t.id
                  ? 'bg-current/10 opacity-90'
                  : 'opacity-40 hover:opacity-70 hover:bg-current/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Edition Filters ────────────────────────────────── */}
      {showEditionFilters && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 px-0.5">
          {editionFilters.map(f => (
            <button
              key={f.id}
              onClick={() => setEditionFilter(f.id)}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                editionFilter === f.id
                  ? 'bg-current/10 border border-current/20 opacity-80'
                  : 'bg-transparent border border-current/10 opacity-40 hover:border-current/20 hover:opacity-60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Top Sales Market Filter ────────────────────────── */}
      {tab === 'top-sales' && (
        <div className="flex gap-1.5 px-0.5">
          {([{ id: '1st' as const, label: '1st Market' }, { id: '2nd' as const, label: '2nd Market' }]).map(f => (
            <button
              key={f.id}
              onClick={() => setSalesMarketFilter(f.id)}
              className={`px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                salesMarketFilter === f.id
                  ? 'bg-current/10 border border-current/20 opacity-80'
                  : 'bg-transparent border border-current/10 opacity-40 hover:border-current/20 hover:opacity-60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Toast */}
      {listSuccess && (
        <div className="text-base p-3 bg-current/5 border border-current/15 opacity-80 text-center">
          {listSuccess}
        </div>
      )}

      {/* ─── All / Art / Video / Music / RWA / Phygital ─────── */}
      {showEditionFilters && (
        (() => {
          const warts = getTabWarts();
          const tabLabels: Record<string, string> = {
            all: 'Gallery Strangrz',
            art: 'Art',
            video: 'Video',
            music: 'Music',
            rwa: 'RWA',
            phygital: 'Phygital',
          };
          return (
            <>
              <div className="glass-panel p-4 text-center">
                <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{tabLabels[tab] || 'Gallery'}</h2>
                <p className="text-body-sm opacity-40">
                  {tab === 'all' && 'Objets rares certifiés sur le protocole Strangrz.'}
                  {tab === 'art' && 'Art visuel — images, illustrations et oeuvres graphiques.'}
                  {tab === 'video' && 'Oeuvres vidéo certifiées.'}
                  {tab === 'music' && 'Oeuvres musicales certifiées.'}
                  {tab === 'cards' && 'Trading cards — cartes à collectionner certifiées.'}
                  {tab === 'rwa' && 'Real World Assets — actifs du monde réel tokénisés.'}
                  {tab === 'phygital' && 'Oeuvres physiques authentifiées avec certificat digital.'}
                </p>
              </div>

              {warts.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <p className="text-2xl mb-2">{'\u2742'}</p>
                  <p className="opacity-50 text-base">Aucune Strangrz dans cette catégorie.</p>
                  <button
                    className="warp-button text-body-sm mt-3 px-4 py-2"
                    onClick={() => setTab('create')}
                  >
                    Créer une Strangrz
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {warts.map(wart => (
                    <WartCard key={wart.id} wart={wart} showBuy />
                  ))}
                </div>
              )}
            </>
          );
        })()
      )}

      {/* ─── Collections PFP Tab ──────────────────────────── */}
      {tab === 'pfp' && <PFPCollectionView />}

      {/* ─── Top Creators Tab ─────────────────────────────── */}
      {tab === 'top-creators' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">Top Creators</h2>
            <p className="text-body-sm opacity-40">Les créateurs les plus actifs et performants.</p>
          </div>
          {topCreators.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-base">Aucun créateur pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCreators.slice(0, 50).map((creator, idx) => (
                <div key={creator.address} className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => navigateToProfile(creator.address)}>
                  <div className="w-8 h-8 flex items-center justify-center text-base font-bold opacity-50 shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold opacity-80 truncate">
                      {creator.address === wallet.address ? (wallet.alias || 'You') : shortAddress(creator.address)}
                    </p>
                    <p className="text-[10px] opacity-40">
                      {creator.count} artwork{creator.count > 1 ? 's' : ''} created
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold opacity-80">{creator.totalVolume.toFixed(1)} {'\u2B23'}</p>
                    <p className="text-[10px] opacity-40">total volume</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Top Collectors Tab ───────────────────────────── */}
      {tab === 'top-collectors' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">Top Collectors</h2>
            <p className="text-body-sm opacity-40">Les plus grands collectionneurs de Strangrz.</p>
          </div>
          {topCollectors.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-base">Aucun collectionneur pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCollectors.slice(0, 50).map((collector, idx) => (
                <div key={collector.address} className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => navigateToProfile(collector.address)}>
                  <div className="w-8 h-8 flex items-center justify-center text-base font-bold opacity-50 shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold opacity-80 truncate">
                      {collector.address === wallet.address ? (wallet.alias || 'You') : shortAddress(collector.address)}
                    </p>
                    <p className="text-[10px] opacity-40">
                      {collector.count} artwork{collector.count > 1 ? 's' : ''} owned
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold opacity-80">{collector.totalSpent.toFixed(1)} {'\u2B23'}</p>
                    <p className="text-[10px] opacity-40">total spent</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Top Sales Tab ────────────────────────────────── */}
      {tab === 'top-sales' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">Top Sales</h2>
            <p className="text-body-sm opacity-40">
              {salesMarketFilter === '1st' ? 'Les meilleures ventes du marché primaire (première vente).' : 'Les meilleures reventes sur le marché secondaire.'}
            </p>
          </div>
          {topSales.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-base">Aucune vente pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topSales.slice(0, 50).map((sale, idx) => (
                <div
                  key={`${sale.wart.id}-${sale.transfer.timestamp}`}
                  className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:bg-current/5 transition-all"
                  onClick={() => openDetail(sale.wart)}
                >
                  <div className="w-8 h-8 flex items-center justify-center text-base font-bold opacity-50 shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="w-12 h-12 bg-current/5 overflow-hidden shrink-0">
                    <WartMedia wart={sale.wart} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold opacity-80 truncate">{sale.wart.title}</p>
                    <p className="text-[10px] opacity-40">
                      {shortAddress(sale.transfer.from)} {'\u2192'} {shortAddress(sale.transfer.to)}
                    </p>
                    <p className="text-[10px] opacity-30">{formatDateFR(sale.transfer.timestamp)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold opacity-90">{sale.transfer.price} {'\u2B23'}</p>
                    <p className="text-[10px] opacity-40">{sale.isFirstSale ? '1st market' : '2nd market'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Top Collections Tab ──────────────────────────── */}
      {tab === 'top-collections' && (
        <>
          <div className="glass-panel p-4 text-center">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">Top Collections</h2>
            <p className="text-body-sm opacity-40">Les collections les plus populaires de Strangrz.</p>
          </div>
          {topCollections.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="opacity-50 text-base">Aucune collection pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCollections.slice(0, 50).map((coll, idx) => (
                <div key={`${coll.creator}-${coll.title}`} className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:bg-current/5 transition-colors" onClick={() => navigateToProfile(coll.creator)}>
                  <div className="w-8 h-8 flex items-center justify-center text-base font-bold opacity-50 shrink-0">
                    #{idx + 1}
                  </div>
                  {coll.warts[0]?.imageData && (
                    <div className="w-12 h-12 bg-current/5 overflow-hidden shrink-0">
                      <img src={coll.warts[0].imageData} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold opacity-80 truncate">{coll.title}</p>
                    <p className="text-[10px] opacity-40">
                      {getCreatorName(coll.creator)} {'\u00B7'} {coll.count} item{coll.count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold opacity-80">{coll.totalVolume.toFixed(1)} {'\u2B23'}</p>
                    <p className="text-[10px] opacity-40">{coll.floorPrice !== null ? `Floor: ${coll.floorPrice} \u2B23` : 'Not listed'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Create Tab ────────────────────────────────────── */}
      {tab === 'create' && (
        <div className="glass-panel p-0 overflow-hidden">
          {/* Create header */}
          <div className="p-5 pb-3 border-b border-current/10">
            <h2 className="text-title-sm font-bold opacity-100 font-title">Create a Strangrz</h2>
            <p className="text-body-sm opacity-40 mt-1">
              Certify a rare digital object on the Strangrz protocol. Earn royalties on every resale.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* ─── Category Selection ──────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 block mb-2 uppercase tracking-wider">Category</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'image', label: 'Art', icon: '\u25C8' },
                  { id: 'video', label: 'Video', icon: '\u25B6' },
                  { id: 'audio', label: 'Music', icon: '\u266B' },
                  { id: 'svg', label: 'RWA', icon: '\u2B22' },
                  { id: 'cards', label: 'Cards', icon: '\uD83C\uDCCF' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMediaType(cat.id as 'image' | 'audio' | 'video' | 'svg' | 'cards')}
                    className={`py-2.5 px-2 text-[11px] font-medium transition-all cursor-pointer text-center ${
                      mediaType === cat.id
                        ? 'bg-current/10 border border-current/20 opacity-90'
                        : 'border border-current/10 opacity-40 hover:opacity-60 hover:border-current/15'
                    }`}
                  >
                    <div className="text-base mb-0.5">{cat.icon}</div>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Chain Selection ──────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 block mb-2 uppercase tracking-wider">Blockchain</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'strangrz' as const, label: 'Strangrz', sub: 'CW-721 \u00B7 0 gas', icon: '\u2B22' },
                  { id: 'ethereum' as const, label: 'Ethereum', sub: 'ERC-721 \u00B7 Gas fees', icon: '\u039E' },
                ]).map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setMintChain(ch.id)}
                    className={`p-3 text-center transition-all cursor-pointer ${
                      mintChain === ch.id
                        ? 'bg-current/10 border border-current/20 opacity-90'
                        : 'border border-current/10 opacity-40 hover:opacity-60 hover:border-current/15'
                    }`}
                  >
                    <div className="text-base mb-1">{ch.icon}</div>
                    <div className="text-[11px] font-medium">{ch.label}</div>
                    <div className="text-[9px] opacity-60 mt-0.5">{ch.sub}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] opacity-30 mt-1.5">
                {mintChain === 'strangrz'
                  ? 'Mint gratuit sur StrangrzChain. Certificat STCERT + Vobjct Safe inclus.'
                  : 'Mint sur Ethereum via ERC-721. N\u00E9cessite un wallet Ethereum connect\u00E9 (MetaMask). Gas fees requis.'}
              </p>
            </div>

            {/* ─── Media Upload ─────────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 block mb-2 uppercase tracking-wider">Media File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".gif,.jpeg,.jpg,.png,.mp3,.wav,.mp4,.mov,.svg"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <input ref={audioCoverRef} type="file" accept="image/*" className="hidden" onChange={handleAudioCoverUpload} />
              {uploadStatus && !imageData && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full p-4 border border-current/10 bg-current/5 space-y-2">
                  <p className="text-[11px] opacity-50 text-center">{uploadStatus}</p>
                  <div className="w-full h-2 bg-current/5 overflow-hidden">
                    <div
                      className="h-full bg-current/30 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] opacity-30 text-center">{uploadProgress}%</p>
                </div>
              )}
              {imageData ? (
                <div className="flex flex-col items-center gap-3">
                  {(mediaType === 'image' || mediaType === 'svg' || mediaType === 'cards') && (
                    <div className="w-full max-w-[280px] aspect-square overflow-hidden bg-current/5 border border-current/10">
                      <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {mediaType === 'video' && (
                    <video src={createVideoBlobUrl} controls playsInline preload="auto" className="w-full max-w-[280px] bg-black border border-current/10" />
                  )}
                  {mediaType === 'audio' && (
                    <div className="w-full space-y-2">
                      <audio src={createAudioBlobUrl} controls className="w-full h-10" />
                      {audioCover ? (
                        <div className="flex items-center gap-3 p-2 bg-current/5 border border-current/10">
                          <img src={audioCover} alt="Cover" className="w-14 h-14 object-cover" />
                          <div className="flex-1">
                            <p className="text-[10px] opacity-50">Cover image</p>
                          </div>
                          <button className="text-[10px] opacity-40 hover:opacity-70 cursor-pointer" onClick={() => setAudioCover('')}>Remove</button>
                        </div>
                      ) : (
                        <button className="w-full py-2 text-[11px] opacity-40 border border-dashed border-current/15 hover:opacity-60 cursor-pointer" onClick={() => audioCoverRef.current?.click()}>
                          + Add cover image
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    className="text-[11px] opacity-40 hover:opacity-70 cursor-pointer"
                    onClick={() => { setImageData(''); setAudioCover(''); }}
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <button
                  className="w-full py-8 border border-dashed border-current/20 hover:border-current/30 hover:bg-current/5 transition-all cursor-pointer opacity-50 hover:opacity-70"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="text-2xl mb-1">{'\u2B06'}</div>
                  <div className="text-[11px]">Click to upload (max 50MB)</div>
                  <div className="text-[10px] opacity-60 mt-1">.gif .jpeg .png .svg .mp3 .mp4 .mov</div>
                </button>
              )}
            </div>

            {/* ─── Title & Description ─────────────────── */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Title</label>
                <input
                  className="warp-input w-full"
                  placeholder="Name your artwork"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Description <span className="opacity-60">(optional)</span></label>
                <textarea
                  className="warp-input w-full min-h-[80px] resize-y"
                  placeholder="Tell the story behind your art..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>

            {/* ─── Edition Type ─────────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 block mb-2 uppercase tracking-wider">Edition Type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'unique' as const, label: 'Unique Piece', sub: '1/1', icon: '\u2726' },
                  { id: 'limited' as const, label: 'Limited Edition', sub: 'Fixed supply', icon: '\u2605' },
                  { id: 'unlimited' as const, label: 'Open Edition', sub: 'Unlimited', icon: '\u25CE' },
                ]).map(et => (
                  <button
                    key={et.id}
                    className={`p-3 text-center transition-all cursor-pointer ${
                      editionType === et.id
                        ? 'bg-current/10 border border-current/20 opacity-90'
                        : 'border border-current/10 opacity-40 hover:opacity-60 hover:border-current/15'
                    }`}
                    onClick={() => { setEditionType(et.id); if (et.id !== 'limited') setMaxEditions(''); }}
                  >
                    <div className="text-base mb-1">{et.icon}</div>
                    <div className="text-[11px] font-medium">{et.label}</div>
                    <div className="text-[9px] opacity-60 mt-0.5">{et.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {editionType === 'limited' && (
              <div>
                <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Max Editions</label>
                <input
                  className="warp-input w-full"
                  type="number"
                  placeholder="e.g. 10"
                  min="1"
                  step="1"
                  value={maxEditions}
                  onChange={e => setMaxEditions(e.target.value)}
                />
              </div>
            )}

            {/* ─── Price & Royalty (side by side) ───────── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Price in {'\u2B23'}</label>
                <input
                  className="warp-input w-full"
                  type="number"
                  placeholder="Not for sale"
                  min="0"
                  step="1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Royalty (%)</label>
                <input
                  className="warp-input w-full"
                  type="number"
                  placeholder="5"
                  min="0"
                  max="50"
                  step="1"
                  value={royalty}
                  onChange={e => setRoyalty(e.target.value)}
                />
              </div>
            </div>

            {/* ─── Time Limit ──────────────────────────── */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Time Limit <span className="opacity-60">(optional, in hours)</span></label>
              <input
                className="warp-input w-full"
                type="number"
                placeholder="Leave empty = forever"
                min="0"
                step="1"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
              />
              {durationHours && (
                <p className="text-[10px] opacity-40 mt-1">
                  Expires {formatDateFR(Date.now() + parseFloat(durationHours) * 3600000)} (Paris)
                </p>
              )}
            </div>

            {/* ─── Rarity Preview ──────────────────────── */}
            <div className="p-3 border border-current/10 bg-current/5 flex items-center justify-between">
              <span className="text-body-sm opacity-40">Estimated rarity</span>
              <span className="text-body-sm">
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
              </span>
            </div>

            {/* ─── Progress Bar ────────────────────────── */}
            {(uploadProgress > 0 && uploadProgress < 100) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="opacity-50">{uploadStatus || 'Traitement...'}</span>
                  <span className="opacity-60 font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-current/5 overflow-hidden">
                  <div
                    className="h-full bg-current/30 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ─── Errors/Success ──────────────────────── */}
            {createError && (
              <div className="text-body-sm p-3 bg-current/5 border border-current/15 opacity-70">{createError}</div>
            )}
            {createSuccess && (
              <div className="text-body-sm p-3 bg-current/5 border border-current/15 opacity-80">{'\u2713'} {createSuccess}</div>
            )}

            {/* ─── Mint Button ─────────────────────────── */}
            <button
              className="warp-button w-full py-3.5 text-base font-bold"
              onClick={handleMint}
              disabled={creating || !title || !imageData}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
                  {uploadStatus || 'Minting...'}
                </span>
              ) : (
                mintChain === 'ethereum' ? 'Certifier & Mint (Ethereum)' : 'Certifier & Mint (Strangrz)'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Music Tab (embedded) ──────────────────────────── */}
      {tab === 'music' && !showEditionFilters && <MusicView />}
    </div>
  );
}
