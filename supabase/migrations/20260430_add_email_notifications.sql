-- Email notification trigger: send partner welcome email via Edge Function
-- Fires AFTER INSERT on profiles where role = 'obrtnik'
-- Requires: email_logs table (2026042501_create_email_logs.sql)
-- Edge Function resend-email deployed with verify_jwt = false (see supabase/config.toml)

-- pg_net is available by default on Supabase hosted projects.
-- Enabling it explicitly is safe to run multiple times.
create extension if not exists pg_net with schema extensions;

-- Trigger function: builds payload and fires async HTTP POST via pg_net.
-- Production URL and frontend URL are hardcoded as constants; no ALTER DATABASE needed.
create or replace function public.send_partner_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _function_url text := 'https://whabaeatixtymbccwigu.supabase.co/functions/v1/resend-email';
  _frontend_url text := 'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app';
  _payload      jsonb;
  _already_sent boolean;
begin
  -- Idempotency: skip if a welcome email is already pending or sent for this address
  select exists(
    select 1 from public.email_logs
    where email  = new.email
      and type   = 'partner_welcome'
      and status in ('pending', 'sent')
  ) into _already_sent;

  if _already_sent then
    return new;
  end if;

  _payload := jsonb_build_object(
    'type', 'partner_welcome',
    'data', jsonb_build_object(
      'partnerName',  coalesce(new.full_name, new.email),
      'businessName', coalesce(new.full_name, new.email),
      'email',        new.email,
      'loginUrl',     _frontend_url || '/prijava'
    )
  );

  -- Record a pending log entry before the async call so failures are always visible
  insert into public.email_logs (type, email, status, metadata)
  values (
    'partner_welcome',
    new.email,
    'pending',
    jsonb_build_object('profile_id', new.id, 'triggered_at', now())
  );

  -- Fire-and-forget async HTTP POST via pg_net.
  -- No Authorization header required: Edge Function is deployed with verify_jwt = false.
  perform net.http_post(
    url     := _function_url,
    body    := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
exception
  when others then
    -- Never block the INSERT; mark the pending log row as failed instead
    update public.email_logs
    set status        = 'failed',
        error_message = sqlerrm
    where email  = new.email
      and type   = 'partner_welcome'
      and status = 'pending'
      and created_at > now() - interval '5 seconds';
    return new;
end;
$$;

-- Drop and recreate trigger so re-running the migration is idempotent
drop trigger if exists trigger_partner_welcome_email on public.profiles;
create trigger trigger_partner_welcome_email
  after insert on public.profiles
  for each row
  when (new.role = 'obrtnik')
  execute function public.send_partner_welcome_email();

-- Only service_role should call this function
revoke execute on function public.send_partner_welcome_email() from public;
grant  execute on function public.send_partner_welcome_email() to service_role;

-- Admins can read email_logs (service_role policy already exists from 2026042501)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename  = 'email_logs'
      and policyname = 'admin_read_email_logs'
  ) then
    execute $pol$
      create policy "admin_read_email_logs"
      on public.email_logs
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles
          where id   = auth.uid()
            and role = 'admin'
        )
      )
    $pol$;
  end if;
end $$;
