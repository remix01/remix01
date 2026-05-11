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
