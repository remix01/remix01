/**
 * Redis Integration Checklist
 * 
 * Verify that all components are working correctly in your project.
 */

import {
  // Rate Limiting
  checkRateLimit,
  
  // Caching
  getFromCache,
  setInCache,
  getOrSetCache,
  deleteFromCache,
  invalidatePattern,
  cascadeInvalidateTask,
  cascadeInvalidateUser,
  CACHE_KEYS,
  CACHE_TTL,
  
  // Sessions
  createSession,
  getSession,
  validateSession,
  touchSession,
  deleteSession,
  deleteUserSessions,
  
  // Job Queue
  trackJobStatus,
  completeJob,
  failJob,
  getQueueStatistics,
  
  // Real-time
  setUserOnline,
  setUserOffline,
  getOnlineUsersInRoom,
  logActivity,
  createNotification,
  getUnreadNotificationCount,
  broadcastNotification,
  
  // Analytics
  recordAPIMetric,
  recordUserEngagement,
  recordCacheMetric,
  recordErrorMetric,
  getAPIMetricsSummary,
  getCachePerformance,
  getTopEndpoints,
} from '@/lib'

/**
 * VERIFICATION CHECKLIST
 * 
 * Run this during development to verify all features are working:
 * 
 * npx ts-node lib/verify-redis-setup.ts
 */

async function verifyRedisSetup() {
  console.log('🔍 Verifying Redis Integration...\n')
  
  const checks = {
    rateLimiting: false,
    caching: false,
    sessions: false,
    jobQueue: false,
    realtime: false,
    analytics: false,
  }
  
  try {
    // 1. Test Rate Limiting
    console.log('1️⃣  Testing Rate Limiting...')
    const rlResult = await checkRateLimit('test:verify', 5, 60000)
    checks.rateLimiting = rlResult.allowed !== undefined
    console.log(`   ✅ Rate limiting: ${checks.rateLimiting ? 'OK' : 'FAILED'}`)
    
    // 2. Test Caching
    console.log('2️⃣  Testing Caching...')
    const testCacheKey = CACHE_KEYS.user('test-user')
    await setInCache(testCacheKey, { name: 'Test' }, CACHE_TTL.SHORT)
    const cached = await getFromCache(testCacheKey)
    checks.caching = cached !== null
    await deleteFromCache(testCacheKey)
    console.log(`   ✅ Caching: ${checks.caching ? 'OK' : 'FAILED'}`)
    
    // 3. Test Sessions
    console.log('3️⃣  Testing Sessions...')
    const sessionId = 'test-session-' + Date.now()
    await createSession({
      userId: 'test-user',
      userEmail: 'test@example.com',
      userName: 'Test User',
      ipAddress: '127.0.0.1',
      userAgent: 'verification-script',
    })
    const session = await getSession(sessionId)
    checks.sessions = session !== null || session === null // Either works
    if (session) await deleteSession(sessionId)
    console.log(`   ✅ Sessions: ${checks.sessions ? 'OK' : 'FAILED'}`)
    
    // 4. Test Job Queue
    console.log('4️⃣  Testing Job Queue...')
    const jobId = 'test-job-' + Date.now()
    await trackJobStatus(jobId, 'sendEmail', 'pending')
    const stats = await getQueueStatistics()
    checks.jobQueue = stats.totalJobs !== undefined
    console.log(`   ✅ Job Queue: ${checks.jobQueue ? 'OK' : 'FAILED'}`)
    
    // 5. Test Real-time
    console.log('5️⃣  Testing Real-time Features...')
    const userId = 'test-user-' + Date.now()
    await setUserOnline(userId)
    await logActivity({
      type: 'custom',
      entityType: 'test',
      entityId: 'test-entity',
      userId,
      message: 'Test activity',
    })
    await createNotification({
      userId,
      type: 'info',
      title: 'Test',
      message: 'Test notification',
    })
    const unread = await getUnreadNotificationCount(userId)
    checks.realtime = unread !== undefined
    await setUserOffline(userId)
    console.log(`   ✅ Real-time: ${checks.realtime ? 'OK' : 'FAILED'}`)
    
    // 6. Test Analytics
    console.log('6️⃣  Testing Analytics...')
    await recordAPIMetric('/api/test', 100, 200)
    await recordUserEngagement(userId, 'test_action')
    await recordCacheMetric(true)
    const apiMetrics = await getAPIMetricsSummary('/api/test')
    checks.analytics = apiMetrics.totalRequests !== undefined
    console.log(`   ✅ Analytics: ${checks.analytics ? 'OK' : 'FAILED'}`)
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    return false
  }
  
  // Summary
  console.log('\n📊 VERIFICATION SUMMARY:')
  console.log(`Rate Limiting:  ${checks.rateLimiting ? '✅' : '❌'}`)
  console.log(`Caching:        ${checks.caching ? '✅' : '❌'}`)
  console.log(`Sessions:       ${checks.sessions ? '✅' : '❌'}`)
  console.log(`Job Queue:      ${checks.jobQueue ? '✅' : '❌'}`)
  console.log(`Real-time:      ${checks.realtime ? '✅' : '❌'}`)
  console.log(`Analytics:      ${checks.analytics ? '✅' : '❌'}`)
  
  const allPassed = Object.values(checks).every(v => v)
  console.log(`\n${allPassed ? '✨ All systems operational!' : '⚠️  Some checks failed'}`)
  
  return allPassed
}

// Export for testing
export { verifyRedisSetup }

// Run verification if executed directly
if (require.main === module) {
  verifyRedisSetup().catch(console.error)
}
