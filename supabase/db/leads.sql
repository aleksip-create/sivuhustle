-- Lead capture (PDF-lataus, uutiskirje)
-- Aja Supabase SQL Editorissa

create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  name text,
  source text default 'pdf',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  landing_page text,
  email_day3_sent_at timestamptz,
  email_day7_sent_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists leads_email_source_idx on public.leads (email, source);

alter table public.leads enable row level security;

drop policy if exists "Allow anonymous lead insert" on public.leads;
drop policy if exists "No public read on leads" on public.leads;

create policy "Allow anonymous lead insert"
  on public.leads for insert
  to anon, authenticated
  with check (true);

create policy "No public read on leads"
  on public.leads for select
  to anon, authenticated
  using (false);