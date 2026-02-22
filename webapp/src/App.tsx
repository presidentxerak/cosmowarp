import { useState, lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { WalletProvider } from './context/WalletContext';
import Header from './components/Header';
const CosmicBackground = lazy(() => import('./components/CosmicBackground'));

class BackgroundErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(_: Error, __: ErrorInfo) { /* swallow background errors */ }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 -z-10"
          style={{
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, #131650 0%, #0a0a1a 70%)',
          }}
        />
      );
    }
    return this.props.children;
  }
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  componentDidCatch(_: Error, __: ErrorInfo) { /* logged above */ }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: '#0a0a1a' }}
        >
          <div className="text-center max-w-md">
            <p className="text-2xl mb-4">{'\u2B21'}</p>
            <h1 className="text-lg font-bold text-purple-300 mb-2">CosmoWarp encountered an error</h1>
            <p className="text-sm text-gray-400 mb-4">{this.state.error || 'Something went wrong.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600/30 border border-purple-500/40 text-purple-300 text-sm cursor-pointer hover:bg-purple-600/50 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import WalletView from './components/WalletView';
import SendView from './components/SendView';
import MineView from './components/MineView';
import MarketplaceView from './components/MarketplaceView';
import FeedView from './components/FeedView';
import AdminView from './components/AdminView';
import ConsoleView from './components/ConsoleView';
import WhitepaperView from './components/WhitepaperView';
import SDKView from './components/SDKView';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');

  return (
    <AppErrorBoundary>
      <WalletProvider>
        <BackgroundErrorBoundary>
          <Suspense fallback={null}><CosmicBackground /></Suspense>
        </BackgroundErrorBoundary>
        <div className="min-h-screen min-h-[100dvh] px-3 sm:px-[10px] pt-0 sm:pt-[10px] pb-3 sm:pb-[10px] relative z-10">
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="pb-6">
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'send' && <SendView />}
            {activeTab === 'mine' && <MineView />}
            {activeTab === 'warts' && <MarketplaceView />}
            {activeTab === 'feed' && <FeedView />}
            {activeTab === 'admin' && <AdminView />}
            {activeTab === 'console' && <ConsoleView />}
            {activeTab === 'whitepaper' && <WhitepaperView />}
            {activeTab === 'sdk' && <SDKView />}
          </main>

          <footer className="text-center text-[10px] text-gray-600 pb-6 space-y-1">
            <p>CosmoWarp Terminal v2.0 &middot; CosmoMesh v2.0 &middot; Resonance Decay &middot; 69M Supply</p>
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
              <span>CosmoWarp Foundation {'\u2B21'}</span>
            </p>
          </footer>
        </div>
      </WalletProvider>
    </AppErrorBoundary>
  );
}

export default App;
