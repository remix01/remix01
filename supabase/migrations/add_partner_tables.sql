-- Partner packages (START/PRO)
create table if not exists partner_paketi (
  id uuid default gen_random_uuid() primary key,
  obrtnik_id uuid references obrtniki(id) on delete cascade unique,
  paket text default 'start' check (paket in ('start','pro')),
  provizija_procent integer default 10,
  aktiviran_do timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Partner notifications
create table if not exists partner_notifikacije (
  id uuid default gen_random_uuid() primary key,
  obrtnik_id uuid references obrtniki(id) on delete cascade,
  tip text not null,
  naslov text not null,
  vsebina text,
  prebrano boolean default false,
  povezava text,
  created_at timestamptz default now()
);

-- Reviews / ocene
create table if not exists ocene (
  id uuid default gen_random_uuid() primary key,
  povprasevanje_id uuid references povprasevanja(id) on delete cascade,
  obrtnik_id uuid references obrtniki(id) on delete cascade,
  stranka_ime text not null,
  ocena integer check (ocena between 1 and 5),
  komentar text,
  odgovor_obrtnika text,
  created_at timestamptz default now()
);

-- RLS policies
alter table partner_paketi enable row level security;
alter table partner_notifikacije enable row level security;
alter table ocene enable row level security;

create policy "Obrtnik own paket" on partner_paketi
  for all using (
    obrtnik_id in (
      select id from obrtniki where user_id = auth.uid()
    )
  );

create policy "Obrtnik own notifikacije" on partner_notifikacije
  for all using (
    obrtnik_id in (
      select id from obrtniki where user_id = auth.uid()
    )
  );

create policy "Public read ocene" on ocene
  for select using (true);

create policy "Admin full ocene" on ocene
  for all using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );

-- Auto-create paket on obrtnik insert
create or replace function auto_create_paket()
returns trigger as $$
begin
  insert into partner_paketi (obrtnik_id) values (new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists obrtniki_auto_paket on obrtniki;
create trigger obrtniki_auto_paket
  after insert on obrtniki
  for each row execute function auto_create_paket();

-- Create indexes for performance
create index if not exists idx_partner_paketi_obrtnik on partner_paketi(obrtnik_id);
create index if not exists idx_partner_notifikacije_obrtnik on partner_notifikacije(obrtnik_id);
create index if not exists idx_partner_notifikacije_prebrano on partner_notifikacije(prebrano);
create index if not exists idx_ocene_obrtnik on ocene(obrtnik_id);
create index if not exists idx_ocene_povprasevanje on ocene(povprasevanje_id);
