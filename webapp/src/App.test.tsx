import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock heavy dependencies to keep smoke test fast
vi.mock('./components/CosmicBackground', () => ({ default: () => null }));
vi.mock('./components/CosmoChatView', () => ({ default: () => <div data-testid="wall-view">Wall</div> }));
vi.mock('./components/MarketplaceView', () => ({ default: () => <div>Gallery</div> }));
vi.mock('./components/WalletView', () => ({ default: () => <div>Wallet</div> }));
vi.mock('./components/MessageView', () => ({ default: () => <div>Messages</div> }));
vi.mock('./components/ProfileView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>Profile</div> }));
vi.mock('./components/SignetsView', () => ({ default: () => <div>Signets</div> }));
vi.mock('./components/WhitepaperView', () => ({ default: () => <div>Whitepaper</div> }));
vi.mock('./components/VaultView', () => ({ default: () => <div>Vault</div> }));
vi.mock('./components/AdminView', () => ({ default: () => <div>Admin</div> }));
vi.mock('./components/SettingsView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>Settings</div> }));
vi.mock('./components/DevView', () => ({ default: () => <div>Dev</div> }));
vi.mock('./components/UserProfileView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>UserProfile</div> }));
vi.mock('./components/DiscoverView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>Discover</div> }));
vi.mock('./components/FiatGatewayView', () => ({ default: () => <div>FiatGateway</div> }));
vi.mock('./components/PaymentSuccessView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>PaymentSuccess</div> }));
vi.mock('./components/NotificationsView', () => ({ default: () => <div>Notifications</div> }));
vi.mock('./components/CollectionPageView', () => ({ default: ({ onNavigate: _ }: { onNavigate: (t: string) => void }) => <div>Collections</div> }));

describe('App', () => {
  it('renders without crashing', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('renders default route (wall) on /', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    const wall = await screen.findByTestId('wall-view');
    expect(wall).toBeInTheDocument();
  });

  it('renders catch-all route → redirects to wall', async () => {
    window.history.pushState({}, '', '/nonexistent-page');
    render(<App />);
    const wall = await screen.findByTestId('wall-view');
    expect(wall).toBeInTheDocument();
  });
});
