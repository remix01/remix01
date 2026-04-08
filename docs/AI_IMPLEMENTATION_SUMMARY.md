# LiftGO AI Nadgradnja - Implementacija

## ✅ Dokončano

### 1. Razširjena Konfiguracija (`lib/env.ts`)

Posodobljena datoteka z:
- **Vsemi AI providerji**: Anthropic, OpenAI, Gemini, Perplexity
- **Utility funkcijami za preverjanje dostopnosti**: `hasOpenAI()`, `hasGemini()`, `hasPerplexity()` itd.
- **AI Provider Functions**: `getAvailableAIProviders()`, `getBestProviderFor()`
- **Upravljanje storitev**: Upstash, QStash, Stripe, Supabase in drugo

### 2. AI Knjižnica (`lib/ai/`)

#### `rag.ts` - Retrieval-Augmented Generation
- Generiranje embedingov z OpenAI/Voyage/Gemini
- Semantično iskanje po tasks, obrtniki, sporočilih, ponudbah
- Gradnja RAG konteksta za agente
- Formatiranje konteksta za prompte

#### `providers.ts` - Multi-Provider AI Routing
- Chat z Anthropic (Claude), OpenAI, Gemini
- Perplexity iskanje z fallback na OpenAI
- Multimodalna analiza slik
- Izračun stroškov po providru

#### `tools.ts` - Function Calling
- 12 orodij za autonomne agente
- Iskanje podobnih nalogov, profili obrtnikov, ponudbe
- Upravljanje cen in materialov
- Obvestila in analitika

#### `orchestrator.ts` - Unified Execution
- Preverjanje dostopa in kvot (po subscription tier)
- RAG kontekst retrieval
- Tool use loop s Claude
- Logging uporabe in stroškov
- Multimodalna analiza slik

#### `index.ts` - Central Exports
- Unified API za vse AI funkcionalnosti

### 3. API Endpointi

#### `app/api/ai/chat/route.ts`
- POST: Enhanced chat z RAG + tool calling
- GET: Health check

#### `app/api/ai/embed/route.ts`
- POST: Generiranje/shranjevanje embedingov
- PUT: Backfill embedingov za tabelo
- GET: Status embedingov

#### `app/api/ai/analyze-image/route.ts`
- POST: Analiza slike z URL
- PUT: Upload in analiza slike

#### `app/api/cron/backfill-embeddings/route.ts`
- GET/POST: Avtomatsko generiranje embedingov
- Čitanje iz 4 tabel: tasks, obrtnik_profiles, ponudbe, sporocila

### 4. Agent Router (`lib/agents/ai-router.ts`)

- 10 agentov s posebnimi vloga in omejitvami
- Daily limits po subscription tier (start, plus, pro, premium)
- Agent metadata in dostop nadzor

### 5. Model Router (`lib/model-router.ts`)

- Selekcija modela po kompleksnosti
- Haiku za preproste, Sonnet za kompleksne
- Izračun stroškov API klicev

---

## 🔧 Potrebne Vercel Environment Variables

V `Settings → Environment Variables` dodaj:

```bash
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...       # Claude (chat, vision)
OPENAI_API_KEY=sk-...              # Embeddings + fallback
GEMINI_API_KEY=AIza...             # Cost-effective fallback
PERPLEXITY_API_KEY=pplx-...        # Real-time search

# Optional
VOYAGE_API_KEY=...                 # Alternative embeddings
CRON_SECRET=<random-string>        # Zaščita cron jobov
```

### Prioriteta Providerjev

| Naloga | Prioriteta |
|--------|------------|
| Chat | Anthropic → OpenAI → Gemini |
| Embeddings | OpenAI → Voyage → Gemini |
| Search | Perplexity → OpenAI |
| Vision | Anthropic → OpenAI → Gemini |

---

## 📋 Naslednji Koraki

### 1. Supabase Migracije

Izvedi migracije za:
- pgvector extension
- `embedding` stolpci na tabelah (1536 dimenzije)
- HNSW indeksi
- RPC funkcije: `match_tasks()`, `match_obrtniki()`, `match_sporocila()`, `match_ponudbe()`
- `ai_usage_logs` tabela za tracking

### 2. Vercel Cron Setup

V `vercel.json` dodaj:
```json
{
  "crons": [{
    "path": "/api/cron/backfill-embeddings",
    "schedule": "*/15 * * * *"
  }]
}
```

### 3. Initial Backfill

Po deploy-u poženi enkratno:
```bash
curl -X PUT https://liftgo.net/api/ai/embed \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"table":"tasks","batchSize":20}'
```

### 4. Test RAG

```bash
curl -X POST https://liftgo.net/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Iščem vodovodarja za zamenjavo pipe",
    "agentType":"work_description"
  }'
```

---

## 📁 Struktura Datotek

```
lib/
├── env.ts                          # ✅ Posodobljen
├── model-router.ts                 # ✅ Obstoječ
├── agents/
│   └── ai-router.ts               # ✅ Obstoječ
└── ai/
    ├── index.ts                    # ✅ Nova
    ├── rag.ts                      # ✅ Nova
    ├── tools.ts                    # ✅ Nova (polna verzija)
    ├── providers.ts                # ✅ Nova
    └── orchestrator.ts             # ✅ Nova

app/api/
├── ai/
│   ├── chat/route.ts              # ✅ Nova
│   ├── embed/route.ts             # ✅ Nova
│   └── analyze-image/route.ts     # ✅ Nova
└── cron/
    └── backfill-embeddings/route.ts # ✅ Nova (popravljena)
```

---

## 🎯 Funkcionalnosti

### Za Naročnike
- **Splošni Chat**: Vprašanja o platformi
- **Opis Dela**: AI asistent za pisanje povpraševanj
- **Primerjava Ponudb**: Analiza in priporočila
- **Video Diagnoza**: Analiza slik (PRO)
- **Urnik**: Predlog terminov

### Za Mojstre
- **Generator Ponudb**: Hitro pisanje ponudb
- **Materiali**: Seznami in cene (PRO)
- **Povzetek Dela**: Poročilo po koncu
- **Pisanje Ponudb**: Professionalne ponudbe (PRO)
- **Optimizacija Profila**: Izboljšave za več posla (PRO)

---

## 💡 Primeri Uporabe

### Chat z RAG
```typescript
import { executeAgent } from '@/lib/ai'

const result = await executeAgent({
  userId: 'user123',
  agentType: 'work_description',
  userMessage: 'Pomozi mi napisati opis dela',
  useRAG: true,
  useTools: true,
})
```

### Multimodalna Analiza
```typescript
const result = await analyzeImage(
  'https://example.com/damage.jpg',
  'diagnosis'
)
```

### Direktni Chat
```typescript
import { chat } from '@/lib/ai'

const result = await chat([
  { role: 'user', content: 'Pomagaj s cenami' }
], { provider: 'anthropic' })
```

---

## 🔐 Varnost

- ✅ Bearer token avtentifikacija
- ✅ Preverjanje dostopa po subscription tier
- ✅ Daily usage kvote
- ✅ Cron secret zaščita
- ✅ Parameterized Supabase queries
- ✅ Admin-only endpoints za embedding

---

## 📊 Monitoring

Preveri AI uporabo:
```bash
curl -X GET https://liftgo.net/api/ai/embed \
  -H "Authorization: Bearer <admin_token>"
```

Rezultat:
```json
{
  "success": true,
  "stats": {
    "tasks": {"total": 500, "withEmbedding": 450, "coverage": "90%"},
    "obrtnik_profiles": {"total": 150, "withEmbedding": 150, "coverage": "100%"},
    "ponudbe": {"total": 2000, "withEmbedding": 1800, "coverage": "90%"},
    "sporocila": {"total": 5000, "withEmbedding": 4500, "coverage": "90%"}
  }
}
```

---

## ⚠️ Znane Omejitve

1. Gemini embeddings so 768D (padded to 1536) - manjša natančnost
2. Voyage API potrebuje ločen API key
3. Perplexity search zahteva internet dostop
4. Vision analysis je draga (~0.015€ per image)
5. Rate limiting na OpenAI/Anthropic API

---

**Zadnja posodobitev**: März 2026
