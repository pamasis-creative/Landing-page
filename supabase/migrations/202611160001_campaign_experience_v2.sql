-- PAMASIS Campaign Experience v2
-- Apply only after campaign-admin.html and campaign-runtime.js are upgraded together.
-- Existing campaigns and media are preserved.

alter table public.pamasis_campaigns
  add column if not exists destination_type text not null default 'external',
  add column if not exists destination_url text,
  add column if not exists page_template text not null default 'campaign',
  add column if not exists show_on_homepage boolean not null default true;

alter table public.pamasis_campaigns
  drop constraint if exists pamasis_campaigns_destination_type_check,
  add constraint pamasis_campaigns_destination_type_check
    check (destination_type in ('campaign_page','opt_in_page','sales_page','resource_page','tool','whatsapp','external'));

alter table public.pamasis_campaigns
  drop constraint if exists pamasis_campaigns_page_template_check,
  add constraint pamasis_campaigns_page_template_check
    check (page_template in ('campaign','opt_in','sales','resource'));

alter table public.pamasis_campaign_placements
  drop constraint if exists pamasis_campaign_placements_placement_key_check;

-- Convert the old promotion-category labels into actual homepage positions.
-- The mapping preserves existing placement rows while changing their meaning.
update public.pamasis_campaign_placements
set placement_key = case placement_key
  when 'featured' then 'after_hero'
  when 'secondary' then 'mid_page'
  when 'product' then 'after_trust'
  when 'lead_magnet' then 'before_footer'
  when 'related' then 'resource_area'
  else placement_key
end;

alter table public.pamasis_campaign_placements
  add constraint pamasis_campaign_placements_placement_key_check
  check (placement_key in ('after_hero','after_trust','mid_page','before_closing','before_footer','resource_area'));

comment on column public.pamasis_campaigns.destination_type is
  'Visitor journey after campaign CTA: campaign page, opt-in, sales, resource, tool, WhatsApp or external destination.';
comment on column public.pamasis_campaigns.destination_url is
  'Optional destination override. Internal campaign destinations use campaign slug when this is null.';
comment on column public.pamasis_campaigns.page_template is
  'Reusable page experience used when destination_type is an internal page.';
comment on column public.pamasis_campaigns.show_on_homepage is
  'Whether this campaign is eligible for a homepage promotional position.';
