#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests the Upstash Redis connection using environment variables
 */

import { Redis } from '@upstash/redis'

async function testRedisConnection() {
  console.log('[Test] Starting Redis connection test...\n')

  // Check environment variables
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

  console.log('[Config] Checking environment variables...')
  if (!url) {
    console.error('❌ Missing KV_REST_API_URL or UPSTASH_REDIS_REST_URL')
    process.exit(1)
  }
  if (!token) {
    console.error('❌ Missing KV_REST_API_TOKEN or UPSTASH_REDIS_REST_TOKEN')
    process.exit(1)
  }
  console.log('✓ Environment variables are set\n')

  // Initialize Redis client
  console.log('[Client] Initializing Redis client...')
  const redis = new Redis({ url, token })
  console.log('✓ Redis client created\n')

  try {
    // Test 1: Ping
    console.log('[Test 1] Sending PING command...')
    const pingResult = await redis.ping()
    console.log(`✓ PING response: ${pingResult}\n`)

    // Test 2: Set a test key
    console.log('[Test 2] Setting test key...')
    await redis.set('test-connection-key', 'Hello from v0!', { ex: 60 })
    console.log('✓ Successfully set test key\n')

    // Test 3: Get the test key
    console.log('[Test 3] Getting test key...')
    const testValue = await redis.get('test-connection-key')
    console.log(`✓ Retrieved value: "${testValue}"\n`)

    // Test 4: Get Redis INFO
    console.log('[Test 4] Getting Redis INFO...')
    const info = await redis.info?.()
    if (info) {
      const infoLines = String(info).split('\r\n').slice(0, 10)
      console.log('✓ Redis INFO (first 10 lines):')
      infoLines.forEach(line => {
        if (line && !line.startsWith('#')) {
          console.log(`  ${line}`)
        }
      })
    }
    console.log()

    // Test 5: List keys
    console.log('[Test 5] Scanning keys...')
    const keys = await redis.keys('*')
    console.log(`✓ Found ${keys.length} keys in Redis\n`)

    // Cleanup
    console.log('[Cleanup] Removing test key...')
    await redis.del('test-connection-key')
    console.log('✓ Test key removed\n')

    console.log('✅ All Redis connection tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Redis connection test failed!')
    console.error('Error:', error.message)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    process.exit(1)
  }
}

testRedisConnection()
