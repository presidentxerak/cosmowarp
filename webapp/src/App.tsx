import { useState, useEffect, useCallback, lazy, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
const CosmicBackground = lazy(() => import('./components/CosmicBackground'));

// ─── Lazy-loaded views with auto-reload on chunk failure ─
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      // Chunk failed to load (stale deployment) — reload once
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        // Return a never-resolving promise to prevent double-render during reload
        return new Promise<T>(() => {});
      }
      // Already reloaded once — retry factory without reload loop
      return factory();
    })
  );
}

const WalletView = lazyRetry(() => import('./components/WalletView'));
const MarketplaceView = lazyRetry(() => import('./components/MarketplaceView'));
const CosmoChatView = lazyRetry(() => import('./components/CosmoChatView'));
const MessageView = lazyRetry(() => import('./components/MessageView'));
const NotificationsView = lazyRetry(() => import('./components/NotificationsView'));
const ProfileView = lazyRetry(() => import('./components/ProfileView'));
const SignetsView = lazyRetry(() => import('./components/SignetsView'));
const WhitepaperView = lazyRetry(() => import('./components/WhitepaperView'));
const AdminView = lazyRetry(() => import('./components/AdminView'));
const SettingsView = lazyRetry(() => import('./components/SettingsView'));
const LandingView = lazyRetry(() => import('./components/LandingView'));
const DevView = lazyRetry(() => import('./components/DevView'));
const UserProfileView = lazyRetry(() => import('./components/UserProfileView'));
const DiscoverView = lazyRetry(() => import('./components/DiscoverView'));
const VaultView = lazyRetry(() => import('./components/VaultView'));
const FiatGatewayView = lazyRetry(() => import('./components/FiatGatewayView'));

// ─── URL routing map ─────────────────────────────────────
const ROUTE_MAP: Record<string, string> = {
  '/': 'landing',
  '/wall': 'wall',
  '/gallery': 'gallery',
  '/messages': 'message',
  '/profile': 'profile',
  '/wallet': 'wallet',
  '/signets': 'signets',
  '/whitepaper': 'whitepaper',
  '/vault': 'vault',
  '/admin': 'admin',
  '/settings': 'settings',
  '/discover': 'discover',
  '/fiat-gateway': 'fiat-gateway',
  '/notifications': 'notifications',
  '/dev': 'dev',
  '/curate': 'curate',
  '/trading': 'trading',
  '/user-profile': 'user-profile',
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
  componentDidCatch() { /* swallow background errors */ }
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
  componentDidCatch() { /* logged above */ }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: '#000000', color: '#ffffff' }}
        >
          <div className="text-center max-w-md">
            <p className="text-4xl mb-6">{'\u2B21'}</p>
            <h1 className="text-title-md font-bold mb-3">Strangrz encountered an error</h1>
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

  // Clear chunk reload flag on successful app load
  useEffect(() => { sessionStorage.removeItem('chunk_reload'); }, []);

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
    window.addEventListener('strangrz-navigate', handler);
    return () => window.removeEventListener('strangrz-navigate', handler);
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
        <div className="min-h-screen min-h-[-webkit-fill-available] supports-[min-height:100dvh]:min-h-[100dvh] relative z-10 flex flex-col">
          {/* Top bar - sticky search + create */}
          <TopBar onNavigate={navigate} />

          {/* Main content area */}
          <main className="flex-1 px-[10px] pb-16">
            <Suspense fallback={<ViewLoader />}>
              {/* Bottom bar tabs */}
              {activeTab === 'wall' && <CosmoChatView />}
              {activeTab === 'gallery' && <MarketplaceView />}
              {activeTab === 'message' && <MessageView />}

              {/* Sidebar pages */}
              {activeTab === 'profile' && <ProfileView onNavigate={navigate} />}
              {activeTab === 'wallet' && <WalletView />}
              {activeTab === 'signets' && <SignetsView />}
              {activeTab === 'whitepaper' && <WhitepaperView />}
              {activeTab === 'vault' && <VaultView />}
              {activeTab === 'admin' && <AdminView />}
              {activeTab === 'settings' && <SettingsView onNavigate={navigate} />}

              {/* Social */}
              {activeTab === 'user-profile' && <UserProfileView onNavigate={navigate} />}
              {activeTab === 'discover' && <DiscoverView onNavigate={navigate} />}

              {/* Fiat Gateway */}
              {activeTab === 'fiat-gateway' && <FiatGatewayView />}

              {/* Notifications (from top bar bell) */}
              {activeTab === 'notifications' && <NotificationsView />}

              {/* Curate & Trading — redirect to gallery with tab */}
              {activeTab === 'curate' && (() => { sessionStorage.setItem('strangrz_gallery_tab', 'curate'); return <MarketplaceView />; })()}
              {activeTab === 'trading' && (() => { sessionStorage.setItem('strangrz_gallery_tab', 'trading'); return <MarketplaceView />; })()}

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
