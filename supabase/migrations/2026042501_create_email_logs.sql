-- Resend email event log table
-- Tracks send lifecycle and webhook status updates.

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  type text not null,
  status text not null,
  resend_email_id text null unique,
  error_message text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_logs_user_id_idx on public.email_logs(user_id);
create index if not exists email_logs_type_idx on public.email_logs(type);
create index if not exists email_logs_status_idx on public.email_logs(status);
create index if not exists email_logs_created_at_idx on public.email_logs(created_at desc);

create or replace function public.set_email_logs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_logs_updated_at on public.email_logs;
create trigger trg_email_logs_updated_at
before update on public.email_logs
for each row
execute function public.set_email_logs_updated_at();

alter table public.email_logs enable row level security;

create policy "service_role_email_logs_all"
on public.email_logs
for all
to service_role
using (true)
with check (true);
