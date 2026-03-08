# Permission Layer - Complete Implementation

## Overview

The Permission Layer enforces role-based and ownership-based access control for every agent tool call. It runs **after Guardrails** and **before the Backend API**, providing a unified defense against unauthorized access.

## Architecture

```
Request
  ↓
[Auth Check] — Is user authenticated?
  ↓
[Guardrails Orchestrator]
  ├─ 1. PERMISSION CHECK (NEW - integrated into guardrails)
  │    ├─ Role-based check: user role >= required role
  │    └─ Ownership check: user owns the resource
  ├─ 2. Schema Guard: Validate request structure
  ├─ 3. Injection Guard: Prevent malicious payloads
  ├─ 4. Amount Guard: Validate financial amounts
  └─ 5. Rate Limit Guard: Prevent abuse
  ↓
[Tool Execution]
  ↓
Response (success or 403 Forbidden)
```

## Components

### 1. Role Hierarchy (`lib/agent/permissions/roles.ts`)

Roles are organized in a strict hierarchy:

```
guest (0) → user (1) → partner (2) → admin (3) → system (4)
```

**Key Rules:**
- A user with role `X` can access resources requiring role `Y` if `X >= Y`
- Example: `partner` (2) can access `user` (1) resources, but not `admin` (3)
- `system` role is INTERNAL ONLY — never assigned from user sessions
- `admin` automatically passes all ownership checks

**Functions:**

```typescript
// Check if user role meets requirement
canAccess(userRole: 'guest' | 'user' | 'partner' | 'admin' | 'system', 
          requiredRole: Role): boolean

// Get display name
getRoleDisplayName(role: Role): string
```

### 2. Ownership Verification (`lib/agent/permissions/ownership.ts`)

Ensures users can only access their own resources. Admins bypass all ownership checks.

**Supported Resources:**
- `inquiry` — Matched by user email
- `offer` — Matched by partner_id (creator)
- `escrow` — Matched by partner_id OR customer_email

**Database Queries:**

```sql
-- inquiries: Match by customer email
SELECT email FROM inquiries WHERE id = ?

-- offers: Match by partner_id
SELECT partner_id FROM offers WHERE id = ?

-- escrow_transactions: Match by partner or customer
SELECT partner_id, customer_email FROM escrow_transactions WHERE id = ?
```

**Function:**

```typescript
async function assertOwnership(
  resource: 'inquiry' | 'offer' | 'escrow',
  id: string,
  userId: string,
  userRole: Role
): Promise<void>
// Throws OwnershipError if user doesn't own resource and isn't admin
```

### 3. Main Permission Checker (`lib/agent/permissions/index.ts`)

Orchestrates all permission checks for a tool call.

**Tool Registry:**

```typescript
const toolRegistry = {
  'escrow.create': {
    requiredRole: 'user',
  },
  'escrow.release': {
    requiredRole: 'partner',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
  'inquiry.create': {
    requiredRole: 'guest',  // Anyone can create inquiries
  },
  'offer.accept': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }],
  },
  // ... more tools
}
```

**Main Function:**

```typescript
async function checkPermission(
  toolName: string,
  params: Record<string, any>,
  session: Session
): Promise<PermissionCheckResult>

// Returns:
// { allowed: true } on success
// { allowed: false, error: 'Forbidden', code: 403 } on failure
```

## Integration with Guardrails

The Permission Layer is now integrated into the main Guardrails Orchestrator:

```typescript
// lib/agent/guardrails/index.ts

export async function runGuardrails(
  toolName: string,
  params: unknown,
  session: Session
): Promise<void> {
  // 1. PERMISSIONS FIRST
  const permissionResult = await checkPermission(toolName, params, session)
  if (!permissionResult.allowed) {
    throw {
      success: false,
      error: 'Forbidden',
      code: 403,
    }
  }

  // 2. Schema validation
  // 3. Injection detection
  // 4. Amount validation
  // 5. Rate limiting
}
```

## Usage in API Routes

### Before (Manual Permission Checks)

```typescript
// app/api/agent/match/route.ts
export async function POST(request: NextRequest) {
  // Manual role check
  if (!profile || profile.role !== 'narocnik') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Manual ownership check
  if (povprasevanje.narocnik_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ... proceed
}
```

### After (Using Guardrails)

```typescript
// app/api/agent/match/route.ts
import { runGuardrails } from '@/lib/agent/guardrails'
import type { Role } from '@/lib/agent/permissions'

export async function POST(request: NextRequest) {
  const session = {
    user: {
      id: user.id,
      email: user.email,
      role: (profile.role === 'narocnik' ? 'user' : 'partner') as Role,
    },
  }

  try {
    // Single call handles ALL guards: permissions, schema, injection, amounts, rate limit
    await runGuardrails('agent.match', { povprasevanjeId }, session)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: error.code || 403 }
    )
  }

  // ... proceed safely
}
```

## Security Properties

### 1. Default Deny

Permission layer uses an allow-list approach:
- Every tool must be explicitly registered in `toolRegistry`
- Unknown tools are automatically rejected with 403
- Resources not in ownership checks are allowed for all users

### 2. Admin Bypass

Admins have special privileges:
- Always pass role checks (role hierarchy level 3)
- Always pass ownership checks (return immediately)
- Never blocked by permission layer
- BUT: Still subject to schema, injection, amount, and rate limit guards

### 3. Never Expose Real Reason

Always return generic "Forbidden" message:
- ❌ "You don't own this resource"
- ❌ "Your role is too low"
- ✅ "Forbidden"

This prevents attackers from discovering valid resource IDs or role requirements.

### 4. Immutable Ownership

Ownership is determined by database state at check time:
- User email from auth matches inquiry email ✓
- Partner ID matches offer creator ✓
- Partner ID or email matches escrow participant ✓
- Admin always passes ✓

### 5. Fail-Safe Design

On any error:
- If database is unreachable → return 403
- If role lookup fails → return 403
- If session is missing → return 401 (handled by auth layer first)
- Never proceed on error — always err on side of caution

## Session Format

```typescript
interface Session {
  user: {
    id: string           // From auth
    email?: string       // From auth
    role: Role          // 'guest' | 'user' | 'partner' | 'admin' | 'system'
  }
}
```

Role mapping from database profile:

```typescript
const roleMap = {
  'narocnik': 'user',     // Customers are 'user' role
  'obrtnik': 'partner',   // Craftworkers are 'partner' role
}
// Plus admin/system roles assigned by admin operations
```

## Configuration

### Adding a New Tool

To register a new tool in the permission system:

```typescript
// lib/agent/permissions/index.ts

export const toolRegistry = {
  // ... existing tools

  'newTool.action': {
    requiredRole: 'user',  // Minimum role required
    ownershipChecks: [
      { resource: 'inquiry', paramKey: 'inquiryId' },
      { resource: 'offer', paramKey: 'offerId' },
    ],
  },
}
```

### Changing Role Requirements

Edit the role hierarchy in `roles.ts`:

```typescript
export const roleHierarchy: Record<Role, number> = {
  guest: 0,
  user: 1,
  partner: 2,
  admin: 3,
  system: 4,
}
```

⚠️ **Warning**: Changing hierarchy requires careful migration planning. Admins have level 3, so adding new levels should go above or below existing roles.

## Audit & Logging

Permission checks include logging:

```typescript
// On permission granted
[PERMISSION] ✓ Tool: escrow.release | User: user-123 | Role: partner

// On permission denied
[PERMISSION] ✗ Tool: admin.suspend | User: user-456 | Reason: role (need admin, have user)
[PERMISSION] ✗ Tool: offer.accept | User: user-789 | Reason: ownership (not offer creator)
```

Enable logging by setting environment variable:

```bash
PERMISSION_DEBUG=true
```

## Testing

### Unit Tests

Test individual permission functions:

```typescript
// Test role hierarchy
expect(canAccess('partner', 'user')).toBe(true)   // partner >= user
expect(canAccess('user', 'partner')).toBe(false)  // user < partner

// Test ownership
await expect(
  assertOwnership('offer', 'offer-123', 'user-999', 'user')
).rejects.toThrow(OwnershipError)
```

### Integration Tests

Test full tool flow:

```typescript
const session = { user: { id: 'user-1', role: 'user' } }
const result = await checkPermission('offer.accept', { offerId: 'offer-1' }, session)
expect(result.allowed).toBe(false)  // User didn't create offer
```

## Troubleshooting

### User Getting "Forbidden" Error

**Possible Causes:**
1. Role too low for tool — check `toolRegistry[toolName].requiredRole`
2. Doesn't own resource — check database for ownership
3. Wrong session role mapping — verify `roleMap` conversion
4. Tool not registered — check if tool name in `toolRegistry`

**Debug Steps:**

```typescript
// Enable permission debugging
process.env.PERMISSION_DEBUG = 'true'

// Check session role
console.log('[DEBUG] Session role:', session.user.role)

// Check tool registry
console.log('[DEBUG] Tool config:', toolRegistry['tool.name'])

// Check resource ownership
const { data } = await supabaseAdmin
  .from('offers')
  .select('partner_id')
  .eq('id', 'offer-id')
```

### Ownership Check Always Fails

**Common Issues:**
1. Email mismatch — inquiry email doesn't match auth email
2. ID mismatch — partner_id in offer doesn't match session user ID
3. Admin check broken — verify role is actually 'admin'

**Fix:**

```typescript
// Check if emails match
const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
const { data: inquiry } = await supabaseAdmin
  .from('inquiries')
  .select('email')
  .eq('id', inquiryId)

console.log('[DEBUG] Auth email:', authUser?.email)
console.log('[DEBUG] Inquiry email:', inquiry?.email)
console.log('[DEBUG] Match:', authUser?.email === inquiry?.email)
```

## Performance Characteristics

- **Role Check:** ~0.1ms (in-memory hierarchy lookup)
- **Ownership Check:** ~10-50ms (single database query)
- **Full Permission Check:** ~10-50ms total
- **Overhead:** <1% of total request time (typically 200-500ms)

## Migration Checklist

- [ ] Verify Permission Layer components exist:
  - [ ] `/lib/agent/permissions/roles.ts`
  - [ ] `/lib/agent/permissions/ownership.ts`
  - [ ] `/lib/agent/permissions/index.ts`
- [ ] Update Guardrails to call `checkPermission()` first
- [ ] Update API routes to use `runGuardrails()` instead of manual checks
- [ ] Test role hierarchy works correctly
- [ ] Test ownership verification for all resource types
- [ ] Test that admins bypass ownership checks
- [ ] Enable permission logging in production
- [ ] Monitor 403 error rates for anomalies

## References

- **Files:** `/lib/agent/permissions/*`
- **Integration:** `/lib/agent/guardrails/index.ts`
- **Usage:** `/app/api/agent/match/route.ts`
- **Types:** Imported from `/lib/agent/permissions`
