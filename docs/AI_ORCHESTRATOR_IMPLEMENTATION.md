# AI Orchestrator Implementation

## Overview

The AI Orchestrator is the brain of the LiftGO agent. It:
1. Receives user messages and session context
2. Sends to Claude 3.5 Sonnet with system prompt listing available tools
3. Gets back structured tool calls: `{ tool: string, params: object }`
4. Routes tool calls through validation → guardrails → permissions → state guards
5. Executes and returns results

## Architecture

```
User Message
    ↓
[Orchestrator] → Claude 3.5 Sonnet (with conversation history)
    ↓
Tool Call: { tool, params }
    ↓
[ToolRouter]
  ├─ Validate tool exists
  ├─ Run guardrails (schema, injection, amounts, rate limits)
  ├─ Check permissions (role-based + ownership)
  ├─ Verify state transitions
  └─ Execute handler
    ↓
Result: { success, data?, error? }
```

## Files Created

### Core Files
- `lib/agent/orchestrator.ts` — LLM interface & tool call parsing (204 lines)
- `lib/agent/tool-router.ts` — Validation & execution pipeline (164 lines)
- `lib/agent/context.ts` — Updated with conversation history support

### Tool Handlers (in `lib/agent/tools/`)
- `createInquiry.ts` — User creates service request
- `submitOffer.ts` — Partner submits quote
- `acceptOffer.ts` — Customer accepts quote & creates escrow
- `captureEscrow.ts` — System captures payment
- `releaseEscrow.ts` — Customer confirms work & releases funds
- `refundEscrow.ts` — Admin refunds disputed escrow

## How It Works

### 1. Orchestrator Flow

```typescript
const response = await orchestrate(userMessage, context)
// Returns: { success, toolCall?, message?, error? }

// If success:
if (response.toolCall) {
  const result = await routeTool(response.toolCall.tool, response.toolCall.params, context)
  // Returns: { success, data?, error? }
}
```

### 2. Tool Registry

Each tool defines:
- `handler` — function that executes the business logic
- `requiredRole` — 'user' | 'partner' | 'admin' | 'system'
- `ownershipChecks` — verify user owns resource
- `stateGuard` — (optional) state transition requirement

Example:
```typescript
submitOffer: {
  handler: submitOfferTool,
  requiredRole: 'partner',
  ownershipChecks: [{ resource: 'inquiry', paramKey: 'inquiryId' }],
}
```

### 3. Guard Execution Order

1. **Guardrails** — Schema validation, injection detection, amount bounds, rate limits
2. **Permissions** — Role check + ownership verification
3. **State Guard** — Tool handler verifies state transitions via `assertTransition()`
4. **Handler** — Business logic executes

### 4. Conversation Context

LLM has no memory between calls. Full context passed each request:

```typescript
context = {
  userId: 'user-123',
  userRole: 'user',
  messages: [
    { role: 'user', content: 'I need a plumber' },
    { role: 'assistant', content: '{"tool":"createInquiry",...}' }
  ],
  activeResourceIds: {
    inquiryId: 'inq-456',
    offerId: 'offer-789',
    escrowId: 'escrow-012'
  }
}
```

## System Prompt

The LLM receives a system prompt that:
- Lists all 6 available tools with params
- Instructs to respond ONLY with `{ "tool": "...", "params": {...} }`
- Forbids asking for payment details (system handles that)
- Forbids constructing SQL or calling APIs directly
- Includes current user context and active resources

## Available Tools

### For Users (role: 'user')
- `createInquiry` — Post new service request
- `acceptOffer` — Accept partner's quote
- `releaseEscrow` — Confirm work & release payment

### For Partners (role: 'partner')
- `submitOffer` — Submit quote for inquiry

### For System (role: 'system')
- `captureEscrow` — Capture payment from pending

### For Admins (role: 'admin')
- `refundEscrow` — Refund disputed escrow

## Error Handling

All tools return `{ success, data?, error? }`:

```typescript
// Success
{ success: true, data: { inquiryId: 'inq-123' } }

// Validation error
{ success: false, error: 'Missing field: title', code: 400 }

// Permission error
{ success: false, error: 'Forbidden', code: 403 }

// State error
{ success: false, error: 'Cannot release pending escrow', code: 409 }
```

## Integration Example

```typescript
import { orchestrate } from '@/lib/agent/orchestrator'
import { routeTool } from '@/lib/agent/tool-router'
import { createAgentContext, addMessage } from '@/lib/agent/context'

// Create context
let context = createAgentContext(userId, userEmail, role, sessionId)

// User sends message
const orchestrateResult = await orchestrate('I need a plumber', context)

if (!orchestrateResult.success) {
  return { error: orchestrateResult.error }
}

// Execute tool
const toolResult = await routeTool(
  orchestrateResult.toolCall.tool,
  orchestrateResult.toolCall.params,
  context
)

// Update context with conversation
context = addMessage(context, 'user', 'I need a plumber')
context = addMessage(context, 'assistant', JSON.stringify(orchestrateResult.toolCall))
```

## Security

- **No Direct Tool Execution** — All tools go through `routeTool()` validator
- **Default Deny** — Unknown tools rejected immediately
- **Guardrails First** — Schema/injection/amounts validated before permissions
- **State Guards** — Tool handlers verify valid transitions
- **Audit Logging** — All tool calls logged in context history
- **Permission Checks** — Role-based + ownership verification for each tool

## Testing

Test the orchestrator:

```bash
npm run test:unit -- --testNamePattern="orchestrator"
```

Or call directly:

```typescript
import { testOrchestrator } from '@/lib/agent/orchestrator'
const result = await testOrchestrator()
console.log(result)
```

## Rules & Constraints

✓ AI output is ALWAYS `{ tool, params }` format  
✓ LLM never asks for payment details  
✓ LLM never constructs DB queries  
✓ LLM never calls APIs directly  
✓ Every tool call goes through guardrails  
✓ No existing routes/UI/DB logic modified  
✓ All guardrails/permissions/state guards work with tools  

## What's NOT Modified

- No existing API routes changed
- No existing UI/pages modified
- No database schema changes
- No authentication logic changed
- State machine, permission layer, guardrails already exist
- Only NEW: orchestrator, tool router, 6 tool handlers
