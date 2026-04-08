-- ============================================================
-- EVdex Migration 002: Badge Updates
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Update existing badges ─────────────────────────────────
update public.badge_definitions set threshold = '{"single_purchase_min": 10000}', description = 'Single purchase of $10,000 or more' where slug = 'whale';
update public.badge_definitions set threshold = '{"single_purchase_min": 1000}', description = 'Single purchase of $1,000 or more' where slug = 'big_spender';

-- ── 2. Add new special badges ─────────────────────────────────
insert into public.badge_definitions (slug, name, description, icon, category, threshold, sort_order) values
  ('just_one_more', 'Just One More', 'Made 3 purchases in one day', 'shopping', 'special', '{"purchases_in_day": 3}', 7),
  ('sniper', 'Sniper', 'Scored a card below market value', 'target', 'special', '{"below_market": true}', 8)
on conflict (slug) do nothing;

-- ── 3. Add progression spending badges ────────────────────────
insert into public.badge_definitions (slug, name, description, icon, category, threshold, sort_order) values
  ('collector',           'Collector',           'Spent $100 lifetime',     'cards',    'spending', '{"lifetime_spend": 100}',    20),
  ('card_enthusiast',     'Card Enthusiast',     'Spent $250 lifetime',     'sparkles', 'spending', '{"lifetime_spend": 250}',    21),
  ('premium_collector',   'Premium Collector',   'Spent $500 lifetime',     'gem',      'spending', '{"lifetime_spend": 500}',    22),
  ('elite_collector',     'Elite Collector',     'Spent $1,000 lifetime',   'crown',    'spending', '{"lifetime_spend": 1000}',   23),
  ('gym_leader',          'Gym Leader',          'Spent $2,500 lifetime',   'medal',    'spending', '{"lifetime_spend": 2500}',   24),
  ('grail_hunter',        'Grail Hunter',        'Spent $5,000 lifetime',   'grail',    'spending', '{"lifetime_spend": 5000}',   25),
  ('legendary_collector', 'Legendary Collector', 'Spent $10,000+ lifetime', 'legendary','spending', '{"lifetime_spend": 10000}',  26)
on conflict (slug) do nothing;

-- ── 4. Update points trigger to handle new badge types ────────

create or replace function public.award_points_on_sale()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid;
  v_rate        numeric;
  v_points      numeric;
  v_old_tier    text;
  v_new_tier    text;
  v_purchase_count bigint;
  v_lifetime_spend numeric;
  v_today_purchases bigint;
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
  values (v_customer_id, 'purchase', v_points, 'Purchase: ' || left(new.description, 100), new.id);

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

    insert into public.customer_badges (customer_id, badge_id, reference_id)
    select v_customer_id, bd.id, new.id
    from public.badge_definitions bd
    where bd.slug = v_new_tier || '_duck' and bd.is_active = true
    on conflict (customer_id, badge_id) do nothing;
  end if;

  -- ── Milestone badges (purchase count) ───────────────────────
  select count(*) into v_purchase_count
  from public.reward_events
  where customer_id = v_customer_id and event_type = 'purchase';

  for v_badge in
    select bd.id, bd.slug
    from public.badge_definitions bd
    where bd.category = 'milestone' and bd.is_active = true
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

  -- ── Single purchase badges (big spender, whale) ─────────────
  for v_badge in
    select bd.id, bd.slug
    from public.badge_definitions bd
    where bd.is_active = true
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

  -- ── Lifetime spend badges (collector → legendary) ───────────
  select coalesce(sum(re.points), 0) into v_lifetime_spend
  from public.reward_events re
  where re.customer_id = v_customer_id and re.event_type = 'purchase';

  for v_badge in
    select bd.id, bd.slug
    from public.badge_definitions bd
    where bd.is_active = true
      and bd.threshold->>'lifetime_spend' is not null
      and (bd.threshold->>'lifetime_spend')::numeric <= v_lifetime_spend
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

  -- ── "Just One More" badge (3 purchases in one day) ──────────
  select count(*) into v_today_purchases
  from public.reward_events re
  where re.customer_id = v_customer_id
    and re.event_type = 'purchase'
    and re.created_at::date = now()::date;

  if v_today_purchases >= 3 then
    for v_badge in
      select bd.id, bd.slug
      from public.badge_definitions bd
      where bd.slug = 'just_one_more' and bd.is_active = true
        and not exists (
          select 1 from public.customer_badges cb
          where cb.customer_id = v_customer_id and cb.badge_id = bd.id
        )
    loop
      insert into public.customer_badges (customer_id, badge_id, reference_id)
      values (v_customer_id, v_badge.id, new.id)
      on conflict (customer_id, badge_id) do nothing;

      insert into public.reward_events (customer_id, event_type, points, description, reference_id)
      values (v_customer_id, 'badge_earned', 0, 'Badge earned: just_one_more', new.id);
    end loop;
  end if;

  -- ── "Sniper" badge (bought below market value) ──────────────
  if new.market_value is not null and new.sale_price < new.market_value then
    for v_badge in
      select bd.id, bd.slug
      from public.badge_definitions bd
      where bd.slug = 'sniper' and bd.is_active = true
        and not exists (
          select 1 from public.customer_badges cb
          where cb.customer_id = v_customer_id and cb.badge_id = bd.id
        )
    loop
      insert into public.customer_badges (customer_id, badge_id, reference_id)
      values (v_customer_id, v_badge.id, new.id)
      on conflict (customer_id, badge_id) do nothing;

      insert into public.reward_events (customer_id, event_type, points, description, reference_id)
      values (v_customer_id, 'badge_earned', 0, 'Badge earned: sniper', new.id);
    end loop;
  end if;

  return new;
end;
$$;
