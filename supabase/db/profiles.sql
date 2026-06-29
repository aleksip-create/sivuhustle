-- Run this in Supabase SQL Editor

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  is_pro boolean default false,
  subscription_type text default 'free', -- 'pro', 'pro_yearly', 'lifetime', 'free'
  stripe_customer_id text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- For admin/webhook (use service role)
-- The webhook uses service role so it can bypass RLS

-- Optional: trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_pro, subscription_type)
  values (new.id, new.email, false, 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
