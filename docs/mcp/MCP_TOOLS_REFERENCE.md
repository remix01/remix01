# LiftGO MCP Tools Reference

Kompletna referenca za vse razpoložljive MCP tools v projektu.

## 🗄️ Supabase Server

### `execute_sql`
Izvršavanje surovih SQL poizvedb proti Supabase podatkovni bazi.

```sql
SELECT * FROM users WHERE role = 'craftworker' LIMIT 10;
```

### `apply_migration`
Aplikacija migracije na bazo podatkov.

```
apply_migration: 20260325_create_tables.sql
```

### `list_tables`
Prikaz vseh tabel v podatkovni bazi.

```
list_tables
```

### `get_project`
Pridobitev informacij o Supabase projektu.

```
get_project
```

---

## 🐘 Postgres Server

### `query`
Izvršavanje kompleksnih SQL poizvedb z naprednima nastavitvami.

```sql
SELECT * FROM inquiries 
WHERE created_at > NOW() - INTERVAL '7 days' 
ORDER BY created_at DESC;
```

### `execute`
Direktno izvršavanje SQL stavkov (INSERT, UPDATE, DELETE).

```sql
UPDATE users SET last_login = NOW() WHERE id = 123;
```

---

## ⚡ Upstash Server

### `redis_get`
Pridobitev vrednosti iz Redis cache-a.

```
redis_get: user:123:preferences
```

### `redis_set`
Shranjevanje vrednosti v Redis cache.

```
redis_set: user:123:preferences value={"theme": "dark"}
```

### `qstash_publish`
Objavitev async job-a v QStash queue.

```
qstash_publish: send_email topic=notifications payload={"email": "user@example.com"}
```

### `qstash_schedule`
Planiranje job-a za poznejšo izvršitev.

```
qstash_schedule: send_reminder delay=3600 topic=notifications
```

---

## 💳 Stripe Server

### `list_customers`
Prikaz vseh Stripe kupcev.

```
list_customers limit=50
```

### `list_subscriptions`
Prikaz vseh aktivnih naročnin.

```
list_subscriptions status=active
```

### `create_payment_link`
Ustvarjanje novega plačilnega linka.

```
create_payment_link: product_id=prod_123 price=99.99 currency=eur
```

### `list_products`
Prikaz vseh Stripe produktov.

```
list_products
```

---

## 🔍 Sentry Server

### `search_issues`
Iskanje Sentry issue-jev in napak.

```
search_issues: level=error environment=production
```

### `get_issue_details`
Pridobitev detajlov specifičnega issue-ja.

```
get_issue_details: issue_id=123456
```

### `analyze_issue_with_seer`
AI analiza issue-ja s Sentry SEER (AI engine).

```
analyze_issue_with_seer: issue_id=123456
```

---

## 🐙 GitHub Server

### `create_pull_request`
Ustvarjanje novega Pull Requesta.

```
create_pull_request:
  title: "Fix auth bug"
  body: "Fixes issue #123"
  head: feature/auth-fix
  base: main
```

### `push_files`
Pushanje datotečnih sprememb v git.

```
push_files:
  files: [app/page.tsx, components/Header.tsx]
  message: "Update header component"
  branch: feature/header-update
```

### `search_code`
Iskanje kode v repozitoriju.

```
search_code: query="function handlePayment" language=typescript
```

### `list_commits`
Prikaz zadnjih commitov.

```
list_commits limit=20 branch=main
```

---

## 🚀 Vercel Server

### `list_deployments`
Prikaz vseh deploymentov.

```
list_deployments limit=10
```

### `get_deployment`
Pridobitev detajlov specifičnega deploymenta.

```
get_deployment: deployment_id=deploy_xyz123
```

### `get_runtime_logs`
Pridobitev runtime logov.

```
get_runtime_logs: deployment_id=deploy_xyz123 limit=100
```

---

## 🧠 Sequential Thinking Server

### `think`
Strukturiran razmislek za kompleksne logične probleme.

```
think: "How to optimize database queries for better performance?"
```

---

## 💾 Memory Server

### `store`
Shranjevanje informacije v persistent memory.

```
store: key=project_architecture value="LiftGO je marketplace za obrtne storitve"
```

### `retrieve`
Pridobitev shranjene informacije.

```
retrieve: key=project_architecture
```

---

## 🔎 Brave Search Server

### `search`
Web iskanje preko Brave Search API.

```
search: query="Next.js 16 best practices" count=10
```

---

## 📁 Filesystem Server

### `read_file`
Branje vsebine datoteke.

```
read_file: /vercel/share/v0-project/app/page.tsx
```

### `write_file`
Pisanje vsebine v datoteko.

```
write_file: /vercel/share/v0-project/test.txt content="Hello, LiftGO!"
```

### `list_directory`
Prikaz vsebine direktorija.

```
list_directory: /vercel/share/v0-project/app
```

---

## 🤖 Puppeteer Server

### `screenshot`
Slika zaslona (screenshot) spletne strani.

```
screenshot: url=https://liftgo.example.com filename=homepage.png
```

### `navigate`
Navigacija na spletno stran.

```
navigate: url=https://liftgo.example.com
```

### `click`
Klik na element na spletni strani.

```
click: selector=".submit-button"
```

---

## 📊 Primeri uporabe

### Scenarij 1: Dodaj novega uporabnika

```
# 1. Supabase - Ustvari tabelo
execute_sql: INSERT INTO users (email, role) VALUES ('user@example.com', 'craftworker')

# 2. Redis - Cache podatke
redis_set: user:123:profile value={"email": "user@example.com", "role": "craftworker"}

# 3. GitHub - Commit sprememb
push_files: files=[scripts/add_user.sql] message="Add new craftworker user"
```

### Scenarij 2: Monitoriranje napak

```
# 1. Sentry - Poiščite kritične napake
search_issues: level=error environment=production

# 2. Sentry - Analiza
analyze_issue_with_seer: issue_id=123456

# 3. Vercel - Pridobi logove
get_runtime_logs: deployment_id=prod_deploy

# 4. GitHub - Ustvari issue
create_pull_request: title="Fix critical error #123" body="Urgent fix needed"
```

### Scenarij 3: Plačilni sistem

```
# 1. Stripe - Poiščite naročnike
list_subscriptions: status=active

# 2. Upstash - Shrani za cache
redis_set: subscriptions:cache value={"count": 150}

# 3. PostgreSQL - Pridobi statuse
query: SELECT COUNT(*) FROM subscriptions WHERE status='active'
```

---

Zadnja posodobitev: 2026-03-25
