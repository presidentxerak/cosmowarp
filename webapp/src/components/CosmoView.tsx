import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';

interface Message {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  timestamp: number;
  suggestion?: { label: string; tab: string };
}

const COSMO_RESPONSES: { keywords: string[]; response: string; suggestion?: { label: string; tab: string } }[] = [
  {
    keywords: ['wallet', 'portefeuille', 'balance', 'solde', 'compte'],
    response: 'Votre wallet est le coeur de Cosmorare ! Il stocke vos tokens Warps et g\u00e8re votre identit\u00e9 sur le r\u00e9seau. Vous pouvez envoyer, recevoir, et miner des Warps. Vous voulez acc\u00e9der \u00e0 votre wallet ?',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['mine', 'mining', 'miner', 'minage'],
    response: 'Le minage sur Cosmorare utilise un syst\u00e8me de preuve de calcul avec 3 niveaux de difficult\u00e9 : L\u00e9ger, Crypto et Minage profond. Chaque minage r\u00e9ussi vous r\u00e9compense en Warps (\u03A9). La r\u00e9compense diminue progressivement selon le nombre d\'or.',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['wart', 'nft', 'art', 'gallery', 'marketplace', 'objet', 'rare', 'certificat', 'certifier'],
    response: 'Les Cosmorares sont des objets certifi\u00e9s sur Cosmorare. Chaque objet re\u00e7oit un certificat CRCERT infalsifiable avec empreinte SHA-256 et signature Ed25519. Vous pouvez certifier des cartes, sneakers, vinyles, oeuvres d\'art... tout objet rare !',
    suggestion: { label: 'Ouvrir la Galerie', tab: 'gallery' },
  },
  {
    keywords: ['send', 'transfer', 'envoyer'],
    response: 'Vous pouvez envoyer des Warps \u00e0 n\'importe quelle adresse Cosmorare. Les transactions passent par le r\u00e9seau CosmoMesh DAG avec 7 couches de validation. Instantan\u00e9 et gratuit !',
    suggestion: { label: 'Ouvrir le Wallet', tab: 'wallet' },
  },
  {
    keywords: ['cosmomesh', 'mesh', 'dag', 'network', 'reseau', 'r\u00e9seau'],
    response: 'CosmoMesh est notre r\u00e9seau en graphe acyclique dirig\u00e9 (DAG). Contrairement aux blockchains traditionnelles, il utilise 7 couches de validation parall\u00e8les et un consensus par R\u00e9sonance pour une finalit\u00e9 quasi instantan\u00e9e.',
    suggestion: { label: 'Lire le White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['help', 'aide', 'how', 'comment'],
    response: 'Je suis l\u00e0 pour vous guider dans Cosmorare ! Posez-moi des questions sur les wallets, le minage, les certificats, le paiement ou le r\u00e9seau. Que souhaitez-vous explorer ?',
    suggestion: { label: 'Ouvrir l\'Aide', tab: 'help' },
  },
  {
    keywords: ['wall', 'post', 'social', 'feed', 'chat', 'mur'],
    response: 'Le Mur est le r\u00e9seau social d\u00e9centralis\u00e9 de Cosmorare. Partagez du texte, des objets certifi\u00e9s, et tippez les publications avec des Warps. Toutes les conversations sont chiffr\u00e9es et anonymes.',
    suggestion: { label: 'Ouvrir le Mur', tab: 'wall' },
  },
  {
    keywords: ['hello', 'hi', 'bonjour', 'salut', 'hey'],
    response: 'Bonjour ! Je suis Cosmo, votre guide dans l\'univers Cosmorare \u30B3\u30B9\u30E2\u30E9\u30EC. Je peux vous expliquer comment certifier un objet rare, miner des Warps, utiliser le paiement, ou naviguer dans l\'\u00e9cosyst\u00e8me.',
  },
  {
    keywords: ['who', 'what are you', 'qui es tu', 'cosmo', 'c\'est quoi'],
    response: 'Cosmorare (\u30B3\u30B9\u30E2\u30E9\u30EC) est une plateforme de certification pour objets rares. Le Protocole Cosmorare cr\u00e9e des certificats d\'authenticit\u00e9 infalsifiables (CRCERT) pour n\'importe quel objet : cartes, sneakers, vinyles, art num\u00e9rique... L\'app fonctionne offline ET online !',
  },
  {
    keywords: ['token', 'warp', 'supply', 'tokenomics'],
    response: 'Le Warp (symbole : \u03A9) est le token natif de Cosmorare avec une supply fixe de 69 millions. On le gagne par le minage et il sert \u00e0 certifier des objets, tipper les publications, et acheter sur la place de march\u00e9.',
    suggestion: { label: 'Lire le White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['paiement', 'payment', 'payer', 'acheter', 'buy', 'euro', 'carte', 'card', 'paypal', 'fiat'],
    response: 'Cosmorare int\u00e8gre une passerelle de paiement ! Achetez des Warps par carte bancaire, PayPal, virement SEPA, Apple Pay ou Google Pay. Vendez vos Warps contre des euros. Tout est int\u00e9gr\u00e9 dans l\'app.',
    suggestion: { label: 'Passerelle de paiement', tab: 'fiat-gateway' },
  },
  {
    keywords: ['offline', 'hors ligne', 'internet', 'connexion'],
    response: 'Cosmorare fonctionne 100% offline ! Gr\u00e2ce au service worker, l\'app se met en cache sur votre appareil. Vos certificats, votre wallet et vos donn\u00e9es restent accessibles sans internet. \u00c0 la reconnexion, tout se synchronise.',
    suggestion: { label: 'Param\u00e8tres', tab: 'settings' },
  },
  {
    keywords: ['privacy', 'anonymous', 'encrypt', 'secure', 'priv\u00e9', 'chiffr\u00e9', 's\u00e9curit\u00e9'],
    response: 'La vie priv\u00e9e est au coeur de Cosmorare. Conversations chiffr\u00e9es, identit\u00e9s pseudonymes, principes zero-knowledge. Vos donn\u00e9es restent les v\u00f4tres.',
    suggestion: { label: 'Confidentialit\u00e9', tab: 'privacy' },
  },
];

function getResponse(input: string): { response: string; suggestion?: { label: string; tab: string } } {
  const lower = input.toLowerCase();
  for (const entry of COSMO_RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { response: entry.response, suggestion: entry.suggestion };
    }
  }
  return {
    response: 'Bonne question ! Essayez de me poser des questions sur les wallets, le minage, les certificats d\'objets rares, le paiement, ou le r\u00e9seau CosmoMesh. Vous pouvez aussi consulter la section Aide.',
    suggestion: { label: 'Ouvrir l\'Aide', tab: 'help' },
  };
}

export default function CosmoView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: 'Bienvenue sur Cosmorare \u30B3\u30B9\u30E2\u30E9\u30EC ! Je suis Cosmo, votre guide. Posez-moi n\'importe quelle question — wallets, minage, certificats d\'objets rares, paiement, r\u00e9seau...',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

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

    setTimeout(() => {
      const { response, suggestion } = getResponse(text);
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
  };

  const quickActions = [
    { label: 'C\'est quoi Cosmorare ?', query: 'C\'est quoi Cosmorare ?' },
    { label: 'Comment miner ?', query: 'Comment miner des Warps ?' },
    { label: 'Certifier un objet', query: 'Comment certifier un objet rare ?' },
    { label: 'Paiement par carte', query: 'Comment acheter avec ma carte ?' },
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
                    setTimeout(() => {
                      const { response, suggestion } = getResponse(text);
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
            placeholder="Posez votre question \u00e0 Cosmo..."
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
          Cosmo est votre guide IA Cosmorare. R\u00e9ponses g\u00e9n\u00e9r\u00e9es localement.
        </p>
      </div>
    </div>
  );
}
