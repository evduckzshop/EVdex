-- ============================================================
-- EVdex — Complete Supabase SQL Schema
-- Run this in the Supabase SQL editor in order
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
-- Linked 1:1 to auth.users via UUID
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  role          text not null default 'employee' check (role in ('admin', 'employee')),
  is_active     boolean not null default true,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row when a user is confirmed in auth.users
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── 2. SALES ────────────────────────────────────────────────
create table public.sales (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  sale_type     text not null check (sale_type in ('Single card','Lot','Slab','Other')),
  qty           integer,
  condition     text,
  market_value  numeric(10,2),
  sale_price    numeric(10,2) not null,
  pct_of_market numeric(5,2),
  cost_basis    numeric(10,2),
  buyer         text,
  payment       text,
  show_id       uuid,
  notes         text,
  photo_url     text,
  created_by    uuid not null references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger sales_updated_at
  before update on public.sales
  for each row execute procedure public.set_updated_at();

-- ── 3. BUYS ─────────────────────────────────────────────────
create table public.buys (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  buy_type      text not null check (buy_type in ('Singles','Slabs','Sealed','Lot')),
  qty           integer,
  condition     text,
  market_value  numeric(10,2),
  amount_paid   numeric(10,2) not null,
  pct_of_market numeric(5,2),
  source        text,
  payment       text,
  show_id       uuid,
  notes         text,
  photo_url     text,
  created_by    uuid not null references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger buys_updated_at
  before update on public.buys
  for each row execute procedure public.set_updated_at();

-- ── 4. EXPENSES ──────────────────────────────────────────────
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  description   text not null,
  category      text not null check (category in ('Show fees','Supplies','Travel','Shipping','Other')),
  amount        numeric(10,2) not null,
  payment       text,
  show_id       uuid,
  created_by    uuid not null references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.set_updated_at();

-- ── 5. SHOWS ────────────────────────────────────────────────
create table public.shows (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  event_date    date,
  location      text,
  table_fee     numeric(10,2) default 0,
  status        text not null default 'upcoming' check (status in ('upcoming','in_progress','completed')),
  notes         text,
  created_by    uuid not null references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger shows_updated_at
  before update on public.shows
  for each row execute procedure public.set_updated_at();

-- ── 6. INVENTORY ────────────────────────────────────────────
create table public.inventory (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  item_type     text not null check (item_type in ('Single','Slab','Sealed','Lot')),
  qty           integer not null default 1,
  condition     text,
  cost_basis    numeric(10,2),
  listed_price  numeric(10,2),
  notes         text,
  created_by    uuid not null references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger inventory_updated_at
  before update on public.inventory
  for each row execute procedure public.set_updated_at();

-- ── 7. CONTACTS ──────────────────────────────────────────────
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null check (role in ('Seller','Buyer','Both','Wholesaler')),
  phone         text,
  preferred_pay text,
  notes         text,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- ── 8. INVITES ───────────────────────────────────────────────
-- Admin-created invite tokens (service role writes, client reads own)
create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  role          text not null default 'employee' check (role in ('admin','employee')),
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by    uuid not null references public.profiles(id),
  accepted      boolean not null default false,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- ── 9. ACTIVITY LOG ──────────────────────────────────────────
create table public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id),
  action_type   text not null,
  entity_type   text,
  entity_id     uuid,
  summary       text,
  before_data   jsonb,
  after_data    jsonb,
  created_at    timestamptz not null default now()
);

-- ── 10. PINS (optional quick-login for show mode) ────────────
create table public.user_pins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  pin_hash      text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.sales         enable row level security;
alter table public.buys          enable row level security;
alter table public.expenses      enable row level security;
alter table public.shows         enable row level security;
alter table public.inventory     enable row level security;
alter table public.contacts      enable row level security;
alter table public.invites       enable row level security;
alter table public.activity_logs enable row level security;
alter table public.user_pins     enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- ── PROFILES ─────────────────────────────────────────────────
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select using (public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "Admins can update any profile"
  on public.profiles for update using (public.is_admin());

-- ── SALES ─────────────────────────────────────────────────────
create policy "Authenticated users can insert sales"
  on public.sales for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Employees can view their own sales"
  on public.sales for select
  using (created_by = auth.uid());

create policy "Admins can view all sales"
  on public.sales for select using (public.is_admin());

create policy "Employees can update their own sales"
  on public.sales for update using (created_by = auth.uid());

create policy "Admins can update all sales"
  on public.sales for update using (public.is_admin());

-- ── BUYS ──────────────────────────────────────────────────────
create policy "Authenticated users can insert buys"
  on public.buys for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Employees can view their own buys"
  on public.buys for select using (created_by = auth.uid());

create policy "Admins can view all buys"
  on public.buys for select using (public.is_admin());

create policy "Employees can update their own buys"
  on public.buys for update using (created_by = auth.uid());

create policy "Admins can update all buys"
  on public.buys for update using (public.is_admin());

-- ── EXPENSES ──────────────────────────────────────────────────
create policy "Authenticated users can insert expenses"
  on public.expenses for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Employees can view their own expenses"
  on public.expenses for select using (created_by = auth.uid());

create policy "Admins can view all expenses"
  on public.expenses for select using (public.is_admin());

create policy "Employees can update their own expenses"
  on public.expenses for update using (created_by = auth.uid());

create policy "Admins can update all expenses"
  on public.expenses for update using (public.is_admin());

-- ── SHOWS ─────────────────────────────────────────────────────
create policy "All authenticated users can read shows"
  on public.shows for select using (auth.uid() is not null);

create policy "Authenticated users can create shows"
  on public.shows for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Admins can update any show"
  on public.shows for update using (public.is_admin());

create policy "Creator can update their show"
  on public.shows for update using (created_by = auth.uid());

-- ── INVENTORY ─────────────────────────────────────────────────
create policy "All authenticated users can read inventory"
  on public.inventory for select using (auth.uid() is not null);

create policy "Authenticated users can insert inventory"
  on public.inventory for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Admins can update any inventory"
  on public.inventory for update using (public.is_admin());

create policy "Creator can update their inventory"
  on public.inventory for update using (created_by = auth.uid());

-- ── CONTACTS ──────────────────────────────────────────────────
create policy "All authenticated users can read contacts"
  on public.contacts for select using (auth.uid() is not null);

create policy "Authenticated users can insert contacts"
  on public.contacts for insert
  with check (auth.uid() is not null and created_by = auth.uid());

create policy "Admins can update contacts"
  on public.contacts for update using (public.is_admin());

-- ── INVITES ───────────────────────────────────────────────────
create policy "Admins can manage invites"
  on public.invites for all using (public.is_admin());

create policy "Anyone can read their own invite by token"
  on public.invites for select using (true);

-- ── ACTIVITY LOGS ─────────────────────────────────────────────
create policy "Authenticated users can insert logs"
  on public.activity_logs for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "Employees see their own logs"
  on public.activity_logs for select using (user_id = auth.uid());

create policy "Admins see all logs"
  on public.activity_logs for select using (public.is_admin());

-- ── USER PINS ─────────────────────────────────────────────────
create policy "Users manage their own PIN"
  on public.user_pins for all using (user_id = auth.uid());

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index on public.sales(created_by);
create index on public.sales(created_at desc);
create index on public.buys(created_by);
create index on public.buys(created_at desc);
create index on public.expenses(created_by);
create index on public.activity_logs(user_id);
create index on public.activity_logs(created_at desc);
create index on public.invites(token);
create index on public.invites(email);

-- ============================================================
-- SUPABASE EDGE FUNCTION: invite-employee
-- Deploy via: supabase functions deploy invite-employee
-- This lives at supabase/functions/invite-employee/index.ts
-- Uses service_role to call admin.inviteUserByEmail
-- See invite-employee.ts file in this project
-- ============================================================
