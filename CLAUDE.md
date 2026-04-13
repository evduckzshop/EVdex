# EVdex — Project Context

## What is EVdex?
A full-stack bookkeeping, CRM, and rewards app for **EVduckzShop LLC** — a trading card business that operates at card shows and online. Built for mobile-first use at shows.

## Tech Stack
- **Frontend**: React 18 + Vite (no TypeScript, JSX only)
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, RLS)
- **Hosting**: Vercel (frontend), Supabase (backend)
- **Styling**: All inline styles — no CSS files, no Tailwind. Uses a shared `C` color object.
- **State**: React Context (AuthContext, NavigationContext, ShowContext) + useState hooks
- **No external UI libraries** — all components are custom-built in `src/components/ui/`

## Architecture

### Roles (single Supabase project)
- `admin` — full access to all tables + team management + settings
- `employee` — read/write internal tables, no admin pages
- `customer` — read-only portal, separate layout, zero access to staff tables

### Key Directories
- `src/pages/` — all page components (lazy-loaded in App.jsx)
- `src/pages/portal/` — customer portal pages (Dashboard, History, Badges, Profile)
- `src/components/ui/` — shared UI primitives (FormComponents, BadgeCard, StaffBadge, LotCalculator, QuickLog)
- `src/components/layout/` — AppLayout (staff), CustomerLayout (customer), PageTransition
- `src/context/` — AuthContext, NavigationContext, ShowContext
- `src/hooks/useData.js` — generic CRUD hook for all tables with activity logging
- `src/lib/supabase.js` — Supabase client, auth helpers, file upload, edge function callers
- `src/lib/exportUtils.js` — CSV/PDF report generation
- `supabase/functions/` — Edge Functions (invite-customer, delete-customer, invite-employee)
- `supabase/migrations/` — SQL migrations (001_customer_portal, 002_badge_updates, 003_trades)

### Database Tables
**Staff tables**: sales, buys, expenses, shows, inventory, contacts, trades, activity_logs, invites, profiles, user_pins
**Customer tables**: customers, reward_events, badge_definitions, customer_badges, points_config

### Key Features Built
- Sales/Buys logging with DealCalc (market calculator with collapsible slider)
- Lot mode with multi-entry calculator + sticky total bar
- Trade calculator (dual-sided, real-time delta)
- Show management with calendar view
- Customer Portal with points, tiers (Bronze/Silver/Golden/Diamond Duck), badges
- Invite-only customer onboarding (admin invites via contact page)
- Export center (CSV + PDF reports)
- Staff badges (fun cosmetic titles with glow/shimmer/holo effects)
- Collapsible sidebar navigation
- Page transitions (fade for tabs, slide for deeper navigation)
- Active show persists globally via ShowContext
- Gamble page (coin flip + dice roll)

### Edge Functions (deployed via Supabase Dashboard)
- `invite-customer` — creates auth user + profile + customer record, sends invite email
- `delete-customer` — full cleanup (badges, rewards, customer, profile, auth user)
- `invite-employee` — creates auth user + profile for staff
- All have JWT verification OFF (auth handled internally)
- CORS is `*` (auth checks are the real security layer)
- Error messages are sanitized (no DB internals leaked)

### RLS Security
- All tables have RLS enabled
- `is_staff()` and `is_customer()` helper functions for policy checks
- `is_admin()` for admin-only operations
- Customers have ZERO access to staff tables
- Points/badges awarded server-side via DB triggers only

### Points System
- $1 spent = 1 point (configurable via points_config table)
- Awarded automatically via BEFORE INSERT trigger on sales table when buyer_contact_id links to a customer
- Also triggers on trades (based on delta)
- Append-only reward_events ledger, balance computed via view
- Tiers: Bronze Duck (0), Silver Duck (500), Golden Duck (2000), Diamond Duck (10000)

### Conventions
- Inline styles everywhere — follow the existing `C` color object pattern
- No new CSS files or className usage
- Mobile-first (390px max-width container)
- Bottom sheet modals for detail views and editors
- Toast component for success/error messages
- Activity logging on all mutations via useData hooks
- Lazy-loaded pages with code splitting

### Supabase Config
- Project URL: stored in VITE_SUPABASE_URL env var
- Site URL (for invite emails): https://evdex.vercel.app
- Email: using default Supabase sender (rate limited to 3-4/hour)
- Storage buckets: `avatars` (profile pics), `photos` (transaction photos)

### Known Limitations
- No custom SMTP set up (email rate limited)
- Inventory not linked to trades yet
- No redemption/perks system for customer points
- No referral system
- Pong page hidden from sidebar but still accessible at /pong
