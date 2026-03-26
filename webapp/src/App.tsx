import { useState, useEffect, useCallback, lazy, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import { setMetaTags, resetMetaTags, setGalleryMeta } from './lib/seo';
import { isOnboardingActive, getCurrentStep, completeStep, skipOnboarding } from './engine/onboarding';
import { Sentry } from './lib/sentry';
import TopBar from './components/TopBar';
import BottomBar from './components/BottomBar';
const CosmicBackground = lazy(() => import('./components/CosmicBackground'));

// ─── Lazy-loaded views with auto-reload on chunk failure ─
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(() =>
    factory().catch(() => {
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise<T>(() => {});
      }
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
const DevView = lazyRetry(() => import('./components/DevView'));
const UserProfileView = lazyRetry(() => import('./components/UserProfileView'));
const DiscoverView = lazyRetry(() => import('./components/DiscoverView'));
const VaultView = lazyRetry(() => import('./components/VaultView'));
const FiatGatewayView = lazyRetry(() => import('./components/FiatGatewayView'));
const PaymentSuccessView = lazyRetry(() => import('./components/PaymentSuccessView'));
const CollectionPageView = lazyRetry(() => import('./components/CollectionPageView'));

// ─── Route → tab mapping (for BottomBar active state) ────
const PATH_TO_TAB: Record<string, string> = {
  '/': 'wall',
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
  '/collections': 'collections',
  '/payment-success': 'payment-success',
  '/payment-cancel': 'payment-cancel',
};

const TAB_TO_PATH: Record<string, string> = {};
for (const [path, tab] of Object.entries(PATH_TO_TAB)) {
  if (!TAB_TO_PATH[tab]) TAB_TO_PATH[tab] = path;
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
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }
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
            <p className="text-base opacity-60 mb-6">{this.state.error || 'Something went wrong.'}</p>
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

// ─── Curate/Trading wrapper (sets gallery sub-tab) ────────

function CurateWrapper() {
  sessionStorage.setItem('strangrz_gallery_tab', 'curate');
  return <MarketplaceView />;
}

function TradingWrapper() {
  sessionStorage.setItem('strangrz_gallery_tab', 'trading');
  return <MarketplaceView />;
}

// ─── Payment Cancel inline page ───────────────────────────

function PaymentCancelView() {
  const nav = useNavigate();
  return (
    <div className="max-w-lg mx-auto py-8 px-4 text-center">
      <p className="text-5xl mb-4">{'\u2716'}</p>
      <h1 className="text-title-md font-bold font-title mb-2">Paiement annulé</h1>
      <p className="opacity-60 text-base mb-6">Aucun montant n'a été débité.</p>
      <button onClick={() => nav('/gallery')} className="warp-button px-6 py-3 text-base cursor-pointer">
        Retour à la Galerie
      </button>
    </div>
  );
}

// ─── Navigation bridge ────────────────────────────────────
// Bridges the legacy `onNavigate(tab)` prop and `strangrz-navigate`
// custom events into react-router navigation.

function NavigationBridge({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const location = useLocation();

  const activeTab = PATH_TO_TAB[location.pathname] || 'wall';

  // Bridge: tab string → react-router navigate
  const navigateTab = useCallback((tab: string) => {
    const path = TAB_TO_PATH[tab] || '/';
    nav(path);
  }, [nav]);

  // Clear chunk reload flag on successful app load
  useEffect(() => { sessionStorage.removeItem('chunk_reload'); }, []);

  // Update SEO meta tags on route change
  useEffect(() => {
    const path = location.pathname;
    if (path === '/gallery') {
      setGalleryMeta();
    } else if (path === '/discover') {
      setMetaTags({ title: 'Discover', description: 'Trending artworks, top creators, and personalized recommendations on Strangrz.' });
    } else if (path === '/whitepaper') {
      setMetaTags({ title: 'Whitepaper', description: 'Strangrz protocol documentation — StrangrzChain, tokenomics, and architecture.' });
    } else {
      resetMetaTags();
    }
  }, [location.pathname]);

  // Listen for legacy strangrz-navigate custom events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') navigateTab(detail);
    };
    window.addEventListener('strangrz-navigate', handler);
    return () => window.removeEventListener('strangrz-navigate', handler);
  }, [navigateTab]);

  // Onboarding state — React-managed for immediate re-render
  const [showOnboarding, setShowOnboarding] = useState(isOnboardingActive);
  const onboardingStep = showOnboarding ? getCurrentStep() : null;

  return (
    <>
      <BackgroundErrorBoundary>
        <Suspense fallback={null}><CosmicBackground /></Suspense>
      </BackgroundErrorBoundary>
      <div className="min-h-screen min-h-[-webkit-fill-available] supports-[min-height:100dvh]:min-h-[100dvh] relative z-10 flex flex-col">
        <TopBar onNavigate={navigateTab} />

        {/* Onboarding banner for new users */}
        {showOnboarding && onboardingStep && (
          <div className="mx-2.5 sm:mx-[10px] mt-2 glass-panel p-4 border-current/20 flex items-center gap-4">
            <span className="text-2xl shrink-0">{onboardingStep.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-bold opacity-90">{onboardingStep.title}</p>
              <p className="text-[11px] opacity-60 mt-0.5">{onboardingStep.description}</p>
            </div>
            <button
              className="warp-button text-[11px] py-1.5 px-3 shrink-0"
              onClick={() => { completeStep(onboardingStep.id); setShowOnboarding(isOnboardingActive()); navigateTab(PATH_TO_TAB[onboardingStep.route.slice(1)] || 'wall'); }}
            >
              {onboardingStep.action}
            </button>
            <button
              className="text-[10px] opacity-40 hover:opacity-70 shrink-0"
              onClick={() => { skipOnboarding(); setShowOnboarding(false); }}
            >
              Skip
            </button>
          </div>
        )}

        <main className="flex-1 px-2.5 sm:px-[10px] pb-16">
          <Suspense fallback={<ViewLoader />}>
            {children}
          </Suspense>
        </main>

        <BottomBar activeTab={activeTab} setActiveTab={navigateTab} />
      </div>
    </>
  );
}

// ─── Route wrapper for components that need onNavigate prop ─

function WithNavigate({ Component }: { Component: React.ComponentType<{ onNavigate: (tab: string) => void }> }) {
  const nav = useNavigate();
  const navigateTab = useCallback((tab: string) => {
    const path = TAB_TO_PATH[tab] || '/';
    nav(path);
  }, [nav]);
  return <Component onNavigate={navigateTab} />;
}

// ─── App ──────────────────────────────────────────────────

function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
      <WalletProvider>
        <BrowserRouter>
          <NavigationBridge>
            <Routes>
              {/* Main tabs */}
              <Route path="/" element={<CosmoChatView />} />
              <Route path="/wall" element={<CosmoChatView />} />
              <Route path="/gallery" element={<MarketplaceView />} />
              <Route path="/messages" element={<MessageView />} />

              {/* Sidebar pages */}
              <Route path="/profile" element={<WithNavigate Component={ProfileView} />} />
              <Route path="/wallet" element={<WalletView />} />
              <Route path="/signets" element={<SignetsView />} />
              <Route path="/whitepaper" element={<WhitepaperView />} />
              <Route path="/vault" element={<VaultView />} />
              <Route path="/admin" element={<AdminView />} />
              <Route path="/settings" element={<WithNavigate Component={SettingsView} />} />

              {/* Social */}
              <Route path="/user-profile" element={<WithNavigate Component={UserProfileView} />} />
              <Route path="/discover" element={<WithNavigate Component={DiscoverView} />} />

              {/* Collections */}
              <Route path="/collections" element={<WithNavigate Component={CollectionPageView} />} />

              {/* Fiat Gateway */}
              <Route path="/fiat-gateway" element={<FiatGatewayView />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsView />} />

              {/* Curate & Trading — gallery with sub-tab */}
              <Route path="/curate" element={<CurateWrapper />} />
              <Route path="/trading" element={<TradingWrapper />} />

              {/* Payment */}
              <Route path="/payment-success" element={<WithNavigate Component={PaymentSuccessView} />} />
              <Route path="/payment-cancel" element={<PaymentCancelView />} />

              {/* Dev */}
              <Route path="/dev" element={<DevView />} />

              {/* Catch-all → redirect to wall */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NavigationBridge>
        </BrowserRouter>
      </WalletProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;
