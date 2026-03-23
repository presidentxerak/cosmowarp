import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';

/* ─── i18n — auto-detect user language ───────────────── */

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    concept: 'Concept',
    publish: 'Créer',
    collect: 'Collectionner',
    protocol: 'Confiance',
    signIn: 'Se connecter',
    signUp: 'S\'inscrire',
    heroSubtitle: 'Découvrez, achetez et collectionnez des oeuvres d\'art uniques',
    heroDesc: 'Une plateforme sociale pour l\'art et les objets de collection. Achetez en un clic par carte bancaire, connectez-vous directement avec les artistes, et revendez à tout moment.',
    mySpace: 'Mon Espace',
    createAccount: 'Créer un compte',
    learnMore: 'En savoir plus',
    conceptTitle: 'C\'est quoi Strangrz ?',
    conceptDesc: 'Strangrz est une plateforme sociale pour l\'art et les objets de collection. Cartes Pokémon, sneakers, vinyles, montres, art numérique : découvrez, achetez et revendez des pièces uniques, certifiées et authentifiées automatiquement.',
    conceptDesc2: 'Chaque oeuvre publiée reçoit un certificat d\'authenticité infalsifiable (STCERT). Ce certificat garantit l\'origine, l\'auteur et la provenance — sans aucune manipulation technique de votre part.',
    conceptDesc3: 'Payez par carte bancaire, Apple Pay ou Google Pay. L\'artiste reçoit ses revenus directement. Strangrz gère la certification, les royalties et la traçabilité en arrière-plan.',
    certify: 'Authentifié',
    certifyDesc: 'Chaque oeuvre reçoit un certificat d\'authenticité (STCERT) : empreinte numérique unique, signature du créateur, horodatage. Infalsifiable et vérifiable par tous.',
    publishTitle: 'Publier',
    publishDesc: 'Publiez vos créations — art numérique, photos, musique, objets physiques. Votre certificat prouve que vous en êtes l\'auteur et le premier propriétaire.',
    exchange: 'Échanger',
    exchangeDesc: 'Achetez et vendez des oeuvres certifiées en toute confiance. Paiement par carte bancaire en euros — la plateforme gère le reste.',
    forCreators: 'Pour les créateurs',
    publishWorks: 'Publiez vos oeuvres',
    step1: 'Créez votre profil',
    step1Desc: 'Un nom d\'utilisateur et un mot de passe suffisent. Aucun email requis. Commencez à publier en moins de 30 secondes.',
    step2: 'Uploadez votre oeuvre',
    step2Desc: 'Photo, vidéo, illustration, musique, objet 3D — tout format est accepté. Ajoutez un titre, une description et un prix.',
    step3: 'Certification automatique',
    step3Desc: 'Strangrz génère automatiquement un certificat d\'authenticité infalsifiable. Votre oeuvre est protégée et vérifiable instantanément.',
    step4: 'Mise en vente',
    step4Desc: 'Votre oeuvre apparaît sur la plateforme avec un prix en euros. Les acheteurs paient par carte bancaire. Vous recevez vos euros directement.',
    publishWork: 'Publier une oeuvre',
    forCollectors: 'Pour les collectionneurs',
    collectCertified: 'Collectionnez des oeuvres uniques',
    collectDesc: 'Explorez la galerie, découvrez des artistes, et constituez votre collection d\'oeuvres authentifiées.',
    explore: 'Explorer',
    exploreDesc: 'Parcourez la galerie et découvrez des oeuvres d\'artistes du monde entier.',
    buy: 'Acheter',
    buyDesc: 'Payez par carte bancaire en euros. La plateforme transfère la propriété et verse les royalties automatiquement.',
    own: 'Posséder',
    ownDesc: 'Chaque achat vous rend propriétaire vérifié de l\'oeuvre. Votre collection est sécurisée et accessible partout.',
    resell: 'Revendre',
    resellDesc: 'Mettez vos oeuvres en vente à tout moment. Le certificat suit l\'objet et prouve la chaîne de propriété.',
    exploreMarketplace: 'Explorer la galerie',
    forCurators: 'Pour les curateurs',
    curateTitle: 'Devenez Curateur',
    curateDesc: 'Collectionnez 10 oeuvres et devenez Curateur. Créez des articles éditoriaux, mettez en valeur des artistes et partagez vos collections comme un magazine d\'art.',
    curateStep1: 'Collectionnez',
    curateStep1Desc: 'Achetez 10 oeuvres certifiées pour débloquer le statut Curateur et le badge doré sur votre profil.',
    curateStep2: 'Curatez',
    curateStep2Desc: 'Créez des articles, mettez en avant des artistes et des collections. Partagez votre vision artistique.',
    curateStep3: 'Influencez',
    curateStep3Desc: 'Vos sélections apparaissent dans le magazine Curate. Devenez une référence dans l\'univers Strangrz.',
    tradingTitle: 'Marché secondaire',
    tradingDesc: 'Suivez les prix, les tendances et les ventes en temps réel. Gérez votre collection comme un portfolio et revendez vos oeuvres à tout moment.',
    whatObjects: 'Quels objets ?',
    digitalArt: 'Art numérique',
    digitalArtDesc: 'Illustrations, 3D, photo',
    music: 'Musique',
    musicDesc: 'Albums, singles, remixes',
    cards: 'Cartes',
    cardsDesc: 'Pokemon, Magic, Yu-Gi-Oh',
    sneakers: 'Sneakers',
    sneakersDesc: 'Nike, Adidas, Jordan',
    watches: 'Montres',
    watchesDesc: 'Rolex, Omega, Seiko',
    vinyl: 'Vinyles',
    vinylDesc: 'Pressages limités',
    technology: 'Confiance',
    protocolTitle: 'Comment ça marche ?',
    crcert: 'Certificat d\'authenticité',
    crcertDesc: 'Chaque oeuvre reçoit un certificat unique et infalsifiable : empreinte numérique du contenu, signature du créateur, horodatage. Vérifiable par tous, impossible à falsifier.',
    strangrmesh: 'Infrastructure haute performance',
    strangrmeshDesc: 'Un réseau de validation à 7 couches parallèles qui garantit des transactions instantanées et une fiabilité maximale.',
    crypto: 'Sécurité de niveau bancaire',
    cryptoDesc: 'Signatures numériques, chiffrement de bout en bout, et les mêmes standards de sécurité que Signal et les applications bancaires.',
    tokenomics: 'Royalties automatiques',
    tokenomicsDesc: 'Les artistes reçoivent 5% de royalties sur chaque revente. Un revenu passif à vie, géré automatiquement par la plateforme.',
    vobjct: 'Protection des oeuvres',
    vobjctDesc: 'Chaque oeuvre est protégée par un manifeste de sécurité : vérification d\'intégrité, stockage multi-couches, monitoring actif et réparation automatique. Vos oeuvres sont permanentes.',
    totalSupply: 'Artistes actifs',
    goldenRatio: 'Royalties à vie',
    layers: 'De sécurité',
    offlineOnline: 'Fonctionne partout',
    whyNotFree: 'Pourquoi l\'art a un prix sur Strangrz',
    whyNotFreeDesc: 'Un écosystème durable pour les créateurs et les collectionneurs',
    whyArg1Title: 'Valoriser la création',
    whyArg1Desc: 'Prix minimum de 10€ par oeuvre. Chaque création mérite un prix qui respecte le travail de l\'artiste.',
    whyArg2Title: 'Économie circulaire',
    whyArg2Desc: 'Royalties de 5% à chaque revente. Les artistes gagnent à vie sur leur oeuvre.',
    whyArg3Title: 'Anti-spam, pro-qualité',
    whyArg3Desc: 'Le prix plancher filtre le bruit et garantit une galerie de qualité pour les collectionneurs.',
    whyArg4Title: 'Impact écologique minimal',
    whyArg4Desc: '~0.001 Wh par transaction. 99.9% plus efficace que les plateformes traditionnelles. Zéro gaspillage.',
    whyCompare: 'Comparatif',
    whyCompareStrangrz: 'Strangrz',
    whyCompareEth: 'Marketplaces classiques',
    whyCompareTezos: 'Galeries en ligne',
    whyCompareSolana: 'Réseaux sociaux',
    whyMintCost: 'Frais de publication',
    whyMinPrice: 'Prix min. vente',
    whyEnergy: 'Énergie/transaction',
    whyCo2: 'Certificat d\'authenticité',
    whyOnChain: 'Royalties automatiques',
    whyFiat: 'Paiement par carte',
    howPaymentWorks: 'Comment fonctionne l\'achat ?',
    howPaymentDesc: 'Payez en euros, la plateforme s\'occupe du reste',
    howPayStep1: 'Vous payez en euros',
    howPayStep1Desc: 'Carte bancaire, Apple Pay ou Google Pay. Paiement sécurisé par Stripe.',
    howPayStep2: 'Certification automatique',
    howPayStep2Desc: 'Le certificat d\'authenticité est généré et transféré à votre compte instantanément. Infalsifiable.',
    howPayStep3: 'Le créateur est payé',
    howPayStep3Desc: 'Le vendeur reçoit ses euros sur son compte bancaire. Les royalties (5%) sont versées au créateur original.',
    howPayStep4: 'Provenance garantie',
    howPayStep4Desc: 'Chaque revente est tracée automatiquement. Le certificat suit l\'oeuvre pour toujours.',
    ctaTitle: 'Prêt à découvrir ?',
    ctaDesc: 'Créez votre compte en 10 secondes. Commencez à explorer, acheter et collectionner des oeuvres uniques.',
    ctaSignUp: 'Créer un compte gratuit',
    readWhitepaper: 'En savoir plus',
    footer: 'Strangrz — Plateforme sociale pour l\'art et les objets de collection',
    whitePaper: 'À propos',
    legal: 'Légal',
    privacy: 'Confidentialité',
    help: 'Aide',
  },
  en: {
    concept: 'Concept',
    publish: 'Create',
    collect: 'Collect',
    protocol: 'Trust',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    heroSubtitle: 'Discover, buy and collect unique artworks',
    heroDesc: 'A social platform for art and collectibles. Buy in one click with your credit card, connect directly with artists, and resell anytime.',
    mySpace: 'My Space',
    createAccount: 'Create Account',
    learnMore: 'Learn More',
    conceptTitle: 'What is Strangrz?',
    conceptDesc: 'Strangrz is a social platform for art and collectibles. Pokémon cards, sneakers, vinyl records, watches, digital art: discover, buy and resell unique pieces, automatically certified and authenticated.',
    conceptDesc2: 'Every published work receives a tamper-proof certificate of authenticity (STCERT). This certificate guarantees origin, authorship and provenance — without any technical effort on your part.',
    conceptDesc3: 'Pay by credit card, Apple Pay or Google Pay. The artist receives their earnings directly. Strangrz handles certification, royalties and traceability behind the scenes.',
    certify: 'Authenticated',
    certifyDesc: 'Each work receives a certificate of authenticity (STCERT): unique digital fingerprint, creator signature, timestamp. Tamper-proof and verifiable by all.',
    publishTitle: 'Publish',
    publishDesc: 'Publish your creations — digital art, photos, music, physical objects. Your certificate proves you are the author and first owner.',
    exchange: 'Exchange',
    exchangeDesc: 'Buy and sell certified works with confidence. Pay by credit card in euros — the platform handles the rest.',
    forCreators: 'For creators',
    publishWorks: 'Publish your works',
    step1: 'Create your profile',
    step1Desc: 'A username and password is all you need. No email required. Start publishing in under 30 seconds.',
    step2: 'Upload your work',
    step2Desc: 'Photo, video, illustration, music, 3D object — all formats are accepted. Add a title, description and price.',
    step3: 'Automatic certification',
    step3Desc: 'Strangrz automatically generates a tamper-proof certificate of authenticity. Your work is protected and verifiable instantly.',
    step4: 'Listed for sale',
    step4Desc: 'Your work appears on the platform with a price in euros. Buyers pay by credit card. You receive your euros directly.',
    publishWork: 'Publish a work',
    forCollectors: 'For collectors',
    collectCertified: 'Collect unique works',
    collectDesc: 'Explore the gallery, discover artists, and build your collection of authenticated works.',
    explore: 'Explore',
    exploreDesc: 'Browse the gallery and discover works from artists worldwide.',
    buy: 'Buy',
    buyDesc: 'Pay by credit card in euros. The platform transfers ownership and pays royalties automatically.',
    own: 'Own',
    ownDesc: 'Each purchase makes you the verified owner. Your collection is secured and accessible anywhere.',
    resell: 'Resell',
    resellDesc: 'List your works for sale at any time. The certificate follows the object and proves the chain of ownership.',
    exploreMarketplace: 'Explore the gallery',
    forCurators: 'For curators',
    curateTitle: 'Become a Curator',
    curateDesc: 'Collect 10 artworks and unlock Curator status. Create editorial articles, highlight artists and share your curated collections like an art magazine.',
    curateStep1: 'Collect',
    curateStep1Desc: 'Buy 10 certified artworks to unlock Curator status and the golden badge on your profile.',
    curateStep2: 'Curate',
    curateStep2Desc: 'Write articles, feature artists and collections. Share your artistic vision with the community.',
    curateStep3: 'Influence',
    curateStep3Desc: 'Your selections appear in the Curate magazine. Become a tastemaker in the Strangrz universe.',
    tradingTitle: 'Secondary Market',
    tradingDesc: 'Track prices, trends and sales in real time. Manage your collection like a portfolio and resell your works anytime.',
    whatObjects: 'What can you collect?',
    digitalArt: 'Digital Art',
    digitalArtDesc: 'Illustrations, 3D, photo',
    music: 'Music',
    musicDesc: 'Albums, singles, remixes',
    cards: 'Cards',
    cardsDesc: 'Pokemon, Magic, Yu-Gi-Oh',
    sneakers: 'Sneakers',
    sneakersDesc: 'Nike, Adidas, Jordan',
    watches: 'Watches',
    watchesDesc: 'Rolex, Omega, Seiko',
    vinyl: 'Vinyl',
    vinylDesc: 'Limited pressings',
    technology: 'Trust',
    protocolTitle: 'How does it work?',
    crcert: 'Certificate of Authenticity',
    crcertDesc: 'Each work receives a unique and tamper-proof certificate: digital fingerprint of the content, creator signature, timestamp. Verifiable by all, impossible to forge.',
    strangrmesh: 'High-performance infrastructure',
    strangrmeshDesc: 'A 7-layer parallel validation network that guarantees instant transactions and maximum reliability.',
    crypto: 'Bank-grade security',
    cryptoDesc: 'Digital signatures, end-to-end encryption, and the same security standards as Signal and banking applications.',
    tokenomics: 'Automatic royalties',
    tokenomicsDesc: 'Artists receive 5% royalties on every resale. A lifetime passive income, managed automatically by the platform.',
    vobjct: 'Artwork protection',
    vobjctDesc: 'Every artwork is protected by a security manifest: integrity verification, multi-layer storage, active monitoring and automated repair. Your artworks are permanent.',
    totalSupply: 'Active artists',
    goldenRatio: 'Lifetime royalties',
    layers: 'Security layers',
    offlineOnline: 'Works everywhere',
    whyNotFree: 'Why art has a price on Strangrz',
    whyNotFreeDesc: 'A sustainable ecosystem for creators and collectors',
    whyArg1Title: 'Value creation',
    whyArg1Desc: 'Minimum price of \u20AC10 per work. Every creation deserves a price that respects the artist\'s work.',
    whyArg2Title: 'Circular economy',
    whyArg2Desc: '5% royalties on every resale. Artists earn for life on their work.',
    whyArg3Title: 'Anti-spam, pro-quality',
    whyArg3Desc: 'The price floor filters noise and guarantees a quality gallery for collectors.',
    whyArg4Title: 'Minimal ecological impact',
    whyArg4Desc: '~0.001 Wh per transaction. 99.9% more efficient than traditional platforms. Zero waste.',
    whyCompare: 'Comparison',
    whyCompareStrangrz: 'Strangrz',
    whyCompareEth: 'Traditional marketplaces',
    whyCompareTezos: 'Online galleries',
    whyCompareSolana: 'Social networks',
    whyMintCost: 'Publishing fee',
    whyMinPrice: 'Min. sale price',
    whyEnergy: 'Energy/transaction',
    whyCo2: 'Certificate of authenticity',
    whyOnChain: 'Automatic royalties',
    whyFiat: 'Card payment',
    howPaymentWorks: 'How does buying work?',
    howPaymentDesc: 'Pay in euros, the platform handles the rest',
    howPayStep1: 'You pay in euros',
    howPayStep1Desc: 'Credit card, Apple Pay or Google Pay. Secure payment powered by Stripe.',
    howPayStep2: 'Automatic certification',
    howPayStep2Desc: 'The certificate of authenticity is generated and transferred to your account instantly. Tamper-proof.',
    howPayStep3: 'The creator gets paid',
    howPayStep3Desc: 'The seller receives euros to their bank account. Royalties (5%) go to the original creator.',
    howPayStep4: 'Provenance guaranteed',
    howPayStep4Desc: 'Every resale is tracked automatically. The certificate follows the work forever.',
    ctaTitle: 'Ready to discover?',
    ctaDesc: 'Create your account in 10 seconds. Start exploring, buying and collecting unique artworks.',
    ctaSignUp: 'Create a free account',
    readWhitepaper: 'Learn more',
    footer: 'Strangrz — Social platform for art and collectibles',
    whitePaper: 'About',
    legal: 'Legal',
    privacy: 'Privacy',
    help: 'Help',
  },
};

function getUserLang(): string {
  const nav = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  const short = nav.split('-')[0].toLowerCase();
  if (short in TRANSLATIONS) return short;
  return 'en';
}

function useTranslation() {
  const [lang] = useState(() => getUserLang());
  const t = (key: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  };
  return { t, lang };
}

/* ─── SVG Icons (inline, design-quality) ─────────────── */

function IconCertify() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" />
      <path d="M12 16l3 3 5-6" />
    </svg>
  );
}

function IconPublish() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="24" height="24" rx="2" />
      <path d="M16 20V12M12 14l4-4 4 4" />
    </svg>
  );
}

function IconExchange() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10h20l-4-4M26 22H6l4 4" />
    </svg>
  );
}

function IconExplore() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="8" />
      <path d="M20 20l8 8" />
      <circle cx="14" cy="14" r="3" />
    </svg>
  );
}

function IconBuy() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="26" height="18" rx="2" />
      <path d="M3 14h26" />
      <path d="M8 20h4M18 20h6" />
    </svg>
  );
}

function IconOwn() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="14" width="16" height="14" rx="2" />
      <path d="M11 14V10a5 5 0 0 1 10 0v4" />
      <circle cx="16" cy="21" r="2" />
    </svg>
  );
}

function IconResell() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4v18M12 18l4 4 4-4" />
      <path d="M6 22v4h20v-4" />
      <path d="M24 10l3-3-3-3" />
    </svg>
  );
}

function IconDigitalArt() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="24" height="24" rx="2" />
      <circle cx="10" cy="10" r="3" />
      <path d="M26 20l-6-6-8 8" />
      <path d="M18 22l-4-4" />
    </svg>
  );
}

function IconMusic() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 22V8l12-4v14" />
      <circle cx="7" cy="22" r="3" />
      <circle cx="19" cy="18" r="3" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="16" height="22" rx="2" />
      <rect x="9" y="6" width="10" height="7" rx="1" />
      <path d="M11 18h6M11 21h3" />
    </svg>
  );
}

function IconSneakers() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h22v2H3z" />
      <path d="M3 20c0-3 2-5 4-7l2-3c1-1 3-1 4 0l1 1 2-1c2-1 5 0 7 2l2 3v5" />
      <path d="M8 16h3M14 14h4" />
    </svg>
  );
}

function IconWatches() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="9" />
      <circle cx="14" cy="14" r="7" />
      <path d="M14 9v5l3 3" />
      <path d="M11 3h6M11 25h6" />
    </svg>
  );
}

function IconVinyl() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="12" />
      <circle cx="14" cy="14" r="4" />
      <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      <path d="M14 2v2M14 24v2" />
    </svg>
  );
}

/* ─── Scroll-based reveal animation hook ─────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Interactive card with tilt effect ──────────────── */

function TiltCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    card.style.boxShadow = `${-x * 20}px ${y * 20}px 40px rgba(255,255,255,0.03)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = '';
    card.style.boxShadow = '';
  };

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

/* ─── Main Landing View ──────────────────────────────── */

export default function LandingView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [heroVideoNum] = useState(() => Math.floor(Math.random() * 3) + 1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const logoSrc = import.meta.env.BASE_URL + 'strangrz-logo-white.svg';

  // Safari video autoplay fix
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('x-webkit-airplay', 'allow');
    // Safari requires muted to be set before play() for autoplay policy
    v.muted = true;
    v.defaultMuted = true;
    // Safari may block autoplay; retry on user interaction
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
    // Safari sometimes needs a slight delay after mount
    const timer = setTimeout(tryPlay, 300);
    document.addEventListener('touchstart', tryPlay, { once: true });
    document.addEventListener('click', tryPlay, { once: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', tryPlay);
      document.removeEventListener('click', tryPlay);
    };
  }, []);

  // Parallax scroll tracking
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  // Header background opacity based on scroll
  const headerBgOpacity = Math.min(scrollY / 200, 0.9);

  return (
    <div className="min-h-screen relative text-white" style={{ background: '#000' }}>

      {/* ─── Promo Banner ────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] text-center py-1.5 px-3 text-[11px] font-medium tracking-wide"
        style={{
          background: 'linear-gradient(90deg, #d4af37, #e91e8c, #339af0, #51cf66, #d4af37)',
          backgroundSize: '300% 100%',
          animation: 'promoBannerScroll 6s linear infinite',
          color: '#000',
        }}
      >
        First 100 signups: 30{'\u20AC'} credit = 3 free artworks!
      </div>
      <style>{`@keyframes promoBannerScroll { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }`}</style>

      {/* ─── Header ─────────────────────────────────────── */}
      <header
        className="fixed top-[28px] left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: `rgba(0,0,0,${headerBgOpacity})`,
          backdropFilter: scrollY > 50 ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrollY > 50 ? 'blur(16px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">
          {/* Logo + name */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 cursor-pointer group">
            <img src={logoSrc} alt="Strangrz" className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-base font-bold tracking-wider opacity-90 hidden sm:inline font-logo uppercase">Strangrz</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { id: 'concept', label: t('concept') },
              { id: 'publier', label: t('publish') },
              { id: 'collectionner', label: t('collect') },
              { id: 'protocole', label: t('protocol') },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="px-4 py-2 opacity-50 hover:opacity-100 transition-all cursor-pointer relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-white/50 transition-all duration-300 group-hover:w-3/4" />
              </button>
            ))}
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-4 py-2 text-sm opacity-50 hover:opacity-100 transition-all cursor-pointer hidden sm:block"
            >
              {t('signIn')}
            </button>
            <button
              onClick={() => onNavigate('wallet')}
              className="px-5 py-2 text-sm font-bold cursor-pointer transition-all hover:bg-white/20 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {t('signUp')}
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
          <div
            className="md:hidden px-4 pb-4 flex flex-col gap-1 text-sm"
            style={{ background: 'rgba(0,0,0,0.95)', animation: 'slideDown 0.2s ease-out' }}
          >
            <button onClick={() => scrollTo('concept')} className="text-left py-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">{t('concept')}</button>
            <button onClick={() => scrollTo('publier')} className="text-left py-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">{t('publish')}</button>
            <button onClick={() => scrollTo('collectionner')} className="text-left py-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">{t('collect')}</button>
            <button onClick={() => scrollTo('protocole')} className="text-left py-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">{t('protocol')}</button>
            <div className="h-[1px] bg-white/10 my-2" />
            <button onClick={() => { onNavigate('wallet'); }} className="text-left py-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">{t('signIn')}</button>
          </div>
        )}
      </header>

      {/* ─── Hero with Video Background + Parallax ────── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video background with parallax */}
        <div
          className="absolute inset-0 w-full h-[120%] -top-[10%]"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ opacity: 0.35, filter: 'saturate(0.7) brightness(0.6)' }}
            autoPlay
            muted
            loop
            playsInline
            poster=""
          >
            <source src={`${import.meta.env.BASE_URL}strangrz-landing-hero-random-${heroVideoNum}.mp4`} type="video/mp4" />
          </video>
        </div>

        {/* Gradient overlays (reduced opacity) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.25) 100%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(168,85,247,0.06) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.05) 0%, transparent 50%)',
        }} />

        <div
          className="relative text-center px-4 sm:px-8 max-w-3xl mx-auto"
          style={{ transform: `translateY(${scrollY * -0.15}px)` }}
        >
          <img
            src={logoSrc}
            alt="Strangrz"
            className="w-20 sm:w-28 h-20 sm:h-28 mx-auto mb-8 animate-float"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))' }}
          />
          <h1
            className="text-title-xl sm:text-[4rem] lg:text-[5rem] font-bold font-logo mb-2 tracking-wide uppercase"
            style={{ textShadow: '0 0 60px rgba(255,255,255,0.1)' }}
          >
            Strangrz
          </h1>
          <p className="text-base sm:text-lg opacity-70 font-bold mb-3">
            {t('heroSubtitle')}
          </p>
          <p className="text-sm sm:text-base opacity-60 max-w-xl mx-auto mb-10 leading-relaxed">
            {t('heroDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('wallet')}
              className="px-8 py-4 text-base font-bold cta-gradient-btn"
            >
              {wallet ? t('mySpace') : t('createAccount')}
            </button>
            <button
              onClick={() => scrollTo('concept')}
              className="px-8 py-4 text-base opacity-60 cursor-pointer transition-all hover:opacity-100 hover:bg-white/5 active:scale-95"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {t('learnMore')} ↓
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-50 animate-bounce-slow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ─── Concept ────────────────────────────────────── */}
      <section id="concept" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-50 text-center mb-3">{t('concept')}</p>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-6">
              {t('conceptTitle')}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="max-w-3xl mx-auto mb-14 space-y-4">
              <p className="text-sm sm:text-base opacity-50 leading-relaxed">
                {t('conceptDesc')}
              </p>
              <p className="text-sm sm:text-base opacity-60 leading-relaxed">
                {t('conceptDesc2')}
              </p>
              <p className="text-sm sm:text-base opacity-60 leading-relaxed">
                {t('conceptDesc3')}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <IconCertify />, title: t('certify'), desc: t('certifyDesc') },
              { icon: <IconPublish />, title: t('publishTitle'), desc: t('publishDesc') },
              { icon: <IconExchange />, title: t('exchange'), desc: t('exchangeDesc') },
            ].map((card, i) => (
              <Reveal key={card.title} delay={0.1 + i * 0.1}>
                <TiltCard
                  className="p-6 sm:p-8 cursor-default landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="block mb-4 opacity-60 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-lg font-bold opacity-90 mb-3">{card.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{card.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Publier ────────────────────────────────────── */}
      <section id="publier" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <p className="text-label tracking-[0.3em] opacity-50 mb-3">{t('forCreators')}</p>
                <h2 className="text-title-lg sm:text-title-xl font-bold font-title mb-6">
                  {t('publishWorks')}
                </h2>
                <div className="space-y-6">
                  {[
                    { step: '01', title: t('step1'), desc: t('step1Desc') },
                    { step: '02', title: t('step2'), desc: t('step2Desc') },
                    { step: '03', title: t('step3'), desc: t('step3Desc') },
                    { step: '04', title: t('step4'), desc: t('step4Desc') },
                  ].map(s => (
                    <div key={s.step} className="flex gap-4 group">
                      <span className="text-2xl font-bold opacity-10 shrink-0 w-10 text-right group-hover:opacity-50 transition-opacity">{s.step}</span>
                      <div>
                        <h3 className="text-base font-bold opacity-90 mb-1">{s.title}</h3>
                        <p className="text-sm opacity-60 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="mt-8 px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:bg-white/12 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {t('publishWork')} →
                </button>
              </div>
            </Reveal>

            {/* Visual — hexagon card */}
            <Reveal delay={0.2}>
              <div className="relative flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.08) 0%, transparent 70%)',
                }} />
                <TiltCard
                  className="relative p-8 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-60" viewBox="0 0 100 100">
                    <polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill="none" stroke="currentColor" strokeWidth="2" />
                    <polygon points="50,18 78,33 78,67 50,82 22,67 22,33" fill="none" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  <p className="text-lg font-bold opacity-60 mb-1">STCERT</p>
                  <p className="text-xs opacity-50">Certificat d'authenticité</p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <span className="px-2 py-1 text-[10px] opacity-60" style={{ background: 'rgba(255,255,255,0.05)' }}>Signé</span>
                    <span className="px-2 py-1 text-[10px] opacity-60" style={{ background: 'rgba(255,255,255,0.05)' }}>Vérifié</span>
                    <span className="px-2 py-1 text-[10px] opacity-60" style={{ background: 'rgba(255,255,255,0.05)' }}>Permanent</span>
                  </div>
                </TiltCard>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Collectionner ──────────────────────────────── */}
      <section id="collectionner" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-50 text-center mb-3">{t('forCollectors')}</p>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-4">
              {t('collectCertified')}
            </h2>
            <p className="text-sm sm:text-base opacity-60 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
              {t('collectDesc')}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <IconExplore />, title: t('explore'), desc: t('exploreDesc') },
              { icon: <IconBuy />, title: t('buy'), desc: t('buyDesc') },
              { icon: <IconOwn />, title: t('own'), desc: t('ownDesc') },
              { icon: <IconResell />, title: t('resell'), desc: t('resellDesc') },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.1}>
                <TiltCard
                  className="p-5 sm:p-6 landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="block mb-3 opacity-60 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-base font-bold opacity-90 mb-2">{card.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{card.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="text-center mt-10">
              <button
                onClick={() => onNavigate('gallery')}
                className="px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:bg-white/12 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {t('exploreMarketplace')} →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Curation ──────────────────────────────────── */}
      <section id="curate" className="relative py-20 sm:py-32 px-4 sm:px-8" style={{ background: 'rgba(212,175,55,0.02)' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-50 text-center mb-3" style={{ color: '#d4af37' }}>{t('forCurators')}</p>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-4">
              {t('curateTitle')}
            </h2>
            <p className="text-base opacity-60 text-center max-w-2xl mx-auto mb-12">
              {t('curateDesc')}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: t('curateStep1'), desc: t('curateStep1Desc'), icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="14,2 26,8.5 26,19.5 14,26 2,19.5 2,8.5" /><path d="M14 10v8M10 14h8" /></svg> },
              { step: '02', title: t('curateStep2'), desc: t('curateStep2Desc'), icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 3.5l6 6L10 24H4v-6L18.5 3.5z" /><path d="M15 7l6 6" /></svg> },
              { step: '03', title: t('curateStep3'), desc: t('curateStep3Desc'), icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="14 2 17.09 9.26 25 10.27 19.5 15.14 20.82 23.02 14 19.27 7.18 23.02 8.5 15.14 3 10.27 10.91 9.26" /></svg> },
            ].map((card, i) => (
              <Reveal key={card.step} delay={i * 0.1}>
                <TiltCard
                  className="p-5 sm:p-6 landing-card group text-center"
                  style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.1)' }}
                >
                  <span className="text-[10px] tracking-[0.3em] opacity-60 block mb-3">{card.step}</span>
                  <span className="flex justify-center mb-3 opacity-60 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-base font-bold opacity-90 mb-2">{card.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{card.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="text-center mt-10">
              <button
                onClick={() => onNavigate('gallery')}
                className="px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:bg-white/12 active:scale-95"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37' }}
              >
                Explore Curate →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Trading Floor ───────────────────────────────── */}
      <section id="trading" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-50 text-center mb-3">MARKETPLACE</p>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-4">
              {t('tradingTitle')}
            </h2>
            <p className="text-base opacity-60 text-center max-w-2xl mx-auto mb-12">
              {t('tradingDesc')}
            </p>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ventes en direct', desc: 'Marché en temps réel', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></svg> },
              { label: 'Ma collection', desc: 'Suivez vos oeuvres', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg> },
              { label: 'Classements', desc: 'Artistes & Collections', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg> },
              { label: 'Activité', desc: 'Ventes récentes', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" /></svg> },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.05}>
                <TiltCard
                  className="p-4 text-center landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="flex justify-center mb-2 opacity-60 group-hover:opacity-70 transition-opacity">{item.icon}</span>
                  <p className="text-sm font-bold opacity-80">{item.label}</p>
                  <p className="text-[10px] opacity-50 mt-1">{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="text-center mt-10">
              <button
                onClick={() => onNavigate('gallery')}
                className="px-6 py-3 text-sm font-bold cursor-pointer transition-all hover:bg-white/12 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                Explorer le marché →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Quels objets ? ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-10">
              {t('whatObjects')}
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: <IconDigitalArt />, label: t('digitalArt'), desc: t('digitalArtDesc') },
              { icon: <IconMusic />, label: t('music'), desc: t('musicDesc') },
              { icon: <IconCards />, label: t('cards'), desc: t('cardsDesc') },
              { icon: <IconSneakers />, label: t('sneakers'), desc: t('sneakersDesc') },
              { icon: <IconWatches />, label: t('watches'), desc: t('watchesDesc') },
              { icon: <IconVinyl />, label: t('vinyl'), desc: t('vinylDesc') },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.05}>
                <TiltCard
                  className="p-4 text-center landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="flex justify-center mb-2 opacity-60 group-hover:opacity-70 transition-opacity">{item.icon}</span>
                  <p className="text-sm font-bold opacity-80">{item.label}</p>
                  <p className="text-[10px] opacity-50 mt-1">{item.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Protocole ──────────────────────────────────── */}
      <section id="protocole" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-50 text-center mb-3">{t('technology')}</p>
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title text-center mb-12">
              {t('protocolTitle')}
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><polygon points="14,1 26,8 26,20 14,27 2,20 2,8" /><path d="M10 14l3 3 5-6" /></svg>,
                title: t('crcert'),
                desc: t('crcertDesc'),
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="14" cy="14" r="5" /><circle cx="5" cy="6" r="3" /><circle cx="23" cy="6" r="3" /><circle cx="5" cy="22" r="3" /><circle cx="23" cy="22" r="3" /><path d="M8 8l3 3M17 11l3-3M8 20l3-3M17 17l3 3" /></svg>,
                title: t('strangrmesh'),
                desc: t('strangrmeshDesc'),
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="4" y="10" width="20" height="14" rx="2" /><path d="M8 10V7a6 6 0 0 1 12 0v3" /><circle cx="14" cy="18" r="2" /><path d="M14 20v2" /></svg>,
                title: t('crypto'),
                desc: t('cryptoDesc'),
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="14" cy="14" r="12" /><ellipse cx="14" cy="14" rx="12" ry="5" /><ellipse cx="14" cy="14" rx="5" ry="12" /></svg>,
                title: t('tokenomics'),
                desc: t('tokenomicsDesc'),
              },
              {
                icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><polygon points="14,2 25,8.5 25,19.5 14,26 3,19.5 3,8.5" /><path d="M14 10v6M11 13h6" /><circle cx="14" cy="14" r="4" /></svg>,
                title: t('vobjct'),
                desc: t('vobjctDesc'),
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.1}>
                <TiltCard
                  className="p-6 sm:p-8 landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="block mb-3 opacity-60 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-lg font-bold opacity-90 mb-2">{card.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{card.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: '500+', label: t('totalSupply') },
            { value: '5%', label: t('goldenRatio') },
            { value: '7', label: t('layers') },
            { value: '∞', label: t('offlineOnline') },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div
                className="p-6 text-center landing-card group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-3xl sm:text-4xl font-bold opacity-80 group-hover:opacity-100 transition-opacity">{s.value}</p>
                <p className="text-[11px] opacity-50 mt-2">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Why Art Isn't Free ─────────────────────────── */}
      <section id="why-not-free" className="py-20 sm:py-32 px-4 sm:px-8" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-title-lg sm:text-title-xl font-bold font-title mb-3">{t('whyNotFree')}</h2>
              <p className="text-sm sm:text-base opacity-60">{t('whyNotFreeDesc')}</p>
            </div>
          </Reveal>

          {/* 4 argument cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {[
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" /><path d="M12 8v4M10 14h4" /></svg>, title: t('whyArg1Title'), desc: t('whyArg1Desc') },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-5.095-8 0-8zM5.822 8c5.096 0 5.096 8 0 8-5.096 0-5.096-8 0-8z" /><path d="M12 8c2.548 0 3.822 2 3.822 4s-1.274 4-3.822 4-3.822-2-3.822-4 1.274-4 3.822-4z" /></svg>, title: t('whyArg2Title'), desc: t('whyArg2Desc') },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" /><path d="M9 12l2 2 4-4" /></svg>, title: t('whyArg3Title'), desc: t('whyArg3Desc') },
              { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c1.25-1.25 2.5-2 4-2 3 0 3 2 6 2s3-2 6-2c1.5 0 2.75.75 4 2" /><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M12 12v6" /></svg>, title: t('whyArg4Title'), desc: t('whyArg4Desc') },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 0.1}>
                <div
                  className="p-6 landing-card group"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="opacity-60 block mb-2">{card.icon}</span>
                  <h3 className="text-base font-bold opacity-90 mb-1">{card.title}</h3>
                  <p className="text-sm opacity-60 leading-relaxed">{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Comparison table */}
          <Reveal delay={0.2}>
            <div className="overflow-x-auto">
              <h3 className="text-lg font-bold opacity-70 mb-4 text-center">{t('whyCompare')}</h3>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th className="text-left py-3 px-3 opacity-60 font-medium"></th>
                    <th className="py-3 px-3 opacity-90 font-bold">{t('whyCompareStrangrz')}</th>
                    <th className="py-3 px-3 opacity-50 font-medium">{t('whyCompareEth')}</th>
                    <th className="py-3 px-3 opacity-50 font-medium">{t('whyCompareTezos')}</th>
                    <th className="py-3 px-3 opacity-50 font-medium">{t('whyCompareSolana')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: t('whyMintCost'), vals: ['Gratuit', '2-100 \u20AC', '10-50 \u20AC', '\u2014'] },
                    { label: t('whyMinPrice'), vals: ['10 \u20AC', '\u2014', '\u2014', '\u2014'] },
                    { label: t('whyEnergy'), vals: ['~0.001 Wh', '~0.5 Wh', '~0.1 Wh', '~0.3 Wh'] },
                    { label: t('whyCo2'), vals: ['\u2713', '\u2717', '\u2717', '\u2717'] },
                    { label: t('whyOnChain'), vals: ['\u2713', '\u2717', '\u2717', '\u2717'] },
                    { label: t('whyFiat'), vals: ['\u2713', '\u2713', '\u2713', '\u2717'] },
                  ].map((row, i) => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td className="py-2.5 px-3 opacity-50 font-medium">{row.label}</td>
                      {row.vals.map((v, j) => (
                        <td key={j} className={`py-2.5 px-3 text-center ${j === 0 ? 'opacity-90 font-bold' : 'opacity-60'}`}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── How Payment Works ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-8">
        <Reveal>
          <div className="text-center mb-12">
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title mb-3">
              {t('howPaymentWorks')}
            </h2>
            <p className="text-sm sm:text-base opacity-40 max-w-xl mx-auto">
              {t('howPaymentDesc')}
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            { num: '1', title: t('howPayStep1'), desc: t('howPayStep1Desc'), icon: '\u20AC' },
            { num: '2', title: t('howPayStep2'), desc: t('howPayStep2Desc'), icon: '\u2B21' },
            { num: '3', title: t('howPayStep3'), desc: t('howPayStep3Desc'), icon: '\u2192' },
            { num: '4', title: t('howPayStep4'), desc: t('howPayStep4Desc'), icon: '\u2B23' },
          ].map((step) => (
            <Reveal key={step.num}>
              <div className="glass-panel p-5 text-center h-full">
                <div className="text-3xl mb-3 opacity-60">{step.icon}</div>
                <p className="text-[10px] opacity-30 mb-1">STEP {step.num}</p>
                <h3 className="text-base font-bold mb-2 opacity-90">{step.title}</h3>
                <p className="text-body-sm opacity-40 leading-relaxed">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-36 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.1) 0%, transparent 60%)',
        }} />
        <Reveal>
          <div className="relative text-center max-w-2xl mx-auto">
            <h2 className="text-title-lg sm:text-title-xl font-bold font-title mb-4">
              {t('ctaTitle')}
            </h2>
            <p className="text-sm sm:text-base opacity-60 mb-8 leading-relaxed">
              {t('ctaDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onNavigate('wallet')}
                className="px-8 py-4 text-base font-bold cta-gradient-btn"
              >
                {wallet ? t('mySpace') : t('ctaSignUp')}
              </button>
              <button
                onClick={() => onNavigate('whitepaper')}
                className="px-8 py-4 text-base opacity-50 cursor-pointer transition-all hover:opacity-80 hover:bg-white/5 active:scale-95"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {t('readWhitepaper')}
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Strangrz" className="w-6 h-6 opacity-60" />
            <span className="text-xs opacity-50">{t('footer')}</span>
          </div>
          <div className="flex gap-4 text-xs opacity-50">
            <button onClick={() => onNavigate('whitepaper')} className="hover:opacity-80 cursor-pointer transition-opacity">{t('whitePaper')}</button>
            <button onClick={() => onNavigate('legals')} className="hover:opacity-80 cursor-pointer transition-opacity">{t('legal')}</button>
            <button onClick={() => onNavigate('privacy')} className="hover:opacity-80 cursor-pointer transition-opacity">{t('privacy')}</button>
            <button onClick={() => onNavigate('help')} className="hover:opacity-80 cursor-pointer transition-opacity">{t('help')}</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
