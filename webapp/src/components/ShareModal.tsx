import { useState } from 'react';
import type { Wart } from '../engine/warts';
import { CosmoChatEngine } from '../engine/cosmochat';
import { shortAddress } from '../engine/crypto';

/** Generate a share URL for an artwork */
function getShareUrl(wartId: string): string {
  return `${window.location.origin}/gallery?wart=${wartId}`;
}

/** Share modal sections */
const SHARE_SECTIONS = [
  {
    title: 'In-app',
    options: [
      { id: 'wall', label: 'Wall', svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
      { id: 'dm', label: 'Message', svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
    ],
  },
  {
    title: 'Social',
    options: [
      { id: 'x', label: 'X', text: '\uD835\uDD4F' },
      { id: 'instagram', label: 'Instagram', text: 'IG' },
      { id: 'facebook', label: 'Facebook', text: 'f' },
      { id: 'telegram', label: 'Telegram', text: 'TG' },
      { id: 'whatsapp', label: 'WhatsApp', text: 'WA' },
      { id: 'email', label: 'Email', svg: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
    ],
  },
  {
    title: '',
    options: [
      { id: 'copy', label: 'Copy link', svg: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' },
    ],
  },
] as const;

interface ShareModalProps {
  wart: Wart;
  walletAddress: string;
  walletAlias?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function ShareModal({ wart, walletAddress, walletAlias, onClose, onSuccess }: ShareModalProps) {
  const [feedback, setFeedback] = useState('');

  const handleOption = (optionId: string) => {
    const url = getShareUrl(wart.id);
    const text = `${wart.title} on Strangrz`;

    switch (optionId) {
      case 'wall': {
        const chatEngine = CosmoChatEngine.load();
        chatEngine.createPost(walletAddress, walletAlias || shortAddress(walletAddress), `${wart.title}`, undefined, 'image', undefined, wart.id);
        setFeedback('Shared to Wall!');
        onSuccess?.('Shared to Wall!');
        break;
      }
      case 'dm':
        window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'message' }));
        onClose();
        return;
      case 'copy':
        navigator.clipboard?.writeText(url).catch(() => {});
        setFeedback('Link copied!');
        onSuccess?.('Link copied!');
        break;
      case 'x':
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, '_blank');
        break;
      case 'instagram':
        navigator.clipboard?.writeText(url).catch(() => {});
        setFeedback('Link copied! Paste it on Instagram.');
        onSuccess?.('Link copied! Paste it on Instagram.');
        break;
    }

    setTimeout(() => onClose(), 1200);
  };

  const shareUrl = getShareUrl(wart.id);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Bottom sheet */}
      <div
        className="relative w-full max-w-lg bg-[var(--bg-primary,#111)] border-t border-current/10 rounded-t-2xl pb-6"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full bg-current/20" />
        </div>

        {/* Artwork preview */}
        <div className="flex items-center gap-3 px-5 pb-4 border-b border-current/10">
          {wart.imageData && (
            <img src={wart.imageData} alt="" className="w-12 h-12 object-cover rounded" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-bold opacity-90 truncate">{wart.title}</p>
            <p className="text-[11px] opacity-50 truncate">{shareUrl}</p>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mx-5 mt-3 p-2 bg-current/5 border border-current/10 text-center text-body-sm opacity-70">
            {'\u2714'} {feedback}
          </div>
        )}

        {/* Share sections */}
        {SHARE_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="text-[10px] opacity-30 uppercase tracking-wider px-5 pt-4 pb-2">{section.title}</p>
            )}
            <div className={`px-3 ${!section.title ? 'pt-2' : ''}`}>
              {section.options.map(opt => (
                <button
                  key={opt.id}
                  className="w-full flex items-center gap-3 px-3 py-3 opacity-70 hover:opacity-100 hover:bg-current/5 transition-all cursor-pointer rounded"
                  onClick={() => handleOption(opt.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-current/8 flex items-center justify-center shrink-0">
                    {'svg' in opt ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" dangerouslySetInnerHTML={{ __html: opt.svg }} />
                    ) : (
                      <span className="text-sm font-bold opacity-80">{'text' in opt ? opt.text : ''}</span>
                    )}
                  </div>
                  <span className="text-body-sm">{opt.label}</span>
                </button>
              ))}
            </div>
            {si < SHARE_SECTIONS.length - 1 && <div className="mx-5 border-b border-current/8" />}
          </div>
        ))}

        {/* Cancel */}
        <div className="px-5 pt-4">
          <button
            onClick={onClose}
            className="w-full py-3 text-body-sm opacity-50 hover:opacity-80 border border-current/10 rounded transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
