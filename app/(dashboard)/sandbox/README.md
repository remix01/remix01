# LiftGO AI Sandbox Module

## Kaj je vključeno
- Stran `app/(dashboard)/sandbox/page.tsx` z modulom `SandboxModule`.
- API route za LLM chat stream: `POST /api/sandbox/chat`.
- API route za izvedbo kode v E2B sandboxu: `POST /api/sandbox/execute`.

## Okoljske spremenljivke
V LiftGO Docker okolje dodajte:

```env
E2B_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Docker / Compose opomba
Ker LiftGO že teče v Dockerju, poskrbite, da je `E2B_API_KEY` posredovan v `environment` sekcijo za Next.js servis (npr. v `docker-compose.yml` ali `docker-compose.dev.yml`).

Primer:

```yaml
environment:
  - E2B_API_KEY=${E2B_API_KEY}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

## MinIO upload
Gumb **"Shrani kodo v projekt"** je pripravljen kot ogrodje; v komponenti je komentar, kam vstavite pravo integracijo z `@aws-sdk/client-s3` in bucketom `liftgo-sandbox`.
