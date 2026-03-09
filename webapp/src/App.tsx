import { useState, useEffect, lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import BottomBar from './components/BottomBar';
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
            background: '#000000',
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
          style={{ background: '#000000', color: '#ffffff' }}
        >
          <div className="text-center max-w-md">
            <p className="text-4xl mb-6">{'\u2B21'}</p>
            <h1 className="text-title-md font-bold mb-3">Cosmorare encountered an error</h1>
            <p className="text-base opacity-50 mb-6">{this.state.error || 'Something went wrong.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="warp-button px-6 py-3 text-base cursor-pointer"
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
import MarketplaceView from './components/MarketplaceView';
import CosmoChatView from './components/CosmoChatView';
import CosmoView from './components/CosmoView';
import MessageView from './components/MessageView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import SignetsView from './components/SignetsView';
import WhitepaperView from './components/WhitepaperView';
import FondationView from './components/FondationView';
import AdminView from './components/AdminView';
import SDKView from './components/SDKView';
import ConsoleView from './components/ConsoleView';
import HelpView from './components/HelpView';
import SettingsView from './components/SettingsView';
import LegalsView from './components/LegalsView';
import PrivacyView from './components/PrivacyView';
import LandingView from './components/LandingView';
import DevView from './components/DevView';
import UserProfileView from './components/UserProfileView';
import DiscoverView from './components/DiscoverView';
import VaultView from './components/VaultView';
import FiatGatewayView from './components/FiatGatewayView';
import PFPCollectionView from './components/PFPCollectionView';

function App() {
  const [activeTab, setActiveTab] = useState('wall');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen for navigation events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setActiveTab(detail);
    };
    window.addEventListener('cosmorare-navigate', handler);
    return () => window.removeEventListener('cosmorare-navigate', handler);
  }, []);

  return (
    <AppErrorBoundary>
      <ThemeProvider>
      <WalletProvider>
        <BackgroundErrorBoundary>
          <Suspense fallback={null}><CosmicBackground /></Suspense>
        </BackgroundErrorBoundary>
        <div className="min-h-screen min-h-[100dvh] relative z-10 flex flex-col">
          {/* Top bar - sticky search + profile + notifications */}
          <TopBar
            onProfileClick={() => setSidebarOpen(true)}
            onNotificationsClick={() => setActiveTab('notifications')}
            onNavigate={setActiveTab}
          />

          {/* Sidebar - slides from left */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Main content area - offset for mini sidebar on desktop */}
          <main className="flex-1 px-0 sm:pl-[66px] sm:pr-[10px] pb-16">
            {/* Bottom bar tabs */}
            {activeTab === 'wall' && <CosmoChatView />}
            {activeTab === 'gallery' && <MarketplaceView />}
            {activeTab === 'cosmo' && <CosmoView onNavigate={setActiveTab} />}
            {activeTab === 'message' && <MessageView />}

            {/* Sidebar pages */}
            {activeTab === 'profile' && <ProfileView onNavigate={setActiveTab} />}
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'signets' && <SignetsView />}
            {activeTab === 'whitepaper' && <WhitepaperView />}
            {activeTab === 'fondation' && <FondationView />}
            {activeTab === 'vault' && <VaultView />}
            {activeTab === 'admin' && <AdminView />}
            {activeTab === 'sdk' && <SDKView />}
            {activeTab === 'console' && <ConsoleView />}
            {activeTab === 'help' && <HelpView onNavigate={setActiveTab} />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'legals' && <LegalsView />}
            {activeTab === 'privacy' && <PrivacyView />}

            {/* Social */}
            {activeTab === 'user-profile' && <UserProfileView onNavigate={setActiveTab} />}
            {activeTab === 'discover' && <DiscoverView onNavigate={setActiveTab} />}

            {/* Fiat Gateway & PFP */}
            {activeTab === 'fiat-gateway' && <FiatGatewayView />}
            {activeTab === 'pfp-collection' && <PFPCollectionView />}

            {/* Notifications (from top bar bell) */}
            {activeTab === 'notifications' && <NotificationsView />}

            {/* Legacy */}
            {activeTab === 'landing' && <LandingView onNavigate={setActiveTab} />}
            {activeTab === 'dev' && <DevView />}
          </main>

          {/* Bottom navigation bar */}
          <BottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </WalletProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;
