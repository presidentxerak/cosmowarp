import { useWallet } from '../context/WalletContext';
import Logo from './Logo';

export default function LandingView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ─── Hero ──────────────────────────────────────────── */}
      <div className="glass-panel p-8 sm:p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{
          background: 'radial-gradient(circle at 20% 20%, #a855f7 0%, transparent 40%), radial-gradient(circle at 80% 80%, #06b6d4 0%, transparent 40%), radial-gradient(circle at 50% 50%, #f59e0b 0%, transparent 30%)',
        }} />
        <div className="relative">
          <Logo className="w-24 sm:w-32 h-24 sm:h-32 mx-auto mb-6 animate-float" />
          <h1 className="text-3xl sm:text-5xl font-bold opacity-100 mb-1 font-title">
            {'コスモラレ'}
          </h1>
          <p className="text-base sm:text-lg opacity-60 mb-2">
            Cosmorare
          </p>
          <p className="text-base sm:text-lg opacity-80 font-bold mb-2">
            Protocole de certification pour objets rares
          </p>
          <p className="text-base opacity-50 max-w-lg mx-auto mb-8 leading-relaxed">
            Chaque objet rare mérite une preuve d'authenticité infalsifiable.
            {' '}Cosmorare est une plateforme qui certifie, protège et permet l'échange d'objets rares — numériques ou physiques — grâce au Protocole Cosmorare.
          </p>
          <button
            onClick={() => onNavigate('wallet')}
            className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer"
          >
            {wallet ? '◈ Mon Espace' : '◈ Commencer'}
          </button>
        </div>
      </div>

      {/* ─── C'est quoi Cosmorare ? ─────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'❓'} C'est quoi Cosmorare ?
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">En 30 secondes, tout comprendre</p>
        <div className="p-4 bg-current/5 border border-current/5 mb-4">
          <p className="text-base opacity-70 leading-relaxed">
            <strong>Cosmorare</strong> est une application qui permet de <strong>certifier l'authenticité</strong> de n'importe quel objet rare.
            Que ce soit une carte Pokemon, une sneaker limitée, un vinyle d'époque, une oeuvre d'art numérique ou un objet de collection —
            Cosmorare crée un <strong>certificat d'authenticité infalsifiable</strong> (CRCERT) lié à cet objet.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '\u{1F50F}',
              title: 'Certifier',
              desc: 'Créez un certificat d\'authenticité lié à votre objet. Ce certificat est signé cryptographiquement avec votre clé privée : personne ne peut le falsifier.',
            },
            {
              icon: '\u{1F4F1}',
              title: 'Offline + Online',
              desc: 'L\'app fonctionne même sans internet. Vos certificats, votre wallet, vos objets restent accessibles partout, tout le temps. Reconnexion automatique.',
            },
            {
              icon: '\u{1F4B0}',
              title: 'Échanger',
              desc: 'Achetez et vendez des objets certifiés en toute confiance. Le certificat suit l\'objet et prouve son origine. Paiement intégré par carte, PayPal ou virement.',
            },
          ].map(card => (
            <div key={card.title} className="p-4 bg-current/5 border border-current/5">
              <span className="text-2xl block mb-2">{card.icon}</span>
              <h3 className="text-base font-bold opacity-80 mb-2">{card.title}</h3>
              <p className="text-body-sm opacity-50 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Le Protocole Cosmorare ──────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'⬡'} Le Protocole Cosmorare
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">La technologie derrière chaque certificat</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: '✦',
              title: 'Certificat CRCERT',
              desc: 'Chaque objet reçoit un certificat unique : empreinte SHA-256 du contenu + signature Ed25519 du créateur + horodatage. Impossible à falsifier, vérifiable par tous.',
            },
            {
              icon: '◎',
              title: 'CosmoMesh — Réseau en graphe',
              desc: 'Un graphe acyclique dirigé (DAG) à 7 couches de validation parallèles. Pas de blocage, pas de file d\'attente. Chaque transaction en valide deux autres.',
            },
            {
              icon: '⚿',
              title: 'Cryptographie certifiée',
              desc: 'Signatures Ed25519, hachage SHA-256, chiffrement AES-GCM. Les mêmes standards que Signal et Tor. Aucun raccourci.',
            },
            {
              icon: '⚛',
              title: 'Tokenomics équitable',
              desc: 'Le token Warp (Ω) a une offre fixe de 69M. Les récompenses de minage suivent le nombre d\'or (φ) — une courbe douce, sans halving brutal.',
            },
          ].map(card => (
            <div key={card.title} className="p-4 bg-current/5 border border-current/5">
              <span className="text-2xl block mb-2 opacity-80">{card.icon}</span>
              <h3 className="text-base font-bold opacity-80 mb-2">{card.title}</h3>
              <p className="text-body-sm opacity-50 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Comment ça marche ? ──────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'⚙'} Comment ça marche ?
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">4 étapes pour commencer avec Cosmorare</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '01', icon: '◈', title: 'Créer un compte', desc: 'Choisissez un nom d\'utilisateur et un mot de passe. Cosmorare génère votre clé Ed25519. Pas d\'email, pas de données personnelles.', action: 'wallet' },
            { step: '02', icon: '⛏', title: 'Miner des Warps', desc: 'Gagnez des tokens Warps (Ω) en minant. Ces tokens servent à certifier des objets et à acheter sur la place de marché.', action: 'wallet' },
            { step: '03', icon: '✦', title: 'Certifier un objet', desc: 'Ajoutez une photo/vidéo de votre objet rare. Cosmorare crée un certificat CRCERT infalsifiable lié à cet objet.', action: 'gallery' },
            { step: '04', icon: '\u{1F4B3}', title: 'Acheter / Vendre', desc: 'Achetez des objets certifiés en Warps ou en euros. Vendez les vôtres via la passerelle de paiement intégrée.', action: 'fiat-gateway' },
          ].map(s => (
            <button
              key={s.step}
              onClick={() => onNavigate(s.action)}
              className="p-4 bg-current/5 border border-current/5 text-left hover:bg-current/5 hover:border-current/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl opacity-30 group-hover:opacity-80 transition-opacity">{s.step}</span>
                <span className="text-xl">{s.icon}</span>
              </div>
              <h3 className="text-base font-bold opacity-90 mb-1">{s.title}</h3>
              <p className="text-[11px] opacity-40 leading-relaxed">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Exemples d'objets ─────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u{1F48E}'} Quels objets certifier ?
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">Cosmorare fonctionne pour tout type d'objet rare</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: '\u{1F3B4}', label: 'Cartes', desc: 'Pokemon, Magic, Yu-Gi-Oh' },
            { icon: '\u{1F45F}', label: 'Sneakers', desc: 'Nike, Adidas, Jordan' },
            { icon: '\u{1F3A8}', label: 'Art numérique', desc: 'Illustrations, 3D, photo' },
            { icon: '\u{1F3B5}', label: 'Vinyles', desc: 'Pressages limités' },
            { icon: '⌚', label: 'Montres', desc: 'Rolex, Omega, Seiko' },
            { icon: '\u{1F393}', label: 'Et plus...', desc: 'Tout objet de collection' },
          ].map(item => (
            <div
              key={item.label}
              className="p-3 bg-current/5 border border-current/5 text-center"
            >
              <span className="text-xl block mb-1">{item.icon}</span>
              <p className="text-body-sm font-bold opacity-90">{item.label}</p>
              <p className="text-[10px] opacity-40">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: '69M', label: 'Supply totale', color: 'opacity-80' },
          { value: 'φ', label: 'Ratio d\'or (minage)', color: 'opacity-80' },
          { value: '7', label: 'Couches du réseau', color: 'opacity-80' },
          { value: '∞', label: 'Offline + Online', color: 'opacity-80' },
        ].map(s => (
          <div key={s.label} className="glass-panel p-4 text-center">
            <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] opacity-40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── CTA ───────────────────────────────────────────── */}
      <div className="glass-panel p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 50% 50%, #a855f7 0%, transparent 60%)',
        }} />
        <div className="relative">
          <h2 className="text-xl sm:text-2xl font-bold opacity-100 mb-3 font-title">
            Prêt à certifier vos trésors ?
          </h2>
          <p className="text-base opacity-50 mb-6 max-w-md mx-auto">
            Créez votre compte en 10 secondes. Pas d'email, pas de tiers. Juste vous et le protocole.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer"
            >
              {wallet ? '◈ Mon Espace' : '⬡ Créer un compte'}
            </button>
            <button
              onClick={() => onNavigate('whitepaper')}
              className="px-8 py-3 bg-white/5 border border-current/10 opacity-70 text-base hover:bg-white/10 transition-all cursor-pointer"
            >
              {'⬡'} Lire le White Paper
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] opacity-30">
        Cosmorare Foundation {'⬡'} — Protocole de certification pour objets rares
      </p>
    </div>
  );
}
