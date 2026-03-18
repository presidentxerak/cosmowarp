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
    response: 'Les Strangrz sont des objets certifiés sur Strangrz. Chaque objet reçoit un certificat STCERT infalsifiable multi-chaîne (SZ-721 sur Strangrz & ERC-721 sur Ethereum) avec empreinte SHA-256 et signature Ed25519. Vous pouvez certifier des cartes, sneakers, vinyles, oeuvres d\'art... tout objet rare !',
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
    response: 'Bonjour ! Je suis Doctor Strangrz, votre guide dans l\'univers Strangrz. Je peux vous expliquer comment certifier un objet rare, miner des Strangrz, utiliser le paiement, ou générer une oeuvre d\'art AI.',
  },
  {
    keywords: ['who', 'what are you', 'qui es tu', 'cosmo', 'c\'est quoi'],
    response: 'Strangrz est une plateforme multi-chaîne de certification pour objets rares. Le Protocole Strangrz crée des certificats d\'authenticité infalsifiables (STCERT) en SZ-721 (Strangrz) et ERC-721 (Ethereum) pour n\'importe quel objet : cartes, sneakers, vinyles, art numérique... L\'app fonctionne offline ET online !',
  },
  {
    keywords: ['token', 'warp', 'supply', 'tokenomics', 'stz', 'coin', 'monnaie', 'valeur', 'prix token', 'combien vaut', 'hexagone', '⬣'],
    response: 'Le Strangrz (⬣), ticker STZ, est le token natif de Strangrz. Supply fixe : 69 millions. Valeur de référence : 1 STZ = 0,10 € (10 centimes). On le gagne par le minage (récompenses de 50 STZ/bloc qui diminuent via la Décroissance par Résonance basée sur le nombre d\'or φ), par airdrop (1 000 STZ pour chaque nouveau compte), ou par achat fiat (carte, PayPal, SEPA). Il sert à certifier des objets rares, tipper sur le Mur, acheter sur la Marketplace, et payer les royalties. Transactions : toujours gratuites, zéro gas !',
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

function getResponse(input: string): { response: string; suggestion?: { label: string; tab: string } } {
  const lower = input.toLowerCase();

  for (const entry of COSMO_RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { response: entry.response, suggestion: entry.suggestion };
    }
  }
  return {
    response: 'Bonne question ! Essayez de me poser des questions sur les wallets, le minage, les certificats d\'objets rares, le paiement, ou le réseau StrangrzMesh.',
    suggestion: { label: 'Ouvrir l\'Aide', tab: 'help' },
  };
}

export default function CosmoView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: 'Bienvenue sur Strangrz ! Je suis Doctor Strangrz, votre guide. Posez-moi n\'importe quelle question — wallets, minage, certificats d\'objets rares, paiement, réseau...',
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

    const { response, suggestion } = getResponse(text);

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
  };

  const quickActions = [
    { label: 'C\'est quoi Strangrz ?', query: 'C\'est quoi Strangrz ?' },
    { label: 'Comment miner ?', query: 'Comment miner des Strangrz ?' },
    { label: 'Certifier un objet', query: 'Comment certifier un objet rare ?' },
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
              <p className={`text-label mt-1 ${msg.role === 'user' ? 'opacity-60 text-right' : 'opacity-50'}`}>
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
                    setInput('');
                    const text = action.query;
                    const userMsg: Message = {
                      id: `user-${Date.now()}`,
                      role: 'user',
                      text,
                      timestamp: Date.now(),
                    };
                    setMessages(prev => [...prev, userMsg]);
                    setTyping(true);

                    const { response, suggestion } = getResponse(text);
                    setTimeout(() => {
                      setMessages(prev => [...prev, {
                        id: `cosmo-${Date.now()}`,
                        role: 'cosmo',
                        text: response,
                        timestamp: Date.now(),
                        suggestion,
                      }]);
                      setTyping(false);
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
            placeholder="Posez votre question ou demandez une image AI..."
            className="flex-1 warp-input py-2.5"
            disabled={typing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className="warp-button px-3 py-2.5 shrink-0 disabled:opacity-50"
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-label opacity-50 mt-1.5 text-center">
          Doctor Strangrz — guide IA & générateur d'art AI Strangrz
        </p>
      </div>
    </div>
  );
}
