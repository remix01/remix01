create table if not exists public.partner_insights (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.obrtnik_profiles(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb not null default '{}'::jsonb,
  recommendations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, period_start, period_end)
);

alter table public.partner_insights enable row level security;

create policy if not exists "Partner can read own insights"
on public.partner_insights for select to authenticated
using (partner_id = auth.uid());

create policy if not exists "Service role can manage insights"
on public.partner_insights for all to service_role
using (true)
with check (true);
