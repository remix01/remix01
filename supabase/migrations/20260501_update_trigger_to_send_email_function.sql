-- Update trigger functions to call new send-email Edge Function
-- (resend-email v1 could not be updated via Management API)

create or replace function public.send_partner_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _function_url text := 'https://whabaeatixtymbccwigu.supabase.co/functions/v1/send-email';
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

create or replace function public.send_customer_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _function_url text := 'https://whabaeatixtymbccwigu.supabase.co/functions/v1/send-email';
  _frontend_url text := 'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app';
  _user_type    text;
  _payload      jsonb;
  _already_sent boolean;
  _display_name text;
begin
  select raw_user_meta_data->>'user_type'
  into   _user_type
  from   auth.users
  where  id = new.id;

  if _user_type = 'partner' then
    return new;
  end if;

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

revoke execute on function public.send_partner_welcome_email() from public;
grant  execute on function public.send_partner_welcome_email() to service_role;
revoke execute on function public.send_customer_welcome_email() from public;
grant  execute on function public.send_customer_welcome_email() to service_role;
