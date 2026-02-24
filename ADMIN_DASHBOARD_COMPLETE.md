# LiftGO Admin Dashboard — Complete Backend & Frontend

## ✅ Deliverables Summary

### Backend API Routes (6 routes created)
1. **POST/GET /api/povprasevanje** — Create inquiries, fetch with filters
2. **PATCH /api/povprasevanje/[id]** — Update inquiry status, assign contractors, add notes
3. **GET/POST /api/obrtniki** — List verified contractors, create new (admin only)
4. **PATCH /api/obrtniki/[id]** — Verify, block, update contractor status
5. **GET /api/admin/stats** — KPI dashboard statistics
6. **GET /api/admin/export** — CSV export of inquiries

### Frontend Pages (5 pages created)
1. **app/admin/layout.tsx** — Protected admin layout with auth check
2. **app/admin/page.tsx** — Dashboard with KPIs and 7-day activity chart
3. **app/admin/povprasevanja/page.tsx** — Inquiries list with filtering, search, pagination
4. **app/admin/povprasevanja/[id]/page.tsx** — Inquiry detail editor (status, contractor assignment, pricing)
5. **app/admin/obrtniki/page.tsx** — Contractors management (verify, block, status filtering)

### Database Schema (lib/supabase-admin.ts)
- Helper functions: `verifyAdmin()`, `logAction()`
- Service role client for admin-only operations
- Audit logging for all administrative actions

### Database Tables (supabase/schema.sql)
- `obrtniki` — Contractors with status (pending/verified/blocked)
- `povprasevanja` — Inquiries with status tracking
- `rezervacije` — Bookings with availability tracking
- `admin_users` — Admin user roles
- `admin_log` — Complete audit trail of changes

---

## 🔐 Security Features

✅ **Row Level Security (RLS)** — Admins can read/write all tables, public can only insert inquiries
✅ **Audit Logging** — Every admin action (create, update, status change) is logged with before/after state
✅ **Email Notifications** — Contractors notified on inquiry assignment and verification status
✅ **Admin Verification** — All admin endpoints verify admin token and user role before allowing access

---

## 🚀 Setup Instructions

### 1. Create Database Schema
Copy the SQL from `supabase/schema.sql` and run in Supabase SQL Editor:
```
supabase/schema.sql — 139 lines
```

This creates all tables, RLS policies, indexes, and triggers.

### 2. Create Admin User (in Supabase)
```sql
-- Create admin auth user
INSERT INTO auth.users (email, password, email_confirmed_at)
VALUES ('admin@liftgo.net', crypt('yourpassword', gen_salt('bf')), now());

-- Get the UUID of created user, then add to admin_users:
INSERT INTO admin_users (user_id, ime, email, vloga)
VALUES ('USER_UUID_HERE', 'Admin', 'admin@liftgo.net', 'superadmin');
```

### 3. Set Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key (for email notifications)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Test Login
Navigate to `/admin` — should redirect to login. After Supabase Auth setup, admin can log in with email/password.

---

## 📊 API Endpoints Reference

### Inquiries
- `POST /api/povprasevanje` — Create inquiry (public)
- `GET /api/povprasevanje?status=novo&search=&page=1` — List inquiries (admin)
- `PATCH /api/povprasevanje/[id]` — Update inquiry (admin)

### Contractors
- `GET /api/obrtniki?storitev=&lokacija=` — List verified contractors (public)
- `GET /api/obrtniki?admin=true` — List all contractors (admin)
- `POST /api/obrtniki` — Create contractor (admin)
- `PATCH /api/obrtniki/[id]` — Update contractor status (admin)

### Admin
- `GET /api/admin/stats` — Dashboard KPIs (admin)
- `GET /api/admin/export?od=&do=` — CSV export (admin)

---

## 🎨 Frontend Features

### Dashboard (app/admin/page.tsx)
- 5 KPI cards (total inquiries, new inquiries, total contractors, pending verifications, completed work)
- 7-day activity chart with Recharts
- CSV export button
- Quick links to Inquiries and Contractors pages

### Inquiries Management (app/admin/povprasevanja/)
- **List page**: Filter by status, search by name/service/location, pagination
- **Detail page**: Edit all fields, assign contractor, set pricing, add admin notes, update status
- **Email notifications**: Contractor is notified when assigned new inquiry

### Contractors Management (app/admin/obrtniki/)
- **List page**: Filter by status (pending/verified/blocked), view ratings, specialties
- **Verification**: One-click button to verify pending contractors
- **Blocking**: Modal to block contractor with reason, sends email notification
- **Status badges**: Visual indicators for contractor status

---

## 📝 Data Flow Example

**User submits inquiry via wizard form:**
1. POST /api/povprasevanje with {storitev, lokacija, opis, stranka_ime, ...}
2. Inquiry created with status='novo'
3. If obrtnik_id provided, status='dodeljeno' + email sent to contractor

**Admin verifies contractor:**
1. GET /api/obrtniki?admin=true shows all pending contractors
2. Click "Verificiraj" on pending contractor
3. PATCH /api/obrtniki/[id] with {status: 'verified'}
4. Contractor profile moved to 'verified' status
5. Email sent: "Vaš profil je verificiran!"

**Admin assigns inquiry to contractor:**
1. GET /api/povprasevanja shows all inquiries
2. Click inquiry → detail page
3. Select contractor from dropdown
4. Set termin_datum, termin_ura, pricing
5. Change status to 'dodeljeno'
6. PATCH /api/povprasevanje/[id]
7. Contractor receives email notification

---

## 🔍 Audit Trail

Every admin action is logged in `admin_log` table:
```
{
  admin_id: UUID,
  akcija: 'UPDATE', 'VERIFY', 'BLOCK', etc.,
  tabela: 'povprasevanja' or 'obrtniki',
  zapis_id: UUID,
  staro_stanje: {...},  // before update
  novo_stanje: {...},   // after update
  created_at: timestamp
}
```

Query audit log:
```typescript
const { data } = await supabaseAdmin
  .from('admin_log')
  .select('*')
  .order('created_at', { ascending: false })
```

---

## 💡 Next Steps

1. **Connect wizard form** — Update form submission to POST /api/povprasevanje
2. **Contractor login** — Create /obrtnik/dashboard route showing assigned inquiries
3. **Customer dashboard** — Create /povprasevanja page showing inquiry status for customers
4. **Payment integration** — Add Stripe integration for contractor commission payments
5. **Analytics** — Expand admin dashboard with more metrics (completion rate, avg rating, etc.)

---

## 📞 Support

For issues with Supabase:
- Check RLS policies are correctly set
- Verify service_role_key has correct permissions
- Ensure NEXT_PUBLIC_SUPABASE_URL matches project

For API errors:
- Check Authorization header format: `Bearer {token}`
- Verify admin_users record exists in database
- Check RESEND_API_KEY if email notifications fail
