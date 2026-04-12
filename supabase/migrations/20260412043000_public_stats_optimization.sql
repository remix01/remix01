-- Optimize homepage public stats endpoint with a single aggregated DB function.

create or replace function public.get_public_stats(window_start timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'successfulConnections', (
      select count(*)::int
      from analytics_events
      where event_name = 'payment_completed'
        and created_at >= window_start
    ),
    'activeArtisans', (
      select count(*)::int
      from craftworker_profile
      where is_active = true
    ),
    'rating', (
      select coalesce(round(avg(rating)::numeric, 1), 4.9)
      from job
      where rating > 0
        and created_at >= window_start
    ),
    'reviews', (
      select count(*)::int
      from job
      where rating > 0
    )
  );
$$;

grant execute on function public.get_public_stats(timestamptz) to anon, authenticated, service_role;

create index if not exists idx_analytics_events_payment_completed_created_at
  on analytics_events (created_at)
  where event_name = 'payment_completed';

create index if not exists idx_craftworker_profile_active
  on craftworker_profile (is_active)
  where is_active = true;

create index if not exists idx_job_rating_created_at
  on job (created_at)
  where rating > 0;
