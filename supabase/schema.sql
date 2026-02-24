-- OBRTNIKI (contractors)
create table if not exists obrtniki (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  ime text not null,
  priimek text not null,
  podjetje text,
  email text not null unique,
  telefon text,
  specialnosti text[] default '{}',
  lokacije text[] default '{}',
  cena_min integer,
  cena_max integer,
  ocena numeric(3,2) default 0,
  stevilo_ocen integer default 0,
  status text default 'pending' 
    check (status in ('pending','verified','blocked')),
  verified_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  profilna_slika_url text,
  bio text,
  leta_izkusenj integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- POVPRAŠEVANJA (inquiries)
create table if not exists povprasevanja (
  id uuid default gen_random_uuid() primary key,
  stranka_ime text not null,
  stranka_email text,
  stranka_telefon text,
  storitev text not null,
  lokacija text not null,
  opis text not null,
  obrtnik_id uuid references obrtniki(id) on delete set null,
  termin_datum date,
  termin_ura time,
  status text default 'novo'
    check (status in ('novo','dodeljeno','sprejeto','zavrnjeno',
                      'v_izvajanju','zakljuceno','preklicano')),
  cena_ocena_min integer,
  cena_ocena_max integer,
  admin_opomba text,
  notifikacija_poslana boolean default false,
  notifikacija_cas timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REZERVACIJE (bookings)
create table if not exists rezervacije (
  id uuid default gen_random_uuid() primary key,
  povprasevanje_id uuid references povprasevanja(id) on delete cascade,
  obrtnik_id uuid references obrtniki(id) on delete cascade,
  datum date not null,
  ura time not null,
  trajanje_min integer default 60,
  status text default 'potrjeno'
    check (status in ('potrjeno','preklicano','zakljuceno')),
  created_at timestamptz default now(),
  unique(obrtnik_id, datum, ura)
);

-- ADMIN USERS
create table if not exists admin_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  ime text not null,
  email text not null unique,
  vloga text default 'admin' check (vloga in ('admin','superadmin')),
  created_at timestamptz default now()
);

-- AUDIT LOG
create table if not exists admin_log (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references admin_users(id),
  akcija text not null,
  tabela text not null,
  zapis_id uuid,
  staro_stanje jsonb,
  novo_stanje jsonb,
  created_at timestamptz default now()
);

-- RLS POLICIES
alter table obrtniki enable row level security;
alter table povprasevanja enable row level security;
alter table rezervacije enable row level security;
alter table admin_users enable row level security;
alter table admin_log enable row level security;

-- Admins can read/write everything
create policy "Admin full access obrtniki" on obrtniki
  for all using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );

create policy "Admin full access povprasevanja" on povprasevanja
  for all using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );

create policy "Admin full access rezervacije" on rezervacije
  for all using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );

-- Obrtniki can read own data
create policy "Obrtnik read own" on obrtniki
  for select using (user_id = auth.uid());

-- Public can insert povprasevanja (wizard form)
create policy "Public insert povprasevanje" on povprasevanja
  for insert with check (true);

-- Indexes for performance
create index if not exists idx_povprasevanja_status on povprasevanja(status);
create index if not exists idx_povprasevanja_obrtnik on povprasevanja(obrtnik_id);
create index if not exists idx_povprasevanja_created on povprasevanja(created_at desc);
create index if not exists idx_obrtniki_status on obrtniki(status);
create index if not exists idx_rezervacije_obrtnik_datum on rezervacije(obrtnik_id, datum);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger if not exists obrtniki_updated_at 
  before update on obrtniki
  for each row execute function update_updated_at();

create trigger if not exists povprasevanja_updated_at 
  before update on povprasevanja
  for each row execute function update_updated_at();
