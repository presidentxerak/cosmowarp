import { useState } from 'react';
import { WalletProvider } from './context/WalletContext';
import Header from './components/Header';
import WalletView from './components/WalletView';
import SendView from './components/SendView';
import MineView from './components/MineView';
import FeedView from './components/FeedView';
import AdminView from './components/AdminView';
import ConsoleView from './components/ConsoleView';
import WhitepaperView from './components/WhitepaperView';
import SDKView from './components/SDKView';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');

  return (
    <WalletProvider>
      <div className="min-h-screen p-2 sm:p-4 max-w-3xl mx-auto">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="pb-6">
          {activeTab === 'wallet' && <WalletView />}
          {activeTab === 'send' && <SendView />}
          {activeTab === 'mine' && <MineView />}
          {activeTab === 'feed' && <FeedView />}
          {activeTab === 'admin' && <AdminView />}
          {activeTab === 'console' && <ConsoleView />}
          {activeTab === 'whitepaper' && <WhitepaperView />}
          {activeTab === 'sdk' && <SDKView />}
        </main>

        <footer className="text-center text-[10px] text-gray-600 pb-6 space-y-1">
          <p>CosmoWarp Terminal &middot; CosmoMesh v1.0 &middot; Resonance Decay &middot; 69M Supply</p>
          <p>
            <button
              onClick={() => setActiveTab('whitepaper')}
              className="text-warp-400/50 hover:text-warp-400 transition-colors cursor-pointer"
            >
              White Paper
            </button>
            {' \u00B7 '}
            <button
              onClick={() => setActiveTab('sdk')}
              className="text-warp-400/50 hover:text-warp-400 transition-colors cursor-pointer"
            >
              SDK & API
            </button>
            {' \u00B7 '}
            <span>CosmoWarp Foundation {'\u2726'}</span>
          </p>
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
