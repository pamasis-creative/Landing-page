-- PAMASIS Campaign Manager expansion
-- Adds multi-media items, campaign placements, pause/resume, attribution events.
alter table public.pamasis_campaigns
  add column if not exists is_paused boolean not null default false,
  add column if not exists objective text,
  add column if not exists audience_key text,
  add column if not exists auto_rotate boolean not null default false,
  add column if not exists rotation_interval integer not null default 5000,
  add column if not exists timezone text not null default 'Africa/Lagos';

create table if not exists public.pamasis_campaign_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.pamasis_campaigns(id) on delete cascade,
  media_kind text not null check (media_kind in ('image','video','social','link')),
  source_url text not null,
  title text,
  description text,
  thumbnail_url text,
  embed_provider text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists pamasis_campaign_media_campaign_order_idx on public.pamasis_campaign_media(campaign_id, display_order);

create table if not exists public.pamasis_campaign_placements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.pamasis_campaigns(id) on delete cascade,
  placement_key text not null check (placement_key in ('featured','secondary','product','lead_magnet','related')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(campaign_id, placement_key)
);
create index if not exists pamasis_campaign_placements_slot_order_idx on public.pamasis_campaign_placements(placement_key, display_order);

create table if not exists public.pamasis_campaign_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.pamasis_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression','media_click','cta_click','whatsapp_click')),
  source text,
  medium text,
  referrer_host text,
  session_key text,
  created_at timestamptz not null default now()
);
create index if not exists pamasis_campaign_events_campaign_date_idx on public.pamasis_campaign_events(campaign_id, created_at desc);

alter table public.pamasis_campaign_media enable row level security;
alter table public.pamasis_campaign_placements enable row level security;
alter table public.pamasis_campaign_events enable row level security;

drop policy if exists "Public reads active campaigns" on public.pamasis_campaigns;
create policy "Public reads active campaigns" on public.pamasis_campaigns for select to anon, authenticated
using (status in ('published','scheduled') and is_paused = false
  and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));

drop policy if exists "Public reads active campaign media" on public.pamasis_campaign_media;
create policy "Public reads active campaign media" on public.pamasis_campaign_media for select to anon, authenticated
using (is_active = true and exists (select 1 from public.pamasis_campaigns c where c.id = campaign_id
  and c.status in ('published','scheduled') and c.is_paused = false
  and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())));
drop policy if exists "Approved admins manage campaign media" on public.pamasis_campaign_media;
create policy "Approved admins manage campaign media" on public.pamasis_campaign_media for all to authenticated
using ((auth.jwt() ->> 'email') = 'pamasisinc@gmail.com') with check ((auth.jwt() ->> 'email') = 'pamasisinc@gmail.com');

drop policy if exists "Public reads active campaign placements" on public.pamasis_campaign_placements;
create policy "Public reads active campaign placements" on public.pamasis_campaign_placements for select to anon, authenticated
using (exists (select 1 from public.pamasis_campaigns c where c.id = campaign_id
  and c.status in ('published','scheduled') and c.is_paused = false
  and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())));
drop policy if exists "Approved admins manage campaign placements" on public.pamasis_campaign_placements;
create policy "Approved admins manage campaign placements" on public.pamasis_campaign_placements for all to authenticated
using ((auth.jwt() ->> 'email') = 'pamasisinc@gmail.com') with check ((auth.jwt() ->> 'email') = 'pamasisinc@gmail.com');

drop policy if exists "Public records campaign events" on public.pamasis_campaign_events;
create policy "Public records campaign events" on public.pamasis_campaign_events for insert to anon, authenticated
with check (event_type in ('impression','media_click','cta_click','whatsapp_click') and exists (
  select 1 from public.pamasis_campaigns c where c.id = campaign_id
  and c.status in ('published','scheduled') and c.is_paused = false
  and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())));
drop policy if exists "Approved admins read campaign events" on public.pamasis_campaign_events;
create policy "Approved admins read campaign events" on public.pamasis_campaign_events for select to authenticated
using ((auth.jwt() ->> 'email') = 'pamasisinc@gmail.com');

grant select on public.pamasis_campaign_media, public.pamasis_campaign_placements to anon, authenticated;
grant insert, update, delete on public.pamasis_campaign_media, public.pamasis_campaign_placements to authenticated;
grant insert on public.pamasis_campaign_events to anon, authenticated;
grant select on public.pamasis_campaign_events to authenticated;
