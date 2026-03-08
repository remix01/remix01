# Guardrails Quick Reference

## 30-Second Overview

The guardrails system validates every tool call before execution:

1. **Permissions** (403) — User allowed to use this tool?
2. **Schema** (400) — Valid request format?
3. **Injection** (400) — Malicious patterns detected?
4. **Amount** (400) — Valid financial amounts?
5. **Rate** (429) — Within quota?

If any fail, the request is rejected immediately.

## Usage in API Route

```typescript
import { runGuardrails } from '@/lib/agent/guardrails'

export async function POST(request: NextRequest) {
  const session = await getSession()
  const { toolName, params } = await request.json()

  try {
    await runGuardrails(toolName, params, session)
  } catch (error: any) {
    return NextResponse.json({ error: error.error }, { status: error.code })
  }

  // Safe to proceed
  const result = await executeTool(toolName, params, session)
  return NextResponse.json(result)
}
```

## Register New Tool

1. **Add schema** in `lib/agent/guardrails/schemaGuard.ts`:
```typescript
toolSchemas.myNewTool = z.object({
  field: z.string().min(3),
  amount: z.number().positive().optional(),
})
```

2. **Add permissions** in `lib/agent/permissions/index.ts`:
```typescript
{
  name: 'myNewTool',
  requiredRole: 'user', // or 'partner', 'admin'
  requiresOwnership: false,
}
```

3. **Done!** Tool is now gated by all guards.

## Error Responses

| Code | Scenario | Retry? |
|------|----------|--------|
| 400 | Schema/Injection/Amount invalid | No |
| 403 | Permission denied | No |
| 429 | Rate limit exceeded | Yes (wait time provided) |

## Files

- `lib/agent/guardrails/index.ts` — Orchestrator
- `lib/agent/guardrails/schemaGuard.ts` — Zod validation
- `lib/agent/guardrails/injectionGuard.ts` — Pattern detection
- `lib/agent/guardrails/amountGuard.ts` — Financial validation
- `lib/agent/guardrails/rateGuard.ts` — Rate limiting (Redis-backed)
- `lib/agent/permissions/index.ts` — Role & ownership checks

## Common Issues

**Tool not found?**
→ Add to `schemaGuard.ts` and `permissions/index.ts`

**Rate limited immediately?**
→ Increase `RATE_LIMIT_MAX_CALLS` in `rateGuard.ts`

**Injection false positive?**
→ Update patterns in `injectionGuard.ts`

**Redis not working?**
→ Set `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars
