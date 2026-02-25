# Permission Layer - Migration Guide

## Overview

This guide walks through integrating the Permission Layer into your existing API routes. The Permission Layer was built to be integrated directly into the Guardrails system, so it's a minimal lift.

## Step 1: Identify Routes to Migrate

Routes that need permission checks:
- ✓ Any route that performs sensitive operations (create, update, delete)
- ✓ Any route that accesses user-specific resources
- ✓ Any route that calls tools (agent.match, etc.)
- ✗ Public routes (landing page, marketing, etc.)

**Common Routes to Update:**

```
/app/api/agent/match/route.ts              ✓ UPDATE
/app/api/inquiries/route.ts                ✓ UPDATE
/app/api/offers/route.ts                   ✓ UPDATE
/app/api/escrow/release/route.ts           ✓ UPDATE
/app/api/escrow/refund/route.ts            ✓ UPDATE
/app/api/admin/disputes/route.ts           ✓ UPDATE
```

## Step 2: Register Tool in toolRegistry

Edit `/lib/agent/permissions/index.ts`:

```typescript
export const toolRegistry: Record<string, {
  requiredRole: Role
  ownershipChecks?: Array<{ resource: ...; paramKey: ... }>
}> = {
  // Existing tools...

  // ADD YOUR TOOL HERE
  'toolName': {
    requiredRole: 'user',  // Minimum role required
    ownershipChecks: [     // Optional: ownership validation
      { resource: 'inquiry', paramKey: 'inquiryId' },
    ],
  },
}
```

## Step 3: Update Route Handler

### Before

```typescript
export async function POST(request: NextRequest) {
  try {
    const { inquiryId } = await request.json()

    // Manual auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Manual role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.role !== 'narocnik') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Manual ownership check
    const { data: inquiry } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', inquiryId)
      .single()
    
    if (!inquiry || inquiry.narocnik_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Business logic...
  } catch (error) {
    // ...
  }
}
```

### After

```typescript
import { runGuardrails } from '@/lib/agent/guardrails'
import type { Role } from '@/lib/agent/permissions'

export async function POST(request: NextRequest) {
  try {
    const { inquiryId } = await request.json()

    // Get auth user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build session
    const session = {
      user: {
        id: user.id,
        email: user.email,
        role: (profile.role === 'narocnik' ? 'user' : 'partner') as Role,
      },
    }

    // Single call handles: permissions, schema, injection, amounts, rate limits
    try {
      await runGuardrails('toolName', { inquiryId }, session)
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: error.code || 403 }
      )
    }

    // Business logic (now guaranteed to be authorized)...
  } catch (error) {
    // ...
  }
}
```

## Step 4: Role Mapping

Make sure you map database roles to permission roles correctly:

```typescript
// In your session building code:
const roleMap: Record<string, Role> = {
  'narocnik': 'user',
  'obrtnik': 'partner',
}

const session = {
  user: {
    id: user.id,
    email: user.email,
    role: (roleMap[profile.role] || 'guest') as Role,
  },
}
```

## Step 5: Test Permission Checks

### Test 1: Verify Role Check Works

```bash
# As guest (no role)
curl -X POST http://localhost:3000/api/inquiries \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "..."}'
# Expected: 403 Forbidden

# As user (has role)
curl -X POST http://localhost:3000/api/inquiries \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "..."}'
# Expected: 200 OK or 400 (if data invalid)
```

### Test 2: Verify Ownership Check Works

```bash
# User A trying to access User B's inquiry
curl -X POST http://localhost:3000/api/offers/accept \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offerId": "offer-from-user-b"}'
# Expected: 403 Forbidden

# User A accessing their own inquiry
curl -X POST http://localhost:3000/api/offers/accept \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offerId": "offer-from-user-a"}'
# Expected: 200 OK
```

### Test 3: Verify Admin Bypass Works

```bash
# Admin accessing another user's inquiry (should work)
curl -X POST http://localhost:3000/api/inquiries/details \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inquiryId": "inquiry-from-user"}'
# Expected: 200 OK
```

## Step 6: Deployment Checklist

Before deploying, verify:

- [ ] All sensitive routes are updated
- [ ] Tool names are registered in `toolRegistry`
- [ ] Role mapping is correct for your database
- [ ] Tests pass (role checks, ownership checks, admin bypass)
- [ ] No breaking changes to existing API response formats
- [ ] Error messages don't expose real reasons (always "Forbidden")
- [ ] Permission logging is disabled (or monitored) in production

## Step 7: Post-Deployment Monitoring

Monitor these metrics:

1. **403 Error Rate**
   - Should increase initially (if you had no permission checks before)
   - Should stabilize after users adapt
   - Alert if suddenly spikes (indicates misconfiguration or attack)

2. **Tool Call Distribution**
   ```sql
   SELECT tool_name, COUNT(*) as count
   FROM api_logs
   WHERE status_code = 403
   GROUP BY tool_name
   ORDER BY count DESC
   ```

3. **Permission Denial Reasons**
   - Most should be "role" failures
   - Some "ownership" failures are normal
   - Many "unknown tool" failures indicates bug

## Troubleshooting

### Permission Denied for Valid User

**Symptoms:** User gets 403 even though they should have access

**Check List:**
1. Is tool registered in `toolRegistry`?
2. Is role requirement correct?
3. Is role mapping correct (narocnik → user)?
4. Does user actually own the resource?

**Debug:**

```typescript
// Add debug logging
console.log('[DEBUG] User role:', session.user.role)
console.log('[DEBUG] Tool requires:', toolRegistry['toolName'].requiredRole)
console.log('[DEBUG] Ownership check:', { resourceId, userId })

// Check database
const { data } = await supabaseAdmin
  .from('inquiries')
  .select('narocnik_id')
  .eq('id', resourceId)
```

### Role Mapping Not Working

**Symptoms:** User gets 403 with message "role too low"

**Fix:**

```typescript
// Verify the role mapping
const dbRole = profile.role        // 'narocnik' or 'obrtnik'
const permRole = roleMap[dbRole]   // 'user' or 'partner'

console.log('[DEBUG] DB role:', dbRole)
console.log('[DEBUG] Permission role:', permRole)

// Add to toolRegistry debugging
console.log('[DEBUG] Tool requires:', toolRegistry['toolName'].requiredRole)
```

### Admin Not Working

**Symptoms:** Admin gets 403 on ownership check

**Note:** This is actually correct! Admins bypass permission checks but NOT other guards. Verify:

1. User actually has `admin` role in database
2. Session is built with role = 'admin'
3. Tool registry might have admin-only tools

```typescript
// Check admin status
const isAdmin = profile.role === 'admin'
console.log('[DEBUG] Is admin:', isAdmin)
```

## Rollback Plan

If issues occur, you can quickly roll back:

1. Remove `runGuardrails()` call from route
2. Add back manual permission checks temporarily
3. Revert route to previous commit
4. Debug permission layer separately

```typescript
// Temporary rollback
try {
  // await runGuardrails(...)  // DISABLED
  // Manual checks instead
  if (!profile || profile.role !== 'narocnik') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
} catch (error) {
  // ...
}
```

## Next Steps

- [ ] Complete Step 1-7 above
- [ ] Monitor permission errors for 48 hours
- [ ] Update documentation
- [ ] Train team on new permission system
- [ ] Consider adding permission middleware to all routes
