-- ============================================================
-- EVdex Migration 003: Trades Table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists public.trades (
  id                  uuid primary key default gen_random_uuid(),
  description         text,
  their_items         jsonb not null default '[]',
  your_items          jsonb not null default '[]',
  their_total_market  numeric(10,2) not null default 0,
  their_total_trade   numeric(10,2) not null default 0,
  their_avg_pct       numeric(5,2),
  your_total          numeric(10,2) not null default 0,
  delta               numeric(10,2) not null default 0,
  contact_id          uuid references public.contacts(id),
  buyer_contact_id    uuid references public.contacts(id),
  show_id             uuid references public.shows(id),
  photo_url           text,
  points_awarded      numeric(10,2) default 0,
  points_awarded_at   timestamptz,
  points_customer_id  uuid,
  created_by          uuid not null references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger trades_updated_at
  before update on public.trades
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.trades enable row level security;

create policy "Staff can insert trades"
  on public.trades for insert
  with check (public.is_staff() and created_by = auth.uid());

create policy "Staff can view own trades"
  on public.trades for select
  using (created_by = auth.uid());

create policy "Admins can view all trades"
  on public.trades for select
  using (public.is_admin());

create policy "Staff can update own trades"
  on public.trades for update
  using (created_by = auth.uid());

create policy "Admins can update all trades"
  on public.trades for update
  using (public.is_admin());

create policy "Admins can delete trades"
  on public.trades for delete
  using (public.is_admin());

-- Indexes
create index if not exists idx_trades_created_by on public.trades(created_by);
create index if not exists idx_trades_created_at on public.trades(created_at desc);
create index if not exists idx_trades_contact_id on public.trades(contact_id);
create index if not exists idx_trades_show_id on public.trades(show_id);

-- Points trigger for trades
create or replace function public.award_points_on_trade()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_rate numeric;
  v_points numeric;
begin
  if new.buyer_contact_id is null then return new; end if;
  if new.points_awarded > 0 and new.points_awarded_at is not null then return new; end if;
  if new.delta <= 0 then return new; end if;

  v_customer_id := public.get_customer_for_contact(new.buyer_contact_id);
  if v_customer_id is null then return new; end if;

  select value into v_rate from public.points_config where key = 'rate_purchase';
  if v_rate is null then v_rate := 1.0; end if;

  v_points := round(new.delta * v_rate, 2);
  if v_points <= 0 then return new; end if;

  insert into public.reward_events (customer_id, event_type, points, description, reference_id)
  values (v_customer_id, 'purchase', v_points, 'Trade value: ' || left(coalesce(new.description, 'Trade'), 80), new.id);

  new.points_awarded := v_points;
  new.points_awarded_at := now();
  new.points_customer_id := v_customer_id;

  return new;
end;
$$;

create trigger trg_award_points_on_trade
  before insert on public.trades
  for each row execute procedure public.award_points_on_trade();
