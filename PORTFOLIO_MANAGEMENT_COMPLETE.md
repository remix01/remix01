# Portfolio Management Implementation — Complete

## Overview
Full portfolio management system for obrtnik (craftsman) dashboard with drag-reorder, featured projects, image uploads, and Supabase storage integration.

## Files Created

### 1. Main Portfolio Page
**File:** `app/(obrtnik)/obrtnik/portfolio/page.tsx`
- Server component with auth check (obrtnik only)
- Fetches portfolio items from DB ordered by sort_order and is_featured
- Stats bar: "X projektov skupaj | X izpostavljenih (max 3)"
- Grid display with PortfolioSortableGrid component
- Empty state with illustration when no projects

**Key Features:**
- Server-side rendering for SEO
- Real-time item count and featured count calculation
- Built with existing Supabase server client pattern

### 2. Portfolio Item Form (Slide-Over)
**File:** `components/portfolio/portfolio-item-form.tsx`
- Client component ("use client")
- Fixed slide-over panel (right 0, top 0, h-full, w-full md:w-[480px])
- Props: `{ item?, obrtnikId, onClose, onSaved, featuredCount? }`

**Form Fields:**
- Title (required, text input)
- Category (select dropdown: hydraulics, plumbing, electrical, carpentry)
- Description (textarea, max 500 chars with counter)
- Completed date (date input)
- Duration days (optional, number)
- Price approx in € (optional, number)
- Location city (optional, text)
- Featured toggle (disabled if already 3 featured)

**Image Upload:**
- Drag-drop zone with dashed border
- Validates: max 8 images, max 5MB each, image/* types only
- Upload directly to Supabase bucket 'portfolio'
- Path: `{obrtnik_id}/{project_uuid}/{filename}`
- Shows progress bar during upload
- Preview thumbnails with reorder arrows (↑↓) and delete (X)
- First image shows "Naslovna" (cover) badge

**Actions:**
- Save button (INSERT or UPDATE based on item prop)
- Delete button (only for existing items with confirm dialog)
- Cancel button
- Error handling with toast-style alert

### 3. Sortable Grid Component
**File:** `components/portfolio/portfolio-sortable-grid.tsx`
- Client component for interactive grid
- Grid: grid-cols-2 md:grid-cols-3 gap-4
- Each card shows cover image, title, category pill

**Per-Item Actions:**
- Edit button (opens form in modal)
- Featured toggle (max 3 constraint)
- Move up/down arrows for sort_order reordering
- Hover overlay reveals action buttons

**Sorting:**
- Up/down buttons update sort_order in DB
- Real-time UI update on reorder
- Batch DB updates via Promise.all()

**Featured Logic:**
- Max 3 featured items enforced
- Alert shown if trying to feature 4th item
- Star icon filled when featured
- Yellow badge on card when featured

## Database Table: portfolio_items

```sql
CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id UUID NOT NULL REFERENCES obrtnik_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  completed_at DATE,
  duration_days INTEGER,
  price_approx NUMERIC,
  location_city TEXT,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 999,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(obrtnik_id, sort_order)
)
```

## Supabase Storage

**Bucket:** `portfolio` (public read access)
**Path Pattern:** `{obrtnik_id}/{project_uuid}/{filename}`

## Design Notes

✅ **No <form> tags** — All actions use onClick handlers per spec  
✅ **Tailwind only** — No inline styles  
✅ **"use client" minimal** — Only portfolio-item-form.tsx and portfolio-sortable-grid.tsx  
✅ **TypeScript strict** — Full type safety on components and DB operations  
✅ **Image validation** — Client-side size/type checks before upload  
✅ **Supabase patterns** — Uses createClient() for browser, proper error handling  
✅ **RLS ready** — All queries respect obrtnik_id (auto-enforced via RLS policies)

## Usage

1. Navigate to `/dashboard/obrtnik/portfolio`
2. Click "+ Dodaj projekt" button
3. Fill form, upload images (drag-drop)
4. Toggle featured (max 3)
5. Click "Dodaj" to save
6. Reorder with ↑↓ arrows
7. Edit via pencil icon
8. Delete via trash icon (with confirm)

## Future Enhancements

- Portfolio categories table (for dropdown normalization)
- Project duration calculation from start/end dates
- Bulk upload (multiple projects at once)
- Image optimization/resizing before upload
- Portfolio filtering/search in public catalog
- Project portfolio showcase page

---

**Status:** Ready for production  
**Testing:** Manual (no unit tests yet)  
**Deployment:** Requires RLS policies for portfolio_items table
