# Automatic Category Creation - Deployment Checklist

## Pre-Deployment Verification ✅

- [x] TypeScript compilation successful
- [x] All imports resolved
- [x] Next.js build passing
- [x] No type errors
- [x] Code follows project conventions
- [x] Backward compatible with existing code

## Files Created/Modified ✅

### New Files
- [x] `supabase/migrations/20250401_add_parent_category.sql` - Database schema
- [x] `lib/utils/slugify.ts` - Slug generation utility
- [x] `lib/utils/rateLimiter.ts` - Rate limiting with Redis
- [x] `docs/CATEGORY_CREATION.md` - Feature documentation
- [x] `scripts/test-category-creation.js` - Test script

### Modified Files
- [x] `lib/dal/categories.ts` - Added `getOrCreateCategory()` function
- [x] `lib/dal/povprasevanja.ts` - Updated `createPovprasevanje()` signature
- [x] `app/(narocnik)/novo-povprasevanje/page.tsx` - Added custom category UI

## Pre-Deployment Tasks

### 1. Environment Variables Setup
Before deploying to production, ensure these are set:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 2. Database Migration
Run this on your Supabase instance:
```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
# Copy content of supabase/migrations/20250401_add_parent_category.sql
# Paste into SQL Editor and execute
```

### 3. Test in Staging
Before production deployment:
1. Deploy code to staging environment
2. Run database migration on staging
3. Test category creation with valid names
4. Test rate limiting (create 11 categories as same user)
5. Test rate limiting (create 100 categories from same IP)
6. Verify duplicate detection works
7. Verify Slovenian character support in slugs
8. Check error messages display correctly

### 4. Monitoring Setup
Set up monitoring for:
- Redis connection health
- Rate limiting hit rates
- Category creation errors
- Invalid input attempts
- Auto-created category counts

## Deployment Steps

### Step 1: Code Deployment
```bash
# Push code to your repository
git add .
git commit -m "feat: automatic category creation for povprasevanja"
git push origin main

# Or deploy directly if using Vercel
# Changes will auto-deploy on push
```

### Step 2: Database Migration
```bash
# If using Supabase CLI
cd /vercel/share/v0-project
supabase db push

# Verify migration ran successfully
# Check Supabase Dashboard > SQL Editor > Migrations tab
```

### Step 3: Verify Deployment
```bash
# Test the API endpoint
curl -X POST https://your-app.com/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "narocnik_id": "user-id",
    "title": "Test Request",
    "description": "Test description with at least 20 characters",
    "location_city": "Ljubljana",
    "category_name": "Elektrika - Popravila"
  }'

# Expected response: Successfully created povprasevanje with auto-created category
```

### Step 4: Monitor First 24 Hours
- Check application logs for errors
- Monitor Redis connection status
- Watch for abuse patterns (spam categories)
- Verify rate limiting is working
- Check database performance with new indexes

## Post-Deployment

### Monitoring Dashboard Setup (Optional)
Create monitoring queries:

```sql
-- Track new auto-created categories
SELECT id, name, slug, created_at 
FROM categories 
WHERE is_auto_created = true 
ORDER BY created_at DESC 
LIMIT 20;

-- Check for rate limit abuses
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as category_count 
FROM categories 
WHERE is_auto_created = true 
GROUP BY hour 
ORDER BY hour DESC;

-- Monitor failed validations (from logs)
SELECT COUNT(*) as validation_errors 
FROM logs 
WHERE message LIKE '%category validation failed%' 
AND timestamp > NOW() - INTERVAL '1 day';
```

### Health Checks
Daily for first week:
1. Check Redis connectivity status
2. Review error logs for any issues
3. Monitor rate limiting effectiveness
4. Verify no category creation timeouts
5. Check database query performance

## Rollback Plan

If issues occur, rollback is straightforward:

### Code Rollback
```bash
# Revert to previous version
git revert <commit-hash>
git push

# Or redeploy previous version from Vercel dashboard
```

### Database Rollback (if needed)
```sql
-- Revert migration (careful - this will drop the new columns)
-- Only if absolutely necessary
ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;
ALTER TABLE categories DROP COLUMN IF EXISTS is_auto_created;
DROP INDEX IF EXISTS idx_categories_parent_id;
DROP INDEX IF EXISTS idx_categories_slug_unique_active;
```

## Sign-Off Checklist

Before going live, confirm:

- [ ] All environment variables set correctly
- [ ] Database migration applied successfully
- [ ] Staging environment tested thoroughly
- [ ] No errors in application logs
- [ ] Rate limiting verified working
- [ ] Redis connection stable
- [ ] Team notified of new feature
- [ ] Documentation updated/shared
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

## Success Criteria

Feature is successfully deployed when:

✅ Users can create custom categories during request submission
✅ Existing category selection still works
✅ Rate limiting prevents spam
✅ Slovenian characters handled correctly
✅ Duplicate categories detected and reused
✅ No performance degradation
✅ Error messages are user-friendly
✅ All tests passing in production

## Support & Documentation

- **Main Documentation**: `docs/CATEGORY_CREATION.md`
- **Implementation Summary**: `CATEGORY_IMPLEMENTATION.md`
- **For Questions**: Review docs or check browser console for detailed errors

## Timeline

- **Pre-deployment**: 15-30 minutes
- **Deployment**: 5-10 minutes
- **Verification**: 15-20 minutes
- **Total**: ~1 hour (low-risk deployment)

---

**Date Prepared**: April 1, 2026
**Status**: Ready for Deployment
**Risk Level**: Low (backward compatible, feature-flagged)
**Estimated Downtime**: 0 minutes (rolling deployment)
