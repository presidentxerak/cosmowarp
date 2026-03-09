import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

/* ─── Hexagon grid background (pure CSS) ──────────────── */
function HexGrid() {
  const hexagons = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hexagons.map(i => {
        const size = 60 + Math.random() * 100;
        const left = Math.random() * 110 - 5;
        const top = Math.random() * 110 - 5;
        const delay = Math.random() * 8;
        const duration = 6 + Math.random() * 8;
        const opacity = 0.03 + Math.random() * 0.07;
        return (
          <svg
            key={i}
            className="absolute hex-float"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
              opacity,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
            viewBox="0 0 100 100"
          >
            <polygon
              points="50,2 93,25 93,75 50,98 7,75 7,25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        );
      })}
    </div>
  );
}

export default function LandingView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logoSrc = import.meta.env.BASE_URL + 'cosmowarp-logo-white.svg';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen relative text-white" style={{ background: '#000' }}>

      {/* ─── Header ─────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">
          {/* Logo + name */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 cursor-pointer">
            <img src={logoSrc} alt="Cosmowarp" className="w-8 h-8" />
            <span className="text-base font-bold tracking-wider opacity-90 hidden sm:inline">COSMORARE</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm opacity-70">
            <button onClick={() => scrollTo('concept')} className="hover:opacity-100 transition-opacity cursor-pointer">Concept</button>
            <button onClick={() => scrollTo('publier')} className="hover:opacity-100 transition-opacity cursor-pointer">Publier</button>
            <button onClick={() => scrollTo('collectionner')} className="hover:opacity-100 transition-opacity cursor-pointer">Collectionner</button>
            <button onClick={() => scrollTo('protocole')} className="hover:opacity-100 transition-opacity cursor-pointer">Protocole</button>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-4 py-2 text-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer hidden sm:block"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('wallet')}
              className="px-5 py-2 text-sm font-bold cursor-pointer transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              Sign Up
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center cursor-pointer opacity-70"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen
                  ? <path d="M6 6l12 12M18 6L6 18" />
                  : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-3 text-sm opacity-80" style={{ background: 'rgba(0,0,0,0.95)' }}>
            <button onClick={() => scrollTo('concept')} className="text-left py-2 cursor-pointer hover:opacity-100">Concept</button>
            <button onClick={() => scrollTo('publier')} className="text-left py-2 cursor-pointer hover:opacity-100">Publier</button>
            <button onClick={() => scrollTo('collectionner')} className="text-left py-2 cursor-pointer hover:opacity-100">Collectionner</button>
            <button onClick={() => scrollTo('protocole')} className="text-left py-2 cursor-pointer hover:opacity-100">Protocole</button>
            <button onClick={() => { onNavigate('wallet'); }} className="text-left py-2 cursor-pointer hover:opacity-100">Sign In</button>
          </div>
        )}
      </header>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HexGrid />
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.12) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.08) 0%, transparent 50%)',
        }} />

        <div className="relative text-center px-4 sm:px-8 max-w-3xl mx-auto">
          <img src={logoSrc} alt="Cosmowarp" className="w-20 sm:w-28 h-20 sm:h-28 mx-auto mb-8 animate-float" />
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold font-title mb-4 tracking-wide">
            {'コスモレア'}
          </h1>
          <p className="text-lg sm:text-xl opacity-50 mb-2 tracking-[0.3em] uppercase">
            Cosmorare
          </p>
          <p className="text-base sm:text-lg opacity-70 font-bold mb-3">
            Protocole de certification pour oeuvres rares
          </p>
          <p className="text-sm sm:text-base opacity-40 max-w-xl mx-auto mb-10 leading-relaxed">
            Publiez, certifiez et collectionnez des oeuvres numériques et physiques.
            Chaque objet reçoit un certificat d'authenticité infalsifiable sur le réseau Cosmorare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-4 text-base font-bold cursor-pointer transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {wallet ? '◈ Mon Espace' : '⬡ Créer un compte'}
            </button>
            <button
              onClick={() => scrollTo('concept')}
              className="px-8 py-4 text-base opacity-60 cursor-pointer transition-all hover:opacity-100"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              En savoir plus ↓
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30 animate-float">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ─── Concept ────────────────────────────────────── */}
      <section id="concept" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">Concept</p>
          <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-4">
            C'est quoi Cosmorare ?
          </h2>
          <p className="text-sm sm:text-base opacity-40 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
            Cosmorare est une plateforme qui permet de <strong className="opacity-80">certifier l'authenticité</strong> d'oeuvres rares,
            numériques ou physiques, grâce à un protocole cryptographique décentralisé.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: '⬡',
                title: 'Certifier',
                desc: 'Chaque oeuvre reçoit un certificat CRCERT : empreinte SHA-256, signature Ed25519 du créateur, horodatage. Infalsifiable et vérifiable par tous.',
              },
              {
                icon: '◈',
                title: 'Publier',
                desc: 'Publiez vos créations — art numérique, photo, musique, objets physiques. Votre certificat prouve que vous en êtes l\'auteur et le premier propriétaire.',
              },
              {
                icon: '◎',
                title: 'Échanger',
                desc: 'Achetez et vendez des oeuvres certifiées en toute confiance. Le certificat suit l\'objet et prouve son origine. Paiement en Warps (Ω) ou en euros.',
              },
            ].map(card => (
              <div
                key={card.title}
                className="p-6 sm:p-8 transition-all hover:translate-y-[-2px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-3xl block mb-4 opacity-60">{card.icon}</span>
                <h3 className="text-lg font-bold opacity-90 mb-3">{card.title}</h3>
                <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Publier ────────────────────────────────────── */}
      <section id="publier" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-label tracking-[0.3em] opacity-30 mb-3">Pour les créateurs</p>
              <h2 className="text-2xl sm:text-4xl font-bold font-title mb-6">
                Publiez vos oeuvres
              </h2>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Créez votre profil', desc: 'Un nom d\'utilisateur et un mot de passe suffisent. Cosmorare génère votre clé cryptographique Ed25519. Aucun email requis.' },
                  { step: '02', title: 'Uploadez votre oeuvre', desc: 'Photo, vidéo, illustration, musique, objet 3D — tout format est accepté. Ajoutez un titre, une description et un prix.' },
                  { step: '03', title: 'Certification automatique', desc: 'Cosmorare calcule l\'empreinte SHA-256 du fichier et la signe avec votre clé privée. Le certificat CRCERT est créé instantanément.' },
                  { step: '04', title: 'Mise en vente', desc: 'Votre oeuvre apparaît sur la marketplace. Les collectionneurs peuvent l\'acheter en Warps (Ω) ou via la passerelle de paiement en euros.' },
                ].map(s => (
                  <div key={s.step} className="flex gap-4">
                    <span className="text-2xl font-bold opacity-15 shrink-0 w-10 text-right">{s.step}</span>
                    <div>
                      <h3 className="text-base font-bold opacity-90 mb-1">{s.title}</h3>
                      <p className="text-sm opacity-40 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onNavigate('gallery')}
                className="mt-8 px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Publier une oeuvre →
              </button>
            </div>

            {/* Visual placeholder — hexagon card */}
            <div className="relative flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 70%)',
              }} />
              <div className="relative p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg className="w-20 h-20 mx-auto mb-4 opacity-20" viewBox="0 0 100 100">
                  <polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill="none" stroke="currentColor" strokeWidth="2" />
                  <polygon points="50,18 78,33 78,67 50,82 22,67 22,33" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
                <p className="text-lg font-bold opacity-60 mb-1">CRCERT</p>
                <p className="text-xs opacity-30 font-mono">SHA-256 · Ed25519 · Horodaté</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <span className="px-2 py-1 text-[10px] opacity-40" style={{ background: 'rgba(255,255,255,0.05)' }}>Signé</span>
                  <span className="px-2 py-1 text-[10px] opacity-40" style={{ background: 'rgba(255,255,255,0.05)' }}>Vérifié</span>
                  <span className="px-2 py-1 text-[10px] opacity-40" style={{ background: 'rgba(255,255,255,0.05)' }}>Infalsifiable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Collectionner ──────────────────────────────── */}
      <section id="collectionner" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">Pour les collectionneurs</p>
          <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-4">
            Collectionnez des oeuvres certifiées
          </h2>
          <p className="text-sm sm:text-base opacity-40 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
            Explorez la marketplace, découvrez des créateurs, et constituez votre collection
            d'oeuvres authentifiées par le protocole Cosmorare.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '\u{1F50D}', title: 'Explorer', desc: 'Parcourez la marketplace et découvrez des oeuvres de créateurs du monde entier.' },
              { icon: '\u{1F4B3}', title: 'Acheter', desc: 'Payez en Warps (Ω) ou en euros via la passerelle de paiement intégrée.' },
              { icon: '\u{1F512}', title: 'Posséder', desc: 'Chaque achat transfère le certificat CRCERT sur votre wallet. Vous êtes le propriétaire vérifié.' },
              { icon: '\u{1F4E4}', title: 'Revendre', desc: 'Mettez vos oeuvres en vente à tout moment. Le certificat suit l\'objet et prouve la chaîne de propriété.' },
            ].map(card => (
              <div
                key={card.title}
                className="p-5 sm:p-6 transition-all hover:translate-y-[-2px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-2xl block mb-3">{card.icon}</span>
                <h3 className="text-base font-bold opacity-90 mb-2">{card.title}</h3>
                <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => onNavigate('gallery')}
              className="px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Explorer la marketplace →
            </button>
          </div>
        </div>
      </section>

      {/* ─── Quels objets ? ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold font-title text-center mb-10">
            Quels objets certifier ?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: '\u{1F3A8}', label: 'Art numérique', desc: 'Illustrations, 3D, photo' },
              { icon: '\u{1F3B5}', label: 'Musique', desc: 'Albums, singles, remixes' },
              { icon: '\u{1F3B4}', label: 'Cartes', desc: 'Pokemon, Magic, Yu-Gi-Oh' },
              { icon: '\u{1F45F}', label: 'Sneakers', desc: 'Nike, Adidas, Jordan' },
              { icon: '⌚', label: 'Montres', desc: 'Rolex, Omega, Seiko' },
              { icon: '\u{1F3B5}', label: 'Vinyles', desc: 'Pressages limités' },
            ].map(item => (
              <div
                key={item.label}
                className="p-4 text-center transition-all hover:translate-y-[-2px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-2xl block mb-2">{item.icon}</span>
                <p className="text-sm font-bold opacity-80">{item.label}</p>
                <p className="text-[10px] opacity-30 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Protocole ──────────────────────────────────── */}
      <section id="protocole" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">Technologie</p>
          <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-12">
            Le Protocole Cosmorare
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: '✦',
                title: 'Certificat CRCERT',
                desc: 'Empreinte SHA-256 du contenu + signature Ed25519 du créateur + horodatage. Impossible à falsifier, vérifiable par tous.',
              },
              {
                icon: '◎',
                title: 'CosmoMesh — Réseau en graphe',
                desc: 'Un graphe acyclique dirigé (DAG) à 7 couches de validation parallèles. Chaque transaction en valide deux autres.',
              },
              {
                icon: '⚿',
                title: 'Cryptographie de pointe',
                desc: 'Signatures Ed25519, hachage SHA-256, chiffrement AES-GCM. Les mêmes standards que Signal et Tor.',
              },
              {
                icon: '⚛',
                title: 'Tokenomics équitable',
                desc: 'Le token Warp (Ω) a une offre fixe de 69M. Les récompenses de minage suivent le nombre d\'or (φ).',
              },
            ].map(card => (
              <div
                key={card.title}
                className="p-6 sm:p-8 transition-all hover:translate-y-[-2px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-2xl block mb-3 opacity-60">{card.icon}</span>
                <h3 className="text-lg font-bold opacity-90 mb-2">{card.title}</h3>
                <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: '69M', label: 'Supply totale' },
            { value: 'φ', label: 'Ratio d\'or (minage)' },
            { value: '7', label: 'Couches du réseau' },
            { value: '∞', label: 'Offline + Online' },
          ].map(s => (
            <div
              key={s.label}
              className="p-6 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-3xl sm:text-4xl font-bold opacity-80">{s.value}</p>
              <p className="text-[11px] opacity-30 mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-36 px-4 sm:px-8 overflow-hidden">
        <HexGrid />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.1) 0%, transparent 60%)',
        }} />
        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold font-title mb-4">
            Prêt à certifier vos trésors ?
          </h2>
          <p className="text-sm sm:text-base opacity-40 mb-8 leading-relaxed">
            Créez votre compte en 10 secondes. Pas d'email, pas de tiers. Juste vous et le protocole.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-4 text-base font-bold cursor-pointer transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {wallet ? '◈ Mon Espace' : '⬡ Sign Up — Créer un compte'}
            </button>
            <button
              onClick={() => onNavigate('whitepaper')}
              className="px-8 py-4 text-base opacity-50 cursor-pointer transition-all hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Lire le White Paper
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Cosmowarp" className="w-6 h-6 opacity-40" />
            <span className="text-xs opacity-30">Cosmorare Foundation ⬡ — Protocole de certification pour oeuvres rares</span>
          </div>
          <div className="flex gap-4 text-xs opacity-30">
            <button onClick={() => onNavigate('whitepaper')} className="hover:opacity-80 cursor-pointer">White Paper</button>
            <button onClick={() => onNavigate('legals')} className="hover:opacity-80 cursor-pointer">Légal</button>
            <button onClick={() => onNavigate('privacy')} className="hover:opacity-80 cursor-pointer">Confidentialité</button>
            <button onClick={() => onNavigate('help')} className="hover:opacity-80 cursor-pointer">Aide</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
