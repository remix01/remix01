# State Machine Guard Layer - Implementation Complete

## ✅ What Was Built

A **State Machine Guard** layer that enforces valid state transitions for escrow, inquiry, and offer entities. No transition is allowed unless explicitly defined. Terminal states (released, refunded, completed, closed) NEVER allow further transitions.

## 📁 Files Created

### Core Implementation
- **`/lib/agent/state-machine/index.ts`** - Main entry point with `assertTransition(resource, id, targetStatus)` function
- **`/lib/agent/state-machine/escrowMachine.ts`** - Escrow state machine with transitions and validation
- **`/lib/agent/state-machine/inquiryMachine.ts`** - Inquiry state machine with transitions and validation  
- **`/lib/agent/state-machine/offerMachine.ts`** - Offer state machine with transitions and validation

### Documentation
- **`/lib/agent/state-machine/README.md`** - Complete overview and architecture
- **`/lib/agent/state-machine/INTEGRATION_GUIDE.md`** - How to integrate into API routes
- **`/lib/agent/state-machine/EXAMPLES.md`** - Real-world example implementations

### Backward Compatibility
- **`/lib/state-machine/index.ts`** - Re-exports from new location (deprecated but functional)
- **`/lib/state-machine/escrowMachine.ts`** - Re-exports from new location
- **`/lib/state-machine/inquiryMachine.ts`** - Re-exports from new location
- **`/lib/state-machine/offerMachine.ts`** - Re-exports from new location

## 🔄 State Transition Rules

### Escrow
```
pending   → [paid, cancelled]
paid      → [released, refunded, disputed]
disputed  → [released, refunded]
released  → [] TERMINAL
refunded  → [] TERMINAL
cancelled → [] TERMINAL
```

### Inquiry
```
pending        → [offer_received, closed]
offer_received → [accepted, pending]
accepted       → [completed, closed]
completed      → [] TERMINAL
closed         → [] TERMINAL
```

### Offer
```
poslana   → [sprejeta, zavrnjena]
sprejeta  → [] TERMINAL
zavrnjena → [] TERMINAL
```

## 🛡️ Key Features

✅ **No Implicit Transitions** - Only explicitly allowed transitions work  
✅ **Terminal State Protection** - Terminal states cannot transition (hard reject with 409 Conflict)  
✅ **Audit Logging** - Every rejected transition logged to audit table  
✅ **Fast Failure** - Invalid transitions fail before any DB writes  
✅ **Transactional Support** - Can run inside DB transactions  
✅ **Backward Compatible** - Old import paths still work  
✅ **No UI Changes** - Purely a backend validation layer  

## 🔧 Usage Example

```typescript
import { assertTransition } from '@/lib/agent/state-machine'

export async function POST(request: NextRequest) {
  const { escrowId, targetStatus } = await request.json()

  try {
    // Validate transition BEFORE DB update
    await assertTransition('escrow', escrowId, targetStatus)

    // Safe to update now
    const { data } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: targetStatus })
      .eq('id', escrowId)

    return success(data)
  } catch (err: any) {
    if (err.code === 409) {
      return conflict(err.error) // Invalid transition
    }
    throw err
  }
}
```

## 📊 Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Unknown resource type |
| 404 | Not Found | Escrow ID doesn't exist |
| 409 | Conflict | Invalid transition or terminal state |
| 500 | Server Error | Database error |

## 🔍 Integration Points

The state machine guard runs in this order:

1. Session/Auth check
2. Permission Layer (role + ownership)
3. Input Validation
4. **← State Machine Guard** (NEW)
5. Database Transaction
6. Async Jobs (Stripe, emails, etc.)

## 📝 Layer Position

The guard runs **AFTER Permission Layer** but **BEFORE DB writes**, ensuring:
- Only authorized users reach the state check
- User input is validated before state check
- Database is only modified if state is valid

## 🧪 Testing

All rejected transitions logged to `escrow_audit_log`:

```sql
SELECT * FROM escrow_audit_log
WHERE event_type = 'transition_rejected'
ORDER BY created_at DESC
```

## 🚀 Next Steps

To integrate into existing API routes:

1. Import: `import { assertTransition } from '@/lib/agent/state-machine'`
2. Add validation: `await assertTransition('escrow', id, newStatus)` before DB update
3. Handle conflicts: Check for `code === 409` errors
4. Test: Verify terminal states cannot transition further
5. Audit: Review rejected transitions in audit logs

See `INTEGRATION_GUIDE.md` and `EXAMPLES.md` for detailed implementation patterns.

## ✨ Benefits

- **Prevents Invalid State Flows** - No escrow can transition from 'released' to 'refunded'
- **Audit Trail** - Every attempted invalid transition is logged
- **Consistent Behavior** - All state transitions use same validation
- **Easy Maintenance** - Transition rules in one place, easy to modify
- **Future-Proof** - Easy to add new entities and transitions

---

**Status**: ✅ Complete  
**No Breaking Changes**: ✅ Backward compatible  
**Audit Integration**: ✅ Full support  
**Terminal State Protection**: ✅ Hard reject enabled  
**UI/Layout Impact**: ✅ None - pure validation layer
