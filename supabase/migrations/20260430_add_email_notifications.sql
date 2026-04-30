-- Email notification trigger: send partner welcome email via Edge Function
-- Fires on INSERT into profiles where role = 'obrtnik'
-- Requires: email_logs table (2026042501_create_email_logs.sql), pg_net extension

-- Enable pg_net for async HTTP calls from triggers
create extension if not exists pg_net with schema extensions;

-- Configure database-level settings used by the trigger function
-- These can also be set via supabase CLI or dashboard secrets
do $$
begin
  -- Only set if not already configured to avoid overwriting dashboard settings
  if current_setting('app.settings.supabase_url', true) is null
    or current_setting('app.settings.supabase_url', true) = '' then
    execute 'alter database postgres set app.settings.supabase_url = ''https://whabaeatixtymbccwigu.supabase.co''';
  end if;
end $$;

-- Function called by the trigger; uses pg_net for non-blocking HTTP POST
create or replace function public.send_partner_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _supabase_url  text;
  _function_url  text;
  _service_key   text;
  _payload       jsonb;
  _already_sent  boolean;
begin
  -- Resolve config values (set via ALTER DATABASE or supabase secrets)
  _supabase_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://whabaeatixtymbccwigu.supabase.co'
  );
  _service_key := current_setting('app.settings.supabase_service_role_key', true);
  _function_url := _supabase_url || '/functions/v1/resend-email';

  -- Idempotency: skip if welcome email already queued/sent for this address
  select exists(
    select 1 from public.email_logs
    where email = new.email
      and type = 'partner_welcome'
      and status in ('pending', 'sent')
  ) into _already_sent;

  if _already_sent then
    return new;
  end if;

  -- Build payload for the Edge Function
  _payload := jsonb_build_object(
    'type', 'partner_welcome',
    'data', jsonb_build_object(
      'partnerName', coalesce(new.full_name, new.email),
      'businessName', coalesce(new.full_name, new.email),
      'email',        new.email,
      'loginUrl',     coalesce(
                        current_setting('app.settings.frontend_url', true),
                        'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app'
                      ) || '/prijava'
    )
  );

  -- Insert pending log entry before the async call
  insert into public.email_logs (type, email, status, metadata)
  values (
    'partner_welcome',
    new.email,
    'pending',
    jsonb_build_object('profile_id', new.id, 'triggered_at', now())
  );

  -- Fire-and-forget HTTP POST via pg_net (non-blocking)
  if _service_key is not null and _service_key <> '' then
    perform extensions.http_post(
      url     := _function_url,
      body    := _payload::text,
      content_type := 'application/json',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || _service_key,
        'Content-Type',  'application/json'
      )
    );
  else
    -- Fallback: use net.http_post (pg_net) without auth header if service key not configured
    perform net.http_post(
      url     := _function_url,
      body    := _payload,
      headers := '{}'::jsonb
    );
  end if;

  return new;
exception
  when others then
    -- Never block the INSERT; just log the failure
    update public.email_logs
    set status = 'failed', error_message = sqlerrm
    where email = new.email
      and type  = 'partner_welcome'
      and status = 'pending'
      and created_at > now() - interval '5 seconds';
    return new;
end;
$$;

-- Trigger fires after each new profile with role='obrtnik'
drop trigger if exists trigger_partner_welcome_email on public.profiles;
create trigger trigger_partner_welcome_email
  after insert on public.profiles
  for each row
  when (new.role = 'obrtnik')
  execute function public.send_partner_welcome_email();

-- Grant execute to service_role (used by Supabase internals)
revoke execute on function public.send_partner_welcome_email() from public;
grant  execute on function public.send_partner_welcome_email() to service_role;

-- RLS: admins can read email_logs (add on top of existing service_role policy)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'email_logs'
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
          where id = auth.uid()
            and role = 'admin'
        )
      )
    $pol$;
  end if;
end $$;
