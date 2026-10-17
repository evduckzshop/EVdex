-- ============================================================
-- EVdex Migration 006: Team brief on shows
-- Run in Supabase SQL Editor
--
-- A free-text message the team reads at the table — what we're buying and
-- at what parameters. Deliberately separate from shows.notes, which is
-- already used for "crowd, vibe" style record-keeping and would otherwise
-- end up on the home screen.
--
-- Safe to re-run.
-- ============================================================

alter table public.shows add column if not exists team_brief text;

-- Bound it server-side; maxLength on a textarea is a UI courtesy, not a
-- limit, and this renders on the home screen for everyone.
alter table public.shows drop constraint if exists shows_team_brief_len;
alter table public.shows
  add constraint shows_team_brief_len
  check (team_brief is null or char_length(team_brief) <= 4000);

-- Reads and writes need no new policies. Migration 001 replaced the original
-- "All authenticated users can read shows" with "Staff can read shows"
-- (using public.is_staff()), so customers cannot read shows at all and the
-- brief is staff-only. The existing admin and creator update policies already
-- govern who can change it.
