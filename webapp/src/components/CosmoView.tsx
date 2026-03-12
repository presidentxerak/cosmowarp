import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { CosmoChatEngine } from '../engine/cosmochat';
import Logo from './Logo';

interface Message {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  timestamp: number;
  suggestion?: { label: string; tab: string };
  aiImage?: string; // base64 image data from AI generation
  aiPrompt?: string; // prompt used for generation
}

const COSMO_RESPONSES: { keywords: string[]; response: string; suggestion?: { label: string; tab: string } }[] = [
  {
    keywords: ['wallet', 'portefeuille', 'balance', 'solde', 'compte'],
    response: 'Votre wallet est le coeur de Strangrz ! Il stocke vos tokens Strangrz et gère votre identité sur le réseau. Vous pouvez envoyer, recevoir, et miner des Strangrz. Vous voulez accéder à votre wallet ?',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['mine', 'mining', 'miner', 'minage'],
    response: 'Le minage sur Strangrz utilise un système de preuve de calcul avec 3 niveaux de difficulté : Léger, Crypto et Minage profond. Chaque minage réussi vous récompense en Strangrz (⬣). La récompense diminue progressivement selon le nombre d\'or.',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['wart', 'nft', 'art', 'gallery', 'marketplace', 'objet', 'rare', 'certificat', 'certifier'],
    response: 'Les Strangrz sont des objets certifiés sur Strangrz. Chaque objet reçoit un certificat STCERT infalsifiable multi-chaîne (CW-721 sur Strangrz & ERC-721 sur Ethereum) avec empreinte SHA-256 et signature Ed25519. Vous pouvez certifier des cartes, sneakers, vinyles, oeuvres d\'art... tout objet rare !',
    suggestion: { label: 'Ouvrir la Galerie', tab: 'gallery' },
  },
  {
    keywords: ['send', 'transfer', 'envoyer'],
    response: 'Vous pouvez envoyer des Strangrz à n\'importe quelle adresse Strangrz. Les transactions passent par le réseau StrangrzMesh DAG avec 7 couches de validation. Instantané et gratuit !',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['strangrmesh', 'mesh', 'dag', 'network', 'reseau', 'réseau'],
    response: 'StrangrzMesh est notre réseau en graphe acyclique dirigé (DAG). Contrairement aux blockchains traditionnelles, il utilise 7 couches de validation parallèles et un consensus par Résonance pour une finalité quasi instantanée.',
    suggestion: { label: 'Lire le White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['help', 'aide', 'how', 'comment'],
    response: 'Je suis là pour vous guider dans Strangrz ! Posez-moi des questions sur les wallets, le minage, les certificats, le paiement ou le réseau. Vous pouvez aussi me demander de générer une image AI !',
    suggestion: { label: 'Ouvrir l\'Aide', tab: 'help' },
  },
  {
    keywords: ['wall', 'post', 'social', 'feed', 'chat', 'mur'],
    response: 'Le Mur est le réseau social décentralisé de Strangrz. Partagez du texte, des objets certifiés, et tippez les publications avec des Strangrz. Toutes les conversations sont chiffrées et anonymes.',
    suggestion: { label: 'Ouvrir le Mur', tab: 'wall' },
  },
  {
    keywords: ['hello', 'hi', 'bonjour', 'salut', 'hey'],
    response: 'Bonjour ! Je suis Doctor Strangrz, votre guide dans l\'univers Strangrz ストレンジャーズ. Je peux vous expliquer comment certifier un objet rare, miner des Strangrz, utiliser le paiement, ou générer une oeuvre d\'art AI.',
  },
  {
    keywords: ['who', 'what are you', 'qui es tu', 'cosmo', 'c\'est quoi'],
    response: 'Strangrz (ストレンジャーズ) est une plateforme multi-chaîne de certification pour objets rares. Le Protocole Strangrz crée des certificats d\'authenticité infalsifiables (STCERT) en CW-721 (Strangrz) et ERC-721 (Ethereum) pour n\'importe quel objet : cartes, sneakers, vinyles, art numérique... L\'app fonctionne offline ET online !',
  },
  {
    keywords: ['token', 'warp', 'supply', 'tokenomics'],
    response: 'Le Strangrz Coin (symbole : STRNGRZ / ⬣) est le token natif de Strangrz avec une supply fixe de 69 millions. On le gagne par le minage et il sert à certifier des objets, tipper les publications, et acheter sur la place de marché.',
    suggestion: { label: 'Lire le White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['paiement', 'payment', 'payer', 'acheter', 'buy', 'euro', 'carte', 'card', 'paypal', 'fiat'],
    response: 'Strangrz intègre une passerelle de paiement ! Achetez des Strangrz par carte bancaire, PayPal, virement SEPA, Apple Pay ou Google Pay. Vendez vos Strangrz contre des euros. Tout est intégré dans l\'app.',
    suggestion: { label: 'Passerelle de paiement', tab: 'fiat-gateway' },
  },
  {
    keywords: ['offline', 'hors ligne', 'internet', 'connexion'],
    response: 'Strangrz fonctionne 100% offline ! Grâce au service worker, l\'app se met en cache sur votre appareil. Vos certificats, votre wallet et vos données restent accessibles sans internet. À la reconnexion, tout se synchronise.',
    suggestion: { label: 'Paramètres', tab: 'settings' },
  },
  {
    keywords: ['privacy', 'anonymous', 'encrypt', 'secure', 'privé', 'chiffré', 'sécurité'],
    response: 'La vie privée est au coeur de Strangrz. Conversations chiffrées, identités pseudonymes, principes zero-knowledge. Vos données restent les vôtres.',
    suggestion: { label: 'Confidentialité', tab: 'privacy' },
  },
];

function getResponse(input: string): { response: string; suggestion?: { label: string; tab: string }; isAiRequest?: boolean } {
  const lower = input.toLowerCase();

  // Detect AI image generation requests
  const aiKeywords = ['generate', 'génère', 'genere', 'crée', 'cree', 'create', 'dessine', 'draw', 'imagine', 'image ai', 'ai art', 'art ai', 'génération', 'generation'];
  if (aiKeywords.some(kw => lower.includes(kw))) {
    return {
      response: 'Je génère votre oeuvre avec l\'IA...',
      isAiRequest: true,
    };
  }

  for (const entry of COSMO_RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { response: entry.response, suggestion: entry.suggestion };
    }
  }
  return {
    response: 'Bonne question ! Essayez de me poser des questions sur les wallets, le minage, les certificats d\'objets rares, le paiement, ou le réseau StrangrzMesh. Vous pouvez aussi me demander de générer une image AI !',
    suggestion: { label: 'Ouvrir l\'Aide', tab: 'help' },
  };
}

/** Extract the actual image prompt from user input by stripping command prefixes */
function extractAiPrompt(input: string): string {
  const lower = input.toLowerCase();
  const prefixes = ['génère ', 'genere ', 'generate ', 'crée ', 'cree ', 'create ', 'dessine ', 'draw ', 'imagine '];
  for (const p of prefixes) {
    const idx = lower.indexOf(p);
    if (idx !== -1) {
      return input.slice(idx + p.length).trim();
    }
  }
  // Fallback: use full input
  return input.trim();
}

export default function CosmoView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, unlocked, mintWart } = useWallet();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: 'Bienvenue sur Strangrz ストレンジャーズ ! Je suis Doctor Strangrz, votre guide. Posez-moi n\'importe quelle question — wallets, minage, certificats d\'objets rares, paiement, réseau... ou demandez-moi de générer une oeuvre d\'art AI !',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // AI minting state
  const [mintingId, setMintingId] = useState<string | null>(null);
  const [mintTitle, setMintTitle] = useState('');
  const [mintPrice, setMintPrice] = useState('');
  const [mintError, setMintError] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const handleAiGenerate = async (userText: string): Promise<string> => {
    const prompt = extractAiPrompt(userText);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image data'));
      reader.readAsDataURL(blob);
    });
  };

  const handleMintAi = async (_msgId: string, imageData: string, prompt: string) => {
    if (!wallet || !unlocked || !mintTitle.trim()) return;
    setMintError('');
    try {
      const price = mintPrice.trim() ? parseFloat(mintPrice) : null;
      const wart = await mintWart(mintTitle, `AI generated: ${prompt}`, imageData, price);
      const alias = wallet.alias || shortAddress(wallet.address);
      const chatEngine = CosmoChatEngine.load();
      chatEngine.createPost(wallet.address, alias, `${mintTitle} — AI generated artwork`, undefined, 'image', undefined, wart.id);

      // Add confirmation message
      setMessages(prev => [...prev, {
        id: `cosmo-mint-${Date.now()}`,
        role: 'cosmo',
        text: `Votre Strangrz "${mintTitle}" a été créé et posté sur le Mur ! ${price ? `Prix: ${price} ⬣` : 'Pas de prix défini.'}`,
        timestamp: Date.now(),
        suggestion: { label: 'Voir sur le Mur', tab: 'wall' },
      }]);
      setMintingId(null);
      setMintTitle('');
      setMintPrice('');
    } catch (e: unknown) {
      setMintError(e instanceof Error ? e.message : 'Minting failed');
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    const { response, suggestion, isAiRequest } = getResponse(text);

    if (isAiRequest) {
      // Generate AI image
      const prompt = extractAiPrompt(text);
      handleAiGenerate(text).then(imageData => {
        const cosmoMsg: Message = {
          id: `cosmo-${Date.now()}`,
          role: 'cosmo',
          text: `Voici votre oeuvre "${prompt}" ! Vous pouvez la mint comme Strangrz NFT pour la vendre et la poster dans le feed.`,
          timestamp: Date.now(),
          aiImage: imageData,
          aiPrompt: prompt,
        };
        setMessages(prev => [...prev, cosmoMsg]);
        setTyping(false);
      }).catch(() => {
        const cosmoMsg: Message = {
          id: `cosmo-${Date.now()}`,
          role: 'cosmo',
          text: 'Désolé, la génération a échoué. Réessayez avec un autre prompt !',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, cosmoMsg]);
        setTyping(false);
      });
    } else {
      setTimeout(() => {
        const cosmoMsg: Message = {
          id: `cosmo-${Date.now()}`,
          role: 'cosmo',
          text: response,
          timestamp: Date.now(),
          suggestion,
        };
        setMessages(prev => [...prev, cosmoMsg]);
        setTyping(false);
      }, 800 + Math.random() * 1200);
    }
  };

  const quickActions = [
    { label: 'C\'est quoi Strangrz ?', query: 'C\'est quoi Strangrz ?' },
    { label: 'Comment miner ?', query: 'Comment miner des Strangrz ?' },
    { label: 'Certifier un objet', query: 'Comment certifier un objet rare ?' },
    { label: 'Générer une image AI', query: 'Génère une oeuvre cosmique avec des hexagones' },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'cosmo' && (
              <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                <Logo className="w-6 h-6" />
              </div>
            )}
            <div className={`max-w-[85%] sm:max-w-[70%] ${
              msg.role === 'user'
                ? 'bg-current/5 border border-current/10 px-3 py-2'
                : 'px-1 py-1'
            }`}>
              <p className={`text-base leading-relaxed ${
                msg.role === 'user' ? 'opacity-100' : 'opacity-90'
              }`}>
                {msg.text}
              </p>

              {/* AI generated image */}
              {msg.aiImage && (
                <div className="mt-2 space-y-2">
                  <img src={msg.aiImage} alt="AI generated" className="w-full object-contain border border-current/10" />

                  {wallet && unlocked && mintingId !== msg.id && (
                    <button
                      className="warp-button w-full py-2 text-body-sm"
                      onClick={() => { setMintingId(msg.id); setMintTitle(''); setMintPrice(''); setMintError(''); }}
                    >
                      {'\u2B22'} Mint as Strangrz NFT
                    </button>
                  )}

                  {mintingId === msg.id && (
                    <div className="space-y-2 p-2 border border-current/10 bg-current/5">
                      <input
                        className="warp-input text-base w-full"
                        placeholder="Title for your Strangrz *"
                        value={mintTitle}
                        onChange={e => setMintTitle(e.target.value)}
                        maxLength={100}
                      />
                      <input
                        className="warp-input text-base w-full"
                        placeholder={`Price in \u2B23 STRNGRZ (optional)`}
                        value={mintPrice}
                        onChange={e => setMintPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                      />
                      <div className="flex gap-2">
                        <button
                          className="warp-button flex-1 py-1.5 text-body-sm"
                          onClick={() => handleMintAi(msg.id, msg.aiImage!, msg.aiPrompt || '')}
                          disabled={!mintTitle.trim()}
                        >
                          Mint & Post
                        </button>
                        <button
                          className="text-body-sm opacity-40 hover:opacity-70 cursor-pointer px-3"
                          onClick={() => setMintingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      {mintError && <p className="text-body-sm opacity-70 p-1 bg-current/5">{mintError}</p>}
                    </div>
                  )}
                </div>
              )}

              {msg.suggestion && (
                <button
                  onClick={() => onNavigate(msg.suggestion!.tab)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-medium opacity-80 bg-current/5 border border-current/10 hover:bg-current/10 transition-all cursor-pointer"
                >
                  {msg.suggestion.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <p className={`text-label mt-1 ${msg.role === 'user' ? 'opacity-40 text-right' : 'opacity-30'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex gap-2 items-start">
            <div className="shrink-0 w-8 h-8 flex items-center justify-center">
              <Logo className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex gap-1 px-3 py-3">
              <span className="w-1.5 h-1.5 bg-current/10 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-current/10 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-current/10 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  setInput(action.query);
                  setTimeout(() => {
                    const text = action.query;
                    const userMsg: Message = {
                      id: `user-${Date.now()}`,
                      role: 'user',
                      text,
                      timestamp: Date.now(),
                    };
                    setMessages(prev => [...prev, userMsg]);
                    setTyping(true);

                    const { response, suggestion, isAiRequest } = getResponse(text);
                    if (isAiRequest) {
                      handleAiGenerate(text).then(imageData => {
                        setMessages(prev => [...prev, {
                          id: `cosmo-${Date.now()}`,
                          role: 'cosmo',
                          text: `Voici votre oeuvre "${extractAiPrompt(text)}" ! Vous pouvez la mint comme Strangrz NFT.`,
                          timestamp: Date.now(),
                          aiImage: imageData,
                          aiPrompt: extractAiPrompt(text),
                        }]);
                        setTyping(false);
                        setInput('');
                      }).catch(() => {
                        setMessages(prev => [...prev, {
                          id: `cosmo-${Date.now()}`,
                          role: 'cosmo',
                          text: 'Désolé, la génération a échoué. Réessayez !',
                          timestamp: Date.now(),
                        }]);
                        setTyping(false);
                        setInput('');
                      });
                    } else {
                      setTimeout(() => {
                        const cosmoMsg: Message = {
                          id: `cosmo-${Date.now()}`,
                          role: 'cosmo',
                          text: response,
                          timestamp: Date.now(),
                          suggestion,
                        };
                        setMessages(prev => [...prev, cosmoMsg]);
                        setTyping(false);
                        setInput('');
                      }, 800 + Math.random() * 1200);
                    }
                  }, 50);
                }}
                className="px-3 py-1.5 text-body-sm opacity-80 border border-current/10 bg-current/5 hover:bg-current/5 transition-all cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0 p-3 border-t border-current/10">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Posez votre question ou demandez une image AI..."
            className="flex-1 warp-input py-2.5"
            disabled={typing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className="warp-button px-3 py-2.5 shrink-0 disabled:opacity-30"
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-label opacity-30 mt-1.5 text-center">
          Doctor Strangrz — guide IA & générateur d'art AI Strangrz
        </p>
      </div>
    </div>
  );
}
