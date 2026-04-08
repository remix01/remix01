# LiftGO MCP Configuration Setup Guide

Kompletna vodilnica za nastavljanje Model Context Protocol (MCP) za LiftGO razvoj.

## 📋 Vsebina

- [Pregled](#pregled)
- [Konfiguracije po okolju](#konfiguracije-po-okolju)
- [Setup po platformi](#setup-po-platformi)
- [Environment Variables](#environment-variables)
- [Debugging](#debugging)
- [Naslednji koraki](#naslednji-koraki)

## Pregled

MCP omogoča Claude-u direkten dostop do zunanjih servisov in baze podatkov. Ta projekt je konfiguriran z 12 MCP strežniki:

### Strežniki

| Strežnik | Namen | Tools |
|----------|-------|-------|
| **Supabase** | Database in Auth | `execute_sql`, `apply_migration`, `list_tables` |
| **Postgres** | Direktni DB dostop | `query`, `execute` |
| **Upstash** | Redis cache + async jobs | `redis_get`, `qstash_publish` |
| **Stripe** | Plačilni sistem | `list_customers`, `create_payment_link` |
| **Sentry** | Error tracking | `search_issues`, `analyze_issue_with_seer` |
| **GitHub** | Version control | `create_pull_request`, `push_files` |
| **Vercel** | Deployment | `list_deployments`, `get_runtime_logs` |
| **Sequential Thinking** | Kompleksno logiko | `think` |
| **Memory** | Persistentna memoria | `store`, `retrieve` |
| **Brave Search** | Web iskanje | `search` |
| **Filesystem** | Datotečni dostop | `read_file`, `write_file` |
| **Puppeteer** | Browser automation | `screenshot`, `navigate` |

## Konfiguracije po okolju

### v0.dev Sandbox

```bash
# Datoteka: .mcp.json (v root repota)
# Automatski nastavljena z environment variables iz Vercel dashboarda
```

**Koraki:**
1. Settings → Environment Variables (v v0 dashboardu)
2. Dodaj vse spremenljivke iz `.env.example`
3. Reload preview

### Claude Desktop (macOS)

```bash
# Lokacija konfiga:
~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Koraki:**
1. Odpri terminal
2. `code ~/Library/Application\ Support/Claude/claude_desktop_config.json`
3. Kopiraj vsebino iz `docs/mcp/claude_desktop_config.example.json`
4. Zamenjaj `YOUR_*` placeholder-je s pravimi vrednostmi
5. Restart Claude Desktop (`⌘Q` in ponovno odpri)

### Claude Code CLI

```bash
# .mcp.json je že konfiguriran v repotu
# ENV vars morajo biti v .env.local
```

**Koraki:**
1. Kopiraj `.env.example` → `.env.local`
2. Izpolni vse vrednosti
3. Zaženi: `claude`
4. Preveri: `claude mcp list`

## Environment Variables

### Obvezni ključi

```bash
# Supabase Database
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.whabaeatixtymbccwigu.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=

# Stripe Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

### DevOps Integration

```bash
# GitHub
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxx

# Vercel
VERCEL_TOKEN=

# Sentry Monitoring
SENTRY_AUTH_TOKEN=
SENTRY_ORG=liftgo
SENTRY_PROJECT=liftgo-nextjs
```

### Opcioni ključi

```bash
# AI Services
BRAVE_API_KEY=

# Slack
SLACK_BOT_TOKEN=
SLACK_TEAM_ID=
```

## Debugging

### Preveri aktivne MCP strežnike

```bash
# Claude Code CLI
claude mcp list

# Preveri logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

### Pogosti problemi

| Problem | Rešitev |
|---------|---------|
| Server ne odgovarja | Povečaj timeout: `"timeout": 30000` v `.mcp.json` |
| Auth failed | Preveri env vars: `echo $SUPABASE_SERVICE_ROLE_KEY` |
| npx ne deluje | Počisti cache: `npm cache clean --force` |
| Tools se ne prikazujejo | Restart Claude Desktop ali CLI |

### Logiranje

```bash
# Prikaži live logs
tail -f ~/Library/Logs/Claude/mcp.log

# Shrani log v datoteko
tail -f ~/Library/Logs/Claude/mcp*.log > debug.log
```

## Naslednji koraki

- [ ] Kopiraj `claude_desktop_config.example.json` v Claude Desktop
- [ ] Izpolni `.env.local` s pravimi vrednostmi
- [ ] Preveri `claude mcp list` za aktivne strežnike
- [ ] Test MCP dostopa: `claude`
- [ ] Zaženi `npm install` za nove dependence

## Povezani dokumenti

- [LiftGO MCP Configuration Guide](../../lift-go-mcp-configuration-guide.md) - Originalni konfiguracijski guide
- [.mcp.json](./../.mcp.json) - Aktualna MCP konfiguracija
- [.env.example](../../.env.example) - Template za environment variables

---

Zadnja posodobitev: 2026-03-25
