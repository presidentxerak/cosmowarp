import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';

/* ─── i18n — auto-detect user language ───────────────── */

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    concept: 'Concept',
    publish: 'Publier',
    collect: 'Collectionner',
    protocol: 'Protocole',
    signIn: 'Se connecter',
    signUp: 'S\'inscrire',
    heroSubtitle: 'Protocole de certification pour oeuvres rares',
    heroDesc: 'Publiez, certifiez et collectionnez des oeuvres numériques et physiques. Chaque objet reçoit un certificat d\'authenticité infalsifiable sur le réseau Strangrz.',
    mySpace: 'Mon Espace',
    createAccount: 'Créer un compte',
    learnMore: 'En savoir plus',
    conceptTitle: 'C\'est quoi Strangrz ?',
    conceptDesc: 'Strangrz est un protocole de certification pour objets rares. Cartes Pokémon, sneakers, vinyles, montres, art numérique : chaque objet rare mérite un certificat d\'authenticité infalsifiable. C\'est exactement ce que Strangrz propose, grâce à des certificats cryptographiques appelés CRCERT.',
    conceptDesc2: 'Contrairement aux blockchains classiques qui chaînent des blocs de manière linéaire, Strangrz utilise un graphe acyclique orienté (DAG) avec 7 couches de validation parallèles, permettant un débit massif sans le goulot d\'étranglement de la confirmation séquentielle.',
    conceptDesc3: 'Là où les systèmes fiat dépendent d\'intermédiaires centralisés (banques, processeurs de paiement), Strangrz fonctionne comme un maillage pair-à-pair où chaque transaction valide deux transactions précédentes, créant un réseau de confiance auto-renforçant.',
    certify: 'Certifier',
    certifyDesc: 'Chaque oeuvre reçoit un certificat CRCERT : empreinte SHA-256, signature Ed25519 du créateur, horodatage. Infalsifiable et vérifiable par tous.',
    publishTitle: 'Publier',
    publishDesc: 'Publiez vos créations — art numérique, photo, musique, objets physiques. Votre certificat prouve que vous en êtes l\'auteur et le premier propriétaire.',
    exchange: 'Échanger',
    exchangeDesc: 'Achetez et vendez des oeuvres certifiées en toute confiance. Le certificat suit l\'objet et prouve son origine. Paiement en Strangrz (Ω) ou en euros.',
    forCreators: 'Pour les créateurs',
    publishWorks: 'Publiez vos oeuvres',
    step1: 'Créez votre profil',
    step1Desc: 'Un nom d\'utilisateur et un mot de passe suffisent. Strangrz génère votre clé cryptographique Ed25519. Aucun email requis.',
    step2: 'Uploadez votre oeuvre',
    step2Desc: 'Photo, vidéo, illustration, musique, objet 3D — tout format est accepté. Ajoutez un titre, une description et un prix.',
    step3: 'Certification automatique',
    step3Desc: 'Strangrz calcule l\'empreinte SHA-256 du fichier et la signe avec votre clé privée. Le certificat CRCERT est créé instantanément.',
    step4: 'Mise en vente',
    step4Desc: 'Votre oeuvre apparaît sur la marketplace. Les collectionneurs peuvent l\'acheter en Strangrz (Ω) ou via la passerelle de paiement en euros.',
    publishWork: 'Publier une oeuvre',
    forCollectors: 'Pour les collectionneurs',
    collectCertified: 'Collectionnez des oeuvres certifiées',
    collectDesc: 'Explorez la marketplace, découvrez des créateurs, et constituez votre collection d\'oeuvres authentifiées par le protocole Strangrz.',
    explore: 'Explorer',
    exploreDesc: 'Parcourez la marketplace et découvrez des oeuvres de créateurs du monde entier.',
    buy: 'Acheter',
    buyDesc: 'Payez en Strangrz (Ω) ou en euros via la passerelle de paiement intégrée.',
    own: 'Posséder',
    ownDesc: 'Chaque achat transfère le certificat CRCERT sur votre wallet. Vous êtes le propriétaire vérifié.',
    resell: 'Revendre',
    resellDesc: 'Mettez vos oeuvres en vente à tout moment. Le certificat suit l\'objet et prouve la chaîne de propriété.',
    exploreMarketplace: 'Explorer la marketplace',
    whatObjects: 'Quels objets certifier ?',
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
    technology: 'Technologie',
    protocolTitle: 'Le Protocole Strangrz',
    crcert: 'Certificat CRCERT',
    crcertDesc: 'Empreinte SHA-256 du contenu + signature Ed25519 du créateur + horodatage. Impossible à falsifier, vérifiable par tous.',
    strangrmesh: 'StrangrzMesh — Réseau en graphe',
    strangrmeshDesc: 'Un graphe acyclique dirigé (DAG) à 7 couches de validation parallèles. Chaque transaction en valide deux autres.',
    crypto: 'Cryptographie de pointe',
    cryptoDesc: 'Signatures Ed25519, hachage SHA-256, chiffrement AES-GCM. Les mêmes standards que Signal et Tor.',
    tokenomics: 'Tokenomics équitable',
    tokenomicsDesc: 'Le token Strangrz (Ω) a une offre fixe de 69M. Les récompenses de minage suivent le nombre d\'or (φ).',
    vobjct: 'Vobjct Safe — Résilience',
    vobjctDesc: 'Chaque oeuvre est protégée par un manifeste Vobjct : intégrité SHA-256, routes de stockage multi-réseau (on-chain, IPFS, cloud), monitoring actif, et réparation automatique. Vos actifs numériques sont vérifiables, récupérables et permanents.',
    totalSupply: 'Supply totale',
    goldenRatio: 'Ratio d\'or (minage)',
    layers: 'Couches du réseau',
    offlineOnline: 'Offline + Online',
    ctaTitle: 'Prêt à certifier vos trésors ?',
    ctaDesc: 'Créez votre compte en 10 secondes. Pas d\'email, pas de tiers. Juste vous et le protocole.',
    ctaSignUp: 'Sign Up — Créer un compte',
    readWhitepaper: 'Lire le White Paper',
    footer: 'Strangrz Foundation — Protocole de certification pour oeuvres rares',
    whitePaper: 'White Paper',
    legal: 'Légal',
    privacy: 'Confidentialité',
    help: 'Aide',
  },
  en: {
    concept: 'Concept',
    publish: 'Publish',
    collect: 'Collect',
    protocol: 'Protocol',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    heroSubtitle: 'Certification protocol for rare works',
    heroDesc: 'Publish, certify and collect digital and physical works. Each object receives a tamper-proof certificate of authenticity on the Strangrz network.',
    mySpace: 'My Space',
    createAccount: 'Create Account',
    learnMore: 'Learn More',
    conceptTitle: 'What is Strangrz?',
    conceptDesc: 'Strangrz is a certification protocol for rare objects. Pokémon cards, sneakers, vinyl records, watches, digital art: every rare object deserves a tamper-proof certificate of authenticity. That\'s exactly what Strangrz offers, through cryptographic certificates called CRCERT.',
    conceptDesc2: 'Unlike traditional blockchains that chain blocks linearly, Strangrz uses a directed acyclic graph (DAG) with 7 parallel validation layers, enabling massive throughput without the bottleneck of sequential confirmation.',
    conceptDesc3: 'Where fiat systems depend on centralized intermediaries (banks, payment processors), Strangrz operates as a peer-to-peer mesh where each transaction validates two previous transactions, creating a self-reinforcing trust network.',
    certify: 'Certify',
    certifyDesc: 'Each work receives a CRCERT certificate: SHA-256 fingerprint, Ed25519 signature from the creator, timestamp. Tamper-proof and verifiable by all.',
    publishTitle: 'Publish',
    publishDesc: 'Publish your creations — digital art, photos, music, physical objects. Your certificate proves you are the author and first owner.',
    exchange: 'Exchange',
    exchangeDesc: 'Buy and sell certified works with confidence. The certificate follows the object and proves its origin. Pay in Strangrz (Ω) or in euros.',
    forCreators: 'For creators',
    publishWorks: 'Publish your works',
    step1: 'Create your profile',
    step1Desc: 'A username and password is all you need. Strangrz generates your Ed25519 cryptographic key. No email required.',
    step2: 'Upload your work',
    step2Desc: 'Photo, video, illustration, music, 3D object — all formats are accepted. Add a title, description and price.',
    step3: 'Automatic certification',
    step3Desc: 'Strangrz computes the SHA-256 fingerprint of the file and signs it with your private key. The CRCERT certificate is created instantly.',
    step4: 'Listed for sale',
    step4Desc: 'Your work appears on the marketplace. Collectors can buy it in Strangrz (Ω) or via the integrated euro payment gateway.',
    publishWork: 'Publish a work',
    forCollectors: 'For collectors',
    collectCertified: 'Collect certified works',
    collectDesc: 'Explore the marketplace, discover creators, and build your collection of works authenticated by the Strangrz protocol.',
    explore: 'Explore',
    exploreDesc: 'Browse the marketplace and discover works from creators worldwide.',
    buy: 'Buy',
    buyDesc: 'Pay in Strangrz (Ω) or in euros via the integrated payment gateway.',
    own: 'Own',
    ownDesc: 'Each purchase transfers the CRCERT certificate to your wallet. You are the verified owner.',
    resell: 'Resell',
    resellDesc: 'List your works for sale at any time. The certificate follows the object and proves the chain of ownership.',
    exploreMarketplace: 'Explore the marketplace',
    whatObjects: 'What objects to certify?',
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
    technology: 'Technology',
    protocolTitle: 'The Strangrz Protocol',
    crcert: 'CRCERT Certificate',
    crcertDesc: 'SHA-256 content fingerprint + Ed25519 creator signature + timestamp. Impossible to forge, verifiable by all.',
    strangrmesh: 'StrangrzMesh — Graph Network',
    strangrmeshDesc: 'A directed acyclic graph (DAG) with 7 parallel validation layers. Each transaction validates two others.',
    crypto: 'Cutting-edge Cryptography',
    cryptoDesc: 'Ed25519 signatures, SHA-256 hashing, AES-GCM encryption. The same standards as Signal and Tor.',
    tokenomics: 'Fair Tokenomics',
    tokenomicsDesc: 'The Strangrz (Ω) token has a fixed supply of 69M. Mining rewards follow the golden ratio (φ).',
    vobjct: 'Vobjct Safe — Resilience',
    vobjctDesc: 'Every artwork is protected by a Vobjct manifest: SHA-256 integrity, multi-network storage routes (on-chain, IPFS, cloud), active monitoring, and automated repair. Your digital assets are verifiable, recoverable, and permanent.',
    totalSupply: 'Total Supply',
    goldenRatio: 'Golden Ratio (mining)',
    layers: 'Network Layers',
    offlineOnline: 'Offline + Online',
    ctaTitle: 'Ready to certify your treasures?',
    ctaDesc: 'Create your account in 10 seconds. No email, no middleman. Just you and the protocol.',
    ctaSignUp: 'Sign Up — Create Account',
    readWhitepaper: 'Read the White Paper',
    footer: 'Strangrz Foundation — Certification protocol for rare works',
    whitePaper: 'White Paper',
    legal: 'Legal',
    privacy: 'Privacy',
    help: 'Help',
  },
  ja: {
    concept: 'コンセプト',
    publish: '公開',
    collect: 'コレクション',
    protocol: 'プロトコル',
    signIn: 'ログイン',
    signUp: 'サインアップ',
    heroSubtitle: 'レアワークのための認証プロトコル',
    heroDesc: 'デジタルおよび物理的作品を公開、認証、収集。各オブジェクトはStrangrzネットワーク上で改ざん不可能な真正性証明書を受け取ります。',
    mySpace: 'マイスペース',
    createAccount: 'アカウント作成',
    learnMore: '詳しく見る',
    conceptTitle: 'Strangrzとは？',
    conceptDesc: 'Strangrzはレアオブジェクトの認証プロトコルです。ポケモンカード、スニーカー、レコード、時計、デジタルアート：すべてのレアオブジェクトはCRCERTと呼ばれる暗号証明書による改ざん不可能な真正性証明書を受け取ります。',
    conceptDesc2: 'ブロックを直線的に連鎖させる従来のブロックチェーンとは異なり、Strangrzは7つの並列検証レイヤーを持つ有向非巡回グラフ（DAG）を使用し、順次確認のボトルネックなしに大量のスループットを実現します。',
    conceptDesc3: '法定通貨システムが中央集権的な仲介者に依存するのに対し、Strangrzは各トランザクションが2つの前のトランザクションを検証するピアツーピアメッシュとして機能し、自己強化型の信頼ネットワークを作成します。',
    certify: '認証',
    certifyDesc: '各作品はCRCERT証明書を受け取ります：SHA-256フィンガープリント、クリエイターのEd25519署名、タイムスタンプ。改ざん不可能で全員が検証可能。',
    publishTitle: '公開',
    publishDesc: '作品を公開 — デジタルアート、写真、音楽、物理オブジェクト。証明書はあなたが著者であり最初の所有者であることを証明します。',
    exchange: '交換',
    exchangeDesc: '認証済み作品を安心して売買。証明書はオブジェクトに従い、その起源を証明します。Strangrz（Ω）またはユーロで支払い。',
    forCreators: 'クリエイター向け',
    publishWorks: '作品を公開する',
    step1: 'プロフィール作成',
    step1Desc: 'ユーザー名とパスワードだけで十分です。StrangrzがEd25519暗号鍵を生成します。メール不要。',
    step2: '作品をアップロード',
    step2Desc: '写真、動画、イラスト、音楽、3Dオブジェクト — すべてのフォーマットに対応。タイトル、説明、価格を追加。',
    step3: '自動認証',
    step3Desc: 'StrangrzがファイルのSHA-256フィンガープリントを計算し、秘密鍵で署名します。CRCERT証明書が即座に作成されます。',
    step4: '販売開始',
    step4Desc: '作品がマーケットプレイスに表示されます。コレクターはStrangrz（Ω）または統合ユーロ決済ゲートウェイで購入できます。',
    publishWork: '作品を公開',
    forCollectors: 'コレクター向け',
    collectCertified: '認証済み作品を収集',
    collectDesc: 'マーケットプレイスを探索し、クリエイターを発見し、Strangrzプロトコルで認証された作品のコレクションを構築。',
    explore: '探索',
    exploreDesc: 'マーケットプレイスを閲覧し、世界中のクリエイターの作品を発見。',
    buy: '購入',
    buyDesc: 'Strangrz（Ω）またはユーロで統合決済ゲートウェイ経由で支払い。',
    own: '所有',
    ownDesc: '各購入でCRCERT証明書がウォレットに転送されます。あなたが検証済みの所有者です。',
    resell: '再販',
    resellDesc: 'いつでも作品を販売に出せます。証明書はオブジェクトに従い、所有権の連鎖を証明します。',
    exploreMarketplace: 'マーケットプレイスを探索',
    whatObjects: 'どんなオブジェクトを認証？',
    digitalArt: 'デジタルアート',
    digitalArtDesc: 'イラスト、3D、写真',
    music: '音楽',
    musicDesc: 'アルバム、シングル、リミックス',
    cards: 'カード',
    cardsDesc: 'ポケモン、マジック、遊戯王',
    sneakers: 'スニーカー',
    sneakersDesc: 'Nike、Adidas、Jordan',
    watches: '時計',
    watchesDesc: 'Rolex、Omega、Seiko',
    vinyl: 'レコード',
    vinylDesc: '限定プレス',
    technology: 'テクノロジー',
    protocolTitle: 'Strangrzプロトコル',
    crcert: 'CRCERT証明書',
    crcertDesc: 'SHA-256コンテンツフィンガープリント + Ed25519クリエイター署名 + タイムスタンプ。偽造不可能、全員が検証可能。',
    strangrmesh: 'StrangrzMesh — グラフネットワーク',
    strangrmeshDesc: '7つの並列検証レイヤーを持つ有向非巡回グラフ（DAG）。各トランザクションが他の2つを検証。',
    crypto: '最先端の暗号技術',
    cryptoDesc: 'Ed25519署名、SHA-256ハッシュ、AES-GCM暗号化。SignalやTorと同じ標準。',
    tokenomics: '公平なトケノミクス',
    tokenomicsDesc: 'Strangrz（Ω）トークンの固定供給量は6900万。マイニング報酬は黄金比（φ）に従います。',
    vobjct: 'Vobjct Safe — レジリエンス',
    vobjctDesc: 'すべての作品はVobjctマニフェストで保護：SHA-256整合性、マルチネットワークストレージルート（オンチェーン、IPFS、クラウド）、アクティブモニタリング、自動修復。デジタル資産は検証可能、回復可能、永続的。',
    totalSupply: '総供給量',
    goldenRatio: '黄金比（マイニング）',
    layers: 'ネットワークレイヤー',
    offlineOnline: 'オフライン + オンライン',
    ctaTitle: '宝物を認証する準備はできましたか？',
    ctaDesc: '10秒でアカウント作成。メール不要、仲介者不要。あなたとプロトコルだけ。',
    ctaSignUp: 'サインアップ — アカウント作成',
    readWhitepaper: 'ホワイトペーパーを読む',
    footer: 'Strangrz Foundation — レアワークのための認証プロトコル',
    whitePaper: 'ホワイトペーパー',
    legal: '法的情報',
    privacy: 'プライバシー',
    help: 'ヘルプ',
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

  const logoSrc = import.meta.env.BASE_URL + 'cosmowarp-logo-white.svg';

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

      {/* ─── Header ─────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: `rgba(0,0,0,${headerBgOpacity})`,
          backdropFilter: scrollY > 50 ? 'blur(16px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.05)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-16">
          {/* Logo + name in katakana */}
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 cursor-pointer group">
            <img src={logoSrc} alt="Strangrz" className="w-8 h-8 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-base font-bold tracking-wider opacity-90 hidden sm:inline font-title">ストレンジャーズ</span>
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
            <source src={`${import.meta.env.BASE_URL}cosmorare-landing-hero-random-${heroVideoNum}.mp4`} type="video/mp4" />
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
            className="text-3xl sm:text-5xl lg:text-6xl font-bold font-title mb-4 tracking-wide"
            style={{ textShadow: '0 0 60px rgba(255,255,255,0.1)' }}
          >
            {'ストレンジャーズ'}
          </h1>
          <p className="text-lg sm:text-xl opacity-50 mb-2 tracking-[0.3em] uppercase">
            STRANGRZ
          </p>
          <p className="text-base sm:text-lg opacity-70 font-bold mb-3">
            {t('heroSubtitle')}
          </p>
          <p className="text-sm sm:text-base opacity-40 max-w-xl mx-auto mb-10 leading-relaxed">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30 animate-bounce-slow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ─── Concept ────────────────────────────────────── */}
      <section id="concept" className="relative py-20 sm:py-32 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">{t('concept')}</p>
            <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-6">
              {t('conceptTitle')}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="max-w-3xl mx-auto mb-14 space-y-4">
              <p className="text-sm sm:text-base opacity-50 leading-relaxed">
                {t('conceptDesc')}
              </p>
              <p className="text-sm sm:text-base opacity-40 leading-relaxed">
                {t('conceptDesc2')}
              </p>
              <p className="text-sm sm:text-base opacity-40 leading-relaxed">
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
                  <span className="block mb-4 opacity-40 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-lg font-bold opacity-90 mb-3">{card.title}</h3>
                  <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
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
                <p className="text-label tracking-[0.3em] opacity-30 mb-3">{t('forCreators')}</p>
                <h2 className="text-2xl sm:text-4xl font-bold font-title mb-6">
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
                      <span className="text-2xl font-bold opacity-10 shrink-0 w-10 text-right group-hover:opacity-30 transition-opacity">{s.step}</span>
                      <div>
                        <h3 className="text-base font-bold opacity-90 mb-1">{s.title}</h3>
                        <p className="text-sm opacity-40 leading-relaxed">{s.desc}</p>
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
            <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">{t('forCollectors')}</p>
            <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-4">
              {t('collectCertified')}
            </h2>
            <p className="text-sm sm:text-base opacity-40 text-center max-w-2xl mx-auto mb-12 leading-relaxed">
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
                  <span className="block mb-3 opacity-40 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-base font-bold opacity-90 mb-2">{card.title}</h3>
                  <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
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

      {/* ─── Quels objets ? ─────────────────────────────── */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold font-title text-center mb-10">
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
                  <span className="flex justify-center mb-2 opacity-40 group-hover:opacity-70 transition-opacity">{item.icon}</span>
                  <p className="text-sm font-bold opacity-80">{item.label}</p>
                  <p className="text-[10px] opacity-30 mt-1">{item.desc}</p>
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
            <p className="text-label tracking-[0.3em] opacity-30 text-center mb-3">{t('technology')}</p>
            <h2 className="text-2xl sm:text-4xl font-bold font-title text-center mb-12">
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
                  <span className="block mb-3 opacity-40 group-hover:opacity-70 transition-opacity">{card.icon}</span>
                  <h3 className="text-lg font-bold opacity-90 mb-2">{card.title}</h3>
                  <p className="text-sm opacity-40 leading-relaxed">{card.desc}</p>
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
            { value: '69M', label: t('totalSupply') },
            { value: 'φ', label: t('goldenRatio') },
            { value: '7', label: t('layers') },
            { value: '∞', label: t('offlineOnline') },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div
                className="p-6 text-center landing-card group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-3xl sm:text-4xl font-bold opacity-80 group-hover:opacity-100 transition-opacity">{s.value}</p>
                <p className="text-[11px] opacity-30 mt-2">{s.label}</p>
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
            <h2 className="text-2xl sm:text-4xl font-bold font-title mb-4">
              {t('ctaTitle')}
            </h2>
            <p className="text-sm sm:text-base opacity-40 mb-8 leading-relaxed">
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
            <img src={logoSrc} alt="Strangrz" className="w-6 h-6 opacity-40" />
            <span className="text-xs opacity-30">{t('footer')}</span>
          </div>
          <div className="flex gap-4 text-xs opacity-30">
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
