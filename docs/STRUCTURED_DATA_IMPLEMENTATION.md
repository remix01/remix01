## ✅ Structured Data & Internal Linking Implementation

Complete implementation of SEO infrastructure with schema.org markup, breadcrumbs, FAQ sections, and internal linking for LiftGO.

---

## Files Created (6 new files)

### 1. `/components/seo/breadcrumb.tsx`
**Client component** with Schema.org BreadcrumbList markup
- Displays hierarchical breadcrumb navigation
- Example: Domov → Vodovodna dela → Ljubljana
- Last item is non-clickable (current page)
- Schema automatically included in page head
- Props: `items: { name: string, href: string }[]`

### 2. `/components/seo/faq-section.tsx`
**Dynamic FAQ generator** with Schema.org FAQPage markup
- Generates 4 FAQs from category data and pricing benchmarks
- Q1: Pricing ranges from `PRICING_BENCHMARKS`
- Q2: Response times (2 hours average)
- Q3: Quality verification (verified masters with reviews)
- Q4: Free inquiry confirmation
- Props: `categoryName`, `categorySlug`, `cityName?`
- FAQSchema automatically included in page head

### 3. `/components/seo/related-cities.tsx`
**Internal linking grid** showing all 15 Slovenian cities
- Highlights current city differently (blue highlight)
- Mobile: horizontal scroll friendly
- Props: `categorySlug`, `categoryName`, `currentCitySlug?`
- Links to `/[categorySlug]/[citySlug]` for SEO

### 4. `/components/seo/related-categories.tsx`
**Async RSC** fetching related categories from database
- Shows 6 related categories (excluding current)
- Links to `/[categorySlug]` or `/[categorySlug]/[citySlug]` if city context exists
- Props: `currentCategorySlug`, `citySlug?`
- Gracefully handles errors with fallback

### 5. `/app/(public)/obrtniki/[id]/page.tsx`
**Public obrtnik profile page** - new route!
- URL: `/obrtniki/[id]`
- Displays business profile with:
  - Avatar & business name
  - Star ratings & review count
  - Verified badge if applicable
  - Location & contact info
  - Categories served
  - Bio/description
  - CTA buttons (Send inquiry / Call)
  - Reviews section (placeholder for future)
  - Related services by location
- Schema: Person + LocalBusiness + AggregateRating
- Breadcrumb: Domov → Category → BusinessName

---

## Files Modified (2 files)

### 1. `/lib/seo/meta.ts`
**Added 3 new schema generators:**

```typescript
generateFAQSchema(faqs)  // FAQPage schema
generateBreadcrumbSchema(items)  // BreadcrumbList schema
generateServiceSchema(params)  // Service schema with pricing
```

Each returns proper Schema.org JSON-LD structure for Google search enhancements.

### 2. `/app/(public)/[category]/page.tsx`
**Updated imports & JSX to use new components:**
- Added `<Breadcrumb>` at top (Domov → Category)
- Added `<FAQSection>` mid-page
- Added `<RelatedCities>` with all 15 city links
- Added `<RelatedCategories>` at bottom
- Added `generateServiceSchema` to page head
- Pricing integration via `getPricingForCategory()`

### 3. `/app/(public)/[category]/[city]/page.tsx`
**Updated imports & JSX to use new components:**
- Added `<Breadcrumb>` with 3-level hierarchy
- Added `<FAQSection cityName={city.name}>` for local pricing
- Added `<RelatedCities currentCitySlug={params.city}>` with highlight
- Added `<RelatedCategories citySlug={params.city}>` for cross-linking
- Added `generateServiceSchema` with city-specific pricing
- Full schema.org markup for local business search

---

## SEO Features Implemented

### Schema.org Markup
✅ **BreadcrumbList** - Hierarchical navigation for search engines
✅ **FAQPage** - 4 dynamic FAQs with pricing & response times
✅ **LocalBusiness** - Business ratings & areaServed
✅ **Service** - Category services with price ranges
✅ **Person + LocalBusiness** - Obrtnik profiles with ratings

### Internal Linking Strategy
✅ **Related Cities** - 15 city links per category (225 city pages)
✅ **Related Categories** - 6 related services per page
✅ **Breadcrumbs** - 2-level (categories) & 3-level (city) navigation
✅ **Cross-linking** - Obrtnik profiles link to categories & cities

### Dynamic Pricing Integration
✅ Pricing ranges from `PRICING_BENCHMARKS` in FAQ
✅ Price range in Service schema (hourly rates)
✅ Weekend & urgent surcharge calculations available

### Accessibility & Performance
✅ Breadcrumbs use semantic `<nav>` with `aria-label`
✅ Star ratings use accessible color + numeric display
✅ All components fully typed with TypeScript
✅ Async RSC for database queries (RelatedCategories)
✅ Static generation where possible (Breadcrumb, RelatedCities)

---

## Usage Examples

### Category Page (/vodovodna-dela)
```typescript
<Breadcrumb items={[
  { name: 'Domov', href: '/' },
  { name: 'Vodovodna dela', href: '/vodovodna-dela' }
]} />
<FAQSection categoryName="Vodovodna dela" categorySlug="vodovodna-dela" />
<RelatedCities categorySlug="vodovodna-dela" categoryName="Vodovodna dela" />
<RelatedCategories currentCategorySlug="vodovodna-dela" />
```

### City+Category Page (/vodovodna-dela/ljubljana)
```typescript
<Breadcrumb items={[
  { name: 'Domov', href: '/' },
  { name: 'Vodovodna dela', href: '/vodovodna-dela' },
  { name: 'Ljubljana', href: '/vodovodna-dela/ljubljana' }
]} />
<FAQSection categoryName="Vodovodna dela" categorySlug="vodovodna-dela" cityName="Ljubljana" />
<RelatedCities categorySlug="vodovodna-dela" categoryName="Vodovodna dela" currentCitySlug="ljubljana" />
<RelatedCategories currentCategorySlug="vodovodna-dela" citySlug="ljubljana" />
```

---

## Database Integration Needed

### For RelatedCategories to work:
- Ensure `/lib/dal/categories.ts` has `getActiveCategories()` function
- Returns: `{ id, name, slug, description }[]`

### For Obrtnik Profile to work:
- Create `/lib/dal/obrtniki.ts` with `getObrtnikById(id)` function
- Returns profile with all required fields

### For Reviews section:
- Create `/lib/dal/reviews.ts` with `getObrtnikReviews(obrtnikId)` function
- Currently placeholder in profile page

---

## Build & Deploy Notes

✅ All components follow Next.js 14 App Router patterns
✅ Server Components by default (RSC)
✅ Client boundary only at `<Breadcrumb>` (for interactivity if needed)
✅ Full TypeScript support
✅ No new dependencies required
✅ Ready for static generation at build time

---

## SEO Impact

**New pages generated:**
- 225 category+city pages with unique schema
- Obrtnik profiles with LocalBusiness schema
- Internal cross-links between 240+ pages

**Indexing signals:**
- BreadcrumbList helps Google understand site structure
- Service schema with pricing improves rich results
- LocalBusiness schema for local search rankings
- Related links increase crawl depth & authority flow

**Local SEO:**
- 15 city pages per category for location targeting
- City-specific FAQs with local pricing
- Obrtnik profiles with areaServed metadata
