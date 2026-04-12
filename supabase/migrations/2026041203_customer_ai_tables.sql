-- Customer AI enhancements: home maintenance log + inquiry status timeline

create table if not exists public.home_maintenance_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_name text not null,
  notes text,
  performed_at date not null,
  created_at timestamptz not null default now()
);

alter table public.home_maintenance_log enable row level security;

create policy if not exists "home_maintenance_log_select_own"
  on public.home_maintenance_log
  for select
  using (auth.uid() = user_id);

create policy if not exists "home_maintenance_log_insert_own"
  on public.home_maintenance_log
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.inquiry_status (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.povprasevanja(id) on delete cascade,
  status_text text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.inquiry_status enable row level security;

create policy if not exists "inquiry_status_select_owner"
  on public.inquiry_status
  for select
  using (
    exists (
      select 1 from public.povprasevanja p
      where p.id = inquiry_id and p.narocnik_id = auth.uid()
    )
  );
