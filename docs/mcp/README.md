# LiftGO MCP Configuration

Model Context Protocol (MCP) configuration za LiftGO projekt omogoča Claude-u direktan dostop do zunanjih servisov in baze podatkov.

## 📦 Datoteke

### `.mcp.json`
Glavna konfiguracija MCP strežnikov za v0.dev sandbox in Claude Code CLI. Vključuje 12 strežnikov:

- **Supabase** - Database in Auth
- **Postgres** - Direktni DB dostop  
- **Upstash** - Redis cache + QStash async jobs
- **Stripe** - Payment processing
- **Sentry** - Error tracking
- **GitHub** - Version control
- **Vercel** - Deployment
- **Sequential Thinking** - Complex reasoning
- **Memory** - Persistent storage
- **Brave Search** - Web search
- **Filesystem** - File operations
- **Puppeteer** - Browser automation

### `.env.example`
Template za vse potrebne environment spremenljivke. Kopiraj v `.env.local` in izpolni vrednosti.

## 📚 Dokumentacija

### `docs/mcp/MCP_SETUP_GUIDE.md`
Kompletna vodilnica za nastavljanje MCP po platformah:
- v0.dev Sandbox
- Claude Desktop (macOS)
- Claude Code CLI
- Claude.ai

### `docs/mcp/ENV_VARS_CHECKLIST.md`
Preverjalni seznam za vse environment spremenljivke z navodili kje dobiti vrednosti.

### `docs/mcp/MCP_TOOLS_REFERENCE.md`
Kompletna referenca za vse 60+ dostopne MCP tools s primeri uporabe:
- Supabase tools
- Postgres tools
- Upstash tools
- Stripe tools
- Sentry tools
- GitHub tools
- Vercel tools
- Filesystem tools
- In drugi...

### `docs/mcp/claude_desktop_config.example.json`
Template za Claude Desktop `.config.json` datoteko.

## 🚀 Hitri Start

### v0.dev Sandbox

1. Odpri Settings → Vars
2. Dodaj vse environment spremenljivke iz `.env.example`
3. Reload preview

### Claude Desktop

1. Kopiraj konfig: `cp docs/mcp/claude_desktop_config.example.json ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Uredi placeholder vrednosti
3. Restart Claude Desktop

### Claude Code CLI

```bash
# Kopira .env.example v .env.local
cp .env.example .env.local

# Uredi s svojimi vrednostmi
nano .env.local

# Zaženi Claude Code
claude
```

## 📋 Potrebne Spremenljivke

**Minimalna postavka za razvoj:**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=postgresql://...

GITHUB_PERSONAL_ACCESS_TOKEN=
VERCEL_TOKEN=
```

## 🔍 Testiranje

```bash
# Preveri MCP strežnike (CLI)
claude mcp list

# Preveri environment spremenljivke
cat .env.local | grep -E "SUPABASE|STRIPE|UPSTASH"
```

## 📖 Povezani Dokumenti

- [LiftGO MCP Configuration Guide](../../lift-go-mcp-configuration-guide.md) - Originalni konfiguracijski guide iz projekta
- [MCP Setup Guide](./MCP_SETUP_GUIDE.md) - Detaljna vodilnica po platformah
- [Environment Variables Checklist](./ENV_VARS_CHECKLIST.md) - Preverjalni seznam spremenljivk
- [MCP Tools Reference](./MCP_TOOLS_REFERENCE.md) - Kompletna referenca svih tools

## ⚠️ Varnost

- ❌ Nikoli ne commitaj `.env.local` ali tajne v git
- ✅ Vedno postavi tajne v Vercel environment variables
- ✅ Vedno preveri `.gitignore` za `.env` datoteke
- ✅ Uporabi `.env.example` kot template

---

Zadnja posodobitev: 2026-03-25
