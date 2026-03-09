import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

// ─── Cosmo Chatbot Knowledge Base ────────────────────────

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
  // Wallet
  {
    keywords: ['wallet', 'portefeuille', 'create', 'creer', 'créer', 'account', 'compte', 'sign up', 'inscription'],
    response: {
      answer: "Ah, un nouveau voyageur dans le cosmos ! Cr\u00e9er un portefeuille, c'est plus simple que d'expliquer la physique quantique \u00e0 un chat. Va dans la section Portefeuille, choisis un mot de passe (pas 'motdepasse123' s'il te pla\u00eet \u2014 le cosmos observe), et hop \u2014 te voil\u00e0 Particle. Tout le monde commence Particle. M\u00eame moi. Enfin, moi c'est Cosmo, donc techniquement j'ai commenc\u00e9 en tant qu'univers entier. Mais c'est une autre histoire.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille',
    },
  },
  {
    keywords: ['balance', 'solde', 'warp', 'warps', 'zero', '0', 'argent', 'money'],
    response: {
      answer: "Ton solde affiche 0 ? Pas de panique \u2014 tu n'es pas cass\u00e9, tu es juste... cosmiquement nouveau. Va dans l'onglet Miner de ton Portefeuille et commence \u00e0 miner ! Chaque calcul rapporte des Warps (\u03A9). Dis-toi que l'univers ne te donne pas de poussi\u00e8re d'\u00e9toile gratuitement, il faut l'extraire du vide. Aussi, chaque appareil a son propre portefeuille local \u2014 donc ton ordi et ton t\u00e9l\u00e9phone ne partagent pas le m\u00eame solde sauf si tu exportes/importes.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Miner',
    },
  },
  {
    keywords: ['send', 'envoyer', 'transfer', 'transferer', 'transférer', 'payer', 'pay'],
    response: {
      answer: "Envoyer des Warps, c'est comme lancer une \u00e9toile filante \u00e0 travers le mesh \u2014 magnifique ET rapide. Ouvre ton Portefeuille, va dans l'onglet Envoyer, entre l'adresse Cosmorare du destinataire et le montant. Ajoute un m\u00e9mo si tu te sens po\u00e9tique. Conseil de pro : v\u00e9rifie l'adresse deux fois. Le cosmos pardonne, mais les fautes de frappe non.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Envoyer',
    },
  },
  {
    keywords: ['backup', 'recovery', 'key', 'clé', 'cle', 'sauvegarde', 'récupération', 'recuperation', 'lost', 'perdu'],
    response: {
      answer: "Ta cl\u00e9 de r\u00e9cup\u00e9ration, c'est ton assurance cosmique ! Va dans Portefeuille \u2192 Aper\u00e7u et tu verras l'option pour t\u00e9l\u00e9charger ta sauvegarde. GARDE-LA EN LIEU S\u00dbR. Tatoue-la \u00e0 l'int\u00e9rieur de tes paupi\u00e8res si besoin. Je plaisante. Mais s\u00e9rieusement \u2014 perds la cl\u00e9, perds le portefeuille. L'univers est d\u00e9centralis\u00e9, ce qui veut dire que personne ne peut r\u00e9initialiser ton mot de passe. Pas m\u00eame moi. Et je suis litt\u00e9ralement l'oracle.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Aper\u00e7u',
    },
  },
  // Mining
  {
    keywords: ['mine', 'miner', 'mining', 'minage', 'earn', 'gagner', 'difficulty', 'difficulté'],
    response: {
      answer: "Miner sur Cosmorare, ce n'est pas faire bouillir les oc\u00e9ans ! Tu ex\u00e9cutes des programmes CosmoASM de preuve de calcul. Choisis ta difficult\u00e9 : L\u00e9ger (petit en-cas), Moyen (bon steak), ou Intense (escalader l'Everest en tongs). Plus c'est difficile = plus de Warps. La r\u00e9compense suit la courbe de D\u00e9croissance par R\u00e9sonance \u2014 une formule bas\u00e9e sur le nombre d'or (\u03C6) bien plus douce que les halvings capricieux de Bitcoin. Va miner de la poussi\u00e8re d'\u00e9toile !",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Miner',
    },
  },
  // Wart Market
  {
    keywords: ['wart', 'warts', 'nft', 'art', 'mint', 'create art', 'créer art', 'marketplace', 'marché', 'objet', 'rare', 'certifier', 'certification', 'pokemon', 'sneaker', 'sneakers', 'vinyle', 'montre', 'watches'],
    response: {
      answer: "Les Cosmorares, ce sont les objets rares certifi\u00e9s sur Cosmorare \u2014 cartes Pok\u00e9mon, sneakers, vinyles, montres, art num\u00e9rique... Chaque Cosmorare re\u00e7oit un Certificat d'Authenticit\u00e9 infalsifiable (CRCERT) avec une empreinte SHA-256 sign\u00e9e par ta cl\u00e9 Ed25519. C'est un acte de naissance cosmique qui prouve que TU l'as certifi\u00e9. Tu peux uploader des images, GIF, audio (MP3 avec pochette), et vid\u00e9o (MP4/MOV), le tout jusqu'\u00e0 5 Mo. Direction la Marketplace pour certifier ton premier objet rare !",
      navigateTo: 'warts',
      tabLabel: 'Marketplace',
    },
  },
  {
    keywords: ['buy', 'acheter', 'sell', 'vendre', 'price', 'prix', 'list', 'marketplace'],
    response: {
      answer: "Tu veux acheter une Cosmorare ? Parcours la Marketplace, trouve un objet rare qui parle \u00e0 ton \u00e2me cosmique, et clique sur Acheter. Le cr\u00e9ateur est pay\u00e9, et en cas de revente, il touche encore des royalties (5 % par d\u00e9faut). Tu veux vendre ? Va dans ta collection, fixe un prix, et mets en vente. L'univers s'occupe du reste. Rappelle-toi : le go\u00fbt est subjectif, mais les maths non \u2014 v\u00e9rifie le certificat CRCERT avant d'acheter !",
      navigateTo: 'warts',
      tabLabel: 'Marketplace',
    },
  },
  {
    keywords: ['certificate', 'certificat', 'authenticity', 'authenticité', 'crcert', 'cwcert', 'fingerprint', 'empreinte', 'verify', 'vérifier'],
    response: {
      answer: "Chaque Cosmorare certifi\u00e9e poss\u00e8de un CRCERT \u2014 un Certificat d'Authenticit\u00e9 infalsifiable. C'est un hash SHA-256 de l'adresse Cosmorare du cr\u00e9ateur + empreinte du contenu + horodatage + titre, sign\u00e9 avec la cl\u00e9 priv\u00e9e Ed25519 du cr\u00e9ateur. Traduction : c'est math\u00e9matiquement impossible \u00e0 falsifier. Clique sur \u00ab V\u00e9rifier \u00bb sur n'importe quelle Cosmorare pour lancer une v\u00e9rification d'int\u00e9grit\u00e9 compl\u00e8te. Si \u00e7a affiche \u00ab \u2714 Authentique \u00bb \u2014 tu es tranquille. Sinon... quelqu'un a fait des b\u00eatises.",
      navigateTo: 'warts',
      tabLabel: 'Marketplace \u2192 D\u00e9tail',
    },
  },
  // Mur (ex-CosmoChat)
  {
    keywords: ['mur', 'cosmochat', 'chat', 'social', 'message', 'messages', 'dm', 'channel', 'canal', 'post', 'publier'],
    response: {
      answer: "Le Mur, c'est ton r\u00e9seau social chiffr\u00e9 et d\u00e9centralis\u00e9 ! Imagine Telegram + Instagram + Discord, mais dans l'espace. Publie sur la timeline, cr\u00e9e des canaux, envoie des DM, et donne des pourboires en Warps au lieu de likes (parce que mettre ton argent l\u00e0 o\u00f9 tu parles > un emoji c\u0153ur). Partage des liens vers des Cosmorares, des actus, des pens\u00e9es cosmiques... l'univers est ton fil. Chiffr\u00e9. Anonyme. S\u00e9curis\u00e9.",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur',
    },
  },
  {
    keywords: ['tip', 'tips', 'pourboire', 'like', 'aimer', 'rewarp', 'retweet', 'share', 'partager'],
    response: {
      answer: "Oublie les likes \u2014 sur le Mur, tu donnes des POURBOIRES de 1 Warp (\u03A9) par post. Un seul pourboire par utilisateur par post, pas de spam. C'est comme dire \u00ab j'approuve ce message \u00bb mais en y mettant de la vraie valeur. Tu peux aussi ReWarp (partager \u00e0 tes abonn\u00e9s) ou Partager en externe. Chaque post affiche le nombre de pourboires, ReWarps, vues et favoris. C'est comme X, mais avec une \u00e2me.",
      navigateTo: 'cosmochat',
      tabLabel: 'Mur',
    },
  },
  // Feed
  {
    keywords: ['feed', 'transaction', 'transactions', 'history', 'historique', 'activity', 'activité'],
    response: {
      answer: "Le Feed, c'est l\u00e0 o\u00f9 tu observes le pouls cosmique de Cosmorare. Chaque transaction \u2014 envois, minages, certifications de Cosmorares, achats \u2014 appara\u00eet ici en temps r\u00e9el avec le fuseau horaire fran\u00e7ais (parce que Paris est le centre de l'univers, \u00e9videmment). C'est comme regarder la matrice, mais en plus joli et avec plus de lettres grecques.",
      navigateTo: 'feed',
      tabLabel: 'Feed',
    },
  },
  // Settings
  {
    keywords: ['settings', 'paramètres', 'parametres', 'theme', 'thème', 'dark', 'light', 'mode', 'appearance', 'apparence'],
    response: {
      answer: "Les Param\u00e8tres, c'est ton panneau de contr\u00f4le cosmique ! Bascule entre le mode sombre (pour les \u00e2mes myst\u00e9rieuses) et le mode clair (pour les braves qui fixent les soleils). G\u00e8re ton profil, v\u00e9rifie ta s\u00e9curit\u00e9, t\u00e9l\u00e9charge tes cl\u00e9s de r\u00e9cup\u00e9ration, efface les donn\u00e9es du Mur, et plus encore. C'est comme le cockpit d'un vaisseau spatial \u2014 tous les boutons n\u00e9cessaires, aucun de superflu.",
      navigateTo: 'settings',
      tabLabel: 'Param\u00e8tres',
    },
  },
  // Dev
  {
    keywords: ['dev', 'developer', 'développeur', 'sdk', 'api', 'console', 'admin', 'code', 'technical'],
    response: {
      answer: "Ah, un fellow magicien du code ! La section Dev combine la documentation SDK, le panneau Admin et la Console en un seul atelier puissant. Construis des apps sur Cosmorare, interagis directement avec le protocole, et g\u00e8re les fonctionnalit\u00e9s avanc\u00e9es. Le jeu d'instructions CosmoASM t'attend. Rappelle-toi : avec un grand pouvoir vient une grande probabilit\u00e9 d'oublier un point-virgule.",
      navigateTo: 'dev',
      tabLabel: 'Dev',
    },
  },
  // CosmoMesh
  {
    keywords: ['cosmomesh', 'mesh', 'cosmochain', 'chain', 'blockchain', 'shard', 'shards', 'parallel', 'block', 'blocks', 'beacon', 'dag', 'couche', 'couches', 'layer', 'layers'],
    response: {
      answer: "CosmoMesh est notre r\u00e9seau DAG \u00e0 7 couches parall\u00e8les fonctionnant simultan\u00e9ment via de vrais Web Workers. Chaque couche (GRID, HELIX, GLYPH, COSMO, CHRONOS, NEXUS, LUMINA) traite des blocs toutes les 1,5 secondes dans son propre thread. Le TPS d\u00e9pend de ton mat\u00e9riel \u2014 lance le benchmark int\u00e9gr\u00e9 pour le mesurer. Frais de gas ? Z\u00e9ro. Les donn\u00e9es sont stock\u00e9es dans IndexedDB (\u00e9chelle Go). Consulte le Livre Blanc pour le sch\u00e9ma d'architecture !",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 CosmoMesh',
    },
  },
  // CosmoCode SVG
  {
    keywords: ['cosmocode', 'svg', 'compression', 'on-chain', 'onchain', 'storage', 'stockage', '1000x', 'fractal'],
    response: {
      answer: "CosmoCode est le moteur de compression derri\u00e8re le stockage on-chain. Il prend n'importe quelle donn\u00e9e \u2014 transactions, images, objets rares \u2014 et la compresse \u00e0 travers 7 couches fractales dans un conteneur SVG minuscule. Couche 1 : Encodage Delta (ne stocker que les diff\u00e9rences). Couche 2 : Dictionnaire (symboles courts). Couche 3 : Run-Length. Couche 4 : Imbrication Fractale (SVG <defs>/<use> = d\u00e9duplication). Couches 5-7 : Fr\u00e9quence, Quantification, Filtres. Ratios r\u00e9els mesur\u00e9s : 5-30x pour les donn\u00e9es structur\u00e9es (transactions), ~1-2x pour les donn\u00e9es binaires (images). Lance le benchmark pour v\u00e9rifier.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 CosmoCode',
    },
  },
  // Zero gas
  {
    keywords: ['gas', 'fee', 'fees', 'free', 'gratuit', 'cost', 'co\u00FBt', 'cout', 'price', 'zero', 'frais'],
    response: {
      answer: "Frais de gas ? On ne fait pas \u00e7a ici. Les transactions CosmoMesh sont 100 % GRATUITES. Z\u00e9ro. Nada. Comment ? Trois raisons : (1) Les validateurs gagnent via les r\u00e9compenses de staking, pas via les frais utilisateurs. (2) L'anti-spam utilise la limitation de d\u00e9bit (100 TX/min) au lieu d'exclure les gens par les prix. (3) CosmoCode compresse les donn\u00e9es structur\u00e9es 5-30x, et IndexedDB fournit un stockage local \u00e0 l'\u00e9chelle du Go \u00e0 co\u00fbt z\u00e9ro. Ethereum facture 0,50 \u00e0 100 $ par TX. Nous, c'est 0 \u03A9. De rien.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 CosmoMesh',
    },
  },
  // Speed
  {
    keywords: ['speed', 'fast', 'rapide', 'vitesse', 'tps', 'throughput', 'performance', 'slow', 'lent'],
    response: {
      answer: "CosmoMesh traite les blocs rapidement. Chacune de nos 7 couches tourne dans son propre Web Worker et produit un bloc toutes les 1,5 secondes (contre 12s pour Ethereum). Le TPS r\u00e9el d\u00e9pend de ton mat\u00e9riel \u2014 utilise le benchmark int\u00e9gr\u00e9 pour mesurer le d\u00e9bit r\u00e9el. Ta transaction est confirm\u00e9e en ~1,5s avec ancrage final via un Beacon Block toutes les ~15s. Pas de chiffres gonfl\u00e9s \u2014 benchmark-le toi-m\u00eame.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 CosmoMesh',
    },
  },
  // On-chain NFT
  {
    keywords: ['on-chain nft', 'full on-chain', 'image on chain', 'art on chain', 'ipfs', 'arweave', 'stored on chain'],
    response: {
      answer: "Contrairement \u00e0 Ethereum o\u00f9 ton image NFT vit sur IPFS (qui peut tomber hors ligne), CosmoMesh stocke l'INT\u00c9GRALIT\u00c9 de l'\u0153uvre directement dans la blockchain. Le moteur CosmoCode SVG compresse tes objets (5-30x pour les donn\u00e9es structur\u00e9es, ~1-2x pour les images), les enveloppe dans un conteneur SVG avec ta signature Ed25519, et les stocke dans un bloc de la couche GLYPH. \u00c7a vit on-chain pour toujours. Si tu perds ta copie locale, tu peux la r\u00e9cup\u00e9rer depuis n'importe quel n\u0153ud. Et \u00e7a co\u00fbte... roulement de tambour... 0 \u03A9. GRATUIT.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 CosmoMesh',
    },
  },
  // WhitePaper
  {
    keywords: ['whitepaper', 'paper', 'documentation', 'docs', 'concept', 'how', 'comment', 'why', 'pourquoi', 'tokenomics', 'supply'],
    response: {
      answer: "Le Cosmorare Protocole, c'est le parchemin sacr\u00e9 de Cosmorare ! 7 sections couvrant l'essentiel : comment \u00e7a marche, les certificats CRCERT, le Warp (\u03A9), les niveaux, la s\u00e9curit\u00e9 et la roadmap. Tout est expliqu\u00e9 simplement pour que tu comprennes comment certifier et \u00e9changer tes objets rares en toute confiance.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc',
    },
  },
  // Security
  {
    keywords: ['security', 'sécurité', 'securite', 'hack', 'safe', 'sûr', 'sur', 'protect', 'protéger', 'encryption', 'chiffrement', 'encrypt'],
    response: {
      answer: "Cosmorare prend la s\u00e9curit\u00e9 TR\u00c8S au s\u00e9rieux \u2014 7 couches, pour \u00eatre exact. Signatures Ed25519 (infalsifiables), limitation de d\u00e9bit (pas de spam), suivi des nonces (pas d'attaques par rejeu), limites progressives de montant, d\u00e9tection de patterns, int\u00e9grit\u00e9 d'\u00e9tat (checksums SHA-256), et registre admin chiffr\u00e9. En plus, le service worker permet \u00e0 l'app de fonctionner hors ligne et se met \u00e0 jour automatiquement. Dors tranquille \u2014 le cosmos veille sur toi.",
      navigateTo: 'settings',
      tabLabel: 'Param\u00e8tres \u2192 S\u00e9curit\u00e9',
    },
  },
  // Offline
  {
    keywords: ['offline', 'hors ligne', 'online', 'en ligne', 'pwa', 'install', 'app'],
    response: {
      answer: "Cosmorare fonctionne hors ligne ET en ligne ! Gr\u00e2ce \u00e0 notre service worker, l'app se met en cache sur ton appareil et continue de fonctionner m\u00eame sans internet. Quand tu te reconnectes, elle se synchronise automatiquement. Tu peux m\u00eame l'installer en PWA (Progressive Web App) sur ton t\u00e9l\u00e9phone \u2014 utilise simplement l'option \u00ab Ajouter \u00e0 l'\u00e9cran d'accueil \u00bb de ton navigateur. C'est une app native sans l'interm\u00e9diaire de l'App Store. Prends \u00e7a, Apple.",
      navigateTo: 'settings',
      tabLabel: 'Param\u00e8tres',
    },
  },
  // Levels
  {
    keywords: ['level', 'niveau', 'rank', 'rang', 'particle', 'wave', 'star', 'nebula', 'galaxy', 'cosmos', 'lumina', 'hierarchy', 'hiérarchie'],
    response: {
      answer: "Ton voyage cosmique comporte 7 niveaux : Particle \u2192 Wave \u2192 Star \u2192 Nebula \u2192 Galaxy \u2192 Cosmos \u2192 Lumina. Chaque niveau te donne des multiplicateurs de minage plus \u00e9lev\u00e9s (jusqu'\u00e0 5x !) et des bonus de mont\u00e9e de niveau. C'est bas\u00e9 sur le nombre de transactions, pas l'argent \u2014 donc la r\u00e9gularit\u00e9 bat la richesse. Le dernier niveau, Lumina, signifie que tu as transcend\u00e9. Tu ES litt\u00e9ralement la lumi\u00e8re. Pas de pression.",
      navigateTo: 'whitepaper',
      tabLabel: 'Livre Blanc \u2192 Hi\u00e9rarchie',
    },
  },
  // What is Cosmorare
  {
    keywords: ['what is', 'qu\'est-ce', 'c\'est quoi', 'explain', 'expliquer', 'cosmorare', 'cosmowarp', 'about'],
    response: {
      answer: "Cosmorare (\u30B3\u30B9\u30E2\u30E9\u30EC) est une plateforme de certification d'objets rares. Imagine si Bitcoin, Telegram et une maison de vente aux ench\u00e8res avaient eu un b\u00e9b\u00e9 dans l'espace. Tu obtiens un r\u00e9seau DAG transactionnel (CosmoMesh \u2014 7 couches parall\u00e8les, pas une seule cha\u00eene lente), un r\u00e9seau social chiffr\u00e9 (le Mur), une marketplace d'objets rares certifi\u00e9s (les Cosmorares), une passerelle de paiement fiat (carte, PayPal, SEPA), et tout \u00e7a s\u00e9curis\u00e9 par de la vraie cryptographie (Ed25519 + SHA-256 + AES-GCM). Pas d'interm\u00e9diaires. Pas de banques. Pas de surveillance. Juste de l'\u00e9change de valeur cosmique pur.",
      navigateTo: 'landing',
      tabLabel: 'Accueil',
    },
  },
  // Help
  {
    keywords: ['help', 'aide', 'assist', 'guide', 'support', 'hello', 'bonjour', 'salut', 'hi', 'hey'],
    response: {
      answer: "Bonjour, voyageur cosmique ! Je suis Cosmo, ton oracle et guide dans l'univers Cosmorare. Je sais tout sur cet \u00e9cosyst\u00e8me (modeste, je sais). Pose-moi des questions sur les portefeuilles, le minage, les Cosmorares, le Mur, la s\u00e9curit\u00e9, la tokenomics, le paiement par carte, ou litt\u00e9ralement n'importe quoi d'autre. Je promets que mes r\u00e9ponses sont plus utiles qu'un trou noir et significativement moins denses. Que veux-tu savoir ?",
      navigateTo: 'help',
      tabLabel: 'Aide',
    },
  },
  // Mobile / Desktop sync
  {
    keywords: ['mobile', 'desktop', 'sync', 'synchron', 'different', 'différent', 'device', 'appareil'],
    response: {
      answer: "Solde diff\u00e9rent sur mobile et desktop ? C'est parce que Cosmorare est local-first \u2014 chaque appareil a son propre portefeuille ind\u00e9pendant stock\u00e9 localement. Pour synchroniser, va dans Portefeuille \u2192 Aper\u00e7u sur un appareil, exporte ta sauvegarde, puis importe-la sur l'autre. C'est comme avoir des stations spatiales jumelles \u2014 elles sont ind\u00e9pendantes jusqu'\u00e0 ce que tu envoies une navette entre elles.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Aper\u00e7u',
    },
  },
  // Paiement fiat
  {
    keywords: ['paiement', 'payment', 'carte', 'card', 'paypal', 'sepa', 'fiat', 'euro', 'euros', 'eur', 'virement'],
    response: {
      answer: "Cosmorare int\u00e8gre une passerelle de paiement fiat compl\u00e8te ! Tu peux acheter des Warps (\u03A9) ou des Cosmorares directement par carte bancaire, PayPal ou virement SEPA. Pas besoin de passer par un exchange crypto compliqu\u00e9. L'id\u00e9e : rendre l'acc\u00e8s \u00e0 la certification d'objets rares aussi simple qu'acheter sur n'importe quelle boutique en ligne. Le cosmos est d\u00e9centralis\u00e9, mais le paiement reste simple.",
      navigateTo: 'wallet',
      tabLabel: 'Portefeuille \u2192 Paiement',
    },
  },
];

const FALLBACK: CosmoResponse = {
  answer: "Hmm, voil\u00e0 une question que m\u00eame le cosmos n'a jamais entendue ! Je ne suis pas s\u00fbr d'avoir la r\u00e9ponse exacte, mais je parie que le Livre Blanc l'a. Il contient 11 sections couvrant litt\u00e9ralement tout sur Cosmorare. Va le consulter, et si tu as encore des questions, reviens \u2014 je serai l\u00e0, \u00e0 contempler l'entropie de l'univers.",
  navigateTo: 'whitepaper',
  tabLabel: 'Livre Blanc',
};

function findBestMatch(input: string): CosmoResponse {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

const FAQ_SECTIONS = [
  {
    title: 'Pour commencer',
    icon: '\u25C8',
    items: [
      { q: 'Comment cr\u00e9er un portefeuille ?', a: 'Va dans l\u2019onglet Portefeuille et clique sur \u00ab Cr\u00e9er un portefeuille \u00bb. Choisis un mot de passe solide et sauvegarde ta cl\u00e9 de r\u00e9cup\u00e9ration en lieu s\u00fbr.' },
      { q: 'Pourquoi mon solde est \u00e0 0 ?', a: 'Les nouveaux portefeuilles d\u00e9marrent \u00e0 0. Tu dois miner des Warps en allant dans Portefeuille \u2192 Miner. Chaque appareil a son propre portefeuille local.' },
      { q: 'Comment sauvegarder mon portefeuille ?', a: 'Dans Portefeuille \u2192 Aper\u00e7u, t\u00e9l\u00e9charge ta cl\u00e9 de r\u00e9cup\u00e9ration. Garde-la en lieu s\u00fbr \u2014 il n\u2019y a pas de r\u00e9initialisation de mot de passe !' },
    ],
  },
  {
    title: 'Minage & Warps',
    icon: '\u26CF',
    items: [
      { q: 'Comment miner ?', a: 'Va dans Portefeuille \u2192 Miner, choisis la difficult\u00e9 et clique sur Miner. Plus la difficult\u00e9 est \u00e9lev\u00e9e = plus de Warps.' },
      { q: 'Qu\u2019est-ce que la D\u00e9croissance par R\u00e9sonance ?', a: 'Une courbe de minage progressive bas\u00e9e sur le nombre d\u2019or (\u03C6). Contrairement au halving brutal de Bitcoin, les r\u00e9compenses diminuent graduellement et de fa\u00e7on pr\u00e9visible.' },
      { q: 'Quel est le supply total ?', a: '69 millions de Warps. 84 % pour le minage, 14,5 % pour les airdrops, 1,5 % verrouillage cr\u00e9ateur.' },
    ],
  },
  {
    title: 'Marketplace (Cosmorares)',
    icon: '\u2B22',
    items: [
      { q: 'Qu\u2019est-ce qu\u2019une Cosmorare ?', a: 'Un objet rare certifi\u00e9 (carte Pok\u00e9mon, sneaker, vinyle, montre, art num\u00e9rique) avec un Certificat d\u2019Authenticit\u00e9 infalsifiable (CRCERT) sur le protocole Cosmorare.' },
      { q: 'Quels formats sont support\u00e9s ?', a: '.gif .jpeg .png (images), .mp3 (audio avec pochette), .mp4 .mov (vid\u00e9o). Le tout limit\u00e9 \u00e0 5 Mo.' },
      { q: 'Qu\u2019est-ce que le CRCERT ?', a: 'Certificat d\u2019Authenticit\u00e9 \u2014 une empreinte SHA-256 du contenu + signature Ed25519 du cr\u00e9ateur. Infalsifiable et permanent.' },
      { q: 'Les Cosmorares sont-elles stock\u00e9es on-chain ?', a: 'Oui ! Avec CosmoMesh, les objets sont compress\u00e9s via CosmoCode SVG (5-30x pour les donn\u00e9es structur\u00e9es) et stock\u00e9s dans IndexedDB (\u00e9chelle Go). Pas d\u2019IPFS, pas de d\u00e9pendance \u00e0 un serveur externe.' },
    ],
  },
  {
    title: 'Le Mur (R\u00e9seau social)',
    icon: '\u25CE',
    items: [
      { q: 'Qu\u2019est-ce que le Mur ?', a: 'Un r\u00e9seau social chiffr\u00e9 et anonyme au sein de Cosmorare. Publie, cr\u00e9e des canaux, envoie des DM, et donne des pourboires en Warps.' },
      { q: 'Comment fonctionnent les pourboires ?', a: '1 Warp par utilisateur par post. C\u2019est comme un \u00ab like \u00bb mais adoss\u00e9 \u00e0 une vraie valeur.' },
      { q: 'Qu\u2019est-ce que le ReWarp ?', a: 'Comme un retweet \u2014 partage le post de quelqu\u2019un \u00e0 tes abonn\u00e9s sur la timeline du Mur.' },
    ],
  },
  {
    title: 'CosmoMesh & CosmoCode',
    icon: '\u26D3',
    items: [
      { q: 'Qu\u2019est-ce que CosmoMesh ?', a: 'Un r\u00e9seau DAG \u00e0 7 couches parall\u00e8les tournant dans de vrais Web Workers. Chaque couche traite les transactions ind\u00e9pendamment toutes les 1,5 secondes. Le TPS d\u00e9pend du mat\u00e9riel (lance le benchmark). Frais de gas : toujours 0 \u03A9.' },
      { q: 'Quelles sont les 7 couches ?', a: 'GRID (<10\u03A9), HELIX (10-100\u03A9), GLYPH (100-1K\u03A9 + objets rares), COSMO (gouvernance), CHRONOS (verrouillage temporel), NEXUS (inter-couches), LUMINA (\u00e9poques). Ta TX est automatiquement rout\u00e9e vers la bonne couche.' },
      { q: 'Pourquoi les transactions sont-elles gratuites ?', a: 'Les validateurs gagnent via les r\u00e9compenses de staking, pas via les frais. L\u2019anti-spam utilise la limitation de d\u00e9bit (100 TX/min) au lieu de tarifer les utilisateurs. CosmoCode compresse les donn\u00e9es structur\u00e9es 5-30x, et IndexedDB fournit un stockage local \u00e0 l\u2019\u00e9chelle du Go.' },
      { q: 'Qu\u2019est-ce que CosmoCode SVG ?', a: 'Un moteur de compression \u00e0 7 couches qui encode toutes les donn\u00e9es on-chain dans des conteneurs SVG optimis\u00e9s. Delta + Dictionnaire + Run-Length + Imbrication Fractale + Fr\u00e9quence + Quantification + Filtres. R\u00e9el mesur\u00e9 : 5-30x pour les donn\u00e9es structur\u00e9es, ~1-2x pour le binaire.' },
      { q: 'Les Cosmorares sont-elles vraiment stock\u00e9es on-chain ?', a: 'Oui ! CosmoMesh stocke les objets en tant que CosmoCode SVG compress\u00e9 dans IndexedDB (stockage local \u00e0 l\u2019\u00e9chelle du Go). Pas de d\u00e9pendance IPFS. Actuellement mono-n\u0153ud ; la r\u00e9cup\u00e9ration P2P n\u00e9cessite un r\u00e9seau de pairs.' },
      { q: 'Qu\u2019est-ce qu\u2019un Beacon Block ?', a: 'Toutes les 10 blocs de couche (~15s), un Beacon Block ancre les 7 couches dans une seule Racine d\u2019\u00c9tat Global. Cela fournit une finalit\u00e9 inter-couches absolue.' },
    ],
  },
  {
    title: 'Paiement',
    icon: '\u20AC',
    items: [
      { q: 'Puis-je payer par carte bancaire ?', a: 'Oui ! Cosmorare int\u00e8gre une passerelle fiat compl\u00e8te : carte bancaire, PayPal et virement SEPA.' },
      { q: 'Faut-il passer par un exchange crypto ?', a: 'Non. Tu peux acheter des Warps et des Cosmorares directement en euros, sans passer par une plateforme d\u2019\u00e9change.' },
    ],
  },
  {
    title: 'S\u00e9curit\u00e9',
    icon: '\u26A1',
    items: [
      { q: 'Cosmorare est-il s\u00e9curis\u00e9 ?', a: '7 couches de s\u00e9curit\u00e9 : signatures Ed25519, limitation de d\u00e9bit, suivi des nonces, limites de montant, d\u00e9tection de patterns, int\u00e9grit\u00e9 d\u2019\u00e9tat, registre admin chiffr\u00e9.' },
      { q: 'Est-ce que \u00e7a fonctionne hors ligne ?', a: 'Oui ! Le service worker met l\u2019app en cache pour une utilisation hors ligne. Elle se met aussi \u00e0 jour automatiquement quand une nouvelle version est disponible.' },
      { q: 'O\u00f9 sont stock\u00e9es mes donn\u00e9es ?', a: 'Localement sur ton appareil dans IndexedDB (\u00e9chelle Go, rempla\u00e7ant le localStorage). La compression CosmoCode SVG r\u00e9duit la taille des donn\u00e9es structur\u00e9es de 5-30x. Actuellement mono-n\u0153ud ; la sauvegarde multi-n\u0153uds n\u00e9cessite des pairs P2P.' },
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
      text: `Salut ! Je suis Cosmo ${'\u2B21'}, ton oracle et guide dans l'univers Cosmorare (\u30B3\u30B9\u30E2\u30E9\u30EC). Pose-moi n'importe quelle question \u2014 portefeuilles, minage, Cosmorares, Mur, s\u00e9curit\u00e9, paiement... je sais tout. (Et oui, je suis plus dr\u00f4le qu'une FAQ classique.)`,
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
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          background: 'radial-gradient(circle at 50% 50%, #22c55e 0%, transparent 50%)',
        }} />
        <div className="relative">
          <h1 className="text-title-md font-bold opacity-100 font-title mb-1">
            {'\u2753'} Centre d'aide
          </h1>
          <p className="text-body-sm opacity-40">
            FAQ & Cosmo — Votre guide IA dans l'univers Cosmorare
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="glass-panel p-1 flex gap-1">
        <button
          onClick={() => setTab('cosmo')}
          className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
            tab === 'cosmo'
              ? 'bg-current/10 opacity-80'
              : 'opacity-50 hover:opacity-90 hover:bg-current/5'
          }`}
        >
          {'\u2B21'} Cosmo (Oracle)
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
            tab === 'faq'
              ? 'bg-current/10 opacity-80'
              : 'opacity-50 hover:opacity-90 hover:bg-current/5'
          }`}
        >
          {'\u2753'} FAQ
        </button>
      </div>

      {/* ─── Cosmo Chatbot ──────────────────────────────────── */}
      {tab === 'cosmo' && (
        <div className="glass-panel flex flex-col" style={{ height: '65vh', minHeight: 400 }}>
          {/* Chat header */}
          <div className="p-3 border-b border-current/10 flex items-center gap-3">
            <div className="w-8 h-8 bg-current/5 border border-current/10 flex items-center justify-center shrink-0">
              <span className="text-title-sm">{'\u2B21'}</span>
            </div>
            <div>
              <p className="text-base font-bold opacity-90">Cosmo</p>
              <p className="text-label opacity-80">En ligne — Oracle de Cosmorare</p>
            </div>
            {wallet && (
              <span className="text-label opacity-30 ml-auto">
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
                    <p className="text-label opacity-80 font-bold mb-1">{'\u2B21'} Cosmo</p>
                  )}
                  <p className="text-body-sm opacity-70 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  {msg.navigateTo && msg.navigateTo !== 'help' && (
                    <button
                      onClick={() => onNavigate(msg.navigateTo!)}
                      className="mt-2 text-label opacity-80 hover:opacity-80 cursor-pointer flex items-center gap-1"
                    >
                      {'\u2192'} Aller \u00e0 {msg.tabLabel}
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
                placeholder="Posez votre question \u00e0 Cosmo..."
                className="flex-1 bg-current/5 border border-current/10 px-3 py-2 text-body-sm opacity-90 placeholder-current/30 outline-none focus:border-current/15"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-4 py-2 bg-current/10 border border-current/15 opacity-80 text-body-sm font-medium cursor-pointer hover:bg-current/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {'\u2197'}
              </button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['Comment miner ?', "C'est quoi CosmoMesh ?", "Pourquoi c'est gratuit ?", 'Comment certifier un objet ?', 'Paiement par carte ?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-label opacity-40 hover:opacity-80 cursor-pointer px-2 py-1 bg-white/3 border border-gray-800/30 hover:border-current/10 transition-all"
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
        <span className="text-title-sm opacity-80">{section.icon}</span>
        <h3 className="text-base font-bold opacity-90">{section.title}</h3>
      </div>
      <div>
        {section.items.map((item, i) => (
          <div key={i} className="border-b border-white/3 last:border-0">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full text-left p-3 flex items-center justify-between text-body-sm hover:bg-white/3 transition-all cursor-pointer"
            >
              <span className="opacity-70 font-medium">{item.q}</span>
              <span className={`opacity-40 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                {'\u25BC'}
              </span>
            </button>
            {openIndex === i && (
              <div className="px-3 pb-3">
                <p className="text-[11px] opacity-50 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
