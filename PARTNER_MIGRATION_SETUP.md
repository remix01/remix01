# Partner Migration Setup - Complete Guide

## Overview

This migration system bridges the old `partners` table with the new `profiles`/`obrtnik_profiles` system, allowing gradual unification without data loss or service interruption.

## Files Created

### 1. **SQL Migration** - `supabase/migrations/20260223_partner_migration.sql`
Adds migration infrastructure to the database:

```sql
-- Adds to partners table:
- new_profile_id UUID (foreign key to profiles)
- migrated_at TIMESTAMPTZ (tracks when migration occurred)

-- Creates view: all_obrtniki
  - Combines old and new system obrtniki
  - Shows legacy vs new system source
  - Only returns active/verified records
```

**View Definition:**
The `all_obrtniki` view returns both old and new system obrtniki in a unified format:
- Columns: id, name, business_name, email, rating, verified, city, system, created_at
- System values: 'new' or 'legacy'

### 2. **Migration Function** - `lib/migration/partner-migration.ts`

Export signature:
```typescript
export async function migratePartnerToNewSystem(
  partnerId: string
): Promise<MigrationResult>

export async function migrateAllPartners(batchSize = 50): Promise<{
  total: number
  successful: number
  failed: number
  errors: Array<{ partnerId: string; error: string }>
}>
```

**Process for single partner migration:**
1. Fetch partner from `partners` table
2. Look up auth user by partner email
3. Create `profiles` record if needed (with role='obrtnik')
4. Create `obrtnik_profiles` record linked to profile
5. Update `partners.new_profile_id` with new profile ID
6. Update `partners.migrated_at` timestamp
7. Return success status

**Error handling:**
- Returns error if partner not found
- Returns error if auth user doesn't exist for partner email
- Skips duplicate profile creation (idempotent)

### 3. **Admin Migration Page** - `app/admin/migracije/page.tsx`

Server component for managing migrations:

**Stats shown:**
- Count of non-migrated partners
- Count of migrated partners
- Progress percentage (visual bar)

**UI Components:**
- Stats cards (3 columns)
- Migration action buttons
- Table of last 20 non-migrated partners with:
  - Business name, email, city, rating, verified status, created date
  - Individual "Migriraj" button per partner

**Actions:**
- "Migriraj vse X partnerjev" button for bulk migration with confirmation
- Individual "Migriraj" button per partner row

### 4. **Admin Components**

#### `components/admin/MigratePartnerAction.tsx`
- Client component for single partner migration
- Calls POST `/api/admin/migrate-partner`
- Shows loading state during migration
- Refreshes page on success

#### `components/admin/MigrateAllPartnersAction.tsx`
- Client component for bulk migration
- Confirmation dialog before starting
- Calls POST `/api/admin/migrate-all-partners`
- Shows batch progress

### 5. **API Routes**

#### `app/api/admin/migrate-partner/route.ts`
- Protected route (admin only)
- POST endpoint for single partner migration
- Calls `migratePartnerToNewSystem()`

#### `app/api/admin/migrate-all-partners/route.ts`
- Protected route (admin only)
- POST endpoint for batch migration
- Calls `migrateAllPartners(batchSize)`
- Returns aggregated success/fail counts

### 6. **Environment Variables** - `.env.example`
```
# Migration batch size (number of partners per batch)
MIGRATION_BATCH_SIZE=50
```

## Admin Sidebar Update

Added to sidebar navigation:
- Label: "🔄 Migracije"
- href: "/admin/migracije"
- Role restriction: SUPER_ADMIN only
- Icon: RefreshCw

## How to Use

### 1. **Apply the SQL migration:**
```bash
supabase migration up
```

### 2. **Access the admin page:**
- Navigate to `/admin/migracije` as SUPER_ADMIN
- View migration stats and non-migrated partners list

### 3. **Migrate partners:**

**Option A: Individual migration**
1. Find partner in the table
2. Click "Migriraj" button
3. System creates profiles/obrtnik_profiles records
4. Updates partner with new_profile_id
5. Page refreshes showing updated status

**Option B: Bulk migration**
1. Click "Migriraj sve X partnerjev"
2. Confirm in dialog
3. System migrates all non-migrated partners in batches of 50
4. Shows results: total, successful, failed
5. Page refreshes

### 4. **Verify migration:**
- Check `partners.new_profile_id` is not NULL
- Check `partners.migrated_at` is set
- Verify profile exists in `profiles` table
- Verify obrtnik_profiles exists

## Data Flow During Migration

```
Old System                    New System
─────────────────────────────────────────
partners → auth.users → profiles
  ├─ id (UUID)                 ├─ auth_user_id (UUID)
  ├─ email                     ├─ email
  ├─ business_name      ─→      ├─ full_name
  ├─ rating                    └─ role='obrtnik'
  ├─ city                         │
  └─ is_active                    ↓
                            obrtnik_profiles
                              ├─ id (same as profiles.id)
                              ├─ business_name
                              └─ avg_rating
```

## Rollback Plan

If migration fails:
1. No data is deleted
2. `partners.new_profile_id` remains NULL
3. Can retry without data loss
4. If profiles/obrtnik_profiles created but link failed:
   - Manually delete new records
   - Retry migration

## Monitoring

After migration:
- Monitor `/admin/migracije` page for migration status
- Check logs for any errors in batch migrations
- Verify auth credentials for users being migrated
- Ensure no duplicate profiles created (should be idempotent)

## Notes

- Migration is non-destructive (no deletions)
- Old `partners` records remain unchanged
- Both old and new systems coexist during transition
- The `all_obrtniki` view shows combined results
- Each migration is logged with timestamp
- Admin only access to migration tools
