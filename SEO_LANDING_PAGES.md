# SEO Landing Pages Implementation Summary

## Files Created ✅

### 1. `/lib/seo/locations.ts`
- Exports `SLOVENIAN_CITIES` array with 15 major Slovenian cities
- Each city has: `name`, `slug`, `region`
- Helper functions:
  - `getCityBySlug(slug)` - finds city by slug
  - `getCityName(slug)` - returns city name or slug

### 2. `/lib/seo/meta.ts`
- `generateCategoryMeta(params)` - generates SEO meta tags for category pages
  - Returns: title, description, keywords, openGraph
  - Supports both generic (whole Slovenia) and city-specific metadata
  - Example title: "Vodovod v Ljubljani | LiftGO — Preverjeni mojstri"
  
- `generateLocalBusinessSchema(params)` - generates Schema.org JSON-LD
  - Type: Service with LocalBusiness provider
  - Includes AggregateRating from obrtniki data

### 3. `/components/obrtnik-card.tsx`
- Reusable card component for displaying obrtnik profiles
- Shows: avatar, name, location, star rating, review count, bio excerpt
- Links to obrtnik detail page

### 4. `/app/(public)/[category]/page.tsx`
**Dynamic route for: `/vodovodna-dela`, `/elektrika`, etc.**

**Features:**
- `generateStaticParams()` - creates static pages for all active categories at build time
- `generateMetadata()` - dynamic SEO tags per category
- Sections:
  1. Hero with H1: "[CategoryName] v Sloveniji"
  2. Verified obrtniki grid (up to 12)
  3. "How it works" (3-step process)
  4. FAQ with Schema.org markup
  5. Cities grid - links to `/[category]/[city]` pages

**Data fetched:**
- Category details by slug
- Verified obrtniki for this category (ordered by rating)
- Count of obrtniki for display

### 5. `/app/(public)/[category]/[city]/page.tsx`
**Dynamic route for: `/vodovodna-dela/ljubljana`, `/elektrika/maribor`, etc.**

**Features:**
- `generateStaticParams()` - creates 225 pages (15 categories × 15 cities)
- `generateMetadata()` - SEO tags with city-specific text
- Sections:
  1. Hero with H1: "[CategoryName] v [CityName]"
  2. City-specific obrtniki grid
  3. Nearby cities in the same region

**Data fetched:**
- Category by slug
- City by slug
- Verified obrtniki filtered by BOTH category AND city
- Nearby cities in the same region

### 6. `/app/sitemap.ts` (Updated)
- Now async function
- Generates dynamic sitemap including:
  - Static pages (homepage, about, faq, etc.)
  - All category pages: `/[category]` (0.9 priority)
  - All category+city pages: `/[category]/[city]` (0.8 priority)
  - Total: ~225+ URLs for maximum SEO coverage

### 7. `/app/robots.ts` (Updated)
- Added `/narocnik/` and `/obrtnik/` to disallow list (user dashboards)
- Already had: `/partner-auth/`, `/partner-dashboard/`, `/api/`, `/admin/`
- Continues to block AI scrapers (GPTBot, Claude-Web, etc.)

## SEO Schema Markup ✅

### H1 Format
- **Category pages:** `<h1>[CategoryName] v Sloveniji</h1>`
- **City pages:** `<h1>[CategoryName] v [CityName]</h1>`

### JSON-LD Schemas Implemented
1. **FAQ Schema** - on category pages
   - 4 FAQ items with Question/Answer structure
   
2. **LocalBusiness Schema** - on all pages
   - Includes AggregateRating from verified obrtniki
   - Shows average rating and review count

## Static Generation

### Build Time Static Pages
- All category pages generated from database categories
- All 225 (category × city) combinations generated
- Efficient incremental static regeneration (ISR) compatible

### Database Queries Used
1. `getActiveCategories()` - all categories from DB
2. `getCategoryBySlug(slug)` - single category lookup
3. `listObrtniki(filters)` - with filters:
   - `category_id`
   - `location_city`
   - `is_available: true`
   - `min_rating` (optional)

## URL Structure

```
/ (homepage)
/[category]
  /vodovodna-dela
  /elektrika
  /...15 categories total

/[category]/[city]
  /vodovodna-dela/ljubljana
  /vodovodna-dela/maribor
  /elektrika/celje
  /...225 total combinations
```

## Files Modified
- ✅ `/app/sitemap.ts` - Added dynamic category and city pages
- ✅ `/app/robots.ts` - Added `/narocnik/` and `/obrtnik/` to disallow

## Testing Checklist

1. **Build-time static generation:**
   - Run `npm run build` and verify all category pages are pre-rendered
   - Check that 225+ pages are generated

2. **Metadata validation:**
   - Test H1 format: Should be "Category Name v City" format
   - Check title tags in HTML source

3. **Schema validation:**
   - Use Google Rich Results test: https://search.google.com/test/rich-results
   - Validate FAQ schema structure
   - Validate LocalBusiness schema

4. **Sitemap:**
   - Visit `/sitemap.xml` to verify all pages are included
   - Should show 200+ URLs for max SEO coverage

5. **Robots.txt:**
   - Visit `/robots.txt` to verify disallow rules
   - Confirm sitemap URL is listed

## Performance Notes
- ✅ Static generation at build time = instant page loads
- ✅ No runtime queries for category/city listings (pre-rendered)
- ✅ Database only queried for obrtniki filtering
- ✅ Schema.org markup reduces need for structured data fetching
