import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock heavy dependencies to keep smoke test fast
vi.mock('./components/CosmicBackground', () => ({ default: () => null }));
vi.mock('./components/CosmoChatView', () => ({ default: () => <div data-testid="wall-view">Wall</div> }));
vi.mock('./components/MarketplaceView', () => ({ default: () => <div>Gallery</div> }));
vi.mock('./components/WalletView', () => ({ default: () => <div>Wallet</div> }));
vi.mock('./components/MessageView', () => ({ default: () => <div>Messages</div> }));
vi.mock('./components/ProfileView', () => ({ default: () => <div>Profile</div> }));
vi.mock('./components/SignetsView', () => ({ default: () => <div>Signets</div> }));
vi.mock('./components/WhitepaperView', () => ({ default: () => <div>Whitepaper</div> }));
vi.mock('./components/VaultView', () => ({ default: () => <div>Vault</div> }));
vi.mock('./components/AdminView', () => ({ default: () => <div>Admin</div> }));
vi.mock('./components/SettingsView', () => ({ default: () => <div>Settings</div> }));
vi.mock('./components/DevView', () => ({ default: () => <div>Dev</div> }));
vi.mock('./components/UserProfileView', () => ({ default: () => <div>UserProfile</div> }));
vi.mock('./components/DiscoverView', () => ({ default: () => <div>Discover</div> }));
vi.mock('./components/FiatGatewayView', () => ({ default: () => <div>FiatGateway</div> }));
vi.mock('./components/PaymentSuccessView', () => ({ default: () => <div>PaymentSuccess</div> }));
vi.mock('./components/NotificationsView', () => ({ default: () => <div>Notifications</div> }));
vi.mock('./components/CollectionPageView', () => ({ default: () => <div>Collections</div> }));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // App should mount successfully with error boundary and providers
    expect(document.body).toBeTruthy();
  });

  it('renders default route (wall) on /', async () => {
    // Ensure we're on root path
    window.history.pushState({}, '', '/');
    render(<App />);
    const wall = await screen.findByTestId('wall-view');
    expect(wall).toBeInTheDocument();
  });
});
