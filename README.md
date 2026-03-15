# LiftGO

**LiftGO** je platforma, ki v Sloveniji poveže stranke z zaupanja vrednimi obrtniki in mojstri. Stranke oddajo brezplačno povpraševanje, obrtniki pošljejo ponudbe — ponavadi v manj kot 2 urah.

🌐 https://liftgo.net · 📧 info@liftgo.net

---

## Tech Stack

| Sloj | Tehnologija |
|------|-------------|
| Framework | Next.js 16 (App Router) |
| Baza | Supabase (PostgreSQL + Auth + Realtime) |
| Styling | Tailwind CSS + shadcn/ui |
| AI Asistent | Anthropic Claude (claude-sonnet-4-6) |
| Plačila | Stripe (escrow model) |
| E-pošta | Resend |
| Job Queue | QStash (Upstash) |
| Hosting | Vercel |

---

## Hitri začetek

### 1. Kloniraj repozitorij
```bash
git clone <repo-url>
cd remix01
npm install
```

### 2. Nastavi okoljske spremenljivke
Kopiraj `.env.example` v `.env.local` in izpolni vrednosti:

```bash
cp .env.example .env.local
```

Obvezne spremenljivke (brez njih aplikacija ne deluje):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Anthropic (AI asistent)
ANTHROPIC_API_KEY=sk-ant-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Opcijske spremenljivke (graceful fallback če niso nastavljene):

```env
RESEND_API_KEY=re_...           # E-pošta
QSTASH_TOKEN=...                # Job queue
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
NEXT_PUBLIC_GA_ID=G-...         # Google Analytics
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... # Push obvestila
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:info@liftgo.net
LANGFUSE_PUBLIC_KEY=...         # AI tracing (opcijsko)
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 3. Nastavi bazo
```bash
# Zaženi migracije v Supabase SQL Editorju (po vrstnem redu):
supabase/migrations/001_*.sql
supabase/migrations/002_*.sql
# ... vse do zadnje migracije
```

Vse migracije so v `/supabase/migrations/` — zaženi jih v Supabase SQL Editorju po kronološkem vrstnem redu.

### 4. Zaženi razvojni strežnik
```bash
npm run dev
```

Aplikacija teče na http://localhost:3000

---

## Struktura projekta

```
app/
  (narocnik)/        ← Strani za stranke (povpraševanja, naročila)
  (obrtnik)/         ← Strani za obrtnike (stara pot)
  admin/             ← Admin panel (zahteva admin_users vpis)
  partner-dashboard/ ← Dashboard za partnerje/obrtnike
  api/               ← API Routes
    agent/chat/      ← AI asistent (POST /api/agent/chat)
    stripe/          ← Stripe webhooks in checkout
    admin/           ← Admin API endpoints

components/
  agent/             ← AI chatbot komponente
  admin/             ← Admin panel komponente
  ui/                ← shadcn/ui komponente

lib/
  supabase/          ← Supabase klienti (server, client, proxy)
  agent/             ← AI orchestrator in state machine
  dal/               ← Data Access Layer
  jobs/              ← Job queue workers
  env.ts             ← Centralizirana konfiguracija env spremenljivk

supabase/
  migrations/        ← SQL migracije (kronološki vrstni red)
```

---

## Baza podatkov — ključne tabele

| Tabela | Namen |
|--------|-------|
| `profiles` | Vsi uporabniki (narocnik / obrtnik vlogi) |
| `obrtnik_profiles` | Profili obrtnikov (podjetje, ocena, verifikacija) |
| `categories` | Kategorije storitev |
| `povprasevanja` | Povpraševanja strank |
| `ponudbe` | Ponudbe obrtnikov na povpraševanja |
| `payouts` | Izplačila obrtnikov |
| `admin_users` | Admin/zaposleni računi z RBAC vlogami |
| `notifications` | Push/in-app obvestila |

---

## Admin panel

Admin panel dostopen na `/admin` — zahteva vpis z računom v tabeli `admin_users`.

Vloge: `SUPER_ADMIN` · `MODERATOR` · `OPERATER`

Za kreacijo prvega admin uporabnika:
1. Registriraj se normalno na platformi
2. V Supabase SQL Editorju dodaj zapis v `admin_users`:
```sql
INSERT INTO admin_users (auth_user_id, email, ime, priimek, vloga)
VALUES ('<auth-user-id>', 'admin@liftgo.net', 'Ime', 'Priimek', 'SUPER_ADMIN');
```

---

## AI asistent

Chatbot teče na `/api/agent/chat` — dostopen vsem uporabnikom (prijavljenim in neprijavljenim).

Model: `claude-sonnet-4-6`
Zahteva: `ANTHROPIC_API_KEY` v env spremenljivkah.

---

## Pricing (za obrtnike)

| Plan | Komisija | Mesečnina |
|------|----------|-----------|
| START | 10% | €0/mesec |
| PRO | 5% | €29/mesec |

---

## Kontakt

**LiftGO d.o.o.**
Kuraltova ulica 12, 4208 Šenčur, Slovenija
📧 info@liftgo.net · 🌐 https://liftgo.net
