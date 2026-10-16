-- PAMASIS Campaign CMS — run in the Supabase SQL Editor.
-- Keep the Supabase service-role key private. Never place it in browser code.
create extension if not exists pgcrypto;

create table if not exists public.pamasis_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  eyebrow text default 'Featured by PAMASIS',
  headline text not null,
  body text not null,
  cta_label text not null default 'Talk to PAMASIS',
  cta_url text not null,
  media_url text,
  media_type text not null default 'image' check (media_type in ('image','video','none')),
  layout text not null default 'split' check (layout in ('split','banner','editorial')),
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pamasis_campaigns enable row level security;

-- Public can only read currently published and in-date campaigns.
drop policy if exists "Public reads active campaigns" on public.pamasis_campaigns;
create policy "Public reads active campaigns"
on public.pamasis_campaigns for select to anon, authenticated
using (
  status = 'published'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

-- Admin writes are authenticated users only. Restrict access to approved admin emails.
-- Replace the example email with the account you will use to manage campaigns.
drop policy if exists "Approved admins manage campaigns" on public.pamasis_campaigns;
create policy "Approved admins manage campaigns"
on public.pamasis_campaigns for all to authenticated
using ((auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL'))
with check ((auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL'));

-- Storage bucket for campaign media. Uploads are limited to images/videos via admin UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pamasis-campaign-media', 'pamasis-campaign-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do nothing;

drop policy if exists "Public reads campaign media" on storage.objects;
create policy "Public reads campaign media"
on storage.objects for select to anon, authenticated
using (bucket_id = 'pamasis-campaign-media');

drop policy if exists "Approved admins upload campaign media" on storage.objects;
create policy "Approved admins upload campaign media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'pamasis-campaign-media'
  and (auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL')
);

drop policy if exists "Approved admins update campaign media" on storage.objects;
create policy "Approved admins update campaign media"
on storage.objects for update to authenticated
using (
  bucket_id = 'pamasis-campaign-media'
  and (auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL')
)
with check (
  bucket_id = 'pamasis-campaign-media'
  and (auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL')
);

drop policy if exists "Approved admins delete campaign media" on storage.objects;
create policy "Approved admins delete campaign media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'pamasis-campaign-media'
  and (auth.jwt() ->> 'email') in ('REPLACE_WITH_ADMIN_EMAIL')
);

create or replace function public.set_campaign_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_campaign_updated_at on public.pamasis_campaigns;
create trigger set_campaign_updated_at before update on public.pamasis_campaigns
for each row execute function public.set_campaign_updated_at();
