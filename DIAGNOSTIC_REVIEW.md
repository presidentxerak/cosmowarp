# Strangrz (CosmoWarp) — Diagnostic Review

> **Date:** March 2026
> **Version:** 3.0.0
> **Status:** Active Development

---

## 1. Executive Summary

Strangrz is a decentralized digital artwork certification and marketplace platform combining:
- A custom blockchain protocol (StrangrzChain) with DAG consensus and mesh networking
- NFT artwork management ("Warts") with lazy minting and on-chain storage
- Fiat payment integration (Stripe) for EUR/USD/GBP/JPY/CHF
- Permanent storage on Arweave (via Irys)
- Social features (follows, comments, notifications)
- User hierarchy/levels and reward system
- Chrome extension for wallet integration

The core marketplace features (wallet, artwork, payments) are **production-ready**. Several secondary features (messaging, curation, trading, governance) are **partially implemented or scaffolded**.

---

## 2. Architecture Overview

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 19.2 + TypeScript 5.9 |
| Bundler | Vite 7.3 + Tailwind CSS 4.1 |
| 3D Graphics | Three.js 0.183 |
| State | React Context (WalletContext, ThemeContext) |
| Routing | Custom pathname → tab map |
| Offline | Service Worker + IndexedDB |

### Backend (Vercel Serverless)
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js via @vercel/node 5.6 |
| Database | Supabase PostgreSQL (RLS + Realtime) |
| Payments | Stripe 17.5 (Checkout + Connect) |
| Storage | Arweave (Irys), IPFS (Pinata), Supabase Storage |
| Rate Limiting | In-memory + optional Upstash Redis |

### Database
- **14+ core tables** with Row-Level Security
- Real-time subscriptions via Supabase Realtime
- Key tables: `profiles`, `warts`, `transactions`, `certificates`, `social_follows`, `notifications`, `fiat_transactions`, `stripe_connect_accounts`

---

## 3. Feature Inventory

### Production-Ready
- [x] Wallet creation, signing, key derivation (Ed25519 + ECDSA)
- [x] Artwork (Wart) minting, listing, buying, transferring
- [x] Lazy minting (buyer pays costs)
- [x] Platform fees (10% primary, 5% secondary)
- [x] Fiat payment processing (Stripe Checkout + webhook)
- [x] Seller onboarding (Stripe Connect)
- [x] Arweave permanent storage (Irys)
- [x] User profiles, following, social relationships
- [x] Notifications (follow, buy, sale, comment, level_up)
- [x] Marketplace with filters/search
- [x] 2FA/TOTP security
- [x] Recovery kit (Vault)
- [x] Profile customization (alias, bio, links, avatar)
- [x] Comments, likes, bookmarks
- [x] Admin dashboard
- [x] Media upload to Supabase Storage
- [x] RLS database security
- [x] Service Worker (offline + auto-update)
- [x] Exchange rates (EUR/USD/GBP/JPY/CHF)

### Partial / In-Progress
- [ ] Generative art viewer (framework exists, needs refinement)
- [ ] P2P direct messaging (WebSocket layer ready, UI scaffolded)
- [ ] Advanced curation tools (CurateView exists but minimal)
- [ ] Trading/price analytics (TradingView framework only)
- [ ] PFP collections (integration started)
- [ ] Stripe Connect payout settlement (infrastructure ready, needs testing)

### Missing / Not Started
- [ ] Mobile app
- [ ] Email notifications
- [ ] KYC/AML compliance layer
- [ ] Advanced search/filtering (facets, tags, full-text)
- [ ] Auction system
- [ ] Bundle/collection sales
- [ ] Subscription/royalty streams
- [ ] DAO governance
- [ ] Dispute resolution
- [ ] Recommendation algorithm

---

## 4. Routes & Views (22 routes, 47+ components)

| Route | View | Status |
|-------|------|--------|
| `/` `/wall` | FeedView | Complete |
| `/gallery` | MarketplaceView | Complete |
| `/messages` | MessageView | Partial |
| `/profile` | ProfileView | Complete |
| `/wallet` | WalletView | Complete |
| `/signets` | SignetsView | Complete |
| `/whitepaper` | WhitepaperView | Complete |
| `/vault` | VaultView | Complete |
| `/admin` | AdminView | Complete |
| `/settings` | SettingsView | Complete |
| `/discover` | DiscoverView | Complete |
| `/fiat-gateway` | FiatGatewayView | Complete |
| `/notifications` | NotificationsView | Complete |
| `/dev` | DevView | Dev-only |
| `/curate` | CurateView | Partial |
| `/trading` | TradingView | Partial |
| `/user-profile` | UserProfileView | Complete |
| `/collections` | CollectionPageView | Partial |
| `/payment-success` | PaymentSuccessView | Complete |
| `/payment-cancel` | PaymentCancelView | Complete |

---

## 5. API Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/health` | Health check | Complete |
| GET/POST | `/api/rates` | Exchange rates | Complete |
| POST | `/api/payments/create` | Stripe checkout session | Complete |
| POST | `/api/payments/webhook` | Stripe payment webhook | Complete |
| POST | `/api/connect/onboard` | Stripe Connect onboarding | Complete |
| GET | `/api/connect/status` | Stripe Connect status | Complete |
| POST | `/api/payouts/create` | Seller payout | Complete |
| POST | `/api/storage/irys-upload` | Arweave upload | Complete |

---

## 6. Database Schema Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Wallet, balance, level, admin | Yes |
| `warts` | Artworks (title, media, price, cert) | Yes |
| `wart_history` | Transfer records | Yes |
| `wart_comments` | Comments on artworks | Yes |
| `wart_likes` | Like/favorite artworks | Yes |
| `wart_bookmarks` | Bookmark artworks | Yes |
| `transactions` | Global ledger | Yes |
| `certificates` | Authenticity certs (append-only) | Yes |
| `social_profiles` | Extended profiles (bio, links) | Yes |
| `social_follows` | Follow relationships | Yes |
| `mesh_state` | DAG consensus state | Yes |
| `notifications` | Activity notifications | Yes |
| `totp_configs` | 2FA secrets | Yes |
| `fiat_transactions` | Fiat payment records | Yes |
| `stripe_connect_accounts` | Seller Stripe accounts | Yes |

---

## 7. Environment Variables

### Frontend (VITE_*)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- `VITE_IPFS_GATEWAY_URL` / `VITE_IPFS_PINNING_API_URL` / `VITE_IPFS_PINNING_API_TOKEN`
- `VITE_ARWEAVE_GATEWAY_URL` / `VITE_ARWEAVE_BUNDLER_URL` / `VITE_ARWEAVE_BUNDLER_TOKEN`
- `VITE_API_URL` (optional, local dev)

### Backend (Secret)
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `IRYS_PRIVATE_KEY` / `IRYS_NETWORK`
- `GATEWAY_ADMIN_KEY` / `PAYOUT_SECRET_KEY`
- `CORS_ORIGIN`

---

## 8. Security Assessment

### Strengths
- Row-Level Security on all tables
- Private keys encrypted with AES before storage
- Optional 2FA/TOTP
- Ed25519 signatures on all transactions
- CORS strict origin validation
- IP-based rate limiting on API endpoints
- CSP headers via Vercel config
- Service Worker for integrity checks

### Areas for Improvement
- No KYC/AML compliance layer
- Rate limiting is in-memory (resets on cold start) — needs Redis for production
- No CSRF protection beyond CORS
- No audit logging for admin actions
- Recovery kit depends on user-managed backups
- No automated vulnerability scanning in CI

---

## 9. Performance Considerations

### Current Optimizations
- Code splitting: Three.js, React, Supabase/vendor chunks
- Lazy-loaded views with chunk error recovery
- IndexedDB cache for media (strangrz_media)
- Service Worker offline fallback
- Target: ES2020 + Safari 14

### Potential Bottlenecks
- Large artwork galleries may cause memory pressure (no virtualization)
- Real-time subscriptions scale linearly with connected clients
- In-memory rate limiting doesn't persist across function instances
- No CDN caching strategy for artwork thumbnails
- P2P mesh gossip may flood on large networks

---

## 10. Technical Debt

1. **Custom routing** — pathname matching instead of React Router; limits nested routes, guards, transitions
2. **Single WalletContext** — monolithic context causes unnecessary re-renders
3. **Engine monolith** — 45+ files in `engine/` with tight coupling between wallet, blockchain, social
4. **No test coverage on webapp** — tests only exist for the CosmoWarp protocol (`src/__tests__/`)
5. **No CI/CD pipeline** — no automated testing, linting, or deployment checks
6. **localStorage as primary store** — data loss risk if cleared; Supabase sync is secondary
7. **Hardcoded constants** — fees, limits, and thresholds scattered across files
8. **No error reporting** — no Sentry or equivalent for production error tracking

---

## 11. Integrations Health

| Integration | Status | Notes |
|-------------|--------|-------|
| Supabase | Healthy | Full CRUD + Realtime + Storage |
| Stripe Checkout | Healthy | Payment flow end-to-end |
| Stripe Connect | Healthy | Onboarding + status check |
| Stripe Payouts | Needs Testing | Infrastructure ready, untested |
| Irys/Arweave | Healthy | Upload working, deps at root for Vercel |
| IPFS/Pinata | Configured | Fallback storage, not primary |
| WebSocket P2P | Partial | Signaling server exists, mesh in progress |
| Chrome Extension | Functional | Basic wallet access |

---

## 12. Folder Structure

```
cosmowarp/
├── api/                          Vercel serverless functions (8 endpoints)
│   ├── _shared/                  Shared utilities (rates, rate-limit)
│   ├── payments/                 Stripe checkout + webhook
│   ├── connect/                  Stripe Connect onboarding
│   ├── payouts/                  Seller payouts
│   └── storage/                  Irys/Arweave upload
├── src/                          CosmoWarp Protocol (standalone)
│   ├── core/                     Registers, layers, opcodes, Planck clock
│   ├── vm/                       Virtual machine
│   ├── asm/                      Assembler/parser/CLI
│   └── __tests__/                Protocol tests (Jest)
├── webapp/                       Main web application
│   ├── src/
│   │   ├── App.tsx               Main app + routing
│   │   ├── components/           47+ view components
│   │   ├── context/              WalletContext, ThemeContext
│   │   ├── engine/               Core protocol engines (45+ files)
│   │   └── lib/                  Supabase integration layer
│   ├── public/                   Static assets
│   ├── supabase-schema.sql       Database DDL (577 lines)
│   └── vite.config.ts            Build config
├── extension/                    Chrome extension (Manifest v3)
├── vercel.json                   Deployment config
└── package.json                  Root dependencies
```
