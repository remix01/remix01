# LiftGO Marketplace - Implementation Status

## ✅ COMPLETED & WORKING

### Database Layer
- ✅ Supabase migration 004 executed successfully
- ✅ Tables created: profiles, obrtnik_profiles, categories, obrtnik_categories, povprasevanja, ponudbe, ocene
- ✅ RLS policies configured
- ✅ 15 service categories seeded
- ✅ Data access layer complete: lib/liftgo/*.ts (profiles, categories, povprasevanja, ponudbe, ocene)

### Types
- ✅ types/liftgo.types.ts created with all TypeScript interfaces and enums

### Shared Components (components/liftgo/)
- ✅ RatingStars.tsx
- ✅ StatusBadge.tsx
- ✅ UrgencyBadge.tsx
- ✅ CategoryCard.tsx
- ✅ ObrnikCard.tsx
- ✅ PovprasevanjeCard.tsx
- ✅ PonudbaCard.tsx

### Layouts
- ✅ /app/(auth)/layout.tsx - Auth pages layout with LiftGO branding
- ✅ /app/(public)/layout.tsx - Public layout with full navigation, user auth state
- ✅ /app/(narocnik)/layout.tsx - Naročnik dashboard with sidebar navigation

### Auth Pages
- ✅ /app/(auth)/prijava/page.tsx - Login page exists
- ✅ /app/(auth)/registracija/page.tsx - Registration page exists

### Naročnik Pages
- ✅ /app/(narocnik)/dashboard/page.tsx
- ✅ /app/(narocnik)/novo-povprasevanje/page.tsx
- ✅ /app/(narocnik)/povprasevanja/page.tsx
- ✅ /app/(narocnik)/povprasevanja/[id]/page.tsx
- ✅ /app/(narocnik)/profil/page.tsx

### Obrtnik Pages
- ✅ /app/(obrtnik)/obrtnik/dashboard/page.tsx
- ✅ /app/(obrtnik)/obrtnik/povprasevanja/page.tsx
- ✅ /app/(obrtnik)/obrtnik/povprasevanja/[id]/page.tsx
- ✅ /app/(obrtnik)/obrtnik/ponudbe/page.tsx
- ✅ /app/(obrtnik)/obrtnik/profil/page.tsx

### Public Pages
- ✅ /app/(public)/obrtniki/page.tsx - Obrtniki listing
- ✅ /app/(public)/obrtniki/[id]/page.tsx - Obrtnik public profile

---

## ⚠️ ISSUES TO FIX

### 1. Middleware Configuration
**File:** `/middleware.ts`

**Problem:** Middleware checks for `profile.user_type` but the database schema uses `profile.role`

**Fix needed:** Update all occurrences of `user_type` to `role` in middleware.ts

Lines to change:
- Line 60: `.select('user_type')` → `.select('role')`
- Line 64: `profile?.user_type !== 'narocnik'` → `profile?.role !== 'narocnik'`
- Line 67: `profile?.user_type === 'obrtnik'` → `profile?.role === 'obrtnik'`
- Line 85: `.select('user_type')` → `.select('role')`
- Line 89: `profile?.user_type !== 'obrtnik'` → `profile?.role !== 'obrtnik'`
- Line 92: `profile?.user_type === 'narocnik'` → `profile?.role === 'narocnik'`

### 2. Missing Obrtnik Layout
**File:** `/app/(obrtnik)/obrtnik/layout.tsx` (DOES NOT EXIST)

**Problem:** Obrtnik pages exist but there's no layout wrapper

**Fix needed:** Create layout similar to narocnik layout with:
- Sidebar navigation for: Dashboard, Povpraševanja, Moje ponudbe, Ocene, Profil
- Auth check: redirect if not logged in or if role !== 'obrtnik'
- Logo and logout button

### 3. Naročnik Route Protection
**Problem:** Middleware protects old routes `/dashboard`, `/novo-povprasevanje` but actual routes are `/narocnik/dashboard`, `/narocnik/novo-povprasevanje`

**Fix needed:** Update middleware line 42-73 to protect `/narocnik/*` instead of individual routes

---

## 📝 RECOMMENDED UPDATES

### Update middleware.ts protection

Replace lines 42-73 with:

```typescript
// Protected naročnik routes - require authentication and naročnik role
if (request.nextUrl.pathname.startsWith('/narocnik')) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/prijava'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  // Check if user has naročnik role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'narocnik') {
    // Not a naročnik → redirect to obrtnik dashboard or homepage
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'obrtnik' ? '/obrtnik/dashboard' : '/'
    return NextResponse.redirect(url)
  }
}
```

### Update obrtnik middleware protection

Replace lines 74-96 with:

```typescript
// Protected obrtnik routes - require authentication and obrtnik role
if (request.nextUrl.pathname.startsWith('/obrtnik')) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/prijava'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  
  // Check if user has obrtnik role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'obrtnik') {
    // Not an obrtnik → redirect to narocnik dashboard or homepage
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'narocnik' ? '/narocnik/dashboard' : '/'
    return NextResponse.redirect(url)
  }
}
```

---

## 🎨 DESIGN SYSTEM

The existing design system uses:
- **Primary color:** Teal/green (--primary: 168 76% 32%)
- **Accent color:** Orange (--accent: 25 95% 53%)
- **Border radius:** 0.625rem (10px)
- **Fonts:** Inter (body), DM Sans (display)
- **Card style:** Subtle borders, white/card backgrounds
- **Button style:** Rounded, solid primary or outline variants
- **Badge style:** Colored backgrounds with matching text (bg-blue-100 text-blue-700 pattern)

All new components already match this design system.

---

## ✅ NEXT STEPS

1. Fix middleware.ts (user_type → role) ✓
2. Create obrtnik layout.tsx ✓  
3. Test auth flows
4. Verify all pages render correctly
5. Test form submissions
6. Verify RLS policies work as expected

---

## 📂 PROJECT STRUCTURE

```
app/
├── (auth)/
│   ├── layout.tsx ✓
│   ├── prijava/page.tsx ✓
│   └── registracija/page.tsx ✓
├── (public)/
│   ├── layout.tsx ✓
│   ├── obrtniki/
│   │   ├── page.tsx ✓
│   │   └── [id]/page.tsx ✓
│   └── page.tsx (homepage)
├── (narocnik)/
│   ├── layout.tsx ✓
│   ├── dashboard/page.tsx ✓
│   ├── novo-povprasevanje/page.tsx ✓
│   ├── povprasevanja/
│   │   ├── page.tsx ✓
│   │   └── [id]/page.tsx ✓
│   └── profil/page.tsx ✓
├── (obrtnik)/obrtnik/
│   ├── layout.tsx ⚠️ MISSING
│   ├── dashboard/page.tsx ✓
│   ├── povprasevanja/
│   │   ├── page.tsx ✓
│   │   └── [id]/page.tsx ✓
│   ├── ponudbe/page.tsx ✓
│   └── profil/page.tsx ✓
└── admin/ (DO NOT TOUCH - working)

components/liftgo/ ✓
lib/liftgo/ ✓
types/liftgo.types.ts ✓
```
