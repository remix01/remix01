# AI Orchestrator - Quick Reference

## Basic Usage

```typescript
import { orchestrate } from '@/lib/agent/orchestrator'
import { routeTool } from '@/lib/agent/tool-router'
import { createAgentContext, addMessage } from '@/lib/agent/context'

// 1. Create context for user
let context = createAgentContext(userId, email, 'user', sessionId)

// 2. Send message to orchestrator
const response = await orchestrate('I need a plumber', context)

// 3. Execute the tool (if successful)
if (response.success && response.toolCall) {
  const result = await routeTool(
    response.toolCall.tool,
    response.toolCall.params,
    context
  )
  console.log(result) // { success: true, data: {...} }
}

// 4. Update conversation history
context = addMessage(context, 'user', 'I need a plumber')
context = addMessage(context, 'assistant', JSON.stringify(response.toolCall))
```

## Available Tools

### `createInquiry`
```typescript
{
  tool: 'createInquiry',
  params: {
    title: 'Fix leaking kitchen sink',
    description: 'Water dripping from underneath...',
    categorySlug: 'plumbing',
    location: 'Ljubljana',
    urgency: 'normalno' | 'nujno',
    budget?: 100,
    maxResponses?: 5
  }
}
```

### `submitOffer`
```typescript
{
  tool: 'submitOffer',
  params: {
    inquiryId: 'inq-123',
    priceOffered: 50,
    estimatedDays: 3,
    notes?: 'Can come tomorrow'
  }
}
```

### `acceptOffer`
```typescript
{
  tool: 'acceptOffer',
  params: {
    offerId: 'offer-456'
  }
}
```

### `captureEscrow`
```typescript
{
  tool: 'captureEscrow',
  params: {
    escrowId: 'escrow-789'
  }
}
```

### `releaseEscrow`
```typescript
{
  tool: 'releaseEscrow',
  params: {
    escrowId: 'escrow-789',
    confirmationDetails?: 'Work completed satisfactorily'
  }
}
```

### `refundEscrow`
```typescript
{
  tool: 'refundEscrow',
  params: {
    escrowId: 'escrow-789',
    reason: 'Partner did not complete work'
  }
}
```

## Orchestrator Response Format

### Success with Tool Call
```typescript
{
  success: true,
  toolCall: {
    tool: 'createInquiry',
    params: { title: '...', ... }
  }
}
```

### Success with Message
```typescript
{
  success: true,
  message: 'I can help you find a plumber. Let me create that for you.'
}
```

### Error
```typescript
{
  success: false,
  error: 'Invalid API key or LLM unavailable'
}
```

## Tool Router Result Format

```typescript
// Success
{
  success: true,
  data: { inquiryId: 'inq-123', status: 'open' }
}

// Error (validation)
{
  success: false,
  error: 'Unknown tool: createOffer',
  code: 400
}

// Error (permission)
{
  success: false,
  error: 'Forbidden: only admins can refund',
  code: 403
}

// Error (state)
{
  success: false,
  error: 'Cannot release pending escrow',
  code: 409
}
```

## Context Structure

```typescript
context = {
  userId: 'user-123',
  userEmail: 'user@example.com',
  userRole: 'user', // 'user' | 'partner' | 'admin' | 'system'
  sessionId: 'sess-456',
  timestamp: new Date(),
  ipAddress: '192.168.1.1',
  
  // Conversation history (LLM sees this)
  messages: [
    { role: 'user', content: 'I need a plumber' },
    { role: 'assistant', content: '{"tool":"createInquiry",...}' }
  ],
  
  // Active resources in conversation
  activeResourceIds: {
    inquiryId: 'inq-123',
    offerId: 'offer-456',
    escrowId: 'escrow-789'
  }
}
```

## Update Active Resources

```typescript
import { updateActiveResources } from '@/lib/agent/context'

context = updateActiveResources(context, {
  inquiryId: 'inq-123',
  // If you want to clear one: offerId: undefined
})
```

## Tool Permissions by Role

| Tool | User | Partner | Admin | System |
|------|------|---------|-------|--------|
| createInquiry | ✓ | ✗ | ✓ | ✗ |
| submitOffer | ✗ | ✓ | ✓ | ✗ |
| acceptOffer | ✓ | ✗ | ✓ | ✗ |
| captureEscrow | ✗ | ✗ | ✗ | ✓ |
| releaseEscrow | ✓ | ✗ | ✓ | ✗ |
| refundEscrow | ✗ | ✗ | ✓ | ✗ |

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid request (missing field, unknown tool) |
| 403 | Permission denied (role or ownership) |
| 404 | Resource not found |
| 409 | State conflict (can't release pending escrow) |
| 429 | Rate limit exceeded |
| 500 | Server error |

## Common Issues

**Q: LLM returns free-form text instead of tool call?**
A: System prompt tells LLM to respond ONLY with JSON. If it happens, check:
- ANTHROPIC_API_KEY is set
- Model name is correct (claude-3-5-sonnet-20241022)
- System prompt is being applied

**Q: Tool execution fails with "Unknown tool"?**
A: Tool name must exactly match registry key. Check `tool-router.ts` for exact names.

**Q: "Forbidden" error on valid request?**
A: Check user role and resource ownership. Router verifies both automatically.

**Q: "Rate limit exceeded"?**
A: User hit 20 tool calls per minute limit. Wait 60 seconds or Redis may be unavailable (falls back to in-memory).

## Testing

```typescript
// Test orchestrator directly
import { testOrchestrator } from '@/lib/agent/orchestrator'
const result = await testOrchestrator()

// Test tool router with mock params
import { routeTool } from '@/lib/agent/tool-router'
const result = await routeTool('createInquiry', {
  title: 'Fix sink',
  description: 'Leaking',
  categorySlug: 'plumbing',
  location: 'Ljubljana'
}, context)
```

## Production Checklist

- [ ] ANTHROPIC_API_KEY set in environment
- [ ] KV_REST_API_URL & KV_REST_API_TOKEN set for Redis rate limiting
- [ ] Created API route that calls orchestrator (not in scope)
- [ ] Conversation history being stored/retrieved
- [ ] Error logging implemented
- [ ] LLM response time monitored
- [ ] Tool success rates tracked
- [ ] Rate limit working (test 20+ rapid calls)
