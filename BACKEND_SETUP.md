# LiftGO Backend Setup — Aktualna Shema

> ⚠️ **Opomba:** Ta dokument opisuje **trenutno shemo** (marketplace arhitektura).
> Stara shema (`obrtniki`, `rezervacije` tabele) je bila zamenjana — migracije so v `supabase/migrations/`.

---

## Zaženi migracije

Vse migracije zaženi v **Supabase SQL Editorju** po kronološkem vrstnem redu:

```
supabase/migrations/
  001_initial_schema.sql
  002_auth_policies.sql
  003_create_admin_users_table.sql
  004_liftgo_marketplace.sql
  20250221_agent_matches.sql
  20250222_*.sql
  20250310_*.sql
  20260215100000_create_escrow_tables.sql
  20260223_partner_migration.sql
  20260227190000_fix_rls_policies.sql
  20260315_fix_category_nullable_and_admin.sql
```

---

## Ključne tabele

### `profiles`
Vsi uporabniki platforme.
```sql
id UUID (FK → auth.users)
role TEXT  -- 'narocnik' | 'obrtnik'
full_name TEXT
email TEXT
phone TEXT
location_city TEXT
location_region TEXT
avatar_url TEXT
created_at TIMESTAMPTZ
```

### `obrtnik_profiles`
Profili obrtnikov (1:1 z profiles kjer role='obrtnik').
```sql
id UUID (FK → profiles)
business_name TEXT
description TEXT
ajpes_id TEXT
is_verified BOOLEAN
is_available BOOLEAN
avg_rating NUMERIC
stripe_account_id TEXT
stripe_onboarded BOOLEAN
created_at TIMESTAMPTZ
```

### `categories`
Kategorije storitev.
```sql
id UUID
name TEXT
slug TEXT UNIQUE
icon_name TEXT
description TEXT
```

### `povprasevanja`
Povpraševanja strank.
```sql
id UUID
narocnik_id UUID (FK → profiles)
category_id UUID (FK → categories, nullable)
title TEXT
description TEXT
location_city TEXT
location_region TEXT
location_notes TEXT
urgency TEXT  -- 'normalno' | 'kmalu' | 'nujno'
status TEXT   -- 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'
budget_min NUMERIC
budget_max NUMERIC
preferred_date_from DATE
preferred_date_to DATE
created_at TIMESTAMPTZ
```

### `ponudbe`
Ponudbe obrtnikov na povpraševanja.
```sql
id UUID
povprasevanje_id UUID (FK → povprasevanja)
obrtnik_id UUID (FK → obrtnik_profiles)
message TEXT
price_estimate NUMERIC
price_type TEXT  -- 'fiksna' | 'urna' | 'po_dogovoru'
available_date DATE
status TEXT  -- 'poslana' | 'sprejeta' | 'zavrnjena'
payment_status TEXT  -- 'unpaid' | 'pending' | 'paid' | 'failed'
stripe_payment_intent_id TEXT
created_at TIMESTAMPTZ
```

### `payouts`
Izplačila obrtnikov.
```sql
id UUID
ponudba_id UUID (FK → ponudbe)
obrtnik_id UUID (FK → obrtnik_profiles)
amount_eur NUMERIC
commission_eur NUMERIC
stripe_transfer_id TEXT
status TEXT  -- 'pending' | 'completed' | 'failed'
created_at TIMESTAMPTZ
```

### `admin_users`
Admin/zaposleni računi z RBAC.
```sql
id UUID
auth_user_id UUID (FK → auth.users, UNIQUE)
email TEXT UNIQUE
ime TEXT
priimek TEXT
vloga TEXT  -- 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER'
aktiven BOOLEAN
created_at TIMESTAMPTZ
```

---

## API Endpoints

### AI Asistent
```
POST /api/agent/chat
Body: { message: string, conversationHistory: Message[] }
Response: { message: string, conversationHistory: Message[] }
```

### Povpraševanja
```
POST /api/povprasevanje          ← Ustvari novo (avtenticirano)
POST /api/povprasevanje/public   ← Ustvari novo (brez prijave)
GET  /api/povprasevanje/[id]     ← Pridobi eno
PATCH /api/povprasevanje/[id]    ← Posodobi status
```

### Stripe
```
POST /api/stripe/create-checkout          ← Ustvari plačilo
POST /api/stripe/webhook                  ← Stripe webhook
POST /api/stripe/connect/create-onboarding-link  ← Onboarding za obrtnike
```

### Admin
```
GET /api/admin/analytics/summary  ← Dashboard statistike
GET /api/admin/placila            ← Pregled plačil
GET /api/admin/craftworkers       ← Seznam obrtnikov
```

---

## Okoljske spremenljivke

Glej README.md za celoten seznam. Ključne:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://liftgo.net
```

---

## Stara shema (arhiv)

Stara shema je imela tabele `obrtniki`, `povprasevanja` (stari format), `rezervacije`.
Te so bile **zamenjane** z novo marketplace arhitekturo.
Migracijski skripta: `supabase/migrations/20260223_partner_migration.sql`
