# Agent runtime convergence (no hard cut)

Status: transitional, adapter-first.
Date: 2026-04-29.

Cilj: dokumentirati varno konvergenco agent runtime-a brez odstranjevanja compatibility layerjev.

---

## 1) Trenutno stanje runtime skladov

### `lib/agent/*` (legacy/parallel stack)
- vsebuje orchestrator, tool-router, guardrails, permissions, state machine in memory module.
- del endpointov je še vedno neposredno vezan na ta stack ali njegovo logiko.

### `lib/agents/*` (novejši stack)
- vsebuje agent definicije, tier access policy, usage logging in orchestrator/message-bus gradnike.
- dinamični endpoint `/api/agent/[agentType]` že uporablja ključne module tega stacka.

### Povzetek
- oba stacka sta aktivna; to je namerna compatibility faza.
- v tej fazi ne odstranjujemo nobenega stacka, ampak dodajamo guarde in test matriko.

---

## 2) Conversation storage model

### `agent_conversations`
- trenutno uporabljen predvsem v `/api/agent/chat`.
- model je zgodovinsko vezan na general chat tok.

### `ai_agent_conversations`
- uporablja ga `/api/agent/[agentType]`.
- model je agent-type aware in je bolj primeren za dolgoročni canonical path.

### Pravilo za migration obdobje
- dual-store ostane aktiven.
- response compatibility ostane nespremenjen (top-level + canonical envelope kjer že obstaja).

---

## 3) Canonical candidate (trenutni target)

**Canonical candidate = `/api/agent/[agentType]` + `lib/agents/*` policy/logging sloj**, ker:
- centralizira tier/quota pravila,
- uporablja `ai_agent_conversations`,
- ima bolj enoten model za usage/cost logging,
- podpira širitev brez endpoint sprawl-a.

To NI hard cut. Legacy endpointi ostanejo aktivni do zaključka compatibility načrta.

---

## 4) Migracijski vrstni red brez hard-cuta

1. **Contract freeze**
   - zakleni response shape contracte za vse `/api/agent/*` endpoint-e.
   - obdrži legacy top-level fields, dodajaj samo non-breaking canonical markerje.

2. **Policy adapterji**
   - shared auth/tier/quota helperji naj se uporabljajo v vseh agent endpointih.
   - brez spremembe business logike.

3. **Telemetry unifikacija**
   - zadržimo obstoječe logging poti, dodamo enotne minimalne atribute (`agent_type`, `response_time_ms`, cost/tokens).

4. **Conversation bridge (po potrebi)**
   - dodaj adapterje za cross-read/cross-write tam, kjer je to potrebno za konsistenten UX.
   - brez brisanja legacy tabele v tej fazi.

5. **Feature-flag convergence**
   - endpointi lahko preklapljajo backend runtime pod feature flagom.
   - rollout po segmentih, spremljanje latency/error/cost.

6. **Cleanup gate**
   - šele po stabilnem obdobju + telemetry dokazih se planira odstranjevanje fallbackov.

---

## 5) Release hardening pravilo

Dokler je runtime dvojni:
- ne spreminjamo javnega response shape-a,
- ne odstranjujemo legacy fallbackov,
- vsak nov endpoint mora imeti contract test za auth + envelope + compatibility.
