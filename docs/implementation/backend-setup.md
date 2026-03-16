# LiftGO Backend Setup Guide

## Database Tables Setup

Run the SQL script in Supabase SQL Editor to create the required tables:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy and run the SQL from `/scripts/setup-liftgo-db.sql`

### Tables Created:

**obrtniki** (Contractors)
- id (UUID, PK)
- ime, lokacija, storitev, ocena, cena_na_uro
- razpoložljive_ure, verified, email
- created_at

**povprasevanja** (Inquiries)
- id (UUID, PK)
- storitev, lokacija, opis
- obrtnik_id (FK to obrtniki)
- termin_datum, termin_ura
- status (novo, sprejeto, zavrnjeno, zakljuceno)
- email, telefon
- created_at, updated_at

**rezervacije** (Bookings)
- id (UUID, PK)
- povprasevanje_id (FK), obrtnik_id (FK)
- status (potrjena, preklicana)
- created_at

---

## API Endpoints

### 1. POST /api/povprasevanje
**Save new inquiry**
```json
{
  "storitev": "Vodovod",
  "lokacija": "Ljubljana",
  "opis": "Popravilo puščajoče pipe",
  "obrtnik_id": "uuid-here",
  "termin_datum": "2024-04-15",
  "termin_ura": "10:00",
  "email": "customer@example.com",
  "telefon": "+386123456789"
}
```

**Response:**
```json
{
  "success": true,
  "inquiry_id": "uuid",
  "message": "Povpraševanje uspešno oddano"
}
```

---

### 2. GET /api/obrtniki?storitev=&lokacija=
**Fetch contractors by service type and location**

Query Parameters:
- `storitev` (optional): Service type (e.g., "Vodovod", "Elektrika")
- `lokacija` (optional): City name (e.g., "Ljubljana")

**Response:**
```json
{
  "success": true,
  "contractors": [
    {
      "id": "uuid",
      "ime": "Marko Novak",
      "lokacija": "Ljubljana",
      "storitev": "Vodovod",
      "ocena": 4.8,
      "cena_na_uro": 30,
      "email": "marko@example.com"
    }
  ],
  "count": 1
}
```

---

### 3. POST /api/rezervacija
**Create booking (check slot availability)**

```json
{
  "povprasevanje_id": "uuid",
  "obrtnik_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "booking_id": "uuid",
  "message": "Rezervacija uspešno potrdjena"
}
```

---

### 4. GET /api/obrtnik/povprasevanja?obrtnik_id=uuid
**Contractor dashboard - get all assigned inquiries**

**Response:**
```json
{
  "success": true,
  "inquiries": [
    {
      "id": "uuid",
      "storitev": "Vodovod",
      "lokacija": "Ljubljana",
      "opis": "Popravilo puščajoče pipe",
      "termin_datum": "2024-04-15",
      "termin_ura": "10:00",
      "status": "novo",
      "email": "customer@example.com",
      "telefon": "+386123456789",
      "created_at": "2024-04-10T14:30:00Z"
    }
  ],
  "grouped": {
    "novo": [...],
    "sprejeto": [...],
    "zavrnjeno": [...],
    "zakljuceno": [...]
  }
}
```

---

### 5. POST /api/send-email
**Send email notification to contractor**

```json
{
  "povprasevanje_id": "uuid",
  "obrtnik_id": "uuid",
  "email": "contractor@example.com"
}
```

---

## Environment Variables

Add to `.env.local`:

```env
# Supabase (auto-configured if using v0 integration)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# Resend (optional for email notifications)
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_FROM_EMAIL=noreply@liftgo.net

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Integration Checklist

- [ ] Supabase project created and tables set up via SQL Editor
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] (Optional) Resend account created and `RESEND_API_KEY` added
- [ ] Wizard form connected to `/api/povprasevanje` endpoint
- [ ] Contractor selection fetches from `/api/obrtniki` (not hardcoded)
- [ ] Final confirmation button triggers `/api/rezervacija`
- [ ] Success page displays inquiry ID

---

## Testing

1. **Test Contractor Fetch:**
   ```bash
   curl "http://localhost:3000/api/obrtniki?storitev=Vodovod&lokacija=Ljubljana"
   ```

2. **Test Inquiry Submission:**
   ```bash
   curl -X POST http://localhost:3000/api/povprasevanje \
     -H "Content-Type: application/json" \
     -d '{
       "storitev": "Vodovod",
       "lokacija": "Ljubljana",
       "opis": "Popravilo puščajoče pipe",
       "obrtnik_id": "contractor-uuid",
       "termin_datum": "2024-04-15",
       "termin_ura": "10:00",
       "email": "test@example.com",
       "telefon": "+386123456789"
     }'
   ```

3. **Test Contractor Dashboard:**
   ```bash
   curl "http://localhost:3000/api/obrtnik/povprasevanja?obrtnik_id=contractor-uuid"
   ```
# LiftGO Backend Implementation - Complete Summary

## ✅ Created API Endpoints

### 1. **POST /api/povprasevanje** - Save Inquiry
Saves a new service inquiry to the `povprasevanja` table with fields:
- storitev, lokacija, opis, obrtnik_id
- termin_datum, termin_ura, status (defaults to "novo")
- email, telefon

**Response:** Returns `inquiry_id` on success

---

### 2. **GET /api/obrtniki?storitev=&lokacija=** - Fetch Contractors
Fetches verified contractors from `obrtniki` table filtered by:
- Service type (storitev)
- Location (lokacija - partial match)
- Sorted by rating (ocena descending)

**Response:** Returns array of contractor objects with all details

---

### 3. **POST /api/rezervacija** - Create Booking
Creates a booking and checks slot availability:
- Limits 3 concurrent bookings per time slot
- Returns error if slot is full
- Updates inquiry status to "sprejeto"
- Returns `booking_id` on success

---

### 4. **GET /api/obrtnik/povprasevanja?obrtnik_id=** - Contractor Dashboard
Retrieves all inquiries assigned to a contractor:
- Groups by status (novo, sprejeto, zavrnjeno, zakljuceno)
- Sorted by newest first
- Includes customer contact info (email, phone)

---

### 5. **POST /api/send-email** - Email Notification
Sends email to contractor via Resend API when new inquiry arrives:
- Requires `RESEND_API_KEY` environment variable
- Template includes inquiry details and dashboard link
- Gracefully handles if Resend not configured

---

## 📊 Database Schema

### obrtniki table
```sql
id (UUID, PK)
ime (TEXT)
lokacija (TEXT)
storitev (TEXT)
ocena (FLOAT)
cena_na_uro (INTEGER)
razpoložljive_ure (TEXT)
verified (BOOLEAN)
email (TEXT)
created_at (TIMESTAMP)
```

### povprasevanja table
```sql
id (UUID, PK)
storitev (TEXT)
lokacija (TEXT)
opis (TEXT)
obrtnik_id (UUID, FK → obrtniki)
termin_datum (DATE)
termin_ura (TIME)
status (ENUM: novo/sprejeto/zavrnjeno/zakljuceno)
email (TEXT)
telefon (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### rezervacije table
```sql
id (UUID, PK)
povprasevanje_id (UUID, FK → povprasevanja)
obrtnik_id (UUID, FK → obrtniki)
status (ENUM: potrjena/preklicana)
created_at (TIMESTAMP)
```

---

## 🔧 Integration Steps

### Step 1: Set Up Database
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy SQL from `/scripts/setup-liftgo-db.sql`
4. Execute to create tables and insert sample contractors

### Step 2: Set Environment Variables
Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
RESEND_API_KEY=re_xxxxx (optional)
NEXT_PUBLIC_FROM_EMAIL=noreply@liftgo.net
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Connect Frontend
Your wizard form at `app/(narocnik)/novo-povprasevanje/page.tsx` needs updates:

**In Step 2 (Contractor Selection):**
- Replace hardcoded contractor array with call to `GET /api/obrtniki?storitev=...&lokacija=...`
- Show contractors from database with real ratings, prices

**In Step 4 (Review & Confirm):**
- Replace current submit logic with POST to `/api/povprasevanje`
- Use response `inquiry_id` for success confirmation
- Then call `POST /api/rezervacija` to create booking

---

## 🧪 Test Endpoints

### Test 1: Fetch Contractors
```bash
curl "http://localhost:3000/api/obrtniki?storitev=Vodovod&lokacija=Ljubljana"
```

Expected: Array of contractors

### Test 2: Create Inquiry
```bash
curl -X POST http://localhost:3000/api/povprasevanje \
  -H "Content-Type: application/json" \
  -d '{
    "storitev": "Vodovod",
    "lokacija": "Ljubljana",
    "opis": "Popravilo puščajoče pipe v kuhinji",
    "obrtnik_id": "contractor-uuid",
    "termin_datum": "2024-04-15",
    "termin_ura": "10:00",
    "email": "customer@example.com",
    "telefon": "+386123456789"
  }'
```

Expected: `{ "success": true, "inquiry_id": "uuid", ... }`

### Test 3: Get Contractor Inquiries
```bash
curl "http://localhost:3000/api/obrtnik/povprasevanja?obrtnik_id=contractor-uuid"
```

Expected: Grouped inquiries by status

---

## 📝 Next Steps to Complete Integration

1. **Update Frontend Form:**
   - Modify contractor selection step to use `/api/obrtniki` endpoint
   - Update final submit to use `/api/povprasevanje` + `/api/rezervacija`

2. **Configure Email (Optional):**
   - Sign up at resend.com
   - Add `RESEND_API_KEY` to environment
   - Emails will auto-send on new inquiries

3. **Database Setup:**
   - Run SQL from `/scripts/setup-liftgo-db.sql` in Supabase

4. **Test End-to-End:**
   - Submit test inquiry through wizard
   - Verify it appears in database
   - Check contractor dashboard endpoint

---

## 📁 Files Created

- `/app/api/povprasevanje/route.ts` - Inquiry submission
- `/app/api/obrtniki/route.ts` - Contractor fetching
- `/app/api/rezervacija/route.ts` - Booking creation
- `/app/api/obrtnik/povprasevanja/route.ts` - Contractor dashboard
- `/app/api/send-email/route.ts` - Email notifications
- `/scripts/setup-liftgo-db.sql` - Database setup
- `/BACKEND_SETUP.md` - Full documentation

---

## ⚠️ Important Notes

- All APIs use Supabase client-side SDK (auto-configured via v0 integration)
- Email notifications require `RESEND_API_KEY` - optional but recommended
- Slot availability limit is 3 concurrent bookings per time slot per contractor
- Status workflow: novo → sprejeto/zavrnjeno → zakljuceno
- All timestamps auto-managed by Supabase
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
