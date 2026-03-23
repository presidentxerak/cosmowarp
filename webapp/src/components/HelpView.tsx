import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '../context/WalletContext';

// ─── Doctor Strangrz Chatbot Knowledge Base ────────────────────────

interface CosmoResponse {
  answer: string;
  navigateTo: string;
  tabLabel: string;
}

interface KnowledgeEntry {
  keywords: string[];
  response: CosmoResponse;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // Account
  {
    keywords: ['wallet', 'portefeuille', 'create', 'creer', 'créer', 'account', 'compte', 'sign up', 'inscription'],
    response: {
      answer: "Ah, un nouveau voyageur dans le cosmos ! Créer un compte, c'est plus simple que d'expliquer la physique quantique à un chat. Va dans la section Mon Compte, choisis un nom d'utilisateur et un mot de passe, et hop — te voilà prêt. Aucun email requis. 30 secondes, top chrono. Conseil : choisis un mot de passe solide — le cosmos observe.",
      navigateTo: 'wallet',
      tabLabel: 'Mon Compte',
    },
  },
  {
    keywords: ['balance', 'solde', 'warp', 'warps', 'zero', '0', 'argent', 'money'],
    response: {
      answer: "Tu es nouveau sur la plateforme ? Bienvenue ! Tu peux commencer à explorer la galerie immédiatement et acheter des oeuvres par carte bancaire, Apple Pay ou Google Pay. Les prix sont affichés en euros, pas besoin de conversion. Si tu veux vendre, publie ton oeuvre et fixe ton prix en euros — les acheteurs paient directement.",
      navigateTo: 'gallery',
      tabLabel: 'Galerie',
    },
  },
  {
    keywords: ['send', 'envoyer', 'transfer', 'transferer', 'transférer', 'payer', 'pay'],
    response: {
      answer: "Envie d'offrir une oeuvre ou de transférer une pièce de ta collection ? Ouvre ta collection, sélectionne l'oeuvre et utilise l'option « Transférer ». Entre le pseudo du destinataire et c'est parti. Simple, rapide, cosmiquement élégant.",
      navigateTo: 'gallery',
      tabLabel: 'Ma Collection',
    },
  },
  {
    keywords: ['backup', 'recovery', 'key', 'clé', 'cle', 'sauvegarde', 'récupération', 'recuperation', 'lost', 'perdu'],
    response: {
      answer: "Ta sauvegarde, c'est ton assurance cosmique ! Va dans Mon Compte → Aperçu et télécharge ta sauvegarde de récupération. GARDE-LA EN LIEU SÛR. Si tu perds ton mot de passe, c'est le seul moyen de retrouver ton compte et ta collection. Personne ne peut réinitialiser ton mot de passe — même Doctor Strangrz, l'oracle lui-même.",
      navigateTo: 'wallet',
      tabLabel: 'Mon Compte → Aperçu',
    },
  },
  // Artworks / Gallery
  {
    keywords: ['wart', 'warts', 'strangrz', 'art', 'create art', 'créer art', 'marketplace', 'marché', 'objet', 'rare', 'certifier', 'certification', 'pokemon', 'sneaker', 'sneakers', 'vinyle', 'montre', 'watches', 'galerie', 'gallery'],
    response: {
      answer: "La Galerie, c'est le coeur de Strangrz ! Tu y trouves des oeuvres d'art uniques, des objets de collection certifiés — cartes Pokémon, sneakers, vinyles, montres, art numérique... Chaque oeuvre est automatiquement certifiée avec un certificat d'authenticité infalsifiable. Tu peux publier images, GIF, audio (MP3 avec pochette), et vidéo (MP4/MOV), le tout jusqu'à 50 Mo. Explore, achète par carte bancaire, et constitue ta collection !",
      navigateTo: 'gallery',
      tabLabel: 'Galerie',
    },
  },
  {
    keywords: ['buy', 'acheter', 'sell', 'vendre', 'price', 'prix', 'list', 'marketplace'],
    response: {
      answer: "Tu veux acheter une oeuvre ? Parcours la Galerie, trouve une pièce qui parle à ton âme cosmique, et clique sur « Collect ». Paie par carte bancaire, Apple Pay ou Google Pay — c'est aussi simple qu'un achat en ligne classique. Tu veux vendre ? Publie ton oeuvre, fixe un prix en euros, et mets en vente. Les acheteurs paient par carte, tu reçois tes euros directement. En cas de revente, tu touches encore des royalties (5%) automatiquement !",
      navigateTo: 'gallery',
      tabLabel: 'Galerie',
    },
  },
  {
    keywords: ['certificate', 'certificat', 'authenticity', 'authenticité', 'stcert', 'crcert', 'cwcert', 'fingerprint', 'empreinte', 'verify', 'vérifier'],
    response: {
      answer: "Chaque oeuvre sur Strangrz possède un certificat d'authenticité (STCERT) — infalsifiable et vérifiable par tous. Il contient une empreinte numérique unique du contenu, la signature du créateur et un horodatage. Clique sur « Vérifier » sur n'importe quelle oeuvre pour lancer une vérification d'intégrité complète. Si ça affiche « Authentique » — tu es tranquille !",
      navigateTo: 'gallery',
      tabLabel: 'Galerie → Détail',
    },
  },
  // Mur (ex-CosmoChat)
  {
    keywords: ['mur', 'cosmochat', 'chat', 'social', 'message', 'messages', 'dm', 'channel', 'canal', 'post', 'publier'],
    response: {
      answer: "Le Mur, c'est ton réseau social intégré ! Imagine Instagram + Discord, mais dédié à l'art. Publie sur la timeline, crée des canaux, envoie des messages directs aux artistes et aux collectionneurs. Partage des liens vers des oeuvres, des actus, des pensées créatives... la communauté est ton fil.",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur',
    },
  },
  {
    keywords: ['tip', 'tips', 'pourboire', 'like', 'aimer', 'rewarp', 'retweet', 'share', 'partager'],
    response: {
      answer: "Sur le Mur, tu peux liker les posts pour soutenir les artistes. Tu peux aussi repartager (RePost) ou Partager en externe. Chaque post affiche le nombre de likes, reposts, vues et favoris. C'est une communauté d'artistes et de collectionneurs passionnés.",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur',
    },
  },
  // Feed
  {
    keywords: ['feed', 'transaction', 'transactions', 'history', 'historique', 'activity', 'activité'],
    response: {
      answer: "Le Feed, c'est là où tu observes le pouls cosmique de Strangrz. Chaque transaction — envois, minages, certifications de Strangrz, achats — apparaît ici en temps réel avec le fuseau horaire français (parce que Paris est le centre de l'univers, évidemment). C'est comme regarder la matrice, mais en plus joli et avec plus de lettres grecques.",
      navigateTo: 'feed',
      tabLabel: 'Feed',
    },
  },
  // Settings
  {
    keywords: ['settings', 'paramètres', 'parametres', 'theme', 'thème', 'dark', 'light', 'mode', 'appearance', 'apparence'],
    response: {
      answer: "Les Paramètres, c'est ton panneau de contrôle cosmique ! Bascule entre le mode sombre (pour les âmes mystérieuses) et le mode clair (pour les braves qui fixent les soleils). Gère ton profil, vérifie ta sécurité, télécharge tes clés de récupération, efface les données du Mur, et plus encore. C'est comme le cockpit d'un vaisseau spatial — tous les boutons nécessaires, aucun de superflu.",
      navigateTo: 'settings',
      tabLabel: 'Paramètres',
    },
  },
  // Dev
  {
    keywords: ['dev', 'developer', 'développeur', 'sdk', 'api', 'console', 'admin', 'code', 'technical'],
    response: {
      answer: "Ah, un fellow magicien du code ! La section Dev combine la documentation SDK, le panneau Admin et la Console en un seul atelier puissant. Construis des apps sur Strangrz, interagis directement avec le protocole, et gère les fonctionnalités avancées. Le jeu d'instructions CosmoASM t'attend. Rappelle-toi : avec un grand pouvoir vient une grande probabilité d'oublier un point-virgule.",
      navigateTo: 'dev',
      tabLabel: 'Dev',
    },
  },
  // StrangrzMesh
  {
    keywords: ['strangrmesh', 'mesh', 'strangrzchain', 'chain', 'blockchain', 'shard', 'shards', 'parallel', 'block', 'blocks', 'beacon', 'dag', 'couche', 'couches', 'layer', 'layers'],
    response: {
      answer: "StrangrzMesh est notre réseau DAG à 7 couches parallèles fonctionnant simultanément via de vrais Web Workers. Chaque couche (GRID, HELIX, GLYPH, COSMO, CHRONOS, NEXUS, LUMINA) traite des blocs toutes les 1,5 secondes dans son propre thread. Le TPS dépend de ton matériel — lance le benchmark intégré pour le mesurer. Frais de gas ? Zéro. Les données sont stockées dans IndexedDB (échelle Go). Consulte le Livre Blanc pour le schéma d'architecture !",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → StrangrzMesh',
    },
  },
  // StrangrzCode SVG
  {
    keywords: ['strangrzcode', 'cosmocode', 'svg', 'compression', 'on-chain', 'onchain', 'storage', 'stockage', '1000x', 'fractal'],
    response: {
      answer: "StrangrzCode est le moteur de compression derrière le stockage on-chain. Il prend n'importe quelle donnée — transactions, images, objets rares — et la compresse à travers 7 couches fractales dans un conteneur SVG minuscule. Couche 1 : Encodage Delta (ne stocker que les différences). Couche 2 : Dictionnaire (symboles courts). Couche 3 : Run-Length. Couche 4 : Imbrication Fractale (SVG <defs>/<use> = déduplication). Couches 5-7 : Fréquence, Quantification, Filtres. Ratios réels mesurés : 5-30x pour les données structurées (transactions), ~1-2x pour les données binaires (images). Lance le benchmark pour vérifier.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → StrangrzCode',
    },
  },
  // Zero gas
  {
    keywords: ['gas', 'fee', 'fees', 'free', 'gratuit', 'cost', 'coût', 'cout', 'price', 'zero', 'frais'],
    response: {
      answer: "Frais de gas ? On ne fait pas ça ici. Les transactions StrangrzMesh sont 100 % GRATUITES. Zéro. Nada. Comment ? Trois raisons : (1) Les validateurs gagnent via les récompenses de staking, pas via les frais utilisateurs. (2) L'anti-spam utilise la limitation de débit (100 TX/min) au lieu d'exclure les gens par les prix. (3) StrangrzCode compresse les données structurées 5-30x, et IndexedDB fournit un stockage local à l'échelle du Go à coût zéro. Ethereum facture 0,50 à 100 $ par TX. Nous, c'est 0 ⬣. De rien.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → StrangrzMesh',
    },
  },
  // Speed
  {
    keywords: ['speed', 'fast', 'rapide', 'vitesse', 'tps', 'throughput', 'performance', 'slow', 'lent'],
    response: {
      answer: "StrangrzMesh traite les blocs rapidement. Chacune de nos 7 couches tourne dans son propre Web Worker et produit un bloc toutes les 1,5 secondes (contre 12s pour Ethereum). Le TPS réel dépend de ton matériel — utilise le benchmark intégré pour mesurer le débit réel. Ta transaction est confirmée en ~1,5s avec ancrage final via un Beacon Block toutes les ~15s. Pas de chiffres gonflés — benchmark-le toi-même.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → StrangrzMesh',
    },
  },
  // On-chain Strangrz
  {
    keywords: ['on-chain strangrz', 'on-chain', 'full on-chain', 'image on chain', 'art on chain', 'ipfs', 'arweave', 'stored on chain'],
    response: {
      answer: "Contrairement à Ethereum où ton image vit sur IPFS (qui peut tomber hors ligne), StrangrzMesh stocke l'INTÉGRALITÉ de l'œuvre directement dans la blockchain. Le moteur StrangrzCode SVG compresse tes objets (5-30x pour les données structurées, ~1-2x pour les images), les enveloppe dans un conteneur SVG avec ta signature Ed25519, et les stocke dans un bloc de la couche GLYPH. Ça vit on-chain pour toujours. Si tu perds ta copie locale, tu peux la récupérer depuis n'importe quel nœud. Et ça coûte... roulement de tambour... 0 ⬣. GRATUIT.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → StrangrzMesh',
    },
  },
  // WhitePaper
  {
    keywords: ['whitepaper', 'paper', 'documentation', 'docs', 'concept', 'how', 'comment', 'why', 'pourquoi', 'tokenomics', 'supply'],
    response: {
      answer: "Le Strangrz Protocole, c'est le parchemin sacré de Strangrz ! 7 sections couvrant l'essentiel : comment ça marche, les certificats STCERT, le Strangrz (⬣), les niveaux, la sécurité et la roadmap. Tout est expliqué simplement pour que tu comprennes comment certifier et échanger tes objets rares en toute confiance.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc',
    },
  },
  // Security
  {
    keywords: ['security', 'sécurité', 'securite', 'hack', 'safe', 'sûr', 'sur', 'protect', 'protéger', 'encryption', 'chiffrement', 'encrypt'],
    response: {
      answer: "Strangrz prend la sécurité TRÈS au sérieux — 7 couches, pour être exact. Signatures Ed25519 (infalsifiables), limitation de débit (pas de spam), suivi des nonces (pas d'attaques par rejeu), limites progressives de montant, détection de patterns, intégrité d'état (checksums SHA-256), et registre admin chiffré. En plus, le service worker permet à l'app de fonctionner hors ligne et se met à jour automatiquement. Dors tranquille — le cosmos veille sur toi.",
      navigateTo: 'settings',
      tabLabel: 'Paramètres → Sécurité',
    },
  },
  // Offline
  {
    keywords: ['offline', 'hors ligne', 'online', 'en ligne', 'pwa', 'install', 'app'],
    response: {
      answer: "Strangrz fonctionne hors ligne ET en ligne ! Grâce à notre service worker, l'app se met en cache sur ton appareil et continue de fonctionner même sans internet. Quand tu te reconnectes, elle se synchronise automatiquement. Tu peux même l'installer en PWA (Progressive Web App) sur ton téléphone — utilise simplement l'option « Ajouter à l'écran d'accueil » de ton navigateur. C'est une app native sans l'intermédiaire de l'App Store. Prends ça, Apple.",
      navigateTo: 'settings',
      tabLabel: 'Paramètres',
    },
  },
  // Levels
  {
    keywords: ['level', 'niveau', 'rank', 'rang', 'particle', 'wave', 'star', 'nebula', 'galaxy', 'cosmos', 'lumina', 'hierarchy', 'hiérarchie'],
    response: {
      answer: "Ton voyage cosmique comporte 7 niveaux : Particle → Wave → Star → Nebula → Galaxy → Cosmos → Lumina. Chaque niveau te donne des multiplicateurs de minage plus élevés (jusqu'à 5x !) et des bonus de montée de niveau. C'est basé sur le nombre de transactions, pas l'argent — donc la régularité bat la richesse. Le dernier niveau, Lumina, signifie que tu as transcendé. Tu ES littéralement la lumière. Pas de pression.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → Hiérarchie',
    },
  },
  // What is Strangrz
  {
    keywords: ['what is', 'qu\'est-ce', 'c\'est quoi', 'explain', 'expliquer', 'strangrz', 'cosmowarp', 'about'],
    response: {
      answer: "Strangrz est une plateforme sociale pour l'art et les objets de collection. Imagine une galerie d'art en ligne + un réseau social + un certificat d'authenticité infalsifiable, le tout dans une app. Tu y trouves : une galerie d'oeuvres certifiées, un réseau social dédié aux artistes et collectionneurs (le Mur), un système de paiement simple (carte bancaire, Apple Pay, Google Pay), et des royalties automatiques pour les créateurs. Pas de complication technique — juste de l'art, de la confiance et de la communauté.",
      navigateTo: 'landing',
      tabLabel: 'Accueil',
    },
  },
  // Help
  {
    keywords: ['help', 'aide', 'assist', 'guide', 'support', 'hello', 'bonjour', 'salut', 'hi', 'hey'],
    response: {
      answer: "Bonjour, voyageur cosmique ! Je suis Doctor Strangrz, ton guide dans l'univers Strangrz. Je sais tout sur la plateforme (modeste, je sais). Pose-moi des questions sur ton compte, la galerie, les oeuvres, le Mur, la sécurité, le paiement, les royalties, ou littéralement n'importe quoi d'autre. Je promets que mes réponses sont plus utiles qu'un trou noir et significativement moins denses. Que veux-tu savoir ?",
      navigateTo: 'help',
      tabLabel: 'Aide',
    },
  },
  // Mobile / Desktop sync
  {
    keywords: ['mobile', 'desktop', 'sync', 'synchron', 'different', 'différent', 'device', 'appareil'],
    response: {
      answer: "Solde différent sur mobile et desktop ? C'est parce que Strangrz est local-first — chaque appareil a son propre portefeuille indépendant stocké localement. Pour synchroniser, va dans Portefeuille → Aperçu sur un appareil, exporte ta sauvegarde, puis importe-la sur l'autre. C'est comme avoir des stations spatiales jumelles — elles sont indépendantes jusqu'à ce que tu envoies une navette entre elles.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille → Aperçu',
    },
  },
  // Strangrz & Asset Protection
  {
    keywords: ['vobjct', 'safe', 'protection', 'intégrité', 'integrite', 'integrity', 'manifest', 'manifeste', 'resilience', 'résilience', 'persistance', 'persistence', 'storage route', 'route de stockage', 'recovery route', 'route de récupération'],
    response: {
      answer: "Strangrz, c'est le bouclier cosmique de tes Strangrz ! Chaque objet certifié reçoit un Strangrz Manifest — un passeport numérique qui contient : l'empreinte SHA-256 du média original, les routes de stockage (Supabase, IndexedDB, on-chain), les routes de récupération, les droits, la politique de mutation, et des signatures Ed25519. Strangrz Safe surveille en permanence la santé de tes objets : si une route tombe, il alerte et peut tenter une réparation automatique. Strangrz supporte aussi le multi-chain : tes objets peuvent être mintés sur StrangrzChain (SZ-721) ou Ethereum (ERC-721), avec la même protection et provenance garanties sur les deux chaînes. C'est comme avoir un coffre-fort cosmique avec alarme et serrurier intégré.",
      navigateTo: 'warts',
      tabLabel: 'Marketplace → Détail',
    },
  },
  {
    keywords: ['stockage', 'storage', 'où sont stockés', 'where stored', 'persistant', 'persistent', 'perte', 'perdu ordinateur', 'lost computer', 'hack', 'hacké', 'vol', 'stolen'],
    response: {
      answer: "Tes Strangrz sont protégées par un système de stockage multi-couches grâce à Strangrz : (1) IndexedDB local — stockage rapide sur ton appareil. (2) Supabase Cloud — backup dans le cloud. (3) On-chain — stockage permanent dans StrangrzMesh. (4) CosmoVault — tes médias chiffrés en AES-256-GCM avec ta clé StrangrzID. Si tu perds ton ordi, tes objets sont récupérables via CosmoVault (même identifiants = même clé de vault) ou le Recovery Kit. Strangrz Safe vérifie régulièrement que toutes les routes de stockage sont actives.",
      navigateTo: 'warts',
      tabLabel: 'Marketplace',
    },
  },
  {
    keywords: ['2fa', 'two factor', 'deux facteurs', 'authenticator', 'totp', 'google auth', 'authy', 'otp'],
    response: {
      answer: "La 2FA (authentification à deux facteurs) ajoute une couche de sécurité cosmique à ton StrangrzID ! Va dans Portefeuille → Aperçu et active la 2FA. Tu scanneras un QR code avec ton app d'authentification (Google Authenticator, Authy, 1Password...). Ensuite, à chaque connexion, tu devras entrer un code à 6 chiffres en plus de ton mot de passe. Tu reçois aussi 8 codes de secours — garde-les précieusement au cas où tu perds ton téléphone.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille → Aperçu',
    },
  },
  // Paiement fiat — flow complet
  {
    keywords: ['paiement', 'payment', 'carte', 'card', 'paypal', 'sepa', 'fiat', 'euro', 'euros', 'eur', 'virement', 'acheter oeuvre', 'buy artwork', 'comment acheter', 'how to buy'],
    response: {
      answer: "Acheter une oeuvre sur Strangrz, c'est aussi simple que sur n'importe quelle boutique en ligne ! Le prix est affiché en euros (€) directement sur chaque oeuvre. Clique sur « Collect €XX » — tu es redirigé vers un paiement sécurisé Stripe (carte bancaire, Apple Pay, Google Pay). Une fois le paiement confirmé, tout se passe automatiquement en arrière-plan : le protocole Strangrz transfère le certificat d'authenticité STCERT sur ton wallet, les royalties sont versées au créateur original, et le vendeur reçoit son paiement en euros sur son compte bancaire. Tu n'as jamais besoin de toucher à de la crypto — le protocole fonctionne en backend, invisible pour toi. Si tu es un crypto-enthousiaste, active le « Mode avancé » dans les Paramètres pour voir tes balances en ⬣ et payer directement en tokens.",
      navigateTo: 'gallery',
      tabLabel: 'Marketplace',
    },
  },
  // Vendre et recevoir ses euros
  {
    keywords: ['vendre', 'sell', 'recevoir euros', 'receive money', 'payout', 'retrait', 'withdrawal', 'stripe connect', 'bank account', 'compte bancaire', 'comment vendre', 'how to sell'],
    response: {
      answer: "Pour vendre tes oeuvres et recevoir tes euros, voici le process : (1) Va dans Paramètres → Payouts et configure ton compte bancaire via Stripe Connect (vérification d'identité + IBAN, une seule fois). (2) Mets ton oeuvre en vente dans la Marketplace — fixe un prix en euros. (3) Quand quelqu'un achète, le paiement est traité automatiquement : l'acheteur paie en €, le protocole transfère le certificat STCERT, et toi tu reçois 100% du prix affiché directement sur ton compte bancaire. C'est l'acheteur qui paie les frais plateforme (10% premier marché, 5% second marché) en plus du prix affiché. Les royalties sur les reventes sont aussi versées automatiquement au créateur original. Si tu n'as pas encore configuré Stripe Connect, tes gains restent en ⬣ dans ton wallet jusqu'à ce que tu le fasses.",
      navigateTo: 'settings',
      tabLabel: 'Paramètres → Payouts',
    },
  },
  // Royalties
  {
    keywords: ['royalty', 'royalties', 'revente', 'resale', 'secondary', 'secondaire', 'créateur', 'creator earnings', 'revenus créateur'],
    response: {
      answer: "Les royalties sur Strangrz sont automatiques et impossibles à contourner — c'est le protocole qui les gère, pas un contrat qu'on peut ignorer. Par défaut, 5% du prix de chaque revente est versé au créateur original. Exemple : tu crées une oeuvre à 50€. Un collectionneur l'achète, puis la revend 200€. Tu reçois automatiquement 10€ (5% de 200€) directement sur ton compte bancaire, sans rien faire. Et ça marche à l'infini — 2ème revente, 3ème, 10ème... tu touches toujours tes royalties. Le taux est configurable entre 0% et 50% au moment de la création. Note : la plateforme prélève 10% sur le premier marché et 5% sur le second marché, ces frais sont payés par l'acheteur en plus du prix affiché.",
      navigateTo: 'gallery',
      tabLabel: 'Marketplace → Créer',
    },
  },
  // Mode avancé
  {
    keywords: ['mode avancé', 'advanced mode', 'crypto mode', 'token', 'strangrz coin', '⬣', 'afficher solde', 'show balance', 'mining visible'],
    response: {
      answer: "Par défaut, Strangrz affiche les prix en euros et masque les mécanismes crypto pour offrir une expérience simple aux collectionneurs. Si tu veux accéder aux fonctionnalités avancées — voir tes Strngrz Coins (⬣), miner des reward tokens, faire des transferts P2P, ou consulter les détails du protocole — active le « Mode avancé » dans Paramètres → Advanced Mode. Ça débloque : le Wallet dans la sidebar, les balances en Strngrz Coins, le minage, et les outils crypto. Rappel : les STZ sont des tokens de récompense, pas une monnaie. 1 œuvre achetée = 100 STZ, et à 2 000 STZ tu reçois une œuvre exclusive en airdrop !",
      navigateTo: 'settings',
      tabLabel: 'Paramètres → Advanced Mode',
    },
  },
  // Profile features
  {
    keywords: ['profil', 'profile', 'adresse', 'address', 'copier', 'copy', 'utilisateur', 'user', 'pseudo', 'alias', 'nom'],
    response: {
      answer: "Chaque utilisateur a un profil avec son pseudo, sa bio, ses liens sociaux (site web, Instagram, X) et ses statistiques. Tu peux visiter le profil d'un créateur en cliquant sur son nom dans la Marketplace ou le Mur. Sur chaque profil, tu peux copier l'adresse Strangrz en cliquant dessus — pratique pour envoyer des Strangrz ! Tu verras aussi ses créations, sa collection et ses posts.",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur → Profil',
    },
  },
  // Social bar
  {
    keywords: ['barre sociale', 'social bar', 'coeur', 'heart', 'signet', 'bookmark', 'partager', 'share', 'repost', 'recosmo', 'hexagone', 'pourboire tip'],
    response: {
      answer: "La barre sociale est présente partout — sous les posts du Mur, les cartes de la Marketplace, et les profils utilisateurs. Elle contient : ❤️ Like, ↻ ReStrangrz (repost), ↑ Partager, et 🔖 Signet (bookmark). L'icône hexagone (⬣) représente les Strngrz Coins — des tokens de récompense pour les collectionneurs. Chaque œuvre collectionnée te rapporte 100 STZ !",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur',
    },
  },
  // Delete profile
  {
    keywords: ['supprimer', 'delete', 'effacer', 'compte', 'désinscription', 'desinscription', 'quitter'],
    response: {
      answer: "Tu veux quitter le cosmos ? C'est triste, mais c'est ton droit. Va dans Paramètres et cherche « Supprimer le profil ». La suppression est définitive : ton solde de Strangrz est réintégré dans le pool d'airdrop pour les futurs voyageurs, et toutes tes données locales sont effacées (portefeuille, profil social, données du Mur). Assure-toi de sauvegarder tes objets avant — une fois supprimé, il n'y a pas de retour !",
      navigateTo: 'settings',
      tabLabel: 'Paramètres',
    },
  },
  // Forgot password
  {
    keywords: ['oublié', 'forgot', 'password', 'mot de passe', 'perdu mot de passe', 'lost password', 'connexion impossible'],
    response: {
      answer: "Mot de passe oublié ? Si tu utilises un StrangrzID, ton portefeuille est dérivé de ton nom d'utilisateur + mot de passe. Sans le mot de passe exact, il est mathématiquement impossible de retrouver ta clé privée (PBKDF2 avec 600 000 itérations). Tu peux cependant te déconnecter dans l'écran de verrouillage via le bouton « Mot de passe oublié ? », et créer un nouveau compte. Si tu as sauvegardé ta clé de récupération (Recovery Kit), tu peux aussi importer ton portefeuille existant.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille',
    },
  },
  // STZ Token
  {
    keywords: ['stz', 'token', 'coin', 'strangrz coin', 'monnaie', 'currency', 'hexagone', '⬣', 'strngrz', 'tokenomics', 'supply', 'valeur', 'prix token', 'combien vaut'],
    response: {
      answer: "Les Strngrz Coins (⬣, ticker STZ) sont des tokens de récompense — pas une monnaie ! Ils récompensent les collectionneurs : 1 œuvre achetée = 100 STZ. Quand tu atteins 2 000 STZ (soit 20 œuvres collectionnées), tu reçois en airdrop une œuvre digitale exclusive en série limitée, curatée par la plateforme. C'est le programme de fidélité ultime pour les collectionneurs d'art numérique. Tu peux aussi gagner des STZ en minant (preuve de calcul) et en restant actif (streak rewards). Les 100 premiers inscrits reçoivent 2 000 STZ = 1 œuvre exclusive Limited Edition par Xerak ! Supply fixe de 69 millions. Répartition : 84 % minage (58M), 14,5 % airdrops (10M), 1,5 % créateur (1M). Transactions toujours gratuites, zéro gas.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc → Tokenomics',
    },
  },
  // StrangrzID
  {
    keywords: ['strangrzid', 'cosmo id', 'identifiant', 'login', 'connexion', 'se connecter', 'sign in', 'sign up', 'inscription'],
    response: {
      answer: "StrangrzID est ton identifiant unique sur Strangrz. Il dérive un portefeuille déterministe à partir de ton nom d'utilisateur + mot de passe grâce à la cryptographie Ed25519 et PBKDF2. Même identifiants = même portefeuille, sur n'importe quel appareil. Pas d'email, pas de numéro de téléphone — juste un pseudo et un mot de passe. Chaque nouveau compte reçoit 300 Strngrz Coins (⬣) de bienvenue. Collectionne des œuvres pour en gagner plus — 100 STZ par œuvre ! Conseil : choisis un mot de passe FORT — il n'y a pas de récupération possible sans Recovery Kit !",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille',
    },
  },
  // Curate
  {
    keywords: ['curate', 'curator', 'curateur', 'magazine', 'article', 'editorial', 'éditorial', 'mise en valeur', 'highlight', 'badge curator', 'badge curateur'],
    response: {
      answer: "Curate, c'est le Vogue de Strangrz ! Un magazine d'art intégré où les collectionneurs deviennent des curateurs. Comment ça marche ? Collectionne 10 œuvres certifiées et tu débloques le statut Curateur — un badge doré apparaît sur ton profil. Ensuite tu peux : écrire des articles éditoriaux, mettre en avant tes artistes préférés, créer des sélections curatées, et apparaître dans le classement Top Curators. C'est comme être rédacteur en chef de ton propre magazine d'art numérique. Va dans Gallery → Curate pour explorer les articles publiés ou commencer à écrire le tien !",
      navigateTo: 'gallery',
      tabLabel: 'Gallery → Curate',
    },
  },
  // Trading
  {
    keywords: ['trading', 'trade', 'trader', 'acheter', 'vendre', 'opensea', 'portfolio', 'portefeuille trading', 'cours', 'prix', 'volume', 'classement', 'ranking', 'floor price', 'listing', 'delist', 'p&l', 'profit', 'perte'],
    response: {
      answer: "Le Trading Floor, c'est ton OpenSea personnel — mais en mieux et sans gas fees ! Tu y trouves : (1) Vue d'ensemble du marché avec stats en temps réel — volume total, listings actifs, prix plancher, prix moyen. (2) Live Listings — toutes les œuvres en vente, triées par prix, date, popularité ou volume. (3) Activité — feed en temps réel de toutes les ventes, mints et transferts. (4) Collections — classement des collections par volume et floor price. (5) Portfolio — valeur totale de ta collection, P&L non réalisé, et gestion de tes listings. Bonus : chaque œuvre achetée te rapporte 100 Strngrz Coins (⬣) ! À 2 000 STZ, tu reçois une œuvre exclusive en airdrop. Zéro gas, zéro frais cachés. Va dans Gallery → Trading pour commencer !",
      navigateTo: 'gallery',
      tabLabel: 'Gallery → Trading',
    },
  },
  // Level / Particle
  {
    keywords: ['level', 'niveau', 'particle', 'wave', 'atom', 'molecule', 'star', 'galaxy', 'universe', 'lv', 'lv.1', 'hiérarchie', 'hierarchy', 'rang', 'rank'],
    response: {
      answer: "Le système de niveaux Strangrz suit les 7 couches cosmiques : Lv.1 Particle (débutant), Lv.2 Wave (voyageur harmonique), Lv.3 Atom (noyau stable), Lv.4 Molecule (structure complexe), Lv.5 Star (luminaire), Lv.6 Galaxy (constellation), Lv.7 Universe (transcendance). Tu progresses en faisant des transactions et en restant actif. Chaque niveau débloque un multiplicateur de minage plus élevé et des bonus d'airdrop. Particle c'est le début du voyage — tout le monde commence là !",
      navigateTo: 'profile',
      tabLabel: 'Profil',
    },
  },
];

const FALLBACK: CosmoResponse = {
  answer: "Hmm, voilà une question que même le cosmos n'a jamais entendue ! Je ne suis pas sûr d'avoir la réponse exacte, mais je parie que le Livre Blanc l'a. Il contient 11 sections couvrant littéralement tout sur Strangrz. Va le consulter, et si tu as encore des questions, reviens — je serai là, à contempler l'entropie de l'univers.",
  navigateTo: 'whitepaper',
  tabLabel: 'Livre Blanc',
};

function findBestMatch(input: string): CosmoResponse {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (normalized.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch ? bestMatch.response : FALLBACK;
}

// ─── Chat Message Type ───────────────────────────────────

interface ChatMsg {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  navigateTo?: string;
  tabLabel?: string;
}

// ─── FAQ Data ────────────────────────────────────────────

const FAQ_ICONS: Record<string, ReactNode> = {
  'Pour commencer': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>,
  'Publier & Vendre': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
  'Minage & Strangrz': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
  'Galerie & Oeuvres': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  'Marketplace (Strangrz)': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  'Le Mur (Réseau social)': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  'Technologie & Sécurité': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  'StrangrzMesh & StrangrzCode': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  'Paiement': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M15 9.354a4 4 0 0 0-2.764-1.354C10.448 7.89 9 9.005 9 10.5c0 1.38 1.12 2.5 3.236 2.5C14.12 13 16 14.12 16 15.5c0 1.495-1.448 2.61-3.236 2.5A4 4 0 0 1 10 16.646" /><line x1="12" y1="6" x2="12" y2="8" /><line x1="12" y1="18" x2="12" y2="20" /></svg>,
  'Strangrz & Protection des actifs': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16" r="1" /></svg>,
  'Sécurité': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  'Marché secondaire': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  'Prix & Impact': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M15 9.354a4 4 0 0 0-2.764-1.354C10.448 7.89 9 9.005 9 10.5c0 1.38 1.12 2.5 3.236 2.5C14.12 13 16 14.12 16 15.5c0 1.495-1.448 2.61-3.236 2.5A4 4 0 0 1 10 16.646" /><line x1="12" y1="6" x2="12" y2="8" /><line x1="12" y1="18" x2="12" y2="20" /></svg>,
  'Ethereum & Multi-Chain': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L4 12l8 5 8-5L12 2z" /><path d="M4 12l8 10 8-10-8 5-8-5z" /></svg>,
  'Curate — Magazine & Curateurs': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  'Trading Floor': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
};

const FAQ_SECTIONS = [
  {
    title: 'Pour commencer',
    icon: 'Pour commencer',
    items: [
      { q: `Comment créer un compte ?`, a: `Va dans Mon Compte et choisis un nom d'utilisateur et un mot de passe. Aucun email requis. Tu es prêt en 30 secondes.` },
      { q: `Comment acheter une oeuvre ?`, a: `Parcours la Galerie, clique sur une oeuvre et appuie sur « Collect ». Paie par carte bancaire, Apple Pay ou Google Pay. C'est tout !` },
      { q: `Comment sauvegarder mon compte ?`, a: `Dans Mon Compte → Aperçu, télécharge ta sauvegarde de récupération. Garde-la en lieu sûr — il n'y a pas de réinitialisation de mot de passe !` },
    ],
  },
  {
    title: 'Publier & Vendre',
    icon: 'Minage & Strangrz',
    items: [
      { q: `Comment publier une oeuvre ?`, a: `Va dans la Galerie et clique sur « + Créer ». Uploade ton média (image, vidéo, musique), ajoute un titre, une description et un prix en euros. Publie et c'est en ligne !` },
      { q: `Comment fixer le prix ?`, a: `Le prix minimum est de 10€ par oeuvre. Fixe ton prix en euros — les acheteurs paient par carte bancaire, et tu reçois tes euros directement.` },
      { q: `Comment recevoir mes paiements ?`, a: `Quand un collectionneur achète ton oeuvre, le paiement est traité automatiquement via Stripe. Tu reçois tes euros sur ton compte bancaire.` },
    ],
  },
  {
    title: 'Galerie & Oeuvres',
    icon: 'Marketplace (Strangrz)',
    items: [
      { q: `Qu'est-ce qu'on peut acheter ?`, a: `Art numérique, photographies, musique, vidéos, et objets physiques certifiés (sneakers, vinyles, montres, cartes de collection). Chaque oeuvre est accompagnée d'un certificat d'authenticité infalsifiable.` },
      { q: `La plateforme gère-t-elle la livraison d'objets physiques ?`, a: `Non. Strangrz est une plateforme de certification et de vente d'oeuvres numériques. Pour les objets physiques certifiés, la plateforme fournit uniquement le certificat d'authenticité numérique (STCERT) et la transaction de vente. La livraison, l'expédition et la logistique sont entièrement à la charge du vendeur et de l'acheteur, qui doivent s'organiser entre eux (via les messages directs de la plateforme par exemple). Strangrz ne peut être tenu responsable des problèmes de livraison, de perte ou de dommages liés au transport d'objets physiques.` },
      { q: `Quels formats sont supportés ?`, a: `.gif .jpeg .png (images), .mp3 (audio avec pochette), .mp4 .mov (vidéo), et Cards. Le tout limité à 50 Mo.` },
      { q: `Qu'est-ce que le certificat STCERT ?`, a: `Un certificat d'authenticité numérique infalsifiable qui accompagne chaque oeuvre. Il contient une empreinte numérique unique du contenu, la signature du créateur et un horodatage. Il est vérifiable par tous et permanent.` },
      { q: `Les oeuvres sont-elles protégées ?`, a: `Oui ! Chaque oeuvre bénéficie d'un stockage sécurisé multi-couches et d'un monitoring actif. Si un problème est détecté, le système lance automatiquement une réparation.` },
      { q: `Comment fonctionnent les royalties ?`, a: `Les artistes reçoivent automatiquement 5% du prix à chaque revente de leur oeuvre. C'est géré par la plateforme — aucune action requise. Le taux est configurable entre 0% et 50% à la publication. Les frais plateforme (10% premier marché, 5% second marché) sont payés par l'acheteur en plus du prix affiché — le vendeur reçoit 100% du prix.` },
    ],
  },
  {
    title: 'Le Mur (Réseau social)',
    icon: 'Le Mur (Réseau social)',
    items: [
      { q: `Qu'est-ce que le Mur ?`, a: `Un réseau social intégré dédié à l'art et aux collectionneurs. Publie, crée des canaux thématiques, envoie des messages directs aux artistes.` },
      { q: `Comment interagir avec les artistes ?`, a: `Like les posts pour soutenir les créateurs, envoie des messages directs, suis tes artistes préférés et partage leurs oeuvres.` },
      { q: `Qu'est-ce que le RePost ?`, a: `Comme un retweet — partage le post de quelqu'un à tes abonnés sur ta timeline.` },
    ],
  },
  {
    title: 'Technologie & Sécurité',
    icon: 'StrangrzMesh & StrangrzCode',
    items: [
      { q: `Comment fonctionne la certification ?`, a: `Quand tu publies une oeuvre, Strangrz génère automatiquement un certificat d'authenticité (STCERT) infalsifiable. Il est basé sur une empreinte numérique unique du contenu et la signature du créateur. Tout est automatique — tu n'as rien à faire.` },
      { q: `Mes oeuvres sont-elles protégées ?`, a: `Oui ! Chaque oeuvre bénéficie d'un stockage multi-couches (local + cloud + sauvegarde permanente), d'un monitoring actif, et de réparation automatique si un problème est détecté.` },
      { q: `Est-ce que la plateforme est rapide ?`, a: `Oui. Strangrz utilise une infrastructure à 7 couches parallèles qui garantit des transactions quasi-instantanées. Publier une oeuvre ou acheter prend quelques secondes.` },
    ],
  },
  {
    title: 'Paiement',
    icon: 'Paiement',
    items: [
      { q: `Comment payer ?`, a: `Carte bancaire, Apple Pay ou Google Pay. Paiement sécurisé par Stripe. Tous les prix sont affichés en euros.` },
      { q: `Comment recevoir mes ventes ?`, a: `Les paiements sont traités automatiquement via Stripe. L'acheteur paie en euros, tu reçois tes euros directement sur ton compte bancaire.` },
      { q: `Y a-t-il des frais ?`, a: `La publication est gratuite. L'acheteur paie des frais plateforme : 10% sur le premier marché (première vente d'une oeuvre) et 5% sur le second marché (reventes). Ces frais sont ajoutés au prix affiché — le vendeur reçoit 100% de son prix. Les royalties (5% par défaut, configurable 0-50%) sont versées automatiquement au créateur original sur chaque revente.` },
    ],
  },
  {
    title: 'Strangrz & Protection des actifs',
    icon: 'Strangrz & Protection des actifs',
    items: [
      { q: `Qu'est-ce que Strangrz ?`, a: `Strangrz est le standard d'intégrité et de résilience des actifs numériques de Strangrz. Chaque objet certifié reçoit un « Strangrz Manifest » — un passeport numérique contenant empreinte SHA-256, routes de stockage, droits, politique de mutation, et signatures Ed25519. C'est chain-agnostic : il peut s'adapter à EVM, XRPL, Solana et d'autres.` },
      { q: `Qu'est-ce que Strangrz Safe ?`, a: `Strangrz Safe est le système de surveillance et réparation automatique. Il vérifie régulièrement que les routes de stockage sont actives (Supabase, IndexedDB, on-chain). Si une route tombe, Safe passe l'objet en état « warning » puis « degraded » et peut lancer des réparations automatiques (re-upload, ajout de miroir). Un journal d'incidents trace chaque action.` },
      { q: `Où sont stockées mes Strangrz ?`, a: `Stockage multi-couches : (1) IndexedDB local pour l'accès rapide, (2) Supabase Cloud pour la persistance, (3) StrangrzMesh on-chain pour le stockage permanent. Strangrz Safe vérifie que chaque objet a au moins 2 routes actives. Le CosmoVault chiffre les médias en AES-256-GCM.` },
      { q: `Que se passe-t-il si je perds mon ordinateur ?`, a: `Tes objets sont récupérables : (1) Reconnecte-toi avec le même StrangrzID → même clé de vault → accès à tous tes médias chiffrés. (2) Utilise ton Recovery Kit (téléchargeable, fonctionne hors ligne). (3) Récupération on-chain via StrangrzCode SVG. (4) Récupération peer-to-peer (fragments chiffrés).` },
      { q: `Quels sont les droits gérés par Strangrz ?`, a: `Chaque manifest définit : droits d'affichage (allowed/forbidden), usage commercial (personal_only/commercial), dérivés (forbidden/allowed), licence version, et termes personnalisés. Ces droits sont embarqués dans le manifest et signés cryptographiquement.` },
    ],
  },
  {
    title: 'Sécurité',
    icon: 'Sécurité',
    items: [
      { q: `Strangrz est-il sécurisé ?`, a: `7 couches de sécurité : signatures Ed25519, limitation de débit, suivi des nonces, limites de montant, détection de patterns, intégrité d'état, registre admin chiffré. En plus, Strangrz Safe surveille l'intégrité de chaque objet certifié en continu.` },
      { q: `Qu'est-ce que la 2FA sur Strangrz ?`, a: `Authentification à deux facteurs (TOTP RFC 6238) pour ton StrangrzID. Active-la dans Portefeuille → Aperçu. Compatible avec Google Authenticator, Authy, 1Password. Tu reçois 8 codes de secours en cas de perte de téléphone.` },
      { q: `Qu'est-ce que le Recovery Kit ?`, a: `Un bundle JSON chiffré contenant tous tes objets de vault, double-chiffré (clé vault + mot de passe de récupération). Téléchargeable dans Portefeuille → Aperçu. Il est auto-généré à la création du wallet et un rappel apparaît tous les 7 jours.` },
      { q: `Est-ce que ça fonctionne hors ligne ?`, a: `Oui ! Le service worker met l'app en cache pour une utilisation hors ligne. Elle se met aussi à jour automatiquement quand une nouvelle version est disponible.` },
      { q: `Où sont stockées mes données ?`, a: `Stockage multi-couches via Strangrz : IndexedDB local (échelle Go), Supabase Cloud, et StrangrzMesh on-chain. CosmoVault chiffre les médias en AES-256-GCM. Strangrz Safe garantit la redondance avec au moins 2 routes actives par objet.` },
      { q: `J'ai oublié mon mot de passe, que faire ?`, a: `Si tu utilises un StrangrzID, le mot de passe est irréversible (PBKDF2 600K itérations). Tu peux te déconnecter via « Mot de passe oublié ? » sur l'écran de verrouillage, puis créer un nouveau compte. Si tu as un Recovery Kit, tu peux restaurer ton portefeuille.` },
      { q: `Comment supprimer mon compte ?`, a: `Va dans Paramètres → Supprimer le profil. Ton solde est réintégré au pool d'airdrop. Toutes les données locales sont effacées définitivement (portefeuille, profil, données sociales).` },
      { q: `Comment copier l'adresse d'un utilisateur ?`, a: `Visite son profil (clique sur son nom dans le Mur ou la Marketplace), puis clique sur l'adresse affichée sous le pseudo. Elle sera copiée dans ton presse-papiers. Une icône ✓ confirme la copie.` },
    ],
  },
  {
    title: 'Prix & Impact',
    icon: 'Paiement',
    items: [
      {
        q: 'Pourquoi un prix minimum de 10€ pour les oeuvres ?',
        a: `Strangrz n'est pas une plateforme gratuite de publication. Le prix minimum garantit :\n\n• La valorisation du travail des artistes — une oeuvre a de la valeur\n• Un filtre anti-spam — pas de flood d'oeuvres générées en masse\n• Un écosystème économique durable\n• Des royalties significatives à chaque revente\n\nL'art gratuit dévalue la création. Strangrz protège les artistes en imposant un plancher qui donne du sens à chaque oeuvre.`,
      },
      {
        q: 'Quel est l\'impact écologique de Strangrz ?',
        a: `Strangrz est l'une des plateformes les plus éco-responsables pour l'art :\n\n• Architecture ultra-légère — chaque transaction consomme ~0.001 Wh\n• Stockage intelligent — compression avancée qui réduit l'empreinte de 5 à 30x\n• Pas de calculs énergivores — 99.9% plus efficace que les plateformes traditionnelles\n• Zéro gaspillage — pas de processus inutile`,
      },
      {
        q: 'Pourquoi l\'art ne doit pas être gratuit ?',
        a: `Le modèle "gratuit" a détruit la valeur de la création numérique pendant 20 ans :\n\n• Les artistes sur les plateformes gratuites gagnent en moyenne 0.003 $ par stream/vue\n• Les galeries sans prix minimum sont envahies par le spam\n\nStrangrz impose un prix minimum de 10€ parce que :\n\n1. La création a de la valeur — un prix plancher respecte le travail de l'artiste\n2. Les collectionneurs investissent — un achat crée un engagement réel\n3. L'écosystème vit — les royalties et le marché secondaire génèrent une économie circulaire\n4. Anti-spam — le coût d'entrée décourage la pollution\n5. Durabilité — un écosystème où la création a un prix est un écosystème qui survit`,
      },
    ],
  },
  {
    title: 'Curate — Magazine & Curateurs',
    icon: 'Curate — Magazine & Curateurs',
    items: [
      { q: `Qu'est-ce que Curate ?`, a: `Curate est la plateforme éditoriale de Strangrz. C'est un magazine d'art intégré où les collectionneurs-curateurs publient des articles, mettent en valeur des artistes et partagent leurs collections.` },
      { q: `Comment devenir Curateur ?`, a: `Collectionnez 10 oeuvres certifiées sur la Marketplace. Une fois le seuil atteint, vous débloquez le statut Curateur et un badge doré apparaît sur votre profil. Vous pouvez alors publier des articles dans Curate.` },
      { q: `Que peut faire un Curateur ?`, a: `Les Curateurs peuvent : (1) Écrire des articles éditoriaux, (2) Mettre en avant des artistes et des oeuvres de leur collection, (3) Créer des sélections curatoriales, (4) Apparaître dans le classement Top Curators, (5) Partager leurs articles avec la communauté.` },
      { q: `Comment écrire un article ?`, a: `Allez dans Gallery → Curate → New Article. Donnez un titre, un sous-titre, rédigez votre article, sélectionnez les oeuvres à mettre en avant depuis votre collection, taguez les artistes, et publiez.` },
      { q: `Comment apparaître dans Top Curators ?`, a: `Le classement se base sur le nombre d'articles publiés, les likes reçus et les vues totales. Plus vos articles sont appréciés, plus vous montez dans le classement.` },
    ],
  },
  {
    title: 'Marché secondaire',
    icon: 'Trading Floor',
    items: [
      { q: `C'est quoi le marché secondaire ?`, a: `C'est l'espace où les collectionneurs peuvent revendre leurs oeuvres. Suivez les prix, les tendances et l'activité en temps réel. Gérez votre collection et mettez en vente vos pièces à tout moment.` },
      { q: `Comment revendre une oeuvre ?`, a: `Allez dans votre collection, sélectionnez une oeuvre et fixez votre prix de revente en euros. Vous recevez 100% du prix affiché moins les royalties du créateur original (5% par défaut). L'acheteur paie 5% de frais plateforme en plus du prix affiché.` },
      { q: `Comment suivre ma collection ?`, a: `Dans la section Marché, visualisez la valeur de votre collection, vos oeuvres en vente, et les tendances du marché en temps réel.` },
      { q: `Comment voir l'activité du marché ?`, a: `L'onglet Activité vous montre toutes les ventes récentes avec filtres temporels (1h, 24h, 7j, 30j). Suivez les tendances en temps réel.` },
    ],
  },
];

// ─── Component ───────────────────────────────────────────

export default function HelpView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet } = useWallet();
  const [tab, setTab] = useState<'faq' | 'cosmo'>('cosmo');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: `Salut ! Je suis Doctor Strangrz, ton guide dans l'univers Strangrz. Pose-moi n'importe quelle question — compte, galerie, oeuvres, paiement, sécurité, le Mur... je sais tout. (Et oui, je suis plus drôle qu'une FAQ classique.)`,
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = {
      id: Date.now().toString(36),
      role: 'user',
      text: input.trim(),
    };

    const response = findBestMatch(input);
    const cosmoMsg: ChatMsg = {
      id: Date.now().toString(36) + '_r',
      role: 'cosmo',
      text: response.answer,
      navigateTo: response.navigateTo,
      tabLabel: response.tabLabel,
    };

    setMessages(prev => [...prev, userMsg, cosmoMsg]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-panel p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 50% 50%, #22c55e 0%, transparent 50%)',
        }} />
        <div className="relative">
          <h1 className="text-title-md font-bold opacity-100 font-title mb-1 flex items-center justify-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Centre d'aide
          </h1>
          <p className="text-body-sm opacity-60">
            FAQ & Doctor Strangrz — Votre guide IA dans l'univers Strangrz
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="glass-panel p-1 flex gap-1">
        <button
          onClick={() => setTab('cosmo')}
          className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'cosmo'
              ? 'bg-current/10 opacity-80'
              : 'opacity-50 hover:opacity-90 hover:bg-current/5'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
          Doctor Strangrz (Oracle)
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'faq'
              ? 'bg-current/10 opacity-80'
              : 'opacity-50 hover:opacity-90 hover:bg-current/5'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          FAQ
        </button>
        <button
          onClick={() => onNavigate('whitepaper')}
          className="flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 opacity-50 hover:opacity-90 hover:bg-current/5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          White Paper
        </button>
      </div>

      {/* ─── Doctor Strangrz Chatbot ──────────────────────────────────── */}
      {tab === 'cosmo' && (
        <div className="glass-panel flex flex-col" style={{ height: '65vh', minHeight: 400 }}>
          {/* Chat header */}
          <div className="p-3 border-b border-current/10 flex items-center gap-3">
            <div className="w-8 h-8 bg-current/5 border border-current/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
            </div>
            <div>
              <p className="text-base font-bold opacity-90">Doctor Strangrz</p>
              <p className="text-label opacity-80">En ligne — Oracle de Strangrz</p>
            </div>
            {wallet && (
              <span className="text-label opacity-50 ml-auto">
                {wallet.alias || wallet.address.slice(0, 10)}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-current/5 border border-current/10'
                    : 'bg-current/5 border border-current/10'
                } p-3`}>
                  {msg.role === 'cosmo' && (
                    <p className="text-label opacity-80 font-bold mb-1 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
                      Doctor Strangrz
                    </p>
                  )}
                  <p className="text-body-sm opacity-70 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  {msg.navigateTo && msg.navigateTo !== 'help' && (
                    <button
                      onClick={() => onNavigate(msg.navigateTo!)}
                      className="mt-2 text-label opacity-80 hover:opacity-80 cursor-pointer flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                      {' '}Aller à {msg.tabLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-current/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question à Doctor Strangrz..."
                className="flex-1 bg-current/5 border border-current/10 px-3 py-2 text-body-sm opacity-90 placeholder-current/30 outline-none focus:border-current/15"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 bg-current/10 border border-current/15 opacity-80 text-body-sm font-medium cursor-pointer hover:bg-current/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['Comment acheter ?', "C'est quoi Strangrz ?", 'Comment publier une oeuvre ?', 'Comment recevoir mes paiements ?', 'Sécurité & 2FA'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-label opacity-60 hover:opacity-80 cursor-pointer px-2 py-1 bg-white/3 border border-gray-800/30 hover:border-current/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── FAQ ────────────────────────────────────────────── */}
      {tab === 'faq' && (
        <div className="space-y-4">
          {FAQ_SECTIONS.map(section => (
            <FaqSection key={section.title} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FAQ Section Component ────────────────────────────────

function FaqSection({ section }: { section: typeof FAQ_SECTIONS[number] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-3 border-b border-current/10 flex items-center gap-2">
        <span className="opacity-80">{FAQ_ICONS[section.icon] || section.icon}</span>
        <h3 className="text-base font-bold opacity-90">{section.title}</h3>
      </div>
      <div>
        {section.items.map((item, i) => (
          <div key={i} className="border-b border-white/3 last:border-0">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left p-3 flex items-center justify-between text-base hover:bg-white/3 transition-all cursor-pointer"
            >
              <span className="opacity-70 font-medium">{item.q}</span>
              <span className={`opacity-60 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </button>
            {openIndex === i && (
              <div className="px-3 pb-3">
                <p className="text-base opacity-60 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
