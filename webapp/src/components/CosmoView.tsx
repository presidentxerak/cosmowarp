import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'cosmo';
  text: string;
  timestamp: number;
  suggestion?: { label: string; tab: string };
}

const COSMO_RESPONSES: { keywords: string[]; response: string; suggestion?: { label: string; tab: string } }[] = [
  {
    keywords: ['wallet', 'portefeuille', 'balance', 'solde'],
    response: 'Your wallet is the core of CosmoWarp! It stores your Warps tokens and manages your identity on the CosmoMesh. You can send, receive, and mine Warps. Want me to show you your wallet?',
    suggestion: { label: 'Open Wallet', tab: 'wallet' },
  },
  {
    keywords: ['mine', 'mining', 'miner', 'minage'],
    response: 'Mining in CosmoWarp uses a proof-of-work system with three difficulty levels: Basic, Crypto, and Deep Mining. Each successful mine rewards you with Warps tokens. The reward decreases as the total supply approaches the 69M cap.',
    suggestion: { label: 'Open Wallet', tab: 'wallet' },
  },
  {
    keywords: ['wart', 'nft', 'art', 'gallery', 'marketplace'],
    response: 'Warts are unique digital assets on CosmoWarp - think of them as encrypted art pieces. You can mint, buy, sell, and collect Warts in the Gallery. Each Wart has rarity levels, editions, and built-in royalties for creators.',
    suggestion: { label: 'Open Gallery', tab: 'gallery' },
  },
  {
    keywords: ['send', 'transfer', 'envoyer'],
    response: 'You can send Warps to any CosmoWarp address. Transactions are processed through the CosmoMesh DAG with 7-layer validation and instant Resonance consensus. No blockchain delays!',
    suggestion: { label: 'Open Wallet', tab: 'wallet' },
  },
  {
    keywords: ['cosmomesh', 'mesh', 'dag', 'network'],
    response: 'CosmoMesh is our revolutionary DAG-based transactional fabric. Unlike traditional blockchains, it uses 7 parallel validation layers and Resonance consensus for near-instant finality. Read the White Paper for the full technical details.',
    suggestion: { label: 'Read White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['help', 'aide', 'how', 'comment'],
    response: 'I\'m here to guide you through CosmoWarp! You can ask me about wallets, mining, Warts (digital art), the CosmoMesh network, or anything else. What would you like to explore?',
    suggestion: { label: 'Open Help', tab: 'help' },
  },
  {
    keywords: ['wall', 'post', 'social', 'feed', 'chat'],
    response: 'The Wall is CosmoWarp\'s decentralized social network. Post text, share Warts, embed external content, and tip posts with Warps. All conversations are encrypted and anonymous.',
    suggestion: { label: 'Open Wall', tab: 'wall' },
  },
  {
    keywords: ['hello', 'hi', 'bonjour', 'salut', 'hey'],
    response: 'Hello! I\'m Cosmo, your AI guide to the CosmoWarp universe. I can help you navigate the ecosystem, explain features, or answer any questions. What interests you?',
  },
  {
    keywords: ['who', 'what are you', 'qui es tu', 'cosmo'],
    response: 'I\'m Cosmo, the AI assistant built into CosmoWarp. I help users navigate the ecosystem, understand features, and make the most of their experience. Think of me as your cosmic guide!',
  },
  {
    keywords: ['token', 'warp', 'supply', 'tokenomics'],
    response: 'Warps (symbol: \u03A9) is the native token of CosmoWarp with a fixed supply cap of 69 million. Tokens are earned through mining and can be used for transactions, tipping posts on the Wall, and purchasing Warts in the Gallery.',
    suggestion: { label: 'Read White Paper', tab: 'whitepaper' },
  },
  {
    keywords: ['sdk', 'developer', 'api', 'dev'],
    response: 'The CosmoWarp SDK lets you build apps and integrations on our ecosystem. It provides wallet management, cryptographic utilities, mining tools, and event-driven APIs.',
    suggestion: { label: 'Open SDK', tab: 'sdk' },
  },
  {
    keywords: ['message', 'dm', 'direct'],
    response: 'Direct messages on CosmoWarp are end-to-end encrypted. You can send private messages to any user on the network. All communications are anonymous and secure.',
    suggestion: { label: 'Open Messages', tab: 'message' },
  },
  {
    keywords: ['privacy', 'anonymous', 'encrypt', 'secure'],
    response: 'Privacy is at the core of CosmoWarp. All conversations are encrypted, identities are pseudonymous through CosmoID, and the network uses zero-knowledge principles. Your data stays yours.',
    suggestion: { label: 'Privacy Policy', tab: 'privacy' },
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
    response: 'Interesting question! I\'m still learning, but I can help you explore CosmoWarp. Try asking me about wallets, mining, Warts, the Wall, or the CosmoMesh network. You can also check the Help section for detailed guides.',
    suggestion: { label: 'Open Help', tab: 'help' },
  };
}

export default function CosmoView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'cosmo',
      text: 'Welcome to CosmoWarp! I\'m Cosmo, your AI guide. Ask me anything about the ecosystem - wallets, mining, Warts, the Wall, or the CosmoMesh network.',
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

    // Simulate AI response with typing delay
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
    { label: 'What is CosmoWarp?', query: 'What is CosmoWarp?' },
    { label: 'How to mine?', query: 'How do I mine Warps?' },
    { label: 'What are Warts?', query: 'What are Warts NFTs?' },
    { label: 'Tell me about the Wall', query: 'Tell me about the Wall social network' },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'cosmo' && (
              <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                <img
                  src={import.meta.env.BASE_URL + 'logo.svg'}
                  alt="Cosmo"
                  className="w-6 h-6"
                />
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
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-body-sm font-medium opacity-80 bg-warp-500/15 border border-warp-500/25 hover:bg-warp-500/25 transition-all cursor-pointer"
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

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-2 items-start">
            <div className="shrink-0 w-8 h-8 flex items-center justify-center">
              <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="Cosmo" className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex gap-1 px-3 py-3">
              <span className="w-1.5 h-1.5 bg-warp-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-warp-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-warp-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Quick actions (only show when few messages) */}
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
                className="px-3 py-1.5 text-body-sm opacity-80 border border-current/10 bg-warp-500/5 hover:bg-warp-500/15 transition-all cursor-pointer"
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
            placeholder="Ask Cosmo anything..."
            className="flex-1 warp-input py-2.5"
            disabled={typing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || typing}
            className="warp-button px-3 py-2.5 shrink-0 disabled:opacity-30"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-label opacity-30 mt-1.5 text-center">
          Cosmo is your AI guide to CosmoWarp. Responses are generated locally.
        </p>
      </div>
    </div>
  );
}
