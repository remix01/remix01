# LiftGO Environment Variables Checklist

## ✅ Preverjalni seznam

Pregled vseh potrebnih environment spremenljivk za LiftGO projekt.

### 🔐 Core Infrastructure

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase projekt URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonimni ključ (javno dostopen)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role ključ (tajne operacije)
- [ ] `SUPABASE_DB_URL` - Polna PostgreSQL connection string za direktni dostop

### 💾 Redis Cache & Async Jobs

- [ ] `UPSTASH_REDIS_REST_URL` - Upstash Redis REST endpoint
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis dostopni token
- [ ] `QSTASH_TOKEN` - QStash token za async job scheduling

### 💳 Stripe Integration

- [ ] `STRIPE_SECRET_KEY` - Stripe tajni ključ (za backendske operacije)
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe javni ključ (za frontend)
- [ ] `STRIPE_MCP_KEY` - Stripe MCP strežnik ključ

### 🚀 DevOps & Deployment

- [ ] `GITHUB_PERSONAL_ACCESS_TOKEN` - GitHub PAT za avtomatske commit-e in PR-je
- [ ] `VERCEL_TOKEN` - Vercel API token za deployment
- [ ] `VERCEL_PROJECT_ID` - ID Vercel projekta

### 🔍 Monitoring & Errors

- [ ] `SENTRY_AUTH_TOKEN` - Sentry authentication token
- [ ] `SENTRY_ORG` - Sentry organizacija (`liftgo`)
- [ ] `SENTRY_PROJECT` - Sentry projekt (`liftgo-nextjs`)
- [ ] `SENTRY_DSN` - Sentry Data Source Name

### 🔎 Optional AI Services

- [ ] `BRAVE_API_KEY` - Brave Search API ključ (optional)

### 💬 Slack Integration (Optional)

- [ ] `SLACK_BOT_TOKEN` - Slack bot token
- [ ] `SLACK_TEAM_ID` - Slack team ID

### ⚙️ Application Configuration

- [ ] `NODE_ENV` - Razvojno okolje (`development`, `production`)
- [ ] `NEXT_PUBLIC_APP_URL` - Javni URL aplikacije

---

## 🔄 Kako nastavljanje

### V v0.dev

1. Settings (zgornji desni kot) → **Settings** tab
2. Pojdi v **Vars** sekcijo
3. Dodaj vsako spremenljivko ločeno
4. Reload preview

### V Claude Desktop

1. Odpri `~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Izpolni vse vrednosti v `env` sekcijah
3. Restart Claude Desktop

### V `.env.local` (lokalnih razvojnim namestitvam)

```bash
# Kopiraj .env.example
cp .env.example .env.local

# Uredi z своїми vrednostmi
nano .env.local
```

---

## 📝 Kam dobiti vrednosti

| Spremenljivka | Kje dobiti |
|---------------|-----------|
| `SUPABASE_*` | https://app.supabase.com → Project Settings → API |
| `UPSTASH_*`, `QSTASH_TOKEN` | https://console.upstash.com → Account |
| `STRIPE_*` | https://dashboard.stripe.com → Settings → API Keys |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `SENTRY_*` | https://sentry.io → Settings → Integrations → Internal |
| `BRAVE_API_KEY` | https://api.search.brave.com |

---

## ⚠️ Varnostna pravila

- ❌ **Nikoli** commitaj `.env.local` v git
- ❌ **Nikoli** pushaš tajne v javne repozitorije
- ✅ **Vedno** uporabi `.env.example` za template
- ✅ **Vedno** postavi tajne v Vercel environment variables
- ✅ **Vedno** preveri `.gitignore` za `.env` datoteke

---

## 🧪 Testiranje

```bash
# Preveri da so vse spremenljivke nastavljene
node -e "console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('STRIPE') || k.includes('UPSTASH')))"

# Za CLI
cat .env.local | grep -E "SUPABASE|STRIPE|UPSTASH|SENTRY|VERCEL"
```

---

Zadnja posodobitev: 2026-03-25
