-- Create partners table for craftsmen/companies
create table if not exists public.partners (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  description text,
  phone_number text,
  website text,
  address text,
  city text,
  postal_code text,
  category text, -- e.g., Vodovod, Elektrika, Gradnja, etc.
  rating numeric default 4.5,
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.partners enable row level security;

create policy "partners_select_own" on public.partners for select using (auth.uid() = id);
create policy "partners_insert_own" on public.partners for insert with check (auth.uid() = id);
create policy "partners_update_own" on public.partners for update using (auth.uid() = id);
create policy "partners_select_all" on public.partners for select using (true);

-- Create offers table for partner responses to customer requests
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  request_id uuid not null,
  title text not null,
  description text not null,
  price numeric,
  estimated_duration text,
  notes text,
  status text default 'pending', -- pending, accepted, rejected, expired
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.offers enable row level security;

create policy "offers_select_own" on public.offers for select using (auth.uid() = partner_id);
create policy "offers_insert_own" on public.offers for insert with check (auth.uid() = partner_id);
create policy "offers_update_own" on public.offers for update using (auth.uid() = partner_id);
create policy "offers_view_all" on public.offers for select using (true);
