import { useState, useEffect, useCallback, lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import BottomBar from './components/BottomBar';
const CosmicBackground = lazy(() => import('./components/CosmicBackground'));

// ─── Lazy-loaded views (code splitting) ──────────────────
const WalletView = lazy(() => import('./components/WalletView'));
const MarketplaceView = lazy(() => import('./components/MarketplaceView'));
const CosmoChatView = lazy(() => import('./components/CosmoChatView'));
const CosmoView = lazy(() => import('./components/CosmoView'));
const MessageView = lazy(() => import('./components/MessageView'));
const NotificationsView = lazy(() => import('./components/NotificationsView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const SignetsView = lazy(() => import('./components/SignetsView'));
const WhitepaperView = lazy(() => import('./components/WhitepaperView'));
const AdminView = lazy(() => import('./components/AdminView'));
const HelpView = lazy(() => import('./components/HelpView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const LegalsView = lazy(() => import('./components/LegalsView'));
const PrivacyView = lazy(() => import('./components/PrivacyView'));
const LandingView = lazy(() => import('./components/LandingView'));
const DevView = lazy(() => import('./components/DevView'));
const UserProfileView = lazy(() => import('./components/UserProfileView'));
const DiscoverView = lazy(() => import('./components/DiscoverView'));
const VaultView = lazy(() => import('./components/VaultView'));
const FiatGatewayView = lazy(() => import('./components/FiatGatewayView'));

// ─── URL routing map ─────────────────────────────────────
const ROUTE_MAP: Record<string, string> = {
  '/': 'landing',
  '/wall': 'wall',
  '/gallery': 'gallery',
  '/cosmo': 'cosmo',
  '/messages': 'message',
  '/profile': 'profile',
  '/wallet': 'wallet',
  '/signets': 'signets',
  '/whitepaper': 'whitepaper',
  '/vault': 'vault',
  '/admin': 'admin',
  '/help': 'help',
  '/settings': 'settings',
  '/legals': 'legals',
  '/privacy': 'privacy',
  '/discover': 'discover',
  '/fiat-gateway': 'fiat-gateway',
  '/notifications': 'notifications',
  '/dev': 'dev',
};

const TAB_TO_PATH: Record<string, string> = {};
for (const [path, tab] of Object.entries(ROUTE_MAP)) {
  TAB_TO_PATH[tab] = path;
}

function getTabFromPath(): string {
  const path = window.location.pathname;
  return ROUTE_MAP[path] || 'landing';
}

// ─── Error Boundaries ────────────────────────────────────

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
          style={{ pointerEvents: 'none', background: '#000000' }}
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

// ─── Loading fallback ─────────────────────────────────────

function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-20 opacity-30">
      <div className="animate-pulse text-sm">Loading...</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState(getTabFromPath);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigate with URL update
  const navigate = useCallback((tab: string) => {
    setActiveTab(tab);
    const path = TAB_TO_PATH[tab] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const tab = e.state?.tab || getTabFromPath();
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Listen for navigation events from child components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') navigate(detail);
    };
    window.addEventListener('cosmorare-navigate', handler);
    return () => window.removeEventListener('cosmorare-navigate', handler);
  }, [navigate]);

  // Landing page renders full-screen without app chrome
  if (activeTab === 'landing') {
    return (
      <AppErrorBoundary>
        <ThemeProvider>
        <WalletProvider>
          <Suspense fallback={<ViewLoader />}>
            <LandingView onNavigate={navigate} />
          </Suspense>
        </WalletProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    );
  }

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
            onNotificationsClick={() => navigate('notifications')}
            onNavigate={navigate}
          />

          {/* Sidebar - slides from left */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={navigate}
          />

          {/* Main content area - offset for mini sidebar on desktop */}
          <main className="flex-1 px-0 sm:pl-[66px] sm:pr-[10px] pb-16">
            <Suspense fallback={<ViewLoader />}>
              {/* Bottom bar tabs */}
              {activeTab === 'wall' && <CosmoChatView />}
              {activeTab === 'gallery' && <MarketplaceView />}
              {activeTab === 'cosmo' && <CosmoView onNavigate={navigate} />}
              {activeTab === 'message' && <MessageView />}

              {/* Sidebar pages */}
              {activeTab === 'profile' && <ProfileView onNavigate={navigate} />}
              {activeTab === 'wallet' && <WalletView />}
              {activeTab === 'signets' && <SignetsView />}
              {activeTab === 'whitepaper' && <WhitepaperView />}
              {activeTab === 'vault' && <VaultView />}
              {activeTab === 'admin' && <AdminView />}
              {activeTab === 'help' && <HelpView onNavigate={navigate} />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'legals' && <LegalsView />}
              {activeTab === 'privacy' && <PrivacyView />}

              {/* Social */}
              {activeTab === 'user-profile' && <UserProfileView onNavigate={navigate} />}
              {activeTab === 'discover' && <DiscoverView onNavigate={navigate} />}

              {/* Fiat Gateway */}
              {activeTab === 'fiat-gateway' && <FiatGatewayView />}

              {/* Notifications (from top bar bell) */}
              {activeTab === 'notifications' && <NotificationsView />}

              {/* Dev */}
              {activeTab === 'dev' && <DevView />}
            </Suspense>
          </main>

          {/* Bottom navigation bar */}
          <BottomBar activeTab={activeTab} setActiveTab={navigate} />
        </div>
      </WalletProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;
