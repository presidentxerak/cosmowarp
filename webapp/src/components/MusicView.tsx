import { useState, useRef, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import type { Wart } from '../engine/warts';

// ─── Waveform Generator ──────────────────────────────────────
function generateWaveformData(audioSrc: string, bars: number): Promise<number[]> {
  return new Promise((resolve) => {
    const audio = new AudioContext();
    fetch(audioSrc)
      .then(r => r.arrayBuffer())
      .then(buf => audio.decodeAudioData(buf))
      .then(decoded => {
        const raw = decoded.getChannelData(0);
        const blockSize = Math.floor(raw.length / bars);
        const waveform: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(raw[i * blockSize + j]);
          }
          waveform.push(sum / blockSize);
        }
        // Normalize 0–1
        const max = Math.max(...waveform, 0.01);
        resolve(waveform.map(v => v / max));
      })
      .catch(() => {
        // Fallback: random-ish waveform
        resolve(Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8));
      });
  });
}

// ─── Waveform Player Component ───────────────────────────────
function WaveformPlayer({ src, cover, title, artist }: { src: string; cover?: string; title: string; artist: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const barCount = 80;
  const waveContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateWaveformData(src, barCount).then(setWaveform);
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration);
    const onEnded = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
    setPlaying(!playing);
  }, [playing]);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    const container = waveContainerRef.current;
    if (!el || !container || !duration) return;
    const rect = container.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
    setCurrentTime(el.currentTime);
  }, [duration]);

  const progress = duration > 0 ? currentTime / duration : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Cover + info */}
      <div className="flex gap-3 p-3">
        <div className="shrink-0 w-16 h-16 bg-current/5 flex items-center justify-center overflow-hidden">
          {cover ? (
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl opacity-30">{'\u266B'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold opacity-90 truncate">{title}</p>
          <p className="text-body-sm opacity-50 truncate">{artist}</p>
        </div>
        <button
          onClick={togglePlay}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-current/10 hover:bg-current/15 transition-all cursor-pointer self-center"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
      </div>

      {/* Waveform timeline */}
      <div
        ref={waveContainerRef}
        className="px-3 pb-2 cursor-pointer h-16 flex items-end gap-[1px]"
        onClick={seekTo}
      >
        {waveform.map((v, i) => {
          const barProgress = i / waveform.length;
          const isPast = barProgress <= progress;
          return (
            <div
              key={i}
              className="flex-1 transition-all duration-75"
              style={{
                height: `${Math.max(8, v * 100)}%`,
                backgroundColor: isPast
                  ? 'currentColor'
                  : 'currentColor',
                opacity: isPast ? 0.7 : 0.15,
              }}
            />
          );
        })}
      </div>

      {/* Time display */}
      <div className="flex justify-between px-3 pb-2 text-label opacity-40">
        <span>{formatTime(currentTime)}</span>
        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

// ─── Music Track Card (grid view) ────────────────────────────
function TrackCard({ wart, onClick }: { wart: Wart; onClick: () => void }) {
  return (
    <div
      className="glass-panel overflow-hidden cursor-pointer hover:border-current/15 transition-all group"
      onClick={onClick}
    >
      <div className="aspect-square bg-current/5 flex items-center justify-center overflow-hidden relative">
        {wart.audioCover ? (
          <img src={wart.audioCover} alt={wart.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-20">{'\u266B'}</span>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        </div>
        {wart.price !== null && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 font-bold">
            {wart.price} {'\u03A9'}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-base font-bold opacity-90 truncate">{wart.title}</p>
        <p className="text-body-sm opacity-40 truncate">{shortAddress(wart.creator)}</p>
        {wart.description && (
          <p className="text-body-sm opacity-30 truncate mt-0.5">{wart.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main MusicView Component ────────────────────────────────
export default function MusicView() {
  const { wallet, unlocked, marketplace, myCollection, myCreated, buyWart } = useWallet();
  const [selectedTrack, setSelectedTrack] = useState<Wart | null>(null);
  const [filter, setFilter] = useState<'all' | 'on-sale' | 'my-tracks'>('all');
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get all audio warts
  const allMusic = marketplace.filter(w => w.mediaType === 'audio');
  const myMusic = [...myCollection, ...myCreated]
    .filter(w => w.mediaType === 'audio')
    .filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);

  const tracks = filter === 'all' ? allMusic
    : filter === 'on-sale' ? allMusic.filter(w => w.listed && w.price !== null)
    : myMusic;

  const handleBuy = async (wart: Wart) => {
    if (!wallet || !unlocked || buying) return;
    setBuying(true);
    try {
      const res = await buyWart(wart.id);
      if (res.success) {
        setBuyResult({ success: true, message: `${wart.title} ajouté à votre collection !` });
        setSelectedTrack(null);
      } else {
        setBuyResult({ success: false, message: res.error || 'Échec de l\'achat' });
      }
    } catch {
      setBuyResult({ success: false, message: 'Échec de l\'achat' });
    }
    setBuying(false);
    setTimeout(() => setBuyResult(null), 4000);
  };

  if (!wallet || !unlocked) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-2xl mb-2">{'\u266B'}</p>
        <p className="opacity-50 text-base">Déverrouillez votre portefeuille pour accéder à la musique.</p>
      </div>
    );
  }

  // ─── Track Detail View ─────────────────────────────────
  if (selectedTrack) {
    const isOwner = selectedTrack.owner === wallet.address;
    const isCreator = selectedTrack.creator === wallet.address;

    return (
      <div className="space-y-4">
        <button
          className="text-body-sm opacity-50 hover:opacity-90 cursor-pointer"
          onClick={() => setSelectedTrack(null)}
        >
          {'\u2190'} Retour
        </button>

        {/* Cover art large */}
        <div className="glass-panel overflow-hidden">
          <div className="aspect-video bg-current/5 flex items-center justify-center overflow-hidden max-h-[300px]">
            {selectedTrack.audioCover ? (
              <img src={selectedTrack.audioCover} alt={selectedTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-6xl opacity-15">{'\u266B'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Waveform player */}
        <WaveformPlayer
          src={selectedTrack.imageData}
          cover={selectedTrack.audioCover}
          title={selectedTrack.title}
          artist={selectedTrack.creator === wallet.address
            ? (wallet.alias || shortAddress(wallet.address))
            : shortAddress(selectedTrack.creator)}
        />

        {/* Track info */}
        <div className="glass-panel p-4 space-y-3">
          <div>
            <h2 className="text-title-sm font-bold opacity-100 font-title">{selectedTrack.title}</h2>
            <p className="text-body-sm opacity-50 mt-0.5">
              par {isCreator ? (wallet.alias || shortAddress(wallet.address)) : shortAddress(selectedTrack.creator)}
            </p>
          </div>

          {selectedTrack.description && (
            <p className="text-base opacity-60">{selectedTrack.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-body-sm opacity-40">
            {selectedTrack.certId && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                CRCERT
              </span>
            )}
            <span>{selectedTrack.editionType === 'unique' ? '1/1' : selectedTrack.editionType === 'limited' ? `Éd. ${selectedTrack.editionNumber}/${selectedTrack.maxEditions}` : 'Illimité'}</span>
            <span>{new Date(selectedTrack.createdAt).toLocaleDateString('fr-FR')}</span>
          </div>

          {/* Buy / ownership */}
          {selectedTrack.listed && selectedTrack.price !== null && !isOwner && (
            <div className="pt-2 border-t border-current/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label opacity-40">PRIX</p>
                  <p className="text-title-sm font-bold opacity-90">{selectedTrack.price} {'\u03A9'}</p>
                </div>
                <button
                  className="warp-button px-6 py-2.5"
                  onClick={() => handleBuy(selectedTrack)}
                  disabled={buying || wallet.balance < (selectedTrack.price || 0)}
                >
                  {buying ? 'Achat en cours...' : `Acheter ${selectedTrack.price} \u03A9`}
                </button>
              </div>
            </div>
          )}

          {isOwner && (
            <div className="pt-2 border-t border-current/10">
              <p className="text-body-sm opacity-60">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><path d="M20 6L9 17l-5-5"/></svg>
                Vous possédez ce titre
              </p>
            </div>
          )}
        </div>

        {/* Transfer history */}
        {selectedTrack.history.length > 0 && (
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-2">Historique</h3>
            <div className="space-y-1 text-body-sm">
              {selectedTrack.history.map((h, i) => (
                <div key={i} className="flex justify-between opacity-40">
                  <span>{shortAddress(h.from)} → {shortAddress(h.to)}</span>
                  <span>{h.price} {'\u03A9'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Music Grid View ───────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 text-center">
        <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u266B'} Musique</h2>
        <p className="text-body-sm opacity-40">
          Écoutez, collectionnez et vendez des oeuvres musicales certifiées sur Strangrz.
        </p>
      </div>

      {/* Filters */}
      <div className="glass-panel p-2">
        <div className="flex gap-1">
          {([
            { id: 'all' as const, label: 'Tout' },
            { id: 'on-sale' as const, label: 'En vente' },
            { id: 'my-tracks' as const, label: 'Mes titres' },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 px-3 py-2 text-body-sm font-medium transition-all cursor-pointer ${
                filter === f.id
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-50 hover:opacity-90 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {buyResult && (
        <div className={`text-base p-3 text-center ${
          buyResult.success ? 'bg-current/5 border border-current/10 opacity-80' : 'bg-current/5 border border-current/15 opacity-70'
        }`}>
          {buyResult.message}
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-3xl mb-2 opacity-20">{'\u266B'}</p>
          <p className="opacity-50 text-base">
            {filter === 'my-tracks' ? 'Aucun titre dans votre collection.' : 'Aucun titre disponible.'}
          </p>
          <p className="text-body-sm opacity-30 mt-1">
            Créez une Strangrz audio (.wav) avec une pochette dans l'onglet Créer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tracks.map(track => (
            <TrackCard key={track.id} wart={track} onClick={() => setSelectedTrack(track)} />
          ))}
        </div>
      )}
    </div>
  );
}
