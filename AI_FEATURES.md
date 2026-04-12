# AI Features (Customer Dashboard)

## Dodano
- **AI Inquiry Wizard**: komponenta `AIConversationalForm` in endpoint `/api/ai/parse-inquiry` za pretvorbo prostega opisa v strukturirano povpraševanje.
- **AI Offer Analyzer**: endpoint `/api/ai/analyze-offers` (z Redis cache) in UI kartica za primerjavo ponudb.
- **AI Project Assistant**: plavajoči pomočnik na vseh naročniških straneh (`ProjectAssistant`) z uporabo `/api/ai/chat`.
- **AI Transparency Tracker**: komponenta časovnice `InquiryTransparencyTracker` na podrobnostih povpraševanja.
- **AI Home Advisor**: nova stran `/moj-dom`, endpoint `/api/ai/home-advisor` in tabela `home_maintenance_log`.

## Tehnični povzetek
- AI odgovori so v slovenščini.
- `analyze-offers` uporablja Redis ključ `ai:offers-analysis:{inquiryId}:{signature}`.
- Novi migration: `2026041203_customer_ai_tables.sql`.
