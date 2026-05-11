# LiftGO Marketplace Backend - Complete Guide

## Overview

The LiftGO marketplace backend is a complete data layer for connecting naročniki (customers) with obrtniki (craftworkers) through povpraševanja (service requests), ponudbe (offers), and ocene (reviews).

## Architecture

### Database Schema

**Tables:**
- `profiles` - Extended user profiles with marketplace roles
- `obrtnik_profiles` - Craftworker business profiles
- `categories` - Service categories (15 pre-seeded)
- `obrtnik_categories` - Many-to-many relationship
- `povprasevanja` - Service requests from naročniki
- `ponudbe` - Offers from obrtniki
- `ocene` - Reviews/ratings from naročniki

**Security:**
- Row Level Security (RLS) enabled on all tables
- Naročniki can only see their own povpraševanja
- Obrtniki can browse open povpraševanja
- Reviews are public by default
- Admin users have full access

### Data Access Layer

All database operations are abstracted into type-safe functions in `/lib/dal/`:

- `profiles.ts` - Profile and obrtnik profile management
- `categories.ts` - Category queries
- `povprasevanja.ts` - Service request CRUD
- `ponudbe.ts` - Offer and review management

## User Roles

### Naročnik (Customer)
- Creates povpraševanja (service requests)
- Reviews ponudbe from obrtniki
- Accepts/rejects ponudbe
- Leaves ocene (reviews) after service completion

### Obrtnik (Craftworker)
- Browses open povpraševanja
- Submits ponudbe (offers) with price estimates
- Gets reviewed by naročniki
- Has public profile with rating and reviews

## Core Workflows

### 1. Service Request Flow

```typescript
import { createPovprasevanje, listPovprasevanja } from '@/lib/dal/povprasevanja'

// Naročnik creates a service request
const povprasevanje = await createPovprasevanje({
  narocnik_id: userId,
  category_id: 'category-uuid',
  title: 'Popravilo pipe',
  description: 'Potrebujem vodovodarja za popravilo pipe v kuhinji',
  location_city: 'Ljubljana',
  urgency: 'kmalu',
  budget_max: 200
})

// Obrtniki browse open requests
const openRequests = await listPovprasevanja({
  status: 'odprto',
  category_id: 'category-uuid',
  limit: 20
})
```

### 2. Offer Submission Flow

```typescript
import { createPonudba, getPonudbeForPovprasevanje } from '@/lib/dal/ponudbe'

// Obrtnik submits an offer
const ponudba = await createPonudba({
  povprasevanje_id: 'request-uuid',
  obrtnik_id: userId,
  message: 'Lahko pridem jutri zvečer. Imam 10 let izkušenj.',
  price_estimate: 150,
  price_type: 'ocena',
  available_date: '2026-02-25'
})

// Naročnik reviews all offers
const ponudbe = await getPonudbeForPovprasevanje('request-uuid')
```

### 3. Review Flow

```typescript
import { createOcena, getObrtnikOcene } from '@/lib/dal/ponudbe'

// Naročnik leaves a review after service completion
const ocena = await createOcena({
  ponudba_id: 'offer-uuid',
  narocnik_id: userId,
  obrtnik_id: 'craftworker-uuid',
  rating: 5,
  comment: 'Odlično opravljeno delo!',
  is_public: true
})

// Public reviews for obrtnik profile
const reviews = await getObrtnikOcene('craftworker-uuid', 10)
```

## TypeScript Types

All types are defined in `/types/marketplace.ts`:

```typescript
import type {
  Profile,
  ObrtnikProfile,
  Povprasevanje,
  Ponudba,
  Ocena,
  Category
} from '@/types/marketplace'
```

**Key Enums:**
- `UserRole`: 'narocnik' | 'obrtnik'
- `UrgencyLevel`: 'normalno' | 'kmalu' | 'nujno'
- `PovprasevanjeStatus`: 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'
- `PonudbaStatus`: 'poslana' | 'sprejeta' | 'zavrnjena'
- `PriceType`: 'fiksna' | 'ocena' | 'po_ogledu'

## API Integration Examples

### Server Actions (Recommended)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createPovprasevanje } from '@/lib/dal/povprasevanja'
import { revalidatePath } from 'next/cache'

export async function submitPovprasevanje(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const povprasevanje = await createPovprasevanje({
    narocnik_id: user.id,
    category_id: formData.get('category_id') as string,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    location_city: formData.get('city') as string,
    urgency: formData.get('urgency') as 'normalno' | 'kmalu' | 'nujno',
  })

  if (!povprasevanje) {
    return { error: 'Failed to create request' }
  }

  revalidatePath('/narocnik/povprasevanja')
  return { success: true, id: povprasevanje.id }
}
```

### API Routes

```typescript
// app/api/povprasevanja/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listPovprasevanja } from '@/lib/dal/povprasevanja'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const categoryId = searchParams.get('category_id') || undefined
  
  const povprasevanja = await listPovprasevanja({
    category_id: categoryId,
    status: 'odprto',
    limit: 20
  })

  return NextResponse.json(povprasevanja)
}
```

### Server Components

```typescript
// app/obrtnik/povprasevanja/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getOpenPovprasevanjaForObrtnik } from '@/lib/dal/povprasevanja'
import { getObrtnikCategories } from '@/lib/dal/profiles'

export default async function ObrtnikPovprasevanjaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get obrtnik's categories
  const categoryIds = await getObrtnikCategories(user.id)
  
  // Get relevant open requests
  const povprasevanja = await getOpenPovprasevanjaForObrtnik(
    user.id,
    categoryIds,
    20
  )

  return (
    <div>
      <h1>Odprta povpraševanja</h1>
      {povprasevanja.map(p => (
        <PovprasevanjeCard key={p.id} povprasevanje={p} />
      ))}
    </div>
  )
}
```

## Pre-Seeded Categories

15 service categories are automatically created:

1. Vodovodna dela (Plumbing)
2. Elektrika (Electrical)
3. Slikopleskarstvo (Painting)
4. Tesarstvo (Carpentry)
5. Ključavničarstvo (Locksmith)
6. Tlakovanje (Paving)
7. Fasaderstvo (Facade work)
8. Ogrevanje in klimatizacija (Heating & AC)
9. Selitvene storitve (Moving services)
10. Čiščenje (Cleaning)
11. Vrtnarstvo (Gardening)
12. Sanacija vlage (Moisture remediation)
13. Strešna dela (Roofing)
14. Keramičarska dela (Ceramic work)
15. Pohištveni servis (Furniture service)

```typescript
import { getActiveCategories } from '@/lib/dal/categories'

const categories = await getActiveCategories()
```

## RLS Security Policies

### Profiles
- Anyone (authenticated) can read all profiles
- Users can only insert/update their own profile

### Obrtnik Profiles
- Anyone can read verified obrtnik profiles
- Obrtniki can manage their own profile
- Only admins can verify obrtniki

### Povpraševanja
- Naročniki see their own povpraševanja
- Obrtniki see open povpraševanja
- Admins see all

### Ponudbe
- Obrtniki see their own ponudbe
- Naročniki see ponudbe for their povpraševanja
- Only obrtniki can create ponudbe
- Only naročniki can update ponudba status (accept/reject)

### Ocene
- Anyone can read public ocene
- Only naročniki can create ocene
- Only for their own accepted ponudbe

## Rating System

Ratings are automatically aggregated:

```typescript
// Triggered automatically on INSERT/UPDATE of ocene table
CREATE TRIGGER update_obrtnik_rating_on_insert
  AFTER INSERT ON public.ocene
  FOR EACH ROW
  EXECUTE FUNCTION public.update_obrtnik_rating();
```

Obrtnik profiles maintain:
- `avg_rating`: Average of all ratings (0-5)
- `total_reviews`: Count of reviews

## Error Handling

All DAL functions include error logging:

```typescript
if (error) {
  console.error('[v0] Error fetching povprasevanje:', error)
  return null
}
```

Check for `null` returns and handle appropriately in your application code.

## Future Enhancements

Potential additions:
- Direct messaging between naročniki and obrtniki
- File attachments for povpraševanja (photos, documents)
- Payment integration (Stripe Connect)
- Dispute resolution system
- Availability calendar for obrtniki
- Push notifications for new ponudbe
- Search and filter UI components

## Testing

To test the backend:

```typescript
// Create a test profile
const profile = await createProfile({
  id: userId,
  role: 'narocnik',
  full_name: 'Test User',
  email: 'test@example.com'
})

// Create a test povprasevanje
const povprasevanje = await createPovprasevanje({
  narocnik_id: userId,
  category_id: categoryId,
  title: 'Test Request',
  description: 'Test description',
  location_city: 'Ljubljana',
  urgency: 'normalno'
})

// Verify it was created
const retrieved = await getPovprasevanje(povprasevanje.id)
console.log(retrieved)
```

## Support

For questions or issues:
- Review RLS policies in the migration file
- Check Supabase logs for detailed error messages
- Verify user authentication state
- Confirm user has the correct role in their profile

---

**Backend Status:** ✅ Complete
**Migration:** `004_liftgo_marketplace.sql`
**Types:** `/types/marketplace.ts`
**DAL:** `/lib/dal/profiles.ts`, `/lib/dal/categories.ts`, `/lib/dal/povprasevanja.ts`, `/lib/dal/ponudbe.ts`
