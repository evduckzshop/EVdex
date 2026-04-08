-- ============================================================
-- EVdex Migration 001: Customer Portal Schema & Security
-- Run this in the Supabase SQL editor AFTER the base schema.sql
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- SECTION 1: HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Staff check: admin or employee (NOT customer)
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'employee')
      and is_active = true
  );
$$;

-- Customer check: authenticated customer viewing their own data
create or replace function public.is_customer()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'customer'
      and is_active = true
  );
$$;

-- NOTE: get_customer_for_contact() is created AFTER the customers table in Section 3

-- ════════════════════════════════════════════════════════════
-- SECTION 2: ALTER EXISTING TABLES
-- ════════════════════════════════════════════════════════════

-- 2a. Add 'customer' to profiles.role check constraint
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'employee', 'customer'));

-- 2b. Update handle_new_user() to support customer role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

-- 2c. Add email column to contacts (for invite matching suggestions)
alter table public.contacts add column if not exists email text;
alter table public.contacts add column if not exists nickname text;
alter table public.contacts add column if not exists instagram text;

-- 2d. Add buyer_contact_id / source_contact_id if not present
alter table public.sales add column if not exists buyer_contact_id uuid references public.contacts(id);
alter table public.buys  add column if not exists source_contact_id uuid references public.contacts(id);

-- 2e. Add points tracking columns to sales table
alter table public.sales add column if not exists points_awarded     numeric(10,2) default 0;
alter table public.sales add column if not exists points_awarded_at  timestamptz;
alter table public.sales add column if not exists points_customer_id uuid;

-- 2f. Update invites table to support customer role
alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites
  add constraint invites_role_check
  check (role in ('admin', 'employee', 'customer'));

-- Add contact_id to invites (pre-link on customer invite)
alter table public.invites add column if not exists contact_id uuid references public.contacts(id);

-- ════════════════════════════════════════════════════════════
-- SECTION 3: NEW TABLES
-- ════════════════════════════════════════════════════════════

-- 3a. CUSTOMERS — Extended customer profile (1:1 with profiles where role='customer')
create table if not exists public.customers (
  id                uuid primary key references public.profiles(id) on delete cascade,
  contact_id        uuid unique references public.contacts(id),
  contact_linked_by uuid references public.profiles(id),
  contact_linked_at timestamptz,
  display_name      text,
  email             text,
  phone             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

-- Helper function (created here because it depends on customers table)
create or replace function public.get_customer_for_contact(p_contact_id uuid)
returns uuid language sql security definer stable as $$
  select id from public.customers
  where contact_id = p_contact_id
  limit 1;
$$;

-- 3b. POINTS CONFIG — Adjustable rates and tier thresholds
create table if not exists public.points_config (
  key         text primary key,
  value       numeric(10,4) not null,
  label       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

-- Insert default config
insert into public.points_config (key, value, label) values
  ('rate_purchase',     1.0,     'Points per $1 spent (buying from us)'),
  ('tier_bronze_min',   0,       'Bronze Duck — minimum points'),
  ('tier_silver_min',   500,     'Silver Duck — minimum points'),
  ('tier_gold_min',     2000,    'Golden Duck — minimum points'),
  ('tier_diamond_min',  10000,   'Diamond Duck — minimum points')
on conflict (key) do nothing;

-- 3c. REWARD EVENTS — Append-only points ledger (never update/delete)
create table if not exists public.reward_events (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id),
  event_type    text not null check (event_type in (
    'purchase',           -- Points from a sale transaction
    'bonus',              -- Manual bonus from admin
    'adjustment',         -- Admin correction
    'tier_promotion',     -- Logged when tier changes
    'badge_earned'        -- Logged when badge awarded
  )),
  points        numeric(10,2) not null,  -- positive = earn, negative = deduct
  description   text,
  reference_id  uuid,                    -- FK to sales.id or other source
  created_at    timestamptz not null default now()
);

-- 3d. BADGE DEFINITIONS — What badges exist
create table if not exists public.badge_definitions (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null,
  icon          text,                    -- emoji or icon identifier
  category      text not null default 'milestone' check (category in ('milestone', 'spending', 'tier', 'special')),
  threshold     jsonb,                   -- e.g. {"purchase_count": 10} or {"single_purchase_min": 100}
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Insert default badges
insert into public.badge_definitions (slug, name, description, icon, category, threshold, sort_order) values
  ('first_purchase',    'First Purchase',    'Made your first purchase',                        'duck',      'milestone', '{"purchase_count": 1}',       1),
  ('ten_purchases',     'Regular',           'Completed 10 purchases',                          'star',      'milestone', '{"purchase_count": 10}',      2),
  ('fifty_purchases',   'Dedicated',         'Completed 50 purchases',                          'fire',      'milestone', '{"purchase_count": 50}',      3),
  ('hundred_purchases', 'Centurion',         'Completed 100 purchases',                         'trophy',    'milestone', '{"purchase_count": 100}',     4),
  ('big_spender',       'Big Spender',       'Single purchase of $100 or more',                 'money',     'spending',  '{"single_purchase_min": 100}', 5),
  ('whale',             'Whale',             'Single purchase of $500 or more',                 'whale',     'spending',  '{"single_purchase_min": 500}', 6),
  ('bronze_duck',       'Bronze Duck',       'Welcome to the flock!',                           'bronze',    'tier',      '{"tier": "bronze"}',          10),
  ('silver_duck',       'Silver Duck',       'Rising through the ranks',                        'silver',    'tier',      '{"tier": "silver"}',          11),
  ('golden_duck',       'Golden Duck',       'A true collector',                                'gold',      'tier',      '{"tier": "gold"}',            12),
  ('diamond_duck',      'Diamond Duck',      'Elite status — the best of the best',             'diamond',   'tier',      '{"tier": "diamond"}',         13)
on conflict (slug) do nothing;

-- 3e. CUSTOMER BADGES — Which badges each customer has earned
create table if not exists public.customer_badges (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers(id),
  badge_id      uuid not null references public.badge_definitions(id),
  earned_at     timestamptz not null default now(),
  reference_id  uuid,                    -- What triggered it (sale id, etc.)
  unique (customer_id, badge_id)         -- One badge per customer
);

-- ════════════════════════════════════════════════════════════
-- SECTION 4: VIEWS
-- ════════════════════════════════════════════════════════════

-- 4a. Customer point balance (computed from reward_events ledger)
create or replace view public.customer_point_balance as
select
  c.id as customer_id,
  c.display_name,
  c.contact_id,
  coalesce(sum(re.points), 0) as total_points,
  count(re.id) filter (where re.event_type = 'purchase') as purchase_count,
  coalesce(sum(re.points) filter (where re.event_type = 'purchase'), 0) as purchase_points,
  max(re.created_at) as last_activity
from public.customers c
left join public.reward_events re on re.customer_id = c.id
group by c.id, c.display_name, c.contact_id;

-- 4b. Customer tier (computed from balance + config)
create or replace view public.customer_tier as
select
  cpb.customer_id,
  cpb.display_name,
  cpb.total_points,
  cpb.purchase_count,
  cpb.last_activity,
  case
    when cpb.total_points >= (select value from public.points_config where key = 'tier_diamond_min')
      then 'Diamond Duck'
    when cpb.total_points >= (select value from public.points_config where key = 'tier_gold_min')
      then 'Golden Duck'
    when cpb.total_points >= (select value from public.points_config where key = 'tier_silver_min')
      then 'Silver Duck'
    else 'Bronze Duck'
  end as tier,
  case
    when cpb.total_points >= (select value from public.points_config where key = 'tier_diamond_min')
      then 'diamond'
    when cpb.total_points >= (select value from public.points_config where key = 'tier_gold_min')
      then 'gold'
    when cpb.total_points >= (select value from public.points_config where key = 'tier_silver_min')
      then 'silver'
    else 'bronze'
  end as tier_slug,
  case
    when cpb.total_points >= (select value from public.points_config where key = 'tier_diamond_min')
      then null  -- already at max
    when cpb.total_points >= (select value from public.points_config where key = 'tier_gold_min')
      then (select value from public.points_config where key = 'tier_diamond_min') - cpb.total_points
    when cpb.total_points >= (select value from public.points_config where key = 'tier_silver_min')
      then (select value from public.points_config where key = 'tier_gold_min') - cpb.total_points
    else
      (select value from public.points_config where key = 'tier_silver_min') - cpb.total_points
  end as points_to_next_tier
from public.customer_point_balance cpb;

-- 4c. Customer transaction history (sales where contact is linked)
-- Customers see ONLY their own linked transactions via RLS
create or replace view public.customer_transaction_history as
select
  s.id,
  s.description,
  s.sale_type,
  s.sale_price,
  s.payment,
  s.points_awarded,
  sh.name as show_name,
  s.created_at
from public.sales s
left join public.shows sh on sh.id = s.show_id
inner join public.customers c on c.contact_id = s.buyer_contact_id
where c.id = auth.uid();

-- ════════════════════════════════════════════════════════════
-- SECTION 5: POINTS ENGINE — Database trigger
-- ════════════════════════════════════════════════════════════

-- Trigger function: auto-award points when staff logs a sale
-- with a buyer_contact_id that is linked to a customer account
create or replace function public.award_points_on_sale()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_rate        numeric;
  v_points      numeric;
  v_old_tier    text;
  v_new_tier    text;
  v_purchase_count bigint;
  v_badge       record;
begin
  -- Only process if there's a buyer_contact_id
  if new.buyer_contact_id is null then
    return new;
  end if;

  -- Skip if points already awarded for this sale
  if new.points_awarded > 0 and new.points_awarded_at is not null then
    return new;
  end if;

  -- Find linked customer
  v_customer_id := public.get_customer_for_contact(new.buyer_contact_id);
  if v_customer_id is null then
    return new;
  end if;

  -- Get points rate from config
  select value into v_rate from public.points_config where key = 'rate_purchase';
  if v_rate is null then v_rate := 1.0; end if;

  -- Calculate points
  v_points := round(new.sale_price * v_rate, 2);
  if v_points <= 0 then return new; end if;

  -- Get tier before awarding
  select tier_slug into v_old_tier from public.customer_tier where customer_id = v_customer_id;

  -- Insert reward event
  insert into public.reward_events (customer_id, event_type, points, description, reference_id)
  values (
    v_customer_id,
    'purchase',
    v_points,
    'Purchase: ' || left(new.description, 100),
    new.id
  );

  -- Stamp the sale record
  new.points_awarded     := v_points;
  new.points_awarded_at  := now();
  new.points_customer_id := v_customer_id;

  -- Get tier after awarding
  select tier_slug into v_new_tier from public.customer_tier where customer_id = v_customer_id;

  -- If tier changed, log it and award tier badge
  if v_old_tier is distinct from v_new_tier and v_new_tier is not null then
    insert into public.reward_events (customer_id, event_type, points, description)
    values (v_customer_id, 'tier_promotion', 0, 'Promoted to ' || v_new_tier || ' tier');

    -- Award tier badge
    insert into public.customer_badges (customer_id, badge_id, reference_id)
    select v_customer_id, bd.id, new.id
    from public.badge_definitions bd
    where bd.slug = v_new_tier || '_duck'
      and bd.is_active = true
    on conflict (customer_id, badge_id) do nothing;
  end if;

  -- Check milestone badges
  select count(*) into v_purchase_count
  from public.reward_events
  where customer_id = v_customer_id and event_type = 'purchase';

  -- Award milestone badges based on purchase count
  for v_badge in
    select bd.id, bd.slug, (bd.threshold->>'purchase_count')::int as req_count
    from public.badge_definitions bd
    where bd.category = 'milestone'
      and bd.is_active = true
      and bd.threshold->>'purchase_count' is not null
      and (bd.threshold->>'purchase_count')::int <= v_purchase_count
      and not exists (
        select 1 from public.customer_badges cb
        where cb.customer_id = v_customer_id and cb.badge_id = bd.id
      )
  loop
    insert into public.customer_badges (customer_id, badge_id, reference_id)
    values (v_customer_id, v_badge.id, new.id)
    on conflict (customer_id, badge_id) do nothing;

    insert into public.reward_events (customer_id, event_type, points, description, reference_id)
    values (v_customer_id, 'badge_earned', 0, 'Badge earned: ' || v_badge.slug, new.id);
  end loop;

  -- Check spending badges (single purchase amount)
  for v_badge in
    select bd.id, bd.slug, (bd.threshold->>'single_purchase_min')::numeric as min_amt
    from public.badge_definitions bd
    where bd.category = 'spending'
      and bd.is_active = true
      and bd.threshold->>'single_purchase_min' is not null
      and (bd.threshold->>'single_purchase_min')::numeric <= new.sale_price
      and not exists (
        select 1 from public.customer_badges cb
        where cb.customer_id = v_customer_id and cb.badge_id = bd.id
      )
  loop
    insert into public.customer_badges (customer_id, badge_id, reference_id)
    values (v_customer_id, v_badge.id, new.id)
    on conflict (customer_id, badge_id) do nothing;

    insert into public.reward_events (customer_id, event_type, points, description, reference_id)
    values (v_customer_id, 'badge_earned', 0, 'Badge earned: ' || v_badge.slug, new.id);
  end loop;

  return new;
end;
$$;

-- Fire BEFORE INSERT so we can stamp points columns on the new row
create trigger trg_award_points_on_sale
  before insert on public.sales
  for each row execute procedure public.award_points_on_sale();

-- Also handle updates (e.g. staff edits buyer_contact_id after the fact)
create or replace function public.award_points_on_sale_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_rate        numeric;
  v_points      numeric;
begin
  -- If buyer_contact_id changed and new one is linked to a customer
  if (old.buyer_contact_id is distinct from new.buyer_contact_id)
     and new.buyer_contact_id is not null
     and (new.points_awarded is null or new.points_awarded = 0)
  then
    v_customer_id := public.get_customer_for_contact(new.buyer_contact_id);
    if v_customer_id is not null then
      select value into v_rate from public.points_config where key = 'rate_purchase';
      if v_rate is null then v_rate := 1.0; end if;
      v_points := round(new.sale_price * v_rate, 2);

      if v_points > 0 then
        insert into public.reward_events (customer_id, event_type, points, description, reference_id)
        values (v_customer_id, 'purchase', v_points, 'Purchase: ' || left(new.description, 100), new.id);

        new.points_awarded     := v_points;
        new.points_awarded_at  := now();
        new.points_customer_id := v_customer_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_award_points_on_sale_update
  before update on public.sales
  for each row execute procedure public.award_points_on_sale_update();

-- ════════════════════════════════════════════════════════════
-- SECTION 6: ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

-- 6a. Enable RLS on all new tables
alter table public.customers        enable row level security;
alter table public.points_config    enable row level security;
alter table public.reward_events    enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.customer_badges  enable row level security;

-- ── CUSTOMERS TABLE ──────────────────────────────────────────
-- Customers can read their own row
create policy "Customers read own record"
  on public.customers for select
  using (auth.uid() = id and public.is_customer());

-- Staff/admin can read all customers
create policy "Staff read all customers"
  on public.customers for select
  using (public.is_staff());

-- Only admin can insert (via edge function with service role, but policy for safety)
create policy "Admin insert customers"
  on public.customers for insert
  with check (public.is_admin());

-- Admin can update any customer (link/unlink contacts, etc.)
create policy "Admin update customers"
  on public.customers for update
  using (public.is_admin());

-- Customers can update their own display_name, phone
create policy "Customers update own record"
  on public.customers for update
  using (auth.uid() = id and public.is_customer())
  with check (auth.uid() = id);

-- ── POINTS CONFIG ────────────────────────────────────────────
-- Anyone authenticated can read config (needed for tier display)
create policy "Authenticated read points config"
  on public.points_config for select
  using (auth.uid() is not null);

-- Only admin can modify config
create policy "Admin manage points config"
  on public.points_config for all
  using (public.is_admin());

-- ── REWARD EVENTS ────────────────────────────────────────────
-- Customers read their own events
create policy "Customers read own reward events"
  on public.reward_events for select
  using (customer_id = auth.uid() and public.is_customer());

-- Staff read all reward events
create policy "Staff read all reward events"
  on public.reward_events for select
  using (public.is_staff());

-- No client insert/update/delete — points are server-side only
-- (triggers run as security definer, bypassing RLS)

-- Admin can insert for manual bonuses/adjustments
create policy "Admin insert reward events"
  on public.reward_events for insert
  with check (public.is_admin());

-- ── BADGE DEFINITIONS ────────────────────────────────────────
-- Everyone can read badge definitions (public knowledge)
create policy "Anyone can read badge definitions"
  on public.badge_definitions for select
  using (auth.uid() is not null);

-- Only admin can manage badges
create policy "Admin manage badge definitions"
  on public.badge_definitions for all
  using (public.is_admin());

-- ── CUSTOMER BADGES ──────────────────────────────────────────
-- Customers read their own badges
create policy "Customers read own badges"
  on public.customer_badges for select
  using (customer_id = auth.uid() and public.is_customer());

-- Staff read all badges
create policy "Staff read all customer badges"
  on public.customer_badges for select
  using (public.is_staff());

-- No client insert — badges awarded by triggers only

-- ════════════════════════════════════════════════════════════
-- SECTION 7: TIGHTEN EXISTING TABLE POLICIES
-- Block customer role from accessing internal tables
-- ════════════════════════════════════════════════════════════

-- The existing policies use "auth.uid() is not null" for insert,
-- which would allow customers to insert. Replace with is_staff().

-- ── SALES: tighten insert ────────────────────────────────────
drop policy if exists "Authenticated users can insert sales" on public.sales;
create policy "Staff can insert sales"
  on public.sales for insert
  with check (public.is_staff() and created_by = auth.uid());

-- ── BUYS: tighten insert ─────────────────────────────────────
drop policy if exists "Authenticated users can insert buys" on public.buys;
create policy "Staff can insert buys"
  on public.buys for insert
  with check (public.is_staff() and created_by = auth.uid());

-- ── EXPENSES: tighten insert ─────────────────────────────────
drop policy if exists "Authenticated users can insert expenses" on public.expenses;
create policy "Staff can insert expenses"
  on public.expenses for insert
  with check (public.is_staff() and created_by = auth.uid());

-- ── SHOWS: tighten insert & read ─────────────────────────────
drop policy if exists "Authenticated users can create shows" on public.shows;
create policy "Staff can create shows"
  on public.shows for insert
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists "All authenticated users can read shows" on public.shows;
create policy "Staff can read shows"
  on public.shows for select
  using (public.is_staff());

-- ── INVENTORY: tighten insert & read ─────────────────────────
drop policy if exists "Authenticated users can insert inventory" on public.inventory;
create policy "Staff can insert inventory"
  on public.inventory for insert
  with check (public.is_staff() and created_by = auth.uid());

drop policy if exists "All authenticated users can read inventory" on public.inventory;
create policy "Staff can read inventory"
  on public.inventory for select
  using (public.is_staff());

-- ── CONTACTS: tighten insert & read ──────────────────────────
drop policy if exists "All authenticated users can read contacts" on public.contacts;
create policy "Staff can read contacts"
  on public.contacts for select
  using (public.is_staff());

drop policy if exists "Authenticated users can insert contacts" on public.contacts;
create policy "Staff can insert contacts"
  on public.contacts for insert
  with check (public.is_staff() and created_by = auth.uid());

-- ── ACTIVITY LOGS: tighten insert ────────────────────────────
drop policy if exists "Authenticated users can insert logs" on public.activity_logs;
create policy "Staff can insert logs"
  on public.activity_logs for insert
  with check (public.is_staff() and user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- SECTION 8: INDEXES
-- ════════════════════════════════════════════════════════════

create index if not exists idx_customers_contact_id      on public.customers(contact_id);
create index if not exists idx_reward_events_customer_id  on public.reward_events(customer_id);
create index if not exists idx_reward_events_created_at   on public.reward_events(created_at desc);
create index if not exists idx_reward_events_reference_id on public.reward_events(reference_id);
create index if not exists idx_customer_badges_customer   on public.customer_badges(customer_id);
create index if not exists idx_sales_buyer_contact_id     on public.sales(buyer_contact_id);
create index if not exists idx_buys_source_contact_id     on public.buys(source_contact_id);
create index if not exists idx_contacts_email             on public.contacts(email);

-- ════════════════════════════════════════════════════════════
-- DONE. Summary of what was created:
--
-- FUNCTIONS:  is_staff(), is_customer(), get_customer_for_contact()
-- TABLES:     customers, points_config, reward_events,
--             badge_definitions, customer_badges
-- VIEWS:      customer_point_balance, customer_tier,
--             customer_transaction_history
-- TRIGGERS:   trg_award_points_on_sale (BEFORE INSERT on sales)
--             trg_award_points_on_sale_update (BEFORE UPDATE on sales)
-- RLS:        All new tables locked down. Existing tables tightened
--             to block customer role.
-- CONFIG:     Default point rates + tier thresholds seeded
-- BADGES:     10 default badges seeded (milestones, spending, tiers)
-- ════════════════════════════════════════════════════════════
