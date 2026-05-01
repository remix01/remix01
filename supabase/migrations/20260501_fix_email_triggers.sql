-- Fix partner_welcome trigger (INSERT → UPDATE) and add customer_welcome trigger
-- Root cause: handle_new_user inserts profiles with role=NULL,
--             handle_new_partner then UPDATEs to role='obrtnik'.
--             The original INSERT trigger never saw 'obrtnik'.

-- ── 1. Fix send_partner_welcome_email: now fires on UPDATE ──────────────────
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
  _display_name text;
begin
  select exists(
    select 1 from public.email_logs
    where email  = new.email
      and type   = 'partner_welcome'
      and status in ('pending', 'sent')
  ) into _already_sent;

  if _already_sent then
    return new;
  end if;

  -- Build display name from available profile columns
  _display_name := coalesce(
    nullif(trim(coalesce(new.full_name, '')), ''),
    nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''),
    new.email
  );

  _payload := jsonb_build_object(
    'type', 'partner_welcome',
    'data', jsonb_build_object(
      'partnerName',  _display_name,
      'businessName', _display_name,
      'email',        new.email,
      'loginUrl',     _frontend_url || '/prijava'
    )
  );

  insert into public.email_logs (type, email, status, metadata)
  values (
    'partner_welcome', new.email, 'pending',
    jsonb_build_object('profile_id', new.id, 'triggered_at', now())
  );

  perform net.http_post(
    url     := _function_url,
    body    := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
exception
  when others then
    update public.email_logs
    set status = 'failed', error_message = sqlerrm
    where email  = new.email
      and type   = 'partner_welcome'
      and status = 'pending'
      and created_at > now() - interval '5 seconds';
    return new;
end;
$$;

-- Drop old INSERT trigger, recreate as UPDATE trigger
drop trigger if exists trigger_partner_welcome_email on public.profiles;
create trigger trigger_partner_welcome_email
  after update on public.profiles
  for each row
  when (old.role is distinct from new.role and new.role = 'obrtnik')
  execute function public.send_partner_welcome_email();

-- ── 2. Customer welcome: fires on INSERT for non-partner signups ────────────
create or replace function public.send_customer_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _function_url text := 'https://whabaeatixtymbccwigu.supabase.co/functions/v1/resend-email';
  _frontend_url text := 'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app';
  _user_type    text;
  _payload      jsonb;
  _already_sent boolean;
  _display_name text;
begin
  -- Skip if the registering user is a partner (they get partner_welcome instead)
  select raw_user_meta_data->>'user_type'
  into   _user_type
  from   auth.users
  where  id = new.id;

  if _user_type = 'partner' then
    return new;
  end if;

  -- Skip if email is missing (edge case: social login without email)
  if new.email is null or new.email = '' then
    return new;
  end if;

  select exists(
    select 1 from public.email_logs
    where email  = new.email
      and type   = 'customer_welcome'
      and status in ('pending', 'sent')
  ) into _already_sent;

  if _already_sent then
    return new;
  end if;

  _display_name := coalesce(
    nullif(trim(coalesce(new.full_name, '')), ''),
    nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''),
    new.email
  );

  _payload := jsonb_build_object(
    'type', 'customer_welcome',
    'data', jsonb_build_object(
      'customerName', _display_name,
      'email',        new.email,
      'loginUrl',     _frontend_url || '/narocnik/dashboard'
    )
  );

  insert into public.email_logs (type, email, status, metadata)
  values (
    'customer_welcome', new.email, 'pending',
    jsonb_build_object('profile_id', new.id, 'triggered_at', now())
  );

  perform net.http_post(
    url     := _function_url,
    body    := _payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  return new;
exception
  when others then
    update public.email_logs
    set status = 'failed', error_message = sqlerrm
    where email  = new.email
      and type   = 'customer_welcome'
      and status = 'pending'
      and created_at > now() - interval '5 seconds';
    return new;
end;
$$;

drop trigger if exists trigger_customer_welcome_email on public.profiles;
create trigger trigger_customer_welcome_email
  after insert on public.profiles
  for each row
  execute function public.send_customer_welcome_email();

-- Permissions
revoke execute on function public.send_partner_welcome_email() from public;
grant  execute on function public.send_partner_welcome_email() to service_role;
revoke execute on function public.send_customer_welcome_email() from public;
grant  execute on function public.send_customer_welcome_email() to service_role;
