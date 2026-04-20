# LangSmith + LangChain + LangGraph Integration

This project includes a LangGraph-powered chat pipeline with optional LangSmith tracing.

## 1) Install dependencies

If your environment supports npm registry access, install:

```bash
npm install langchain @langchain/openai @langchain/langgraph zod
```

> This repository uses pnpm in normal workflows. If npm fails due workspace/link protocol, use pnpm.

## 2) Configure environment variables

Set these values in your shell or `.env.local`:

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
export LANGSMITH_API_KEY=lsv2_pt_xxx
export LANGSMITH_PROJECT="pr-your-project"
export OPENAI_API_KEY="sk-..."
```

## 3) Test integration endpoint

Endpoint:

- `POST /api/ai/langchain`
- `GET /api/ai/langchain` (health + tracing status)

Example request:

```bash
curl -X POST http://localhost:3000/api/ai/langchain \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Return one sentence about LiftGO."}'
```

## 4) LangGraph flow

Current graph topology:

- `START` → `generate_response` → `END`

`generate_response` uses `ChatOpenAI` from `@langchain/openai`, while LangSmith tracing is enabled through env propagation in `lib/ai/langsmith.ts`.

## 5) What was added

- `lib/ai/langsmith.ts`
  - Syncs LangSmith env vars into `process.env`
  - Exposes tracing status
  - Creates a `ChatOpenAI` model via `@langchain/openai`
- `lib/ai/langgraph.ts`
  - Builds and runs the LangGraph state machine
- `app/api/ai/langchain/route.ts`
  - Validates request with `zod`
  - Executes LangGraph pipeline

