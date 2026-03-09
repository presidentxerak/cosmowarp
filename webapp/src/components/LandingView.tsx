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
            {'\u30B3\u30B9\u30E2\u30E9\u30EC'}
          </h1>
          <p className="text-base sm:text-lg opacity-60 mb-2">
            Cosmorare
          </p>
          <p className="text-base sm:text-lg opacity-80 font-bold mb-2">
            Protocole de certification pour objets rares
          </p>
          <p className="text-base opacity-50 max-w-lg mx-auto mb-8 leading-relaxed">
            Chaque objet rare m&eacute;rite une preuve d'authenticit&eacute; infalsifiable.
            {' '}Cosmorare est une plateforme qui certifie, prot&egrave;ge et permet l'&eacute;change d'objets rares — num&eacute;riques ou physiques — gr&acirc;ce au Protocole Cosmorare.
          </p>
          <button
            onClick={() => onNavigate('wallet')}
            className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer"
          >
            {wallet ? '\u25C8 Mon Espace' : '\u25C8 Commencer'}
          </button>
        </div>
      </div>

      {/* ─── C'est quoi Cosmorare ? ─────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u2753'} C'est quoi Cosmorare ?
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">En 30 secondes, tout comprendre</p>
        <div className="p-4 bg-current/5 border border-current/5 mb-4">
          <p className="text-base opacity-70 leading-relaxed">
            <strong>Cosmorare</strong> est une application qui permet de <strong>certifier l'authenticit&eacute;</strong> de n'importe quel objet rare.
            Que ce soit une carte Pokemon, une sneaker limit&eacute;e, un vinyle d'&eacute;poque, une oeuvre d'art num&eacute;rique ou un objet de collection —
            Cosmorare cr&eacute;e un <strong>certificat d'authenticit&eacute; infalsifiable</strong> (CRCERT) li&eacute; &agrave; cet objet.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '\u{1F50F}',
              title: 'Certifier',
              desc: 'Cr\u00e9ez un certificat d\'authenticit\u00e9 li\u00e9 \u00e0 votre objet. Ce certificat est sign\u00e9 cryptographiquement avec votre cl\u00e9 priv\u00e9e : personne ne peut le falsifier.',
            },
            {
              icon: '\u{1F4F1}',
              title: 'Offline + Online',
              desc: 'L\'app fonctionne m\u00eame sans internet. Vos certificats, votre wallet, vos objets restent accessibles partout, tout le temps. Reconnexion automatique.',
            },
            {
              icon: '\u{1F4B0}',
              title: '\u00c9changer',
              desc: 'Achetez et vendez des objets certifi\u00e9s en toute confiance. Le certificat suit l\'objet et prouve son origine. Paiement int\u00e9gr\u00e9 par carte, PayPal ou virement.',
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
          {'\u2B21'} Le Protocole Cosmorare
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">La technologie derri&egrave;re chaque certificat</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: '\u2726',
              title: 'Certificat CRCERT',
              desc: 'Chaque objet re\u00e7oit un certificat unique : empreinte SHA-256 du contenu + signature Ed25519 du cr\u00e9ateur + horodatage. Impossible \u00e0 falsifier, v\u00e9rifiable par tous.',
            },
            {
              icon: '\u25CE',
              title: 'CosmoMesh — R\u00e9seau en graphe',
              desc: 'Un graphe acyclique dirig\u00e9 (DAG) \u00e0 7 couches de validation parall\u00e8les. Pas de blocage, pas de file d\'attente. Chaque transaction en valide deux autres.',
            },
            {
              icon: '\u26BF',
              title: 'Cryptographie certifi\u00e9e',
              desc: 'Signatures Ed25519, hachage SHA-256, chiffrement AES-GCM. Les m\u00eames standards que Signal et Tor. Aucun raccourci.',
            },
            {
              icon: '\u269B',
              title: 'Tokenomics \u00e9quitable',
              desc: 'Le token Warp (\u03A9) a une offre fixe de 69M. Les r\u00e9compenses de minage suivent le nombre d\'or (\u03C6) — une courbe douce, sans halving brutal.',
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

      {/* ─── Comment \u00e7a marche ? ──────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-xl font-bold opacity-100 mb-2 font-title text-center">
          {'\u2699'} Comment \u00e7a marche ?
        </h2>
        <p className="text-body-sm opacity-40 text-center mb-6">4 \u00e9tapes pour commencer avec Cosmorare</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: '01', icon: '\u25C8', title: 'Cr\u00e9er un compte', desc: 'Choisissez un nom d\'utilisateur et un mot de passe. Cosmorare g\u00e9n\u00e8re votre cl\u00e9 Ed25519. Pas d\'email, pas de donn\u00e9es personnelles.', action: 'wallet' },
            { step: '02', icon: '\u26CF', title: 'Miner des Warps', desc: 'Gagnez des tokens Warps (\u03A9) en minant. Ces tokens servent \u00e0 certifier des objets et \u00e0 acheter sur la place de march\u00e9.', action: 'wallet' },
            { step: '03', icon: '\u2726', title: 'Certifier un objet', desc: 'Ajoutez une photo/vid\u00e9o de votre objet rare. Cosmorare cr\u00e9e un certificat CRCERT infalsifiable li\u00e9 \u00e0 cet objet.', action: 'gallery' },
            { step: '04', icon: '\u{1F4B3}', title: 'Acheter / Vendre', desc: 'Achetez des objets certifi\u00e9s en Warps ou en euros. Vendez les v\u00f4tres via la passerelle de paiement int\u00e9gr\u00e9e.', action: 'fiat-gateway' },
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
            { icon: '\u{1F3A8}', label: 'Art num\u00e9rique', desc: 'Illustrations, 3D, photo' },
            { icon: '\u{1F3B5}', label: 'Vinyles', desc: 'Pressages limit\u00e9s' },
            { icon: '\u231A', label: 'Montres', desc: 'Rolex, Omega, Seiko' },
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
          { value: '\u03C6', label: 'Ratio d\'or (minage)', color: 'opacity-80' },
          { value: '7', label: 'Couches du r\u00e9seau', color: 'opacity-80' },
          { value: '\u221E', label: 'Offline + Online', color: 'opacity-80' },
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
            Pr\u00eat \u00e0 certifier vos tr\u00e9sors ?
          </h2>
          <p className="text-base opacity-50 mb-6 max-w-md mx-auto">
            Cr\u00e9ez votre compte en 10 secondes. Pas d'email, pas de tiers. Juste vous et le protocole.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-3 bg-current/10 border border-current/20 opacity-80 font-bold text-base hover:bg-current/50 transition-all cursor-pointer"
            >
              {wallet ? '\u25C8 Mon Espace' : '\u2B21 Cr\u00e9er un compte'}
            </button>
            <button
              onClick={() => onNavigate('whitepaper')}
              className="px-8 py-3 bg-white/5 border border-current/10 opacity-70 text-base hover:bg-white/10 transition-all cursor-pointer"
            >
              {'\u2B21'} Lire le White Paper
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] opacity-30">
        Cosmorare Foundation {'\u2B21'} — Protocole de certification pour objets rares
      </p>
    </div>
  );
}
