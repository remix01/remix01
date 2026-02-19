# Admin Role-Based Access Control System

This system provides a complete role-based access control (RBAC) implementation for the admin panel. It uses a three-tier role hierarchy to manage permissions across the application.

## Role Hierarchy

### 1. **SUPER_ADMIN** (Level 3 - Full Access)
- Full access to all admin features
- Can manage other admin users (create, update, delete)
- Can moderate all content (stranke, partnerji)
- Can view violations and risk alerts
- Can access system settings

### 2. **MODERATOR** (Level 2 - Content Moderation)
- Can moderate content (stranke, partnerji)
- Cannot manage other admin users
- Can view violations and risk alerts
- Read-only access to system settings

### 3. **OPERATER** (Level 1 - View Only)
- Read-only access to stranke and partnerji
- Can view violations and risk alerts
- Cannot make any modifications

## Components & Hooks

### `useAdminRole` Hook
Client-side hook for checking admin role and permissions.

```tsx
'use client';
import { useAdminRole } from '@/hooks/use-admin-role';

export function MyComponent() {
  const { 
    admin,           // Current admin user object
    vloga,           // Current role (Vloga type)
    isLoading,       // Loading state
    error,           // Error object
    isSuperAdmin,    // Boolean shortcuts
    isModerator,
    isOperater,
    hasPermission,   // Function: hasPermission(role | role[])
    canManageUsers,  // Boolean helpers
    canModerateContent,
    canViewOnly
  } = useAdminRole();

  if (isLoading) return <div>Loading...</div>;

  if (!hasPermission('SUPER_ADMIN')) {
    return <div>Access Denied</div>;
  }

  return <div>Super Admin Content</div>;
}
```

### `RoleGuard` Component
Wraps content to restrict access by role.

```tsx
import { RoleGuard } from '@/components/admin/RoleGuard';

// Single role
<RoleGuard requiredRole="SUPER_ADMIN">
  <UserManagementPanel />
</RoleGuard>

// Multiple roles (at least one required)
<RoleGuard requiredRole={['SUPER_ADMIN', 'MODERATOR']}>
  <ContentModerationPanel />
</RoleGuard>

// With custom fallback
<RoleGuard 
  requiredRole="SUPER_ADMIN"
  fallback={<CustomAccessDenied />}
>
  <AdminContent />
</RoleGuard>
```

## Database Schema

### Zaposleni Model
```prisma
model Zaposleni {
  id        String   @id @default(cuid())
  email     String   @unique
  ime       String
  priimek   String
  vloga     Vloga    @default(OPERATER)
  aktiven   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   // super admin user id
}

enum Vloga {
  SUPER_ADMIN
  MODERATOR
  OPERATER
}
```

## Setup Process

### Initial Setup (First Super Admin)

1. Navigate to `/admin/setup`
2. Enter your name and surname
3. System automatically creates a super admin account linked to your auth email
4. Redirects to admin dashboard

```tsx
import AdminSetupPage from '@/app/admin/setup/page';

// Auto-redirects after super admin is created
```

### Server-Side Auth Check

The admin layout (`/app/admin/layout.tsx`) performs server-side verification:

```tsx
const zaposleni = await prisma.zaposleni.findUnique({
  where: { email: session.user.email }
});

if (!zaposleni || !zaposleni.aktiven) {
  redirect('/');
}
```

## API Endpoints

### GET `/api/admin/me`
Returns current admin's role and information.

**Response:**
```json
{
  "admin": {
    "id": "...",
    "email": "admin@example.com",
    "ime": "Janez",
    "priimek": "Novak",
    "vloga": "SUPER_ADMIN",
    "aktiven": true
  }
}
```

### GET `/api/admin/setup-status`
Checks if system needs initial setup (no super admin exists).

**Response:**
```json
{ "needsSetup": true }
```

### POST `/api/admin/setup`
Creates the first super admin account.

**Request:**
```json
{
  "ime": "Janez",
  "priimek": "Novak"
}
```

## Server Actions

Located in `/app/admin/zaposleni/actions.ts`:

### `createZaposleni(input)`
Creates a new employee account. **Super Admin only.**

```tsx
const result = await createZaposleni({
  email: 'moderator@example.com',
  ime: 'Marko',
  priimek: 'Markelj',
  vloga: 'MODERATOR'
});
```

### `updateZaposleni(input)`
Updates employee information. **Super Admin only.**

```tsx
const result = await updateZaposleni({
  id: 'zaposleni-id',
  vloga: 'OPERATER',
  aktiven: true
});
```

### `deleteZaposleni(id)`
Deletes an employee. **Super Admin only.**

```tsx
const result = await deleteZaposleni('zaposleni-id');
```

### `getZaposleniList()`
Fetches all employees.

```tsx
const result = await getZaposleniList();
if (result.success) {
  const employees = result.data;
}
```

## Employee Management UI

The `/admin/zaposleni` page provides a complete management interface:

- **List**: View all employees with their roles and status
- **Create**: Add new admin/employee accounts
- **Update**: Edit employee details and roles
- **Delete**: Remove employee accounts
- **Role Management**: Assign or change employee roles

Only accessible to super admins.

## Permission Hierarchy Logic

The system uses a numeric hierarchy:

```
SUPER_ADMIN  (3) >= MODERATOR (2) >= OPERATER (1)
```

When checking `hasPermission(['MODERATOR', 'OPERATER'])`:
- Super Admin: ✅ (3 >= 2)
- Moderator: ✅ (2 >= 2)
- Operater: ❌ (1 < 2)

## Usage Examples

### Protecting a Component
```tsx
'use client';
import { useAdminRole } from '@/hooks/use-admin-role';

export function AdminUsers() {
  const { hasPermission, isLoading } = useAdminRole();

  if (isLoading) return <Spinner />;
  
  if (!hasPermission('SUPER_ADMIN')) {
    return <div>Unauthorized</div>;
  }

  return <UserManagementPanel />;
}
```

### Role-Based Sidebar Navigation
```tsx
const visibleItems = navItems.filter(item => {
  if (!item.roles) return true;
  return item.roles.includes(user.vloga);
});
```

### Server-Side Protection
```tsx
async function updateStranke(id: string, data: any) {
  const session = await getServerSession();
  const zaposleni = await prisma.zaposleni.findUnique({
    where: { email: session.user.email }
  });

  if (!zaposleni?.vloga || !['SUPER_ADMIN', 'MODERATOR'].includes(zaposleni.vloga)) {
    throw new Error('Unauthorized');
  }

  // Proceed with update
}
```

## Security Considerations

1. **Server-Side Validation**: All permissions checked server-side
2. **Email-Based Auth**: Links admin role to authenticated user email
3. **Active Status**: Accounts can be deactivated without deletion
4. **Audit Trail**: `createdBy` field tracks who created each account
5. **Role Hierarchy**: Enforced through permission checking logic

## Troubleshooting

### Admin can't access /admin
1. Check if user email exists in `Zaposleni` table
2. Verify `aktiven` is `true`
3. Check server session is active

### Permission check failing
1. Verify role hierarchy in `use-admin-role.ts`
2. Check role is spelled correctly (case-sensitive)
3. Ensure useAdminRole hook is properly loaded

### Setup page not appearing
1. Check if any super admin exists: `SELECT COUNT(*) FROM "Zaposleni" WHERE vloga = 'SUPER_ADMIN'`
2. Navigate directly to `/admin/setup` if setup status check fails
