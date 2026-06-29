-- UTM-kentät lead-seurantaan (Meta / GA4 attribuutio)
-- Aja Supabase SQL Editorissa leads.sql:n jälkeen

alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_content text;
alter table public.leads add column if not exists landing_page text;

create index if not exists leads_utm_campaign_idx on public.leads (utm_campaign);