# Strangrz — Project Plan (Phased Tickets)

> Each phase builds on the previous one. Tickets are ordered by dependency and priority.
> Verification steps are included for each ticket.

---

## Phase 0 — Foundation & DevOps (Weeks 1–2)

### T-001: Set up CI/CD pipeline
**Priority:** Critical | **Effort:** M | **Depends on:** —
- Add GitHub Actions workflow: lint, type-check, build, test
- Run on push/PR to `main` and `develop`
- Block merge if pipeline fails
- **Verify:** Push a commit with a type error → pipeline fails. Fix it → pipeline passes.

### T-002: Add webapp test infrastructure
**Priority:** Critical | **Effort:** M | **Depends on:** —
- Install Vitest + React Testing Library in `webapp/`
- Configure test runner in `vite.config.ts`
- Write smoke tests for App.tsx rendering, WalletContext initialization
- Add test script to `package.json` and CI pipeline
- **Verify:** `npm test` runs and passes. CI includes test step.

### T-003: Add error reporting (Sentry or equivalent)
**Priority:** High | **Effort:** S | **Depends on:** —
- Install Sentry SDK in webapp
- Initialize in `main.tsx` with environment detection (dev/staging/prod)
- Wrap App in Sentry ErrorBoundary
- Add Sentry DSN as env variable
- **Verify:** Trigger an intentional error → appears in Sentry dashboard.

### T-004: Extract hardcoded constants into config
**Priority:** Medium | **Effort:** S | **Depends on:** —
- Create `webapp/src/config/constants.ts`
- Move fees (10%, 5%), limits, thresholds, timeouts from across engine files
- Import from centralized config everywhere
- **Verify:** Grep for hardcoded fee values → only found in constants file.

### T-005: Add production rate limiting with Redis
**Priority:** High | **Effort:** S | **Depends on:** —
- Implement Upstash Redis rate limiter in `api/_shared/rate-limit.ts`
- Fall back to in-memory if Redis env vars not set
- Apply to all payment/connect/payout endpoints
- **Verify:** Deploy to staging → rate limits persist across cold starts.

---

## Phase 1 — Core Quality & Stability (Weeks 3–4)

### T-006: Split WalletContext into focused contexts
**Priority:** High | **Effort:** L | **Depends on:** T-002
- Separate into: `AuthContext` (wallet, keys, auth state), `BalanceContext` (balance, transactions), `SyncContext` (Supabase realtime sync)
- Each context only triggers re-renders for its own state changes
- Update all consuming components
- **Verify:** Profile page re-renders only when profile data changes, not on balance updates. Existing tests pass.

### T-007: Add React Router for proper routing
**Priority:** Medium | **Effort:** L | **Depends on:** T-002
- Install `react-router-dom`
- Replace custom pathname matching in `App.tsx` with `<Routes>` and `<Route>`
- Add route guards for authenticated/admin routes
- Support nested routes where needed (e.g., `/settings/stripe`, `/profile/:address`)
- Preserve lazy loading for all views
- **Verify:** All 22 routes work. Browser back/forward works. Deep links work. Auth-protected routes redirect to landing.

### T-008: Add virtualized lists for marketplace/gallery
**Priority:** Medium | **Effort:** M | **Depends on:** T-002
- Install `@tanstack/react-virtual` or `react-window`
- Apply to MarketplaceView gallery grid, FeedView transaction list, NotificationsView
- Maintain scroll position across tab switches
- **Verify:** Load 500+ warts → smooth scrolling, memory stays under 200MB.

### T-009: Write integration tests for payment flow
**Priority:** High | **Effort:** M | **Depends on:** T-002
- Mock Stripe API with `stripe-mock` or manual mocks
- Test: create checkout session → webhook fires → ownership transfers → notifications sent
- Test: Stripe Connect onboarding flow
- Test: payout creation with valid/invalid secrets
- **Verify:** All payment flow tests pass. Edge cases (duplicate webhook, expired session) covered.

### T-010: Add audit logging for admin actions
**Priority:** Medium | **Effort:** S | **Depends on:** —
- Create `admin_audit_log` table in Supabase (action, actor, target, timestamp, details)
- Log all admin actions: registry changes, user management, config updates
- Add AdminAuditView component to admin dashboard
- **Verify:** Perform admin action → entry appears in audit log. Audit view shows history.

---

## Phase 2 — Marketplace Enhancements (Weeks 5–7)

### T-011: Advanced search & filtering
**Priority:** High | **Effort:** L | **Depends on:** T-008
- Add full-text search on wart title/description (Supabase `tsvector`)
- Filter by: media type, price range, edition type, creator, date
- Tag system: creators can add up to 5 tags per wart
- Add `tags` column to `warts` table, GIN index on tags
- Sort by: newest, price (low/high), most liked, trending
- Debounced search input with URL query params
- **Verify:** Search for partial title → correct results. Filter by price range → correct subset. URL is shareable.

### T-012: Collection system (bundles)
**Priority:** Medium | **Effort:** L | **Depends on:** T-007
- Create `collections` table (id, creator, title, description, cover_image, created_at)
- Create `collection_warts` junction table (collection_id, wart_id, position)
- CollectionPageView: browse collection with grid view
- Creator can add/remove/reorder warts in their collection
- Collection detail page at `/collections/:id`
- **Verify:** Create collection → add 5 warts → view collection page → reorder → remove one. All persists.

### T-013: Auction system
**Priority:** Medium | **Effort:** XL | **Depends on:** T-009, T-011
- Add `auctions` table (wart_id, start_price, reserve_price, start_time, end_time, status)
- Add `bids` table (auction_id, bidder, amount, timestamp)
- Auction lifecycle: create → active → ended → settled
- Real-time bid updates via Supabase Realtime
- Auto-settlement: transfer ownership to highest bidder at end time
- Outbid notifications
- Extend auction by 5min if bid in last 5min (anti-sniping)
- **Verify:** Create auction → place bids from 2 users → highest bidder wins → ownership transfers. Anti-sniping extends time.

### T-014: Artwork detail page improvements
**Priority:** Medium | **Effort:** M | **Depends on:** T-011
- Full-screen artwork viewer with zoom/pan
- Price history chart (line chart of past sales)
- Provenance chain (visual timeline of ownership transfers)
- Related artworks (same creator or similar tags)
- Share button with OpenGraph metadata
- **Verify:** View artwork → zoom works → price history shows past sales → provenance shows full chain.

### T-015: Trending & recommendation algorithm
**Priority:** Low | **Effort:** L | **Depends on:** T-011
- Score warts by: recent likes, views, purchases, comments (time-weighted)
- Store trending scores in `wart_trending` materialized view (refresh hourly)
- DiscoverView sections: Trending, New, Top Sellers, For You (based on follows/likes)
- **Verify:** Like a wart many times → appears in trending. Follow a creator → their new warts appear in "For You".

---

## Phase 3 — Social & Communication (Weeks 8–10)

### T-016: Complete P2P messaging
**Priority:** High | **Effort:** L | **Depends on:** T-006
- Implement message persistence in Supabase (`messages` table)
- End-to-end encryption using recipient's public key (ECDH key exchange)
- Message types: text, wart share, transaction receipt
- Conversation list with unread counts
- Push notification for new messages (in-app)
- Online/offline status indicators
- **Verify:** Send message → recipient sees it in real-time. Refresh → message persists. Unread badge shows.

### T-017: Enhanced notification system
**Priority:** Medium | **Effort:** M | **Depends on:** T-006
- Add notification preferences (per-type enable/disable)
- Group similar notifications (e.g., "5 people liked your wart")
- Mark all as read
- Notification sound toggle
- Deep links from notification to relevant content
- **Verify:** Toggle off "like" notifications → no more like notifs. Click notification → navigates to correct page.

### T-018: Email notifications (optional)
**Priority:** Low | **Effort:** M | **Depends on:** T-017
- Integrate email service (Resend, SendGrid, or Supabase Edge Functions)
- Email templates for: sale notification, new follower, weekly digest
- User preferences for email frequency (instant, daily, weekly, never)
- Unsubscribe link in each email
- **Verify:** Enable email notifs → sell a wart → email received within 1 min. Unsubscribe → no more emails.

### T-019: Creator profiles & verification
**Priority:** Medium | **Effort:** M | **Depends on:** T-007
- Verification badge system (verified creators)
- Creator stats: total sales, volume, collectors count
- Creator spotlight section on Discover page
- Portfolio page with custom layout
- **Verify:** Admin verifies creator → badge appears. Creator stats update after sale.

---

## Phase 4 — Financial & Compliance (Weeks 11–13)

### T-020: End-to-end Stripe Connect payout testing
**Priority:** Critical | **Effort:** M | **Depends on:** T-009
- Test full payout flow in Stripe test mode
- Handle edge cases: failed payout, insufficient balance, account not verified
- Add payout history view in Settings
- Automatic payout scheduling (daily/weekly/manual)
- **Verify:** Seller onboards → buyer purchases → seller sees pending payout → payout completes → funds in Stripe account.

### T-021: Royalty enforcement on secondary sales
**Priority:** High | **Effort:** M | **Depends on:** T-020
- Creator sets royalty percentage (0–15%) at mint time
- On secondary sale: platform fee (5%) + royalty split automatically
- Royalty tracking in `wart_history` and `transactions`
- Creator dashboard showing royalty earnings
- **Verify:** Mint with 10% royalty → sell → resell for 100 STZ → creator receives 10 STZ, platform 5 STZ, seller 85 STZ.

### T-022: KYC/AML compliance layer
**Priority:** High | **Effort:** XL | **Depends on:** T-020
- Integrate KYC provider (Onfido, Jumio, or Stripe Identity)
- Tiered verification: unverified (<500€), basic KYC (<5000€), full KYC (unlimited)
- Store verification status in `profiles` (never store documents)
- Block high-value transactions without appropriate KYC level
- Compliance dashboard for admin
- **Verify:** Unverified user tries to sell >500€ → prompted for KYC. Completes KYC → can sell. Admin sees verification queue.

### T-023: Multi-currency improvements
**Priority:** Medium | **Effort:** M | **Depends on:** T-004
- Real-time exchange rate updates (every 15min via external API)
- Currency selector persisted in user preferences
- Display prices in user's preferred currency everywhere
- Historical rate tracking for transaction records
- **Verify:** Switch to USD → all prices shown in USD. Buy in USD → transaction records correct EUR equivalent.

---

## Phase 5 — Platform Scaling & Performance (Weeks 14–16)

### T-024: CDN caching for artwork media
**Priority:** High | **Effort:** M | **Depends on:** —
- Configure Vercel/Cloudflare CDN for Supabase Storage URLs
- Generate thumbnails at upload time (small, medium, large)
- Serve responsive images (`srcset`) based on viewport
- Cache Arweave content via proxy with long TTL
- **Verify:** Upload artwork → thumbnails generated. Gallery loads → images served from CDN (check headers).

### T-025: Database query optimization
**Priority:** High | **Effort:** M | **Depends on:** T-011
- Add missing indexes on frequently queried columns (creator, owner, price, created_at)
- Optimize marketplace query with composite indexes
- Add connection pooling via Supabase pgBouncer
- Monitor query performance with pg_stat_statements
- **Verify:** Marketplace page load time <500ms with 10K+ warts. No sequential scans on filtered queries.

### T-026: Progressive Web App enhancements
**Priority:** Medium | **Effort:** M | **Depends on:** —
- Improve Service Worker caching strategy (stale-while-revalidate for API, cache-first for assets)
- Add install prompt (A2HS) with custom UI
- Background sync for offline actions (likes, follows)
- Push notifications via Web Push API
- **Verify:** Go offline → cached pages still load. Like a wart offline → syncs when back online. Install prompt appears.

### T-027: Real-time subscription optimization
**Priority:** Medium | **Effort:** M | **Depends on:** T-006
- Reduce Supabase Realtime channels (batch into fewer subscriptions)
- Add server-side filtering (only subscribe to relevant rows)
- Implement exponential backoff reconnection
- Add heartbeat monitoring for connection health
- **Verify:** Connect 50 concurrent clients → server load stable. Disconnect WiFi → reconnects automatically.

---

## Phase 6 — Advanced Features (Weeks 17–20)

### T-028: DAO governance framework
**Priority:** Low | **Effort:** XL | **Depends on:** T-022
- Governance token mechanics (voting weight based on STZ holdings + activity)
- Proposal system: create, discuss, vote, execute
- Create `proposals` table (title, description, type, creator, status, votes_for, votes_against, quorum, deadline)
- Create `votes` table (proposal_id, voter, weight, choice)
- Proposal types: parameter change, treasury spend, feature request
- Time-locked execution of passed proposals
- **Verify:** Create proposal → users vote → passes quorum → executes. Rejected proposal → no execution.

### T-029: Dispute resolution system
**Priority:** Medium | **Effort:** L | **Depends on:** T-010, T-022
- Create `disputes` table (reporter, reported_wart, reason, evidence, status, resolver, resolution)
- Report flow: user reports → admin reviews → resolve (remove/dismiss/warn)
- Automated DMCA-style takedown with counter-notice
- Escrow for disputed transactions (hold funds until resolved)
- **Verify:** Report a wart → admin sees in queue → resolves → wart delisted. Counter-notice → re-review.

### T-030: Subscription & royalty streams
**Priority:** Low | **Effort:** XL | **Depends on:** T-021
- Creator subscription tiers (free, supporter, premium)
- Subscriber-only content (gated warts)
- Recurring STZ payments via automated deductions
- Revenue dashboard for creators
- **Verify:** Creator sets up tiers → user subscribes → sees gated content. Monthly deduction occurs automatically.

### T-031: Mobile-responsive overhaul
**Priority:** High | **Effort:** L | **Depends on:** T-007, T-008
- Audit and fix all views for mobile breakpoints
- Touch-optimized interactions (swipe, pinch-zoom on artwork)
- Mobile-first navigation (bottom tab bar already exists)
- Test on iOS Safari, Android Chrome, Samsung Internet
- **Verify:** All 22 routes render correctly on 375px width. Touch interactions smooth. No horizontal scroll.

### T-032: Analytics dashboard
**Priority:** Medium | **Effort:** M | **Depends on:** T-025
- Platform metrics: total users, active users, total volume, warts minted
- Creator analytics: views, sales, followers over time
- Admin dashboard with charts (daily active users, revenue, top sellers)
- Export reports as CSV
- **Verify:** Admin sees daily stats chart. Creator sees their sales trend. CSV export downloads correctly.

---

## Phase 7 — Security Hardening (Weeks 21–22)

### T-033: Security audit & penetration testing
**Priority:** Critical | **Effort:** L | **Depends on:** T-022
- Audit all API endpoints for injection, auth bypass, rate limit bypass
- Test RLS policies with malicious queries
- Verify encrypted key storage cannot be extracted
- Check for XSS in user-generated content (wart descriptions, comments)
- CSRF testing on all state-changing endpoints
- **Verify:** No critical/high vulnerabilities. All findings documented and remediated.

### T-034: Content Security Policy tightening
**Priority:** High | **Effort:** S | **Depends on:** T-003
- Tighten CSP in `vercel.json` (remove unsafe-inline where possible)
- Add nonce-based script loading
- Subresource Integrity (SRI) for CDN resources
- Report-URI for CSP violation monitoring
- **Verify:** CSP violations logged. No inline scripts without nonce. Third-party scripts use SRI.

### T-035: Automated vulnerability scanning
**Priority:** Medium | **Effort:** S | **Depends on:** T-001
- Add `npm audit` to CI pipeline (fail on high/critical)
- Add Dependabot or Renovate for dependency updates
- Weekly Snyk scan on dependencies
- **Verify:** Push vulnerable dependency → CI fails. Dependabot creates PR for update.

---

## Phase 8 — Polish & Launch Prep (Weeks 23–24)

### T-036: Onboarding flow for new users
**Priority:** High | **Effort:** M | **Depends on:** T-007
- Step-by-step wallet creation guide
- Interactive tutorial (highlight key features)
- Sample warts to explore on first visit
- Skip option for returning users
- **Verify:** New user arrives → sees onboarding → completes steps → lands on marketplace. Skip → goes directly.

### T-037: SEO & Open Graph metadata
**Priority:** Medium | **Effort:** M | **Depends on:** T-007
- Server-side rendering or pre-rendering for public pages (marketplace, artwork detail)
- Open Graph tags for artwork sharing (image, title, description)
- Structured data (JSON-LD) for artworks
- Sitemap generation
- **Verify:** Share artwork URL on Twitter → shows preview image/title. Google can crawl marketplace.

### T-038: Performance budget & monitoring
**Priority:** Medium | **Effort:** S | **Depends on:** T-024
- Set Lighthouse performance budget (>90 score)
- Add Web Vitals tracking (LCP, FID, CLS)
- Performance regression alerts in CI
- Bundle size monitoring (fail if >500KB main chunk)
- **Verify:** Lighthouse score >90. Bundle size under budget. Web Vitals green.

### T-039: Documentation & API reference
**Priority:** Medium | **Effort:** M | **Depends on:** —
- API documentation (OpenAPI/Swagger spec)
- Developer guide for extension/SDK integration
- Database schema documentation with ER diagram
- Deployment guide (Vercel + Supabase setup)
- **Verify:** Developer can set up local environment following docs. API docs are accessible.

### T-040: Load testing & stress testing
**Priority:** High | **Effort:** M | **Depends on:** T-025, T-027
- Load test marketplace with 1000 concurrent users (k6 or Artillery)
- Stress test Supabase Realtime with 500 concurrent subscriptions
- Test payment flow under load (10 concurrent checkouts)
- Identify and fix bottlenecks
- **Verify:** System handles target load without errors. P95 response time <1s. No data corruption.

---

## Summary

| Phase | Tickets | Focus | Weeks |
|-------|---------|-------|-------|
| 0 | T-001 → T-005 | Foundation & DevOps | 1–2 |
| 1 | T-006 → T-010 | Core Quality & Stability | 3–4 |
| 2 | T-011 → T-015 | Marketplace Enhancements | 5–7 |
| 3 | T-016 → T-019 | Social & Communication | 8–10 |
| 4 | T-020 → T-023 | Financial & Compliance | 11–13 |
| 5 | T-024 → T-027 | Scaling & Performance | 14–16 |
| 6 | T-028 → T-032 | Advanced Features | 17–20 |
| 7 | T-033 → T-035 | Security Hardening | 21–22 |
| 8 | T-036 → T-040 | Polish & Launch Prep | 23–24 |

**Total: 40 tickets across 8 phases (~24 weeks)**

---

## Critical Path

The following tickets are blockers for multiple downstream items:

```
T-001 (CI/CD) ─┬─→ T-002 (Tests) ──→ T-006 (Context split) ──→ T-016 (Messaging)
               │                    ├─→ T-007 (Router) ──→ T-012 (Collections)
               │                    ├─→ T-008 (Virtual lists) ──→ T-011 (Search)
               │                    └─→ T-009 (Payment tests) ──→ T-020 (Payouts)
               └─→ T-035 (Vuln scan)                           └─→ T-022 (KYC)
```

**Start with Phase 0 — everything else depends on having CI and tests in place.**
