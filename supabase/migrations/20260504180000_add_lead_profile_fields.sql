alter table public.obrtnik_profiles
  add column if not exists profile_status text not null default 'verified'
    check (profile_status in ('lead','claimed','verified')),
  add column if not exists is_claimed boolean not null default false,
  add column if not exists source text not null default 'signup'
    check (source in ('manual','import','signup')),
  add column if not exists visibility text not null default 'public_full'
    check (visibility in ('public_limited','public_full'));

update public.obrtnik_profiles
set profile_status = case
  when coalesce(is_verified, false) = true then 'verified'
  else 'claimed'
end
where profile_status not in ('lead','claimed','verified');

update public.obrtnik_profiles
set is_claimed = (profile_status in ('claimed','verified'))
where is_claimed is distinct from (profile_status in ('claimed','verified'));
