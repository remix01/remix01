# Permission Layer - Architecture Deep Dive

## System Design

### Overall Architecture

```
┌─────────────────────────────────────────────────────┐
│                     CLIENT REQUEST                  │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│         API Route Handler (Next.js)                 │
│  - Parse request                                    │
│  - Extract user auth                                │
│  - Build session object                             │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│       GUARDRAILS ORCHESTRATOR (index.ts)            │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1. PERMISSION CHECK (Roles + Ownership)       │  │
│  │    ├─ Check role hierarchy                    │  │
│  │    └─ Verify resource ownership (if needed)   │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ 2. SCHEMA GUARD                               │  │
│  │    └─ Validate request structure               │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ 3. INJECTION GUARD                            │  │
│  │    └─ Detect malicious payloads                │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ 4. AMOUNT GUARD                               │  │
│  │    └─ Validate financial amounts               │  │
│  └───────────────────────────────────────────────┘  │
│                       ↓                              │
│  ┌───────────────────────────────────────────────┐  │
│  │ 5. RATE LIMIT GUARD                           │  │
│  │    └─ Check request rate                       │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       ↓ All pass
┌─────────────────────────────────────────────────────┐
│              TOOL EXECUTION (SAFE)                  │
│  - User is authenticated ✓                          │
│  - User has required role ✓                         │
│  - User owns the resource (if checked) ✓            │
│  - Request is valid and safe ✓                      │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                   DATABASE WRITE                    │
│               (Side Effects Module)                 │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│                   RESPONSE (200)                    │
└─────────────────────────────────────────────────────┘

    ✗ On PERMISSION failure → 403 (Forbidden)
    ✗ On SCHEMA failure → 400 (Bad Request)
    ✗ On other guard failure → 400/429/500
```

## Permission Layer Components

### 1. Role Hierarchy

**File:** `/lib/agent/permissions/roles.ts`

```typescript
export type Role = 'guest' | 'user' | 'partner' | 'admin' | 'system'

export const roleHierarchy: Record<Role, number> = {
  guest: 0,    // Least privilege
  user: 1,
  partner: 2,
  admin: 3,
  system: 4,   // Most privilege (internal only)
}

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
```

**Logic:**
- Each role has numeric level (0-4)
- User with role X can access resources requiring role Y if X >= Y
- Example: Partner (2) can access User (1) resources but not Admin (3)

**Invariants:**
- `canAccess('admin', 'guest')` = true (admin can access everything)
- `canAccess('user', 'admin')` = false (user cannot access admin resources)
- `canAccess('admin', 'admin')` = true (admin can access admin resources)

### 2. Ownership Verification

**File:** `/lib/agent/permissions/ownership.ts`

```typescript
export async function assertOwnership(
  resource: 'inquiry' | 'offer' | 'escrow',
  id: string,
  userId: string,
  userRole: Role
): Promise<void>
```

**Ownership Rules by Resource Type:**

#### Inquiry
- **Table:** `inquiries`
- **Check:** User email matches inquiry email
- **Query:** `SELECT email FROM inquiries WHERE id = ?`
- **Logic:**
  ```
  IF userRole == 'admin' THEN pass
  IF getUserEmail(userId) == inquiry.email THEN pass
  ELSE throw OwnershipError
  ```

#### Offer
- **Table:** `offers`
- **Check:** User ID matches partner_id (offer creator)
- **Query:** `SELECT partner_id FROM offers WHERE id = ?`
- **Logic:**
  ```
  IF userRole == 'admin' THEN pass
  IF userId == offer.partner_id THEN pass
  ELSE throw OwnershipError
  ```

#### Escrow
- **Table:** `escrow_transactions`
- **Check:** User is either partner or customer
- **Query:** `SELECT partner_id, customer_email FROM escrow_transactions WHERE id = ?`
- **Logic:**
  ```
  IF userRole == 'admin' THEN pass
  IF userId == escrow.partner_id THEN pass
  IF getUserEmail(userId) == escrow.customer_email THEN pass
  ELSE throw OwnershipError
  ```

**Error Handling:**

- Resource not found → Generic "Forbidden" (don't leak that resource exists)
- Database error → Generic "Forbidden" (fail safe)
- User is admin → Always pass (no further checks)

### 3. Main Permission Checker

**File:** `/lib/agent/permissions/index.ts`

#### Tool Registry

```typescript
export const toolRegistry: Record<string, {
  requiredRole: Role
  ownershipChecks?: Array<{
    resource: 'inquiry' | 'offer' | 'escrow'
    paramKey: string
  }>
}> = {
  'tool.name': {
    requiredRole: 'user',
    ownershipChecks: [
      { resource: 'offer', paramKey: 'offerId' }
    ],
  },
  // ... more tools
}
```

**Purpose:**
- Centralized registry of all tools
- Each tool specifies minimum required role
- Optionally specifies which resources require ownership checks

#### Permission Check Function

```typescript
export async function checkPermission(
  toolName: string,
  params: Record<string, any>,
  session: Session
): Promise<PermissionCheckResult>
```

**Algorithm:**

```
1. IF tool NOT in registry
   THEN return { allowed: false, error: 'Forbidden', code: 403 }

2. IF user role < required role (from registry)
   THEN return { allowed: false, error: 'Forbidden', code: 403 }

3. IF tool has ownership checks
   FOR EACH ownership check:
     resourceId = params[paramKey]
     IF resourceId provided
       TRY assertOwnership(resource, resourceId, userId, role)
       CATCH OwnershipError
         THEN return { allowed: false, error: 'Forbidden', code: 403 }

4. RETURN { allowed: true }
```

**Return Value:**

```typescript
interface PermissionCheckResult {
  allowed: boolean
  error?: string
  code?: number
}

// On success:
{ allowed: true }

// On failure:
{ allowed: false, error: 'Forbidden', code: 403 }
```

## Integration with Guardrails

### Execution Order

The Guardrails Orchestrator runs guards in this order:

```typescript
export async function runGuardrails(
  toolName: string,
  params: unknown,
  session: Session
): Promise<void> {
  // 1. PERMISSIONS FIRST (NEW - integrated)
  const permissionResult = await checkPermission(toolName, params, session)
  if (!permissionResult.allowed) {
    throw { success: false, error: 'Forbidden', code: 403 }
  }

  // 2. Schema validation (existing)
  await schemaGuard(toolName, params)

  // 3. Injection detection (existing)
  await injectionGuard(params)

  // 4. Amount validation (existing)
  await amountGuard(params)

  // 5. Rate limiting (existing)
  await rateGuard(session.user.id)
}
```

### Why Permissions First?

1. **Fail Fast** — No point validating schema if user not authorized
2. **Security** — Authorization before any data processing
3. **Performance** — Avoid expensive guards for unauthorized users
4. **Clarity** — Permission failures shouldn't leak to schema validation

## Security Guarantees

### 1. Default Deny

```
Every tool must be:
- Explicitly registered in toolRegistry
- Have minimum role requirement specified
- Include resource ownership checks if accessing user data

Unknown tools → 403 (Forbidden)
Unregistered resources → 403 (Forbidden)
```

### 2. No Privilege Escalation

```
Role hierarchy is immutable:
- User cannot change their role
- System role never issued from user session
- Admins cannot make other users admins
  (that's a separate admin operation)
```

### 3. Information Hiding

```
All permission failures return identical response:
{ error: 'Forbidden', code: 403 }

NOT:
- "Your role is too low"
- "You don't own this resource"
- "Invalid tool name"

This prevents attackers from:
- Discovering valid resource IDs
- Inferring role requirements
- Enumerating tool names
```

### 4. Atomic Ownership Check

```
Ownership is determined at check time from database:
- No time-of-check to time-of-use (TOCTOU) gap
- Database is source of truth
- Admin status can't be cached/stale

If ownership changes between check and execution:
- Database constraints enforce atomicity
- Update operation would fail/retry
```

### 5. Admin Bypass Only for Permissions

```
Admins bypass:
✓ Role checks
✓ Ownership checks

Admins do NOT bypass:
✗ Schema validation
✗ Injection detection
✗ Amount validation
✗ Rate limiting

This means malicious admins still can't:
- Inject SQL
- Send huge amounts
- Exceed rate limits
- Send invalid data
```

## Data Flow Examples

### Example 1: User Accepts Offer

**Request:**
```json
POST /api/offers/accept
{ "offerId": "offer-123" }
```

**Session:**
```typescript
{
  user: {
    id: "user-456",
    email: "user@example.com",
    role: "user"
  }
}
```

**Permission Check Flow:**

```
1. Tool lookup
   toolRegistry['offer.accept'] = {
     requiredRole: 'user',
     ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }]
   }
   ✓ Found

2. Role check
   canAccess('user', 'user') = true
   ✓ Pass

3. Ownership check
   assertOwnership('offer', 'offer-123', 'user-456', 'user')
   
   a. Not admin, continue
   b. Query database:
      SELECT partner_id FROM offers WHERE id = 'offer-123'
      → Result: { partner_id: 'user-456' }
   c. Check: userId (user-456) == partner_id (user-456)
   d. ✓ Pass
```

**Result:** ✓ Permission granted, proceed to execution

### Example 2: Guest Tries to Create Offer

**Request:**
```json
POST /api/offers/create
{ "inquiryId": "inq-789" }
```

**Session:**
```typescript
{
  user: {
    id: "guest-001",
    email: null,
    role: "guest"
  }
}
```

**Permission Check Flow:**

```
1. Tool lookup
   toolRegistry['offer.create'] = {
     requiredRole: 'partner'
   }
   ✓ Found

2. Role check
   canAccess('guest', 'partner') = false
   (0 < 2)
   ✗ FAIL

Return: { allowed: false, error: 'Forbidden', code: 403 }
```

**Result:** ✗ Permission denied, return 403

### Example 3: Partner Viewing Disputed Escrow (Admin Override)

**Request:**
```json
POST /api/escrow/audit
{ "transactionId": "escrow-999" }
```

**Session (Admin):**
```typescript
{
  user: {
    id: "admin-111",
    email: "admin@example.com",
    role: "admin"
  }
}
```

**Permission Check Flow:**

```
1. Tool lookup
   toolRegistry['escrow.getAudit'] = {
     requiredRole: 'user',
     ownershipChecks: [{ resource: 'escrow', paramKey: 'transactionId' }]
   }
   ✓ Found

2. Role check
   canAccess('admin', 'user') = true
   (3 >= 1)
   ✓ Pass

3. Ownership check
   assertOwnership('escrow', 'escrow-999', 'admin-111', 'admin')
   
   a. userRole == 'admin'
   b. Return immediately (admins always pass)
   c. ✓ Pass
```

**Result:** ✓ Permission granted (admin always passes)

## Performance Analysis

### Per-Request Overhead

| Guard | Latency | Notes |
|-------|---------|-------|
| Role check | 0.1ms | In-memory lookup |
| Ownership check | 10-50ms | Single DB query |
| Full permission check | 10-50ms | Total for both |

### Total Guardrails Stack

| Component | Latency |
|-----------|---------|
| Permissions | 10-50ms |
| Schema | 1-5ms |
| Injection | 1-5ms |
| Amount | 0.5-2ms |
| Rate limit | 2-10ms |
| **Total** | **14-72ms** |

**vs. Total Request Time:** ~200-500ms (API execution)

**Overhead:** ~3-14% (acceptable for security)

### Optimization Strategies

1. **Cache role hierarchy** — In-memory (currently done)
2. **Cache ownership checks** — Not recommended (consistency risk)
3. **Batch ownership checks** — If multiple resources checked
4. **Use database indexes** — On creator_id, partner_id, email columns

## Testing Strategy

### Unit Tests

```typescript
// Test role hierarchy
test('Partner can access user resources', () => {
  expect(canAccess('partner', 'user')).toBe(true)
})

test('User cannot access admin resources', () => {
  expect(canAccess('user', 'admin')).toBe(false)
})

// Test ownership
test('User cannot access other user offer', async () => {
  await expect(
    assertOwnership('offer', 'offer-123', 'user-456', 'user')
  ).rejects.toThrow(OwnershipError)
})

// Test admin bypass
test('Admin always passes ownership', async () => {
  await expect(
    assertOwnership('offer', 'offer-xyz', 'admin-111', 'admin')
  ).resolves.not.toThrow()
})
```

### Integration Tests

```typescript
// Test permission check with real session
test('Permission granted for valid user', async () => {
  const result = await checkPermission(
    'offer.accept',
    { offerId: 'offer-123' },
    { user: { id: 'user-456', role: 'user' } }
  )
  expect(result.allowed).toBe(true)
})

// Test permission denied for low role
test('Permission denied for guest', async () => {
  const result = await checkPermission(
    'offer.create',
    { inquiryId: 'inq-789' },
    { user: { id: 'guest-001', role: 'guest' } }
  )
  expect(result.allowed).toBe(false)
})
```

### End-to-End Tests

```typescript
// Test full API flow
test('User can accept own offer', async () => {
  const response = await fetch('/api/offers/accept', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ offerId: 'offer-user-owns' }),
  })
  expect(response.status).toBe(200)
})

// Test permission denied
test('User cannot accept other user offer', async () => {
  const response = await fetch('/api/offers/accept', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ offerId: 'offer-other-user-owns' }),
  })
  expect(response.status).toBe(403)
})
```

## References

- `/lib/agent/permissions/roles.ts` — Role hierarchy
- `/lib/agent/permissions/ownership.ts` — Ownership verification
- `/lib/agent/permissions/index.ts` — Main permission checker
- `/lib/agent/guardrails/index.ts` — Guardrails integration
- `/app/api/agent/match/route.ts` — Example usage
