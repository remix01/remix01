-- Lightweight snapshot table for partner dashboard summaries.
-- Used for: weekly reports, admin digests, historical KPI trends.
-- All columns are JSONB so the schema can evolve without further migrations.

create table if not exists dashboard_summary_snapshots (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  generated_at  timestamptz not null default now(),
  filter_context jsonb      not null default '{}'::jsonb,
  kpis          jsonb       not null default '{}'::jsonb,
  source        text        not null default 'live' check (source in ('live', 'cache')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_dashboard_snapshots_user_recent
  on dashboard_summary_snapshots (user_id, generated_at desc);

alter table dashboard_summary_snapshots enable row level security;

create policy "partners_view_own_snapshots"
  on dashboard_summary_snapshots for select
  using (auth.uid() = user_id);
