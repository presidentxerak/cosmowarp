import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { PFPCollectionEngine } from '../engine/pfpcollection';
import type { PFPCollection, TraitLayer } from '../engine/pfpcollection';

type Step = 'list' | 'create' | 'edit' | 'mint' | 'gallery' | 'rarity';

export default function PFPCollectionView() {
  const { wallet, unlocked } = useWallet();
  const [step, setStep] = useState<Step>('list');
  const [collections, setCollections] = useState<PFPCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<PFPCollection | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxSupply, setMaxSupply] = useState('1000');
  const [basePrice, setBasePrice] = useState('');
  const [createError, setCreateError] = useState('');
  const [mintChain, setMintChain] = useState<'strangrz' | 'ethereum'>('strangrz');

  // Layer/variant management
  const [newLayerName, setNewLayerName] = useState('');
  const [addingVariantLayerId, setAddingVariantLayerId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantRarity, setVariantRarity] = useState('50');
  const [variantImage, setVariantImage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk upload
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [bulkUploadLayerId, setBulkUploadLayerId] = useState('');

  // Drag & drop reorder
  const [dragLayerIdx, setDragLayerIdx] = useState<number | null>(null);

  // Mint
  const [minting, setMinting] = useState(false);
  const [mintCount, setMintCount] = useState('1');
  const [mintResult, setMintResult] = useState('');

  // Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Upload state (must be before early returns to respect Rules of Hooks)
  const [uploadError, setUploadError] = useState('');
  const [bulkProgress, setBulkProgress] = useState('');

  useEffect(() => {
    const engine = PFPCollectionEngine.load();
    setCollections(engine.getAllCollections());
  }, []);

  const refreshCollection = useCallback(() => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    const updated = engine.getCollection(selectedCollection.id);
    setSelectedCollection(updated);
    setCollections(engine.getAllCollections());
  }, [selectedCollection]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
        <p className="text-base opacity-50">Unlock your wallet to manage PFP collections</p>
      </div>
    );
  }

  const handleCreateCollection = () => {
    if (!name.trim()) { setCreateError('Name required'); return; }
    const supply = parseInt(maxSupply);
    if (isNaN(supply) || supply < 1) { setCreateError('Invalid max supply'); return; }
    const price = basePrice ? parseFloat(basePrice) : null;
    if (price !== null && (isNaN(price) || price < 0)) { setCreateError('Invalid price'); return; }

    const engine = PFPCollectionEngine.load();
    const collection = engine.createCollection(wallet.address, name.trim(), description, supply, price, mintChain);
    setCollections(engine.getAllCollections());
    setSelectedCollection(collection);
    setStep('edit');
    setName(''); setDescription(''); setMaxSupply('1000'); setBasePrice('');
    setCreateError('');
  };

  const handleAddLayer = () => {
    if (!selectedCollection || !newLayerName.trim()) return;
    const engine = PFPCollectionEngine.load();
    engine.addLayer(selectedCollection.id, newLayerName.trim());
    refreshCollection();
    setNewLayerName('');
  };

  const handleRemoveLayer = (layerId: string) => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    engine.removeLayer(selectedCollection.id, layerId);
    refreshCollection();
  };

  const handleVariantUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setUploadError('File must be under 2MB'); return; }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => setVariantImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedCollection || !bulkUploadLayerId) return;
    const engine = PFPCollectionEngine.load();
    let loaded = 0;
    let skipped = 0;
    const total = files.length;
    setBulkProgress(`0/${total}`);
    Array.from(files).forEach(file => {
      if (file.size > 2 * 1024 * 1024) { loaded++; skipped++; setBulkProgress(`${loaded}/${total}`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const varName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        engine.addVariant(selectedCollection.id, bulkUploadLayerId, varName, reader.result as string, 50);
        loaded++;
        setBulkProgress(`${loaded}/${total}`);
        if (loaded >= total) {
          refreshCollection();
          setBulkProgress(skipped > 0 ? `Done (${skipped} skipped — over 2MB)` : '');
          setTimeout(() => setBulkProgress(''), 3000);
        }
      };
      reader.onerror = () => { loaded++; skipped++; setBulkProgress(`${loaded}/${total}`); };
      reader.readAsDataURL(file);
    });
    setBulkUploadLayerId('');
  };

  const handleAddVariant = () => {
    if (!selectedCollection || !addingVariantLayerId || !variantName.trim() || !variantImage) return;
    const rarity = parseInt(variantRarity) || 50;
    const engine = PFPCollectionEngine.load();
    engine.addVariant(selectedCollection.id, addingVariantLayerId, variantName.trim(), variantImage, rarity);
    refreshCollection();
    setVariantName('');
    setVariantRarity('50');
    setVariantImage('');
    setAddingVariantLayerId('');
  };

  const handleRemoveVariant = (layerId: string, variantId: string) => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    engine.removeVariant(selectedCollection.id, layerId, variantId);
    refreshCollection();
  };

  const handleUpdateRarity = (layerId: string, variantId: string, newRarity: number) => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    const col = engine.getCollection(selectedCollection.id);
    if (!col) return;
    const layer = col.layers.find(l => l.id === layerId);
    if (!layer) return;
    const variant = layer.variants.find(v => v.id === variantId);
    if (!variant) return;
    variant.rarity = Math.max(1, Math.min(100, newRarity));
    engine.save();
    refreshCollection();
  };

  const handleMint = async () => {
    if (!selectedCollection) return;
    setMinting(true);
    setMintResult('');
    const count = Math.max(1, Math.min(50, parseInt(mintCount) || 1));
    const engine = PFPCollectionEngine.load();
    let minted = 0;
    for (let i = 0; i < count; i++) {
      const item = await engine.mintPFP(selectedCollection.id, wallet.address);
      if (item) minted++;
      else break;
    }
    setMintResult(`Minted ${minted} PFP(s)!`);
    refreshCollection();
    setMinting(false);
    setTimeout(() => setMintResult(''), 4000);
  };

  const handleGeneratePreview = async () => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    const item = await engine.mintPFP(selectedCollection.id, wallet.address);
    if (item) {
      setPreviewImage(item.compositeImage);
      refreshCollection();
    }
  };

  const totalCombinations = (layers: TraitLayer[]) => {
    if (layers.length === 0) return 0;
    return layers.reduce((total, layer) => total * Math.max(1, layer.variants.length), 1);
  };

  const getRarityDistribution = (layer: TraitLayer) => {
    const total = layer.variants.reduce((sum, v) => sum + v.rarity, 0);
    return layer.variants.map(v => ({
      ...v,
      percentage: total > 0 ? ((v.rarity / total) * 100).toFixed(1) : '0',
    }));
  };

  // ─── List view ────────────────────────────────────────
  if (step === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-title-sm font-bold">PFP Collections</h3>
          <button onClick={() => setStep('create')} className="warp-button text-base px-5 py-2.5">
            + New Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <p className="text-5xl mb-4">{'\u2B21'}</p>
            <p className="text-title-sm font-bold mb-2">No PFP collections yet</p>
            <p className="text-base opacity-50 mb-6">Create a collection with trait layers and rarity configuration</p>
            <button onClick={() => setStep('create')} className="warp-button text-base px-6 py-3">
              Create Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {collections.map(col => (
              <div key={col.id} className="card p-5 cursor-pointer" onClick={() => { setSelectedCollection(col); setStep('edit'); }}>
                <div className="flex items-center gap-4">
                  {col.items.length > 0 ? (
                    <img src={col.items[0].compositeImage} alt="" className="w-20 h-20 object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-current/5 flex items-center justify-center text-4xl opacity-30">
                      {'\u2B21'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-title-sm font-bold truncate">{col.name}</h4>
                    <p className="text-body-sm opacity-50 mt-1">{col.layers.length} layers | {col.items.length}/{col.maxSupply} minted</p>
                    <p className="text-body-sm opacity-50">{totalCombinations(col.layers).toLocaleString()} possible combinations</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Create view ──────────────────────────────────────
  if (step === 'create') {
    return (
      <div className="space-y-6">
        <button onClick={() => setStep('list')} className="text-base opacity-50 hover:opacity-100 cursor-pointer transition-opacity">{'\u2190'} Back</button>
        <div className="glass-panel p-8">
          <h3 className="text-title-lg font-bold font-title text-center mb-6">{'\u2B21'} New PFP Collection</h3>
          <div className="space-y-4">
            <div>
              <label className="text-label opacity-50 block mb-2">COLLECTION NAME</label>
              <input className="warp-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CosmoKids" maxLength={50} />
            </div>
            <div>
              <label className="text-label opacity-50 block mb-2">DESCRIPTION</label>
              <textarea className="warp-input min-h-[80px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your collection..." maxLength={300} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label opacity-50 block mb-2">MAX SUPPLY</label>
                <input className="warp-input" type="number" value={maxSupply} onChange={e => setMaxSupply(e.target.value)} min="1" />
              </div>
              <div>
                <label className="text-label opacity-50 block mb-2">MINT PRICE {'\u2B23'}</label>
                <input className="warp-input" type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="Free" min="0" />
              </div>
            </div>
            {/* Chain Selection */}
            <div>
              <label className="text-label opacity-50 block mb-2">BLOCKCHAIN</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'strangrz' as const, label: 'Strangrz', sub: 'SZ-721 \u00B7 0 gas', icon: '\u2B22' },
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
                  ? 'Mint gratuit sur StrangrzChain. Certificat STCERT + Strangrz Safe inclus.'
                  : 'Mint sur Ethereum via ERC-721. N\u00E9cessite MetaMask. Gas fees requis.'}
              </p>
            </div>
            {createError && <p className="text-base opacity-70">{createError}</p>}
            <button onClick={handleCreateCollection} className="warp-button w-full py-3 text-base" disabled={!name.trim()}>
              {mintChain === 'ethereum' ? 'Create Collection (Ethereum)' : 'Create Collection (Strangrz)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit view (layer/trait management + rarity + mint + gallery) ──────────────
  if (selectedCollection) {
    const col = selectedCollection;
    const combos = totalCombinations(col.layers);

    return (
      <div className="space-y-6">
        <button onClick={() => { setStep('list'); setSelectedCollection(null); }} className="text-base opacity-50 hover:opacity-100 cursor-pointer transition-opacity">{'\u2190'} Back to collections</button>

        {/* Collection header */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-5">
            {col.items.length > 0 ? (
              <img src={col.items[col.items.length - 1].compositeImage} alt="" className="w-24 h-24 object-cover" />
            ) : (
              <div className="w-24 h-24 bg-current/5 flex items-center justify-center text-5xl opacity-20">{'\u2B21'}</div>
            )}
            <div>
              <h3 className="text-title-lg font-bold font-title">{col.name}</h3>
              <p className="text-base opacity-50 mt-1">{col.description}</p>
              <div className="flex gap-4 mt-2 text-body-sm opacity-50">
                <span>{col.layers.length} layers</span>
                <span>{combos.toLocaleString()} combos</span>
                <span>{col.items.length}/{col.maxSupply} minted</span>
                {col.basePrice !== null && <span>{col.basePrice} {'\u2B23'}</span>}
              </div>
              <p className="text-label opacity-30 mt-1 font-mono">ID: {col.fingerprint}</p>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-current/10">
          {(['edit', 'rarity', 'mint', 'gallery'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 px-4 py-3 text-base font-medium cursor-pointer border-b-2 transition-all ${
                step === s ? 'border-current opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
              }`}
            >
              {s === 'edit' ? 'Layers & Traits' : s === 'rarity' ? 'Rarity' : s === 'mint' ? 'Mint' : `Gallery (${col.items.length})`}
            </button>
          ))}
        </div>

        {/* ─── Layers & Traits ─────────────────────────────── */}
        {step === 'edit' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                className="warp-input flex-1"
                value={newLayerName}
                onChange={e => setNewLayerName(e.target.value)}
                placeholder="New layer name (e.g. Background, Head, Eyes...)"
                onKeyDown={e => { if (e.key === 'Enter') handleAddLayer(); }}
              />
              <button onClick={handleAddLayer} className="warp-button px-5" disabled={!newLayerName.trim()}>
                + Add Layer
              </button>
            </div>

            {col.layers.length > 0 && (
              <p className="text-body-sm opacity-40">Layers render bottom to top. Drag to reorder.</p>
            )}

            {col.layers.length === 0 ? (
              <div className="glass-panel p-10 text-center">
                <p className="text-title-sm font-bold opacity-60 mb-2">Add layers to define your PFP structure</p>
                <p className="text-base opacity-40">Layers are stacked: Background {'\u2192'} Body {'\u2192'} Eyes {'\u2192'} Mouth {'\u2192'} Accessories</p>
              </div>
            ) : (
              col.layers.map((layer, idx) => (
                <div
                  key={layer.id}
                  className={`glass-panel p-5 transition-all ${dragLayerIdx === idx ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={() => setDragLayerIdx(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (dragLayerIdx !== null && dragLayerIdx !== idx && selectedCollection) {
                      const engine = PFPCollectionEngine.load();
                      const c = engine.getCollection(selectedCollection.id);
                      if (c) {
                        const [moved] = c.layers.splice(dragLayerIdx, 1);
                        c.layers.splice(idx, 0, moved);
                        engine.save();
                        refreshCollection();
                      }
                    }
                    setDragLayerIdx(null);
                  }}
                  onDragEnd={() => setDragLayerIdx(null)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-label opacity-30 w-6 cursor-grab">{'\u2630'}</span>
                      <span className="text-label opacity-40">{idx + 1}.</span>
                      <h4 className="text-title-sm font-bold">{layer.name}</h4>
                      <span className="text-body-sm opacity-40">({layer.variants.length} variants)</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => {
                          setBulkUploadLayerId(layer.id);
                          bulkFileRef.current?.click();
                        }}
                        className="text-body-sm opacity-50 hover:opacity-100 cursor-pointer transition-opacity"
                      >
                        Bulk upload
                      </button>
                      <button
                        onClick={() => setAddingVariantLayerId(addingVariantLayerId === layer.id ? '' : layer.id)}
                        className="text-body-sm opacity-70 hover:opacity-100 cursor-pointer transition-opacity"
                      >
                        + Add variant
                      </button>
                      <button onClick={() => handleRemoveLayer(layer.id)} className="text-body-sm opacity-30 hover:opacity-70 cursor-pointer transition-opacity">
                        Remove
                      </button>
                      {bulkProgress && (
                        <span className="text-label opacity-50">{bulkProgress}</span>
                      )}
                    </div>
                  </div>

                  {layer.variants.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                      {layer.variants.map(v => (
                        <div key={v.id} className="group relative card p-2">
                          <img src={v.imageData} alt={v.name} className="w-full aspect-square object-cover" style={{ imageRendering: 'pixelated' }} />
                          <p className="text-label truncate mt-1">{v.name}</p>
                          <p className="text-label opacity-40">{v.rarity}%</p>
                          <button
                            onClick={() => handleRemoveVariant(layer.id, v.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-current/20 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            {'\u2715'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {addingVariantLayerId === layer.id && (
                    <div className="mt-4 p-4 bg-current/5 space-y-3">
                      <input ref={fileRef} type="file" accept="image/png" className="hidden" onChange={handleVariantUpload} />
                      {uploadError && <p className="text-body-sm p-2 bg-current/5 border border-current/15 opacity-70">{uploadError}</p>}
                      <div className="flex gap-3">
                        <input
                          className="warp-input flex-1"
                          value={variantName}
                          onChange={e => setVariantName(e.target.value)}
                          placeholder="Variant name"
                        />
                        <input
                          className="warp-input w-24"
                          type="number"
                          value={variantRarity}
                          onChange={e => setVariantRarity(e.target.value)}
                          min="1" max="100"
                          placeholder="%"
                          title="Rarity weight (1-100)"
                        />
                      </div>
                      <div className="flex gap-3 items-center">
                        {variantImage ? (
                          <div className="flex items-center gap-3">
                            <img src={variantImage} alt="" className="w-14 h-14 object-cover" />
                            <button onClick={() => setVariantImage('')} className="text-body-sm opacity-50 cursor-pointer">Remove</button>
                          </div>
                        ) : (
                          <button onClick={() => fileRef.current?.click()} className="text-base opacity-60 cursor-pointer hover:opacity-100 transition-opacity">
                            Upload PNG (transparent)
                          </button>
                        )}
                        <button
                          onClick={handleAddVariant}
                          className="warp-button px-5 py-2 ml-auto"
                          disabled={!variantName.trim() || !variantImage}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            <input
              ref={bulkFileRef}
              type="file"
              accept="image/png"
              multiple
              className="hidden"
              onChange={handleBulkUpload}
            />
          </div>
        )}

        {/* ─── Rarity Configuration ──────────────────────── */}
        {step === 'rarity' && (
          <div className="space-y-6">
            {col.layers.length === 0 ? (
              <div className="glass-panel p-10 text-center">
                <p className="text-base opacity-50">Add layers and variants first to configure rarity</p>
              </div>
            ) : (
              col.layers.map(layer => {
                const dist = getRarityDistribution(layer);
                return (
                  <div key={layer.id} className="glass-panel p-6">
                    <h4 className="text-title-sm font-bold mb-4">{layer.name}</h4>
                    {layer.variants.length === 0 ? (
                      <p className="text-base opacity-40">No variants yet</p>
                    ) : (
                      <div className="space-y-3">
                        {dist.map(v => (
                          <div key={v.id} className="flex items-center gap-4">
                            <img src={v.imageData} alt={v.name} className="w-12 h-12 object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-base font-medium truncate">{v.name}</p>
                              <div className="w-full h-2 bg-current/10 mt-1">
                                <div
                                  className="h-full bg-current/30 transition-all"
                                  style={{ width: `${v.percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="range"
                                min="1"
                                max="100"
                                value={v.rarity}
                                onChange={e => handleUpdateRarity(layer.id, v.id, parseInt(e.target.value))}
                                className="w-24"
                              />
                              <span className="text-body-sm opacity-60 w-16 text-right">{v.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── Mint ─────────────────────────────────────────── */}
        {step === 'mint' && (
          <div className="glass-panel p-8 text-center space-y-6">
            <h3 className="text-title-lg font-bold font-title">Mint PFPs</h3>
            <p className="text-base opacity-50">
              Generate unique PFPs by randomly combining traits from each layer.
              Each mint creates a one-of-a-kind combination with a cryptographic signature.
            </p>
            <div className="text-base opacity-60 space-y-2">
              <p>Possible combinations: <span className="font-bold opacity-100">{combos.toLocaleString()}</span></p>
              <p>Minted: <span className="font-bold">{col.items.length}</span> / {col.maxSupply}</p>
              <p>Remaining: <span className="font-bold">{col.maxSupply - col.items.length}</span></p>
            </div>

            {col.layers.length === 0 ? (
              <p className="text-base opacity-50">Add layers and variants before minting</p>
            ) : col.items.length >= col.maxSupply ? (
              <p className="text-base opacity-50">Collection is fully minted!</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-label opacity-40 block mb-2">MINT COUNT (1-50)</label>
                  <input
                    className="warp-input text-center text-title-sm"
                    type="number"
                    value={mintCount}
                    onChange={e => setMintCount(e.target.value)}
                    min="1"
                    max="50"
                  />
                </div>
                <button
                  onClick={handleMint}
                  className="warp-button w-full py-4 text-title-sm"
                  disabled={minting || col.layers.every(l => l.variants.length === 0)}
                >
                  {minting ? 'Generating...' : `Mint ${mintCount} PFP(s)`}
                </button>
                <button
                  onClick={handleGeneratePreview}
                  className="text-base opacity-50 hover:opacity-100 cursor-pointer transition-opacity"
                  disabled={col.layers.every(l => l.variants.length === 0)}
                >
                  Generate Preview
                </button>
              </div>
            )}
            {mintResult && (
              <p className="text-title-sm font-bold">
                {mintResult}
              </p>
            )}

            {(previewImage || col.items.length > 0) && (
              <div className="mt-6">
                <p className="text-label opacity-40 mb-3">{previewImage ? 'Preview:' : 'Last minted:'}</p>
                <div className="inline-block">
                  <img
                    src={previewImage || col.items[col.items.length - 1].compositeImage}
                    alt=""
                    className="w-48 h-48 object-cover mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {!previewImage && col.items.length > 0 && (
                    <>
                      <p className="text-base mt-2">PFP #{col.items[col.items.length - 1].tokenIndex}</p>
                      <p className="text-label opacity-30 font-mono">sig: {col.items[col.items.length - 1].signature}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Gallery ─────────────────────────────────────── */}
        {step === 'gallery' && (
          col.items.length === 0 ? (
            <div className="glass-panel p-10 text-center">
              <p className="text-base opacity-50 mb-3">No PFPs minted yet</p>
              <button onClick={() => setStep('mint')} className="text-base opacity-60 hover:opacity-100 cursor-pointer transition-opacity">Mint one</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {col.items.map(item => (
                <div key={item.id} className="card p-3">
                  <img src={item.compositeImage} alt="" className="w-full aspect-square object-cover" style={{ imageRendering: 'pixelated' }} />
                  <p className="text-body-sm mt-2 text-center font-medium">#{item.tokenIndex}</p>
                  <div className="text-label opacity-40 space-y-0.5 mt-1">
                    {item.traits.map((t, i) => (
                      <p key={i} className="truncate">{t.layerName}: {t.variantName}</p>
                    ))}
                  </div>
                  <p className="text-label opacity-20 font-mono mt-1 truncate">sig: {item.signature}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  return null;
}
