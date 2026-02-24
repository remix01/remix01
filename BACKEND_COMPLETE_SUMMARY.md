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
