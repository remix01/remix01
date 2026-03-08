/**
 * STATE MACHINE GUARD LAYER - IMPLEMENTATION SUMMARY
 * 
 * This layer enforces valid state transitions for escrow, inquiry, and offer entities.
 * No transition is allowed unless explicitly defined. Terminal states NEVER transition further.
 */

# Directory Structure

```
/lib/agent/state-machine/
├── index.ts                  # Main entry point - assertTransition()
├── escrowMachine.ts          # Escrow transition rules and validation
├── inquiryMachine.ts         # Inquiry transition rules and validation
├── offerMachine.ts           # Offer transition rules and validation
├── INTEGRATION_GUIDE.md      # How to integrate into API routes
└── README.md                 # This file
```

# How It Works

## 1. State Transition Rules

Each entity has explicit allowed transitions. Transitions not in the list are rejected:

### Escrow Transitions
```
pending   → [paid, cancelled]
paid      → [released, refunded, disputed]
disputed  → [released, refunded]
released  → [] (TERMINAL - no transitions)
refunded  → [] (TERMINAL - no transitions)
cancelled → [] (TERMINAL - no transitions)
```

### Inquiry Transitions
```
pending        → [offer_received, closed]
offer_received → [accepted, pending]
accepted       → [completed, closed]
completed      → [] (TERMINAL - no transitions)
closed         → [] (TERMINAL - no transitions)
```

### Offer Transitions
```
poslana   → [sprejeta, zavrnjena]
sprejeta  → [] (TERMINAL - no transitions)
zavrnjena → [] (TERMINAL - no transitions)
```

## 2. Validation Flow

When `assertTransition()` is called:

1. **Fetch current state** from database
2. **Check if terminal** - Hard reject if in terminal state
3. **Check if valid** - Verify target is in allowed transitions list
4. **Log if invalid** - Write rejection to audit table
5. **Throw error** - Return 409 Conflict if invalid

## 3. Error Codes

| Code | Meaning | When |
|------|---------|------|
| 400 | Bad Request | Unknown resource type |
| 404 | Not Found | Resource ID doesn't exist |
| 409 | Conflict | Invalid transition or terminal state violation |
| 500 | Server Error | Database error during state check |

## 4. Audit Logging

Every rejected transition is logged:

```sql
-- View all rejected transitions
SELECT * FROM escrow_audit_log
WHERE event_type = 'transition_rejected'
ORDER BY created_at DESC

-- Shows why transition was rejected:
-- - reason: 'TERMINAL_STATE' (attempted from terminal)
-- - reason: 'INVALID_TRANSITION' (not allowed in this state)
```

## 5. Integration Pattern

Add state guard to API routes before DB updates:

```typescript
import { assertTransition } from '@/lib/agent/state-machine'

export async function POST(request: NextRequest) {
  const { escrowId, targetStatus } = await request.json()

  try {
    // 1. Validate transition FIRST
    await assertTransition('escrow', escrowId, targetStatus)

    // 2. If we reach here, transition is valid
    // Safe to update DB
    const { data } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: targetStatus })
      .eq('id', escrowId)

    return success(data)
  } catch (err: any) {
    if (err.code === 409) return conflict(err.error)
    if (err.code === 404) return notFound(err.error)
    return internalError()
  }
}
```

## 6. Layer Ordering

The State Machine Guard runs in this position:

```
1. Session/Auth check
2. Permission Layer (role + ownership checks)
3. Input Validation
4. State Machine Guard ← HERE
5. Database Transaction
6. Async Jobs (Stripe, emails, etc.)
```

This ensures:
- Only authorized users reach the state guard
- User input is validated before state check
- Database is only modified if state is valid

## 7. Transactional Consistency

The state guard can run inside a DB transaction:

```typescript
// Validate transition BEFORE transaction
await assertTransition('escrow', escrowId, 'released')

// Now update in transaction (safe - transition already validated)
const escrow = await db.transaction(async (trx) => {
  return await trx
    .from('escrow_transactions')
    .update({ status: 'released' })
    .eq('id', escrowId)
})

// After DB commits, enqueue async operations
await enqueue('stripeCapture', { escrowId })
```

## 8. Key Rules

✅ **Terminal states are immutable** - Once reached, no further transitions
✅ **No implicit transitions** - Only explicit transitions allowed
✅ **Audit trail** - Every rejection is logged
✅ **Fast failure** - Invalid transitions fail before DB touches
✅ **Backward compatible** - Old imports from `/lib/state-machine/` still work

## 9. Testing

Example test to verify state machine works:

```typescript
it('should reject transitions from terminal states', async () => {
  // Escrow is in 'released' state (terminal)
  await expect(
    assertTransition('escrow', releasedEscrowId, 'refunded')
  ).rejects.toMatchObject({
    code: 409,
    error: expect.stringContaining('terminal state'),
  })

  // Verify audit log was created
  const { data: logs } = await supabaseAdmin
    .from('escrow_audit_log')
    .select('*')
    .eq('event_type', 'transition_rejected')

  expect(logs.length).toBeGreaterThan(0)
})
```

## 10. Modification Guide

To add a new transition:

1. Open the relevant machine file (escrowMachine.ts, etc.)
2. Find the `*Transitions` object
3. Add the transition to the allowed list:

```typescript
const escrowTransitions: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],    // ← Add your new transition here
  // ...
}
```

4. Run tests to verify
5. No database changes needed - rules are in code

## 11. Backward Compatibility

Old imports still work:

```typescript
// Old path (deprecated but works)
import { assertTransition } from '@/lib/state-machine'

// New path (recommended)
import { assertTransition } from '@/lib/agent/state-machine'
```

Files in `/lib/state-machine/` re-export from new location.

---

**Status**: ✅ Complete  
**Files Created**: 
- `/lib/agent/state-machine/index.ts`
- `/lib/agent/state-machine/escrowMachine.ts`
- `/lib/agent/state-machine/inquiryMachine.ts`
- `/lib/agent/state-machine/offerMachine.ts`
- `/lib/agent/state-machine/INTEGRATION_GUIDE.md`

**Backward Compat**: ✅ Maintained  
**Audit Logging**: ✅ Integrated  
**Terminal States**: ✅ Hard reject enabled  
**No UI Changes**: ✅ Confirmed
