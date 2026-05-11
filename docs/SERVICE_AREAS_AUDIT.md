# Service Areas Usage Audit Report

## Overview
This audit documents all usages of ServiceArea types across the codebase and identifies inconsistencies and opportunities for improvement based on the refactoring suggestions provided.

---

## Database Schema
**Table:** `service_areas` (Supabase)

### Current Structure:
```sql
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Issues Identified:
1. ❌ **Missing `radius_km` column** - The application uses `radius_km` but the migration script doesn't create it
2. ❌ **Missing `lat`/`lng` columns** - The Supabase type definition includes these, but migration doesn't create them
3. ❌ **Inconsistent `region` requirement** - Marked as `NOT NULL` in migration, but app treats it as optional
4. ✓ **Missing `updated_at`** - Not tracked, should be added

---

## Type Definitions

### Current Types in Use:

#### 1. **Supabase Auto-Generated Type** (`types/supabase.ts`)
```typescript
service_areas: {
  Row: {
    id: string
    obrtnik_id: string
    city: string
    region: string | null
    radius_km: number | null
    lat: number | null
    lng: number | null
    is_active: boolean | null
    created_at: string | null
  }
  Insert: { ... }
  Update: Partial<...>
}
```

#### 2. **Component Type** (`components/obrtnik/service-areas-section.tsx`)
```typescript
interface ServiceAreasData {
  id: string
  obrtnik_id: string
  city: string
  region: string | null
  radius_km: number | null
  lat: number | null
  lng: number | null
  is_active: boolean | null
  created_at: string | null
}
```

#### 3. **Page Type** (`app/(obrtnik)/obrtnik/razpolozljivost/page.tsx`)
```typescript
interface ServiceAreasData {
  id: string
  city: string | null
  region: string
  radius_km?: number | null
}
```

#### 4. **Display Type** (`components/obrtnik/tabs/CoverageTab.tsx`)
- Uses untyped `any[]` for serviceAreas
- Expects: `area.city`, `area.region`, `area.radius_km`

---

## Files Using Service Areas

### 1. **Service Areas Management** (Full CRUD)
**File:** `components/obrtnik/service-areas-section.tsx`
- **Type:** Client component
- **Usage:** Complete service area management
- **Type Issues:**
  - ✓ Uses custom `ServiceAreasData` interface (matches DB)
  - ✓ Properly handles insert/delete operations
  - ⚠️ Hardcodes default region as 'Slovenija'
  - ⚠️ Defaults radius to 30km

**Current Logic:**
```typescript
{
  obrtnik_id: obrtnikId,
  city: newCity.trim(),
  region: 'Slovenija',  // ← Hardcoded default
  radius_km: newRadius,
  is_active: true,
}
```

### 2. **Availability/Coverage Page** (Data Loading)
**File:** `app/(obrtnik)/obrtnik/razpolozljivost/page.tsx`
- **Type:** Server component (RSC)
- **Usage:** Fetches and passes service areas to child components
- **Type Issues:**
  - ⚠️ Custom `ServiceAreasData` type with different field requirements
  - ⚠️ Manually enriches data with `radius_km` fallback to 30
  - ⚠️ Type mismatch between fetched data and passed type

**Current Logic:**
```typescript
const enrichedServiceAreas: ServiceAreasData[] = (serviceAreas || []).map((area) => ({
  id: area.id,
  city: area.city,
  region: area.region,
  radius_km: (area as any).radius_km ?? 30,  // ← Fallback logic
}))
```

### 3. **Public Craftsman Detail Page** (Read-only Display)
**File:** `app/(public)/mojstri/[id]/page.tsx`
- **Type:** Server component (RSC)
- **Usage:** Displays service areas in Coverage tab
- **Type Issues:**
  - ✓ Queries service areas as part of full profile fetch
  - ⚠️ Uses untyped `any` for the entire obrtnik object
  - ⚠️ Accesses `obrtnik.service_areas` directly in JSX

**Current Usage:**
```typescript
// In query
service_areas(city, region, is_active)

// In display
{obrtnik.service_areas?.map((area: any) => (
  // Display logic
))}
```

### 4. **Coverage Tab Component** (Typed Display)
**File:** `components/obrtnik/tabs/CoverageTab.tsx`
- **Type:** Client component
- **Usage:** Displays service areas to users
- **Type Issues:**
  - ❌ Uses untyped `any[]` for props
  - ✓ Displays `area.city`, `area.region`, `area.radius_km`

**Props:**
```typescript
interface CoverageTabProps {
  serviceAreas: any[]  // ← Should be typed!
  availability: any[]
}
```

### 5. **Profile Tabs Component** (Data Orchestration)
**File:** `components/obrtnik/ProfileTabs.tsx`
- **Type:** Client component
- **Usage:** Passes service areas to CoverageTab
- **Type Issues:**
  - ❌ Uses untyped `any[]` for serviceAreas
  - ✓ Properly orchestrates tab switching

---

## Consistency Issues Summary

### Type Definition Inconsistencies:

| Issue | Location | Impact |
|-------|----------|--------|
| **Type duplication** | Multiple files | Hard to maintain, risk of divergence |
| **Untyped `any[]`** | CoverageTab, ProfileTabs | Loss of IDE support & type safety |
| **Field variations** | razpolozljivost page has different required fields | Confusion about what's optional |
| **Hardcoded defaults** | service-areas-section | Magic values in component |
| **Missing null safety** | Multiple JSX renders | Potential runtime errors |

### Data Flow Issues:

1. **DB → Component:** Database returns full row, but some components only use subset of fields
2. **RSC → Client:** Server component transforms data before passing to client (enrichment)
3. **Display:** Untyped `any` loses information about what fields are available

---

## Recommended Refactoring

### Step 1: Create Centralized Type Definitions
**File:** `types/service-areas.ts` (NEW)

```typescript
import type { Database } from '@/types/supabase'

// Full database row type
export type ServiceAreaFull = Database['public']['Tables']['service_areas']['Row']

// Insert type (for creating new records)
export type ServiceAreaInsert = Database['public']['Tables']['service_areas']['Insert']

// Update type (for modifying records)
export type ServiceAreaUpdate = Database['public']['Tables']['service_areas']['Update']

// Display type (for UI components - subset of fields needed for rendering)
export interface ServiceAreaDisplay {
  id: string
  city: string | null
  region: string | null
  radius_km: number | null
}

// Edit type (what the user modifies)
export interface ServiceAreaEditForm {
  city: string
  region?: string
  radius_km: number
}
```

### Step 2: Update Database Schema
**File:** `supabase/migrations/20260321_add_obrtnik_extended_fields.sql`

Add missing columns:
```sql
ALTER TABLE public.service_areas
  ADD COLUMN IF NOT EXISTS radius_km INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS lng NUMERIC(11, 8),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

### Step 3: Update Components

#### Fix CoverageTab.tsx
```typescript
import type { ServiceAreaDisplay } from '@/types/service-areas'

interface CoverageTabProps {
  serviceAreas: ServiceAreaDisplay[]  // ✓ Properly typed
  availability: any[]
}
```

#### Simplify razpolozljivost/page.tsx
```typescript
import type { ServiceAreaDisplay } from '@/types/service-areas'

// Remove manual enrichment - DB should provide defaults
const { data: serviceAreas } = await supabase
  .from('service_areas')
  .select('id, city, region, radius_km')  // Select only needed fields
  .eq('obrtnik_id', obrtnikProfile.id)
  .eq('is_active', true)
```

#### Update service-areas-section.tsx
```typescript
import type { ServiceAreaInsert, ServiceAreaFull } from '@/types/service-areas'

// Use proper types instead of inline interface
const [serviceAreas, setServiceAreas] = useState<ServiceAreaFull[]>(initialServiceAreas)
```

---

## Migration Path

1. **Phase 1:** Create new `types/service-areas.ts` file (non-breaking)
2. **Phase 2:** Update database migration script (requires re-running migration)
3. **Phase 3:** Update components to use new types (one by one, no breaking changes)
4. **Phase 4:** Remove old inline type definitions
5. **Phase 5:** Update queries to use column selection for performance

---

## Benefits of Refactoring

✅ **Single source of truth** for service area types  
✅ **Better IDE support** with proper TypeScript types  
✅ **Reduced bugs** from type mismatches  
✅ **Easier maintenance** with centralized definitions  
✅ **Performance improvements** with column selection  
✅ **Consistency** across all components and pages  

---

## Files to Update

### High Priority (Type safety):
- [ ] Create `types/service-areas.ts`
- [ ] Update `components/obrtnik/tabs/CoverageTab.tsx`
- [ ] Update `components/obrtnik/ProfileTabs.tsx`
- [ ] Update `components/obrtnik/service-areas-section.tsx`

### Medium Priority (DB schema):
- [ ] Update migration script

### Low Priority (Nice to have):
- [ ] Update queries to select specific columns
- [ ] Add utility functions for service area operations

---

Generated: 2026-03-27
