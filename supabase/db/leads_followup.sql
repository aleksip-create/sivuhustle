-- Sähköpostisarja: päivä 3 + päivä 7 (process-lead-followups Edge Function)
-- Aja Supabase SQL Editorissa leads.sql:n jälkeen

alter table public.leads add column if not exists email_day3_sent_at timestamptz;
alter table public.leads add column if not exists email_day7_sent_at timestamptz;

create index if not exists leads_followup_day3_idx
  on public.leads (created_at)
  where email_day3_sent_at is null;

create index if not exists leads_followup_day7_idx
  on public.leads (created_at)
  where email_day7_sent_at is null;