import { useState } from 'react';
import { WalletProvider } from './context/WalletContext';
import Header from './components/Header';
import WalletView from './components/WalletView';
import SendView from './components/SendView';
import MineView from './components/MineView';
import FeedView from './components/FeedView';
import ConsoleView from './components/ConsoleView';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');

  return (
    <WalletProvider>
      <div className="min-h-screen p-2 sm:p-4 max-w-2xl mx-auto">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main>
          {activeTab === 'wallet' && <WalletView />}
          {activeTab === 'send' && <SendView />}
          {activeTab === 'mine' && <MineView />}
          {activeTab === 'feed' && <FeedView />}
          {activeTab === 'console' && <ConsoleView />}
        </main>

        <footer className="text-center text-[10px] text-gray-600 mt-6 pb-4">
          CosmoWarp Terminal &middot; CosmoMesh Protocol v1.0 &middot; Ed25519 + SHA-256 + AES-GCM &middot; {'\u2726'}
        </footer>
      </div>
    </WalletProvider>
  );
}

export default App;
