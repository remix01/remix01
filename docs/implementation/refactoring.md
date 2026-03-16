# LiftGO Marketplace Refactor - Schema Corrections

## ✅ COMPLETED FIXES

### 1. **lib/dal/obrtniki.ts**
- ✅ Changed table from `obrtniki` to `obrtnik_profiles`
- ✅ Added proper JOIN with `profiles!inner(...)` to get user data
- ✅ Updated interface `ObrtnikiPublic` to match schema fields:
  - `business_name` (not `company_name`)
  - `is_verified` (not `verified`)
  - `avg_rating` (not `rating`)
  - `subscription_tier` ('start' | 'pro')
  - `stripe_customer_id`
- ✅ Simplified filters - removed non-existent `specialnosti` and `lokacije` array filters
- ✅ Added placeholder functions for future `obrtnik_categories` table

### 2. **app/(public)/mojstri/page.tsx**
- ✅ Updated to use correct DAL with proper filtering
- ✅ Removed `specialnosti` and `lokacije` URL params (not applicable to `obrtnik_profiles`)
- ✅ Kept search and rating filters (only valid ones)
- ✅ Fixed props passed to `CatalogFilters` component

### 3. **components/mojstri/MojsterCard.tsx**
- ✅ Updated TypeScript type to match `ObrtnikiPublic` schema
- ✅ Changed field references:
  - `obrtnik.business_name` (was `podjetje`)
  - `obrtnik.avg_rating` (was `ocena`)
  - `obrtnik.is_verified` (was verified flag)
  - `obrtnik.subscription_tier` (new field)
- ✅ Added nested `profiles` object access for user data
- ✅ Removed non-existent fields: `specialnosti`, `lokacije`, `bio`, `leta_izkusenj`

### 4. **components/mojstri/CatalogFilters.tsx**
- ✅ Simplified to only support search and rating filters
- ✅ Removed `specialnosti` and `lokacije` checkbox sections
- ✅ Kept responsive design and URL parameter handling

### 5. **app/(public)/obrtniki/[id]/page.tsx**
- ✅ Updated metadata generation to use correct fields
- ✅ Fixed display logic to use `obrtnik.business_name`
- ✅ Added proper nested profile data access
- ✅ Removed sections for non-existent fields
- ✅ Simplified schema.org markup

## ⚠️ MISSING FUNCTIONALITY

### Category/Specialnosti System
**Status:** TODO - Waiting for `obrtnik_categories` table  
**Current:** Placeholder dummy data returned from `getActiveSpecialnosti()`

```sql
-- Needed table structure:
CREATE TABLE obrtnik_categories (
  id UUID PRIMARY KEY,
  obrtnik_id UUID NOT NULL FOREIGN KEY (obrtnik_profiles.id),
  category_id UUID NOT NULL FOREIGN KEY (categories.id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Locations Filtering
**Status:** Partial - Using `profiles.location_city` instead of array  
**Current:** Filter by `location_city` from joined `profiles` table  
**TODO:** Add dedicated locations table if needed for region/multi-location support

### Reviews/Ratings Display
**Status:** TODO - Need `obrtnik_reviews` table  
**Current:** Only showing `avg_rating` and implicit review count

```sql
-- Needed table structure:
CREATE TABLE obrtnik_reviews (
  id UUID PRIMARY KEY,
  obrtnik_id UUID NOT NULL FOREIGN KEY (obrtnik_profiles.id),
  reviewer_id UUID NOT NULL FOREIGN KEY (profiles.id),
  rating INT (1-5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Portfolio/Gallery
**Status:** TODO - Need storage integration  
**Current:** No portfolio section implemented  
**TODO:** Add Vercel Blob or Supabase Storage integration for images

## 📋 CHECKLIST - What Works Now

- ✅ Catalog page loads with verified obrtniki
- ✅ Search by business_name or description
- ✅ Filter by minimum rating
- ✅ Click card to view detail page
- ✅ Detail page shows business info, subscription tier, location
- ✅ Proper TypeScript types throughout
- ✅ Schema.org structured data for SEO
- ✅ Responsive design

## 🔍 DATA MODEL SUMMARY

### Active Tables Used
```
profiles (base user table)
├── id, email, phone, full_name
├── location_city, location_region
└── role: 'obrtnik' | 'narocnik' | 'admin'

obrtnik_profiles (business details - 1:1 with profiles)
├── id (FK → profiles.id)
├── business_name
├── description
├── is_verified
├── avg_rating
├── subscription_tier ('start' | 'pro')
├── stripe_customer_id
└── created_at
```

### Fields NOT Used (Don't Exist)
- ❌ `obrtniki` table (legacy, doesn't exist)
- ❌ `partners` table (deprecated)
- ❌ `specialnosti[]` array in `obrtnik_profiles`
- ❌ `lokacije[]` array in `obrtnik_profiles`
- ❌ `company_name` (use `business_name`)
- ❌ `verified` (use `is_verified`)

## 🚀 NEXT STEPS

1. **Implement `obrtnik_categories` table** - For proper specialnost filtering
2. **Implement `obrtnik_reviews` table** - For detailed ratings/reviews
3. **Add profile image storage** - For avatar uploads
4. **Add portfolio galleries** - For showcasing work
5. **Implement offer system** - For job matching (separate feature)
