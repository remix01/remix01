# Permission Layer - Quick Reference

## TL;DR

Permission Layer is integrated into Guardrails and enforces:
1. **Role-based access** — user role must meet minimum requirement
2. **Ownership verification** — user must own the resource
3. **Admin bypass** — admins always pass (except schema/injection/amount/rate checks)

## Quick Integration

### Update Your API Route

```typescript
import { runGuardrails } from '@/lib/agent/guardrails'
import type { Role } from '@/lib/agent/permissions'

export async function POST(request: NextRequest) {
  // Build session with role
  const session = {
    user: {
      id: user.id,
      email: user.email,
      role: (profile.role === 'narocnik' ? 'user' : 'partner') as Role,
    },
  }

  // Run guardrails (handles permissions + all other guards)
  try {
    await runGuardrails('tool.name', { resourceId }, session)
  } catch (error: any) {
    return NextResponse.json({ error: 'Forbidden' }, { status: error.code || 403 })
  }

  // Proceed safely
  return NextResponse.json({ success: true })
}
```

## Register a New Tool

Edit `/lib/agent/permissions/index.ts`:

```typescript
export const toolRegistry = {
  'newTool.action': {
    requiredRole: 'user',  // 'guest' | 'user' | 'partner' | 'admin'
    ownershipChecks: [
      { resource: 'inquiry', paramKey: 'inquiryId' },
    ],
  },
}
```

## Role Hierarchy

```
guest (0) < user (1) < partner (2) < admin (3) < system (4)
```

User role can access resources requiring lower roles.

**Mapping:**
- `narocnik` → `user`
- `obrtnik` → `partner`
- `admin_users` → `admin`
- Internal only → `system`

## Test Permission Check

```typescript
import { checkPermission } from '@/lib/agent/permissions'

const result = await checkPermission(
  'offer.accept',
  { offerId: 'offer-123' },
  { user: { id: 'user-1', role: 'user' } }
)

if (!result.allowed) {
  console.log('Permission denied:', result.error)
}
```

## Common Issues & Fixes

### "Forbidden" Error on Valid Request

1. Check tool is registered in `toolRegistry`
2. Verify session role is correct:
   ```typescript
   console.log('User role:', session.user.role)
   console.log('Tool requires:', toolRegistry['tool.name'].requiredRole)
   ```
3. Verify ownership in database:
   ```sql
   SELECT creator_id FROM offers WHERE id = ?
   ```

### Admin Not Bypassing Ownership

This is expected! Admins bypass ownership checks but NOT:
- Schema validation
- Injection detection
- Amount validation
- Rate limiting

Permission layer never blocks admins for permissions.

### Permission Debug Logging

Enable in your route:

```typescript
process.env.PERMISSION_DEBUG = 'true'
```

## Files

- **Roles:** `/lib/agent/permissions/roles.ts`
- **Ownership:** `/lib/agent/permissions/ownership.ts`
- **Main:** `/lib/agent/permissions/index.ts`
- **Guardrails:** `/lib/agent/guardrails/index.ts`
- **Example:** `/app/api/agent/match/route.ts`

## API Response Codes

- **200** — Permission granted, tool executed successfully
- **400** — Schema validation failed
- **401** — Not authenticated (before permission layer)
- **403** — Permission denied (role/ownership check failed)
- **429** — Rate limited
- **500** — Server error

All permission failures return **403** with generic "Forbidden" message.
