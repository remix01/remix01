# State Machine Guard - Complete Documentation Index

## 📚 Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| **README.md** | Overview & architecture | Everyone |
| **INTEGRATION_GUIDE.md** | How to add to API routes | Developers |
| **EXAMPLES.md** | Real-world code examples | Developers |
| **ARCHITECTURE.md** | Flow diagrams & visual design | Architects |
| **state-machine.test.ts** | Test suite & examples | QA/Testing |

---

## 🚀 Getting Started (5 minutes)

1. **Read**: `README.md` - Understand what this is
2. **Scan**: `ARCHITECTURE.md` - See the flow diagrams
3. **Search**: `EXAMPLES.md` - Find a similar example to your use case
4. **Integrate**: `INTEGRATION_GUIDE.md` - Add to your API route

---

## 🎯 For Different Roles

### Developers Integrating the Guard

Start here:
1. `README.md` - Understand the state transitions
2. `INTEGRATION_GUIDE.md` - Step-by-step integration
3. `EXAMPLES.md` - Copy a pattern that matches your use case

### QA/Testing

Start here:
1. `state-machine.test.ts` - See test patterns
2. `README.md` - Understand what to test
3. Run tests: `npm test lib/agent/state-machine/`

### Architects/Tech Leads

Start here:
1. `README.md` - See the design decisions
2. `ARCHITECTURE.md` - Understand the system flow
3. `INTEGRATION_GUIDE.md` - See how it integrates with existing layers

### DevOps/Operations

Focus on:
1. Audit logging queries in `README.md`
2. Error codes in `INTEGRATION_GUIDE.md`
3. Monitoring rejected transitions

---

## 📁 File Descriptions

### Core Implementation

**index.ts** (39 lines)
- Main entry point: `assertTransition(resource, id, targetStatus)`
- Routes to correct machine based on resource type
- Exports all sub-functions

**escrowMachine.ts** (113 lines)
- Escrow state transition rules
- Terminal states: released, refunded, cancelled
- Audit logging for rejected transitions

**inquiryMachine.ts** (118 lines)
- Inquiry state transition rules
- Terminal states: completed, closed
- Audit logging for rejected transitions

**offerMachine.ts** (114 lines)
- Offer (ponudbe) state transition rules
- Terminal states: sprejeta, zavrnjena
- Audit logging for rejected transitions

### Documentation

**README.md** (232 lines)
- Complete architecture overview
- All state transition diagrams
- Integration patterns
- Testing examples
- Modification guide
- Backward compatibility notes

**INTEGRATION_GUIDE.md** (293 lines)
- Basic usage pattern
- Resource types and transitions
- Error handling
- Transactional patterns
- Permission + state machine layer flow
- Migration checklist
- Testing patterns
- Backward compatibility

**EXAMPLES.md** (365 lines)
- Example 1: Escrow Release Route
- Example 2: Escrow Dispute Route
- Example 3: Inquiry Accept Offer Route
- Example 4: Admin Resolve Dispute Route
- Example 5: Complete Inquiry Route
- Common patterns and best practices

**ARCHITECTURE.md** (344 lines)
- System architecture diagram
- State machine validation flow
- Escrow state machine visual
- Inquiry state machine visual
- Offer state machine visual
- Error handling flow
- Audit logging flow
- API route integration flow
- Directory structure
- Summary

**state-machine.test.ts** (472 lines)
- Escrow State Machine test suite
  - Valid transitions (4 tests)
  - Invalid transitions (3 tests)
  - Terminal state protection (3 tests)
  - Audit logging (2 tests)
  - Error handling (2 tests)
- Inquiry State Machine test suite (5 tests)
- Offer State Machine test suite (3 tests)
- Integration tests (1 test)

---

## 🔄 State Transition Reference

### Escrow Transitions (Quick Reference)

```
pending   → paid, cancelled
paid      → released, refunded, disputed
disputed  → released, refunded
released  → TERMINAL
refunded  → TERMINAL
cancelled → TERMINAL
```

### Inquiry Transitions (Quick Reference)

```
pending        → offer_received, closed
offer_received → accepted, pending
accepted       → completed, closed
completed      → TERMINAL
closed         → TERMINAL
```

### Offer Transitions (Quick Reference)

```
poslana   → sprejeta, zavrnjena
sprejeta  → TERMINAL
zavrnjena → TERMINAL
```

---

## 🔧 Common Tasks

### Add a new state transition

1. Open the relevant machine file (e.g., `escrowMachine.ts`)
2. Find the `*Transitions` object
3. Add the transition to the allowed array:
   ```typescript
   const escrowTransitions = {
     pending: ['paid', 'cancelled', 'NEW_STATE'], // ← Add here
   }
   ```
4. Run tests to verify

### Debug a rejected transition

1. Query the audit log:
   ```sql
   SELECT * FROM escrow_audit_log
   WHERE event_type = 'transition_rejected'
   ORDER BY created_at DESC
   LIMIT 10
   ```
2. Check the `status_before`, `status_after`, and `metadata.reason`
3. Verify the transition is defined in the machine

### Integrate into a new API route

1. Copy code from `EXAMPLES.md`
2. Add: `import { assertTransition } from '@/lib/agent/state-machine'`
3. Add: `await assertTransition('resource', id, targetStatus)` before DB update
4. Add error handling for `code === 409`

### Write tests for a new route

1. Copy test patterns from `state-machine.test.ts`
2. Create valid transition test
3. Create invalid transition test
4. Create terminal state test
5. Verify audit logs are created

---

## 📊 Error Codes Quick Reference

| Code | Meaning | Cause | Fix |
|------|---------|-------|-----|
| 400 | Bad Request | Unknown resource type | Check resource name spelling |
| 404 | Not Found | Resource doesn't exist | Verify resource ID exists in DB |
| 409 | Conflict | Invalid transition or terminal | Check state machine rules |
| 500 | Server Error | Database error | Check DB connection |

---

## ✅ Implementation Checklist

- [ ] Read README.md
- [ ] Understand state transitions
- [ ] Review ARCHITECTURE.md diagrams
- [ ] Find similar example in EXAMPLES.md
- [ ] Import assertTransition in your route
- [ ] Add state machine validation before DB update
- [ ] Handle 409 Conflict errors
- [ ] Write/run tests
- [ ] Check audit logs for rejected transitions
- [ ] Deploy and monitor

---

## 🆘 Troubleshooting

**Q: Transition is rejected but it should be allowed**
- A: Check state-machine files for the allowed transitions
- Verify current state in database
- Query audit log to see the rejection reason

**Q: Terminal states are being modified**
- A: The guard should have caught this
- Check if assertTransition is being called
- Query audit log to see if rejection was logged

**Q: No audit logs are being created**
- A: Audit logging is best-effort (won't block main flow)
- Check database table exists: escrow_audit_log
- Check table has columns: event_type, transaction_id, metadata, etc.

**Q: Old imports still work but I want to use new path**
- A: Both paths work due to backward compatibility shims
- Use new path: `@/lib/agent/state-machine`
- Old path still functional: `@/lib/state-machine`

---

## 📞 Support

### For Integration Questions
See: **INTEGRATION_GUIDE.md**

### For Code Examples
See: **EXAMPLES.md**

### For Architecture Questions
See: **ARCHITECTURE.md**

### For Testing Questions
See: **state-machine.test.ts**

### For State Transition Questions
See: **README.md** - Detailed transition rules

---

## 🔗 Related Files in Codebase

- `/lib/audit.ts` - Audit logging utilities
- `/lib/escrow.ts` - Escrow business logic
- `/lib/agent/permissions/` - Permission layer
- `/lib/agent/guardrails/` - Input validation layer
- `/app/api/escrow/` - API routes using state machine
- `/lib/jobs/INTEGRATION_GUIDE.md` - Job queue integration

---

## 📈 Metrics to Monitor

In production, track:
- **Rejected transitions**: `event_type = 'transition_rejected'` count
- **Terminal state violations**: `metadata.reason = 'TERMINAL_STATE'`
- **Invalid transitions**: `metadata.reason = 'INVALID_TRANSITION'`
- **Error rate**: Count of 409 responses
- **Response time**: State check latency (should be <10ms)

---

## 🎓 Learning Path

**Beginner** (30 minutes)
1. README.md (overview)
2. ARCHITECTURE.md (diagrams)
3. One example from EXAMPLES.md

**Intermediate** (1 hour)
1. All of above
2. Full INTEGRATION_GUIDE.md
3. Run through EXAMPLES.md

**Advanced** (2 hours)
1. All of above
2. state-machine.test.ts (write your own tests)
3. Modify state transitions
4. Integrate into your routes

---

## ✨ Key Takeaways

1. **State machine runs AFTER permissions, BEFORE DB**
2. **Terminal states NEVER transition further**
3. **Every invalid transition is logged**
4. **Returns 409 Conflict for invalid transitions**
5. **No implicit transitions - only explicit ones allowed**
6. **Backward compatible - old imports still work**
7. **No UI/routing changes - pure validation layer**

---

Last Updated: 2024-01-15
Status: ✅ Complete and Production Ready
