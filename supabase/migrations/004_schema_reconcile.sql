-- ============================================================
-- EVdex Migration 004: Reconcile schema files with production
-- Run in Supabase SQL Editor
--
-- Several columns and constraint changes were applied directly to the
-- live database and never written down. This migration brings the repo
-- back in sync. Every statement is idempotent — it is safe to run even
-- where the change is already in place.
-- ============================================================

-- ── 1. sales.sale_type is free text ──────────────────────────
-- The Sales form offers Singles / Slabs / Sealed / Lot plus an "Other"
-- box that accepts any text, so a fixed CHECK can never hold. The
-- original constraint listed ('Single card','Lot','Slab','Other').
alter table public.sales drop constraint if exists sales_sale_type_check;

-- ── 2. Lot breakdowns (multi-entry lot calculator) ───────────
alter table public.sales add column if not exists lot_entries   jsonb;
alter table public.buys  add column if not exists lot_entries   jsonb;

-- ── 3. Split payments on sales ───────────────────────────────
-- Shape: [{"method":"Cash","amount":40},{"method":"Venmo","amount":60}]
alter table public.sales add column if not exists payment_split jsonb;

-- ── 4. Trade cash settlement ─────────────────────────────────
alter table public.trades add column if not exists payment_method text;
alter table public.trades add column if not exists amount_paid    numeric(10,2);

-- ── 5. Per-user preferences + cosmetic staff badges ──────────
-- settings holds { default_sale_pct, default_buy_pct, default_trade_pct }
alter table public.profiles add column if not exists settings     jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists badge_title  text;
alter table public.profiles add column if not exists badge_color  text;
alter table public.profiles add column if not exists badge_effect text;

-- ── 6. Contact avatar + accent colour ────────────────────────
alter table public.contacts add column if not exists avatar_url text;
alter table public.contacts add column if not exists color      text;

-- The Add/Edit contact forms submit name, nickname, phone, instagram and
-- notes only — role is never set, so it cannot be NOT NULL.
alter table public.contacts alter column role drop not null;

-- ── 7. Customer portal first-visit timestamp ─────────────────
alter table public.customers add column if not exists accepted_at timestamptz;

-- ── 8. Indexes for the filters the app actually runs ─────────
create index if not exists idx_sales_show_id    on public.sales(show_id);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_buys_show_id     on public.buys(show_id);
create index if not exists idx_buys_created_at  on public.buys(created_at desc);
create index if not exists idx_expenses_show_id on public.expenses(show_id);
create index if not exists idx_sales_buyer_contact  on public.sales(buyer_contact_id);
create index if not exists idx_buys_source_contact  on public.buys(source_contact_id);
