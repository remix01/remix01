-- Auto-create partner row when a user signs up with user_type = 'partner'
create or replace function public.handle_new_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ->> 'user_type' = 'partner' then
    insert into public.partners (id, company_name, category)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'company_name', 'Neznano podjetje'),
      'Splošno'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_partner on auth.users;

create trigger on_auth_user_created_partner
  after insert on auth.users
  for each row
  execute function public.handle_new_partner();
