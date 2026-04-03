# Automatic Category Creation Feature

## Overview

The automatic category creation feature allows users to create custom categories on-the-fly when submitting a povpraševanje (service request) if their desired category doesn't exist in the predefined list. This feature:

- **Auto-creates categories** from user input with validation and rate limiting
- **Generates URL-safe slugs** with support for Slovenian characters
- **Prevents abuse** with Redis-based rate limiting (10 per user/hour, 100 per IP/day)
- **Maintains backward compatibility** with existing category selection flow
- **Tracks auto-created categories** for future review and management

## Architecture

### Database Schema Changes

**File**: `supabase/migrations/20250401_add_parent_category.sql`

New columns added to `categories` table:
- `parent_id` (UUID, nullable) - For future category hierarchy support
- `is_auto_created` (BOOLEAN, default: false) - Tracks user-submitted categories
- Indexes on `parent_id` and slug for performance

### Backend Components

#### 1. Slugify Utility
**File**: `lib/utils/slugify.ts`

```typescript
slugify('Čiščenje') // => 'ciscenje'
slugify('Elektrika - Popravila') // => 'elektrika-popravila'
```

Features:
- Slovenian character support (č, š, ž)
- Removes special characters except spaces and hyphens
- Converts to lowercase and collapses multiple hyphens

#### 2. Rate Limiter
**File**: `lib/utils/rateLimiter.ts`

Uses Upstash Redis for distributed rate limiting:
- `checkUserRateLimit(userId)` - 10 creations/hour per user
- `checkIpRateLimit(ipAddress)` - 100 creations/day per IP

Returns:
```typescript
{
  allowed: boolean
  remaining: number
  resetAt: Date
}
```

#### 3. Categories DAL
**File**: `lib/dal/categories.ts`

New function: `getOrCreateCategory(name, userId?, ipAddress?)`

Flow:
1. Validates category name (2-100 chars, allowed characters)
2. Checks rate limits if user/IP provided
3. Searches for existing category (case-insensitive)
4. If found, returns existing category ID
5. If not found, creates new category with:
   - Generated slug
   - `is_auto_created: true`
   - Default icon
   - Timestamp

#### 4. Povprasevanja DAL Update
**File**: `lib/dal/povprasevanja.ts`

Modified `createPovprasevanje()` signature:

```typescript
createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  options?: {
    categoryName?: string      // For auto-creation
    userId?: string            // For rate limiting
    ipAddress?: string         // For rate limiting
  }
)
```

### Frontend Updates

**File**: `app/(narocnik)/novo-povprasevanje/page.tsx`

Changes:
- Added `customCategoryName` state
- Added "Other / Custom category" section below predefined categories
- Text input with real-time validation (2-100 characters)
- Updated validation logic to accept either selected category OR custom category
- Updated submit handler to pass `categoryName` to `createPovprasevanje()`

## Usage Flow

### User Journey

1. **Step 1 - Category Selection**
   - User sees predefined categories
   - If category exists, selects it
   - If not found, enters custom category name
   - Form validates: name must be 2-100 characters

2. **Step 2-3** - Normal flow (description, location, budget)

3. **Step 4** - Submission
   - If custom category used, backend:
     - Checks rate limits
     - Generates slug
     - Looks up existing category (case-insensitive)
     - Creates if needed
   - Povpraševanje created with appropriate category_id

### API Integration

When submitting from frontend:

```typescript
await createPovprasevanje(povprasevanje, {
  categoryName: 'Elektrika - Popravila',
  userId: user.id,
  ipAddress: requestIpAddress // Would be extracted from headers server-side
})
```

## Validation & Error Handling

### Category Name Validation

✓ **Valid**:
- 2-100 characters
- Letters, numbers, spaces, hyphens, ampersand (&)
- Examples: "Elektrika - Popravila", "Gradbeništvo"

✗ **Invalid**:
- Too short (< 2 chars)
- Too long (> 100 chars)
- Special characters (@, #, $, etc.)
- Empty or whitespace only

### Rate Limiting

**Per User (Hourly)**:
- Limit: 10 category creations
- Window: 1 hour
- Error: "Prekoračili ste limit ustvarjanja kategorij..."

**Per IP (Daily)**:
- Limit: 100 category creations
- Window: 24 hours
- Error: "Prekoračili ste limit ustvarjanja kategorij z te IP naslova"

**Graceful Degradation**: If Redis is unavailable, rate limits are bypassed (fail-open)

## Database Considerations

### RLS Policies
- Auto-created categories are `is_active: true` by default
- Follow existing RLS patterns for categories table
- All users can read active categories

### Indexing
- `idx_categories_parent_id` - For hierarchy queries
- `idx_categories_slug_unique_active` - For active category lookups

### Data Cleanup
- Periodic task (optional) to archive unused auto-created categories
- Mark `is_active: false` if no povprasevanja exist for that category in 30+ days

## Future Enhancements

1. **Category Hierarchy**
   - Use `parent_id` to create category trees
   - "Elektrika" > "Popravila" > "Elektrika - Popravila"

2. **Admin Review**
   - Dashboard to approve/reject auto-created categories
   - Merge duplicate categories

3. **Analytics**
   - Track which categories are frequently created
   - Suggestions for new predefined categories

4. **Smart Suggestions**
   - Show similar existing categories before allowing creation
   - Fuzzy matching on category names

## Deployment Checklist

- [ ] Run migration: `20250401_add_parent_category.sql`
- [ ] Deploy backend code (utilities, DAL updates)
- [ ] Deploy frontend updates
- [ ] Verify Redis/Upstash connection
- [ ] Test category creation with valid/invalid names
- [ ] Test rate limiting
- [ ] Monitor for spam/abuse patterns
- [ ] Update API documentation
- [ ] Notify users of new feature

## Testing

### Manual Testing

1. **Valid Category Creation**
   ```
   Input: "Čiščenje stanovanja"
   Expected: New category created with slug "ciscenje-stanovanja"
   ```

2. **Duplicate Prevention**
   ```
   Input: "Elektrika" (twice)
   Expected: Same category returned both times
   ```

3. **Rate Limiting**
   ```
   Action: Create 11 categories as same user within 1 hour
   Expected: 11th fails with rate limit error
   ```

4. **Invalid Input**
   ```
   Input: "ab" (too short)
   Expected: Validation error before submission
   ```

### Automated Testing

Run test script:
```bash
node scripts/test-category-creation.js --env-file=.env.development.local
```

## Troubleshooting

### Issue: "Prekoračili ste limit ustvarjanja kategorij..."
- **Cause**: User exceeded rate limit
- **Solution**: Wait until reset time shown in error message

### Issue: Custom category not appearing
- **Check**: Is the category `is_active: true` in database?
- **Check**: Did the creation actually succeed? Check browser console
- **Check**: Reload page to see newly created category

### Issue: Redis connection failed
- **Cause**: Upstash credentials missing or invalid
- **Solution**: Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
- **Note**: Feature will work with rate limiting disabled if Redis unavailable

## Files Modified

1. `supabase/migrations/20250401_add_parent_category.sql` - NEW
2. `lib/utils/slugify.ts` - NEW
3. `lib/utils/rateLimiter.ts` - NEW
4. `lib/dal/categories.ts` - Added `getOrCreateCategory()`
5. `lib/dal/povprasevanja.ts` - Updated `createPovprasevanje()`
6. `app/(narocnik)/novo-povprasevanje/page.tsx` - Added custom category UI
