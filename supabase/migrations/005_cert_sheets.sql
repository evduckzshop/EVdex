-- ============================================================
-- EVdex Migration 005: Saved Sheets (cert lists)
-- Run in Supabase SQL Editor
--
-- Replaces the single cert buffer that lived in profiles.settings.
-- One row per sheet, so editing on the laptop can't clobber a sheet
-- created on the phone.
--
-- Safe to re-run.
-- ============================================================

create table if not exists public.cert_sheets (
  id          uuid primary key default gen_random_uuid(),
  -- Optional. The UI falls back to "Oct 17 · 24 certs" when it's null.
  name        text,
  -- Raw text exactly as pasted, so the cleanup actions in the UI stay
  -- reversible by re-pasting rather than being baked in on save.
  certs       text not null default '',
  created_by  uuid not null references public.profiles(id),
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists cert_sheets_updated_at on public.cert_sheets;
create trigger cert_sheets_updated_at
  before update on public.cert_sheets
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.cert_sheets enable row level security;

drop policy if exists "Staff can insert own sheets"  on public.cert_sheets;
drop policy if exists "Staff can view own sheets"    on public.cert_sheets;
drop policy if exists "Admins can view all sheets"   on public.cert_sheets;
drop policy if exists "Staff can update own sheets"  on public.cert_sheets;
drop policy if exists "Admins can update all sheets" on public.cert_sheets;
drop policy if exists "Staff can delete own sheets"  on public.cert_sheets;
drop policy if exists "Admins can delete all sheets" on public.cert_sheets;

create policy "Staff can insert own sheets"
  on public.cert_sheets for insert
  with check (public.is_staff() and created_by = auth.uid());

create policy "Staff can view own sheets"
  on public.cert_sheets for select
  using (public.is_staff() and created_by = auth.uid());

create policy "Admins can view all sheets"
  on public.cert_sheets for select
  using (public.is_admin());

create policy "Staff can update own sheets"
  on public.cert_sheets for update
  using (created_by = auth.uid());

create policy "Admins can update all sheets"
  on public.cert_sheets for update
  using (public.is_admin());

-- Unlike shows, staff can bin their own sheets — they're scratch lists,
-- not bookkeeping records.
create policy "Staff can delete own sheets"
  on public.cert_sheets for delete
  using (created_by = auth.uid());

create policy "Admins can delete all sheets"
  on public.cert_sheets for delete
  using (public.is_admin());

-- ── Size limits ──────────────────────────────────────────────
-- ~100k characters is roughly 10,000 certs: generous, but bounded.
alter table public.cert_sheets drop constraint if exists cert_sheets_name_len;
alter table public.cert_sheets
  add constraint cert_sheets_name_len
  check (name is null or char_length(name) <= 200);

alter table public.cert_sheets drop constraint if exists cert_sheets_certs_len;
alter table public.cert_sheets
  add constraint cert_sheets_certs_len
  check (char_length(certs) <= 100000);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_cert_sheets_created_by on public.cert_sheets(created_by);
create index if not exists idx_cert_sheets_updated_at on public.cert_sheets(updated_at desc);
