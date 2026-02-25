import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { PFPCollectionEngine } from '../engine/pfpcollection';
import type { PFPCollection, TraitLayer } from '../engine/pfpcollection';

type Step = 'list' | 'create' | 'edit' | 'mint' | 'gallery';

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

  // Layer/variant management
  const [newLayerName, setNewLayerName] = useState('');
  const [addingVariantLayerId, setAddingVariantLayerId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantRarity, setVariantRarity] = useState('50');
  const [variantImage, setVariantImage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Mint
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState('');

  useEffect(() => {
    const engine = PFPCollectionEngine.load();
    setCollections(engine.getAllCollections());
  }, []);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
        <p className="text-gray-400 text-sm">Unlock your wallet to manage PFP collections</p>
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
    const collection = engine.createCollection(wallet.address, name.trim(), description, supply, price);
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
    setSelectedCollection(engine.getCollection(selectedCollection.id));
    setCollections(engine.getAllCollections());
    setNewLayerName('');
  };

  const handleRemoveLayer = (layerId: string) => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    engine.removeLayer(selectedCollection.id, layerId);
    setSelectedCollection(engine.getCollection(selectedCollection.id));
    setCollections(engine.getAllCollections());
  };

  const handleVariantUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setVariantImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddVariant = () => {
    if (!selectedCollection || !addingVariantLayerId || !variantName.trim() || !variantImage) return;
    const rarity = parseInt(variantRarity) || 50;
    const engine = PFPCollectionEngine.load();
    engine.addVariant(selectedCollection.id, addingVariantLayerId, variantName.trim(), variantImage, rarity);
    setSelectedCollection(engine.getCollection(selectedCollection.id));
    setCollections(engine.getAllCollections());
    setVariantName('');
    setVariantRarity('50');
    setVariantImage('');
    setAddingVariantLayerId('');
  };

  const handleRemoveVariant = (layerId: string, variantId: string) => {
    if (!selectedCollection) return;
    const engine = PFPCollectionEngine.load();
    engine.removeVariant(selectedCollection.id, layerId, variantId);
    setSelectedCollection(engine.getCollection(selectedCollection.id));
    setCollections(engine.getAllCollections());
  };

  const handleMint = async () => {
    if (!selectedCollection) return;
    setMinting(true);
    setMintResult('');
    const engine = PFPCollectionEngine.load();
    const item = await engine.mintPFP(selectedCollection.id, wallet.address);
    if (item) {
      setMintResult(`Minted PFP #${item.tokenIndex}!`);
      setSelectedCollection(engine.getCollection(selectedCollection.id));
      setCollections(engine.getAllCollections());
    } else {
      setMintResult('Mint failed - collection may be full or has no layers');
    }
    setMinting(false);
    setTimeout(() => setMintResult(''), 3000);
  };

  const totalCombinations = (layers: TraitLayer[]) => {
    if (layers.length === 0) return 0;
    return layers.reduce((total, layer) => total * Math.max(1, layer.variants.length), 1);
  };

  // ─── List view ────────────────────────────────────────
  if (step === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-200">PFP Collections</h3>
          <button onClick={() => setStep('create')} className="warp-button text-xs px-3 py-1.5">
            + New Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <p className="text-3xl mb-3">{'\u2B21'}</p>
            <p className="text-gray-400 text-sm">No PFP collections yet</p>
            <p className="text-gray-500 text-xs mt-1">Create a collection with trait layers like CryptoPunks</p>
            <button onClick={() => setStep('create')} className="warp-button text-xs px-4 py-2 mt-4">
              Create Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {collections.map(col => (
              <div key={col.id} className="glass-panel p-4 cursor-pointer hover:border-warp-400/40 transition-all" onClick={() => { setSelectedCollection(col); setStep('edit'); }}>
                <div className="flex items-center gap-3">
                  {col.items.length > 0 ? (
                    <img src={col.items[0].compositeImage} alt="" className="w-14 h-14 object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-warp-500/10 border border-warp-500/20 flex items-center justify-center text-2xl text-warp-400">
                      {'\u2B21'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-200 truncate">{col.name}</h4>
                    <p className="text-[10px] text-gray-500">{col.layers.length} layers | {col.items.length}/{col.maxSupply} minted</p>
                    <p className="text-[10px] text-gray-500">{totalCombinations(col.layers).toLocaleString()} possible combinations</p>
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
      <div className="space-y-4 max-w-md mx-auto">
        <button onClick={() => setStep('list')} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">{'\u2190'} Back</button>
        <div className="glass-panel p-5">
          <h3 className="text-lg font-bold text-gray-100 font-title text-center mb-4">{'\u2B21'} New PFP Collection</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">COLLECTION NAME</label>
              <input className="warp-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CosmoKids" maxLength={50} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">DESCRIPTION</label>
              <textarea className="warp-input min-h-[60px] resize-y" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your collection..." maxLength={300} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">MAX SUPPLY</label>
              <input className="warp-input" type="number" value={maxSupply} onChange={e => setMaxSupply(e.target.value)} min="1" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">MINT PRICE IN {'\u03A9'} (empty = free)</label>
              <input className="warp-input" type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" min="0" />
            </div>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <button onClick={handleCreateCollection} className="warp-button w-full py-2.5" disabled={!name.trim()}>
              Create Collection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit view (layer/trait management) ──────────────
  if ((step === 'edit' || step === 'mint' || step === 'gallery') && selectedCollection) {
    const col = selectedCollection;
    const combos = totalCombinations(col.layers);

    return (
      <div className="space-y-4">
        <button onClick={() => { setStep('list'); setSelectedCollection(null); }} className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">{'\u2190'} Back to collections</button>

        {/* Collection header */}
        <div className="glass-panel p-4">
          <div className="flex items-center gap-3">
            {col.items.length > 0 ? (
              <img src={col.items[col.items.length - 1].compositeImage} alt="" className="w-16 h-16 object-cover" />
            ) : (
              <div className="w-16 h-16 bg-warp-500/10 border border-warp-500/20 flex items-center justify-center text-3xl text-warp-400">{'\u2B21'}</div>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-100 font-title">{col.name}</h3>
              <p className="text-xs text-gray-500">{col.description}</p>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                <span>{col.layers.length} layers</span>
                <span>{combos.toLocaleString()} combos</span>
                <span>{col.items.length}/{col.maxSupply} minted</span>
                {col.basePrice !== null && <span>{col.basePrice} {'\u03A9'}</span>}
              </div>
              <p className="text-[9px] text-gray-600 mt-0.5 font-mono">ID: {col.fingerprint}</p>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-white/5">
          {(['edit', 'mint', 'gallery'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 px-3 py-2 text-xs font-medium cursor-pointer border-b-2 transition-all ${
                step === s ? 'border-warp-400 text-warp-300' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {s === 'edit' ? 'Layers & Traits' : s === 'mint' ? 'Mint' : `Gallery (${col.items.length})`}
            </button>
          ))}
        </div>

        {/* Layers & Traits */}
        {step === 'edit' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                className="warp-input flex-1 text-xs"
                value={newLayerName}
                onChange={e => setNewLayerName(e.target.value)}
                placeholder="New layer name (e.g. Background, Head, Eyes...)"
                onKeyDown={e => { if (e.key === 'Enter') handleAddLayer(); }}
              />
              <button onClick={handleAddLayer} className="warp-button text-xs px-3" disabled={!newLayerName.trim()}>
                + Add Layer
              </button>
            </div>

            {col.layers.length === 0 ? (
              <div className="glass-panel p-6 text-center">
                <p className="text-gray-500 text-sm">Add layers to define your PFP structure</p>
                <p className="text-gray-600 text-xs mt-1">Layers are stacked: Background {'\u2192'} Body {'\u2192'} Eyes {'\u2192'} Mouth {'\u2192'} Accessories</p>
              </div>
            ) : (
              col.layers.map((layer, idx) => (
                <div key={layer.id} className="glass-panel p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 w-5">{idx + 1}.</span>
                      <h4 className="text-xs font-bold text-gray-200">{layer.name}</h4>
                      <span className="text-[10px] text-gray-500">({layer.variants.length} variants)</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddingVariantLayerId(addingVariantLayerId === layer.id ? '' : layer.id)}
                        className="text-[10px] text-warp-400 hover:text-warp-300 cursor-pointer"
                      >
                        + Add variant
                      </button>
                      <button onClick={() => handleRemoveLayer(layer.id)} className="text-[10px] text-red-400/50 hover:text-red-400 cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Existing variants */}
                  {layer.variants.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {layer.variants.map(v => (
                        <div key={v.id} className="shrink-0 w-16 group relative">
                          <img src={v.imageData} alt={v.name} className="w-16 h-16 object-cover bg-cosmic-800" />
                          <p className="text-[9px] text-gray-400 truncate mt-0.5">{v.name}</p>
                          <p className="text-[8px] text-gray-600">{v.rarity}%</p>
                          <button
                            onClick={() => handleRemoveVariant(layer.id, v.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            {'\u2715'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add variant form */}
                  {addingVariantLayerId === layer.id && (
                    <div className="mt-2 p-2 border border-white/5 space-y-2">
                      <input ref={fileRef} type="file" accept="image/png" className="hidden" onChange={handleVariantUpload} />
                      <div className="flex gap-2">
                        <input
                          className="warp-input flex-1 text-xs py-1"
                          value={variantName}
                          onChange={e => setVariantName(e.target.value)}
                          placeholder="Variant name"
                        />
                        <input
                          className="warp-input w-16 text-xs py-1"
                          type="number"
                          value={variantRarity}
                          onChange={e => setVariantRarity(e.target.value)}
                          min="1" max="100"
                          placeholder="%"
                          title="Rarity weight (1-100)"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        {variantImage ? (
                          <div className="flex items-center gap-2">
                            <img src={variantImage} alt="" className="w-10 h-10 object-cover" />
                            <button onClick={() => setVariantImage('')} className="text-[10px] text-gray-500 cursor-pointer">Remove</button>
                          </div>
                        ) : (
                          <button onClick={() => fileRef.current?.click()} className="text-xs text-warp-400 cursor-pointer hover:text-warp-300">
                            Upload PNG (transparent)
                          </button>
                        )}
                        <button
                          onClick={handleAddVariant}
                          className="warp-button text-xs px-3 py-1 ml-auto"
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
          </div>
        )}

        {/* Mint */}
        {step === 'mint' && (
          <div className="glass-panel p-6 text-center space-y-4 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-gray-100 font-title">Mint a PFP</h3>
            <p className="text-xs text-gray-500">
              Generate a unique PFP by randomly combining traits from each layer.
              Each mint creates a one-of-a-kind combination with a cryptographic signature.
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Possible combinations: <span className="text-warp-300 font-bold">{combos.toLocaleString()}</span></p>
              <p>Minted: <span className="text-energy-400">{col.items.length}</span> / {col.maxSupply}</p>
              <p>Remaining: <span className="text-energy-400">{col.maxSupply - col.items.length}</span></p>
            </div>
            {col.layers.length === 0 ? (
              <p className="text-xs text-red-400">Add layers and variants before minting</p>
            ) : col.items.length >= col.maxSupply ? (
              <p className="text-xs text-red-400">Collection is fully minted!</p>
            ) : (
              <button
                onClick={handleMint}
                className="warp-button w-full py-3 text-base"
                disabled={minting || col.layers.every(l => l.variants.length === 0)}
              >
                {minting ? 'Generating...' : `Mint PFP #${col.items.length + 1}`}
              </button>
            )}
            {mintResult && (
              <p className={`text-sm ${mintResult.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>
                {mintResult}
              </p>
            )}

            {/* Last minted preview */}
            {col.items.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] text-gray-500 mb-2">Last minted:</p>
                <div className="inline-block">
                  <img src={col.items[col.items.length - 1].compositeImage} alt="" className="w-40 h-40 object-cover mx-auto" />
                  <p className="text-xs text-gray-300 mt-1">PFP #{col.items[col.items.length - 1].tokenIndex}</p>
                  <p className="text-[9px] text-gray-600 font-mono">sig: {col.items[col.items.length - 1].signature}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {step === 'gallery' && (
          col.items.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-500 text-sm">No PFPs minted yet</p>
              <button onClick={() => setStep('mint')} className="text-xs text-warp-400 mt-2 cursor-pointer">Mint one</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {col.items.map(item => (
                <div key={item.id} className="glass-panel p-1.5">
                  <img src={item.compositeImage} alt="" className="w-full aspect-square object-cover" />
                  <p className="text-[10px] text-gray-300 mt-0.5 text-center">#{item.tokenIndex}</p>
                  <div className="text-[8px] text-gray-600 space-y-0.5 mt-0.5">
                    {item.traits.map((t, i) => (
                      <p key={i} className="truncate">{t.layerName}: {t.variantName}</p>
                    ))}
                  </div>
                  <p className="text-[8px] text-gray-600 font-mono mt-0.5 truncate">sig: {item.signature}</p>
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
