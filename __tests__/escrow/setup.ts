import { config } from 'dotenv'
import path from 'path'

// Load .env.test for test environment
config({ path: path.resolve(process.cwd(), '.env.test') })
// Optional: load live-like local env if explicitly requested
if (process.env.USE_LIVE_ENV === '1') {
  config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
}

// Safety check: NEVER run tests with live Stripe keys
if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) {
  console.error('❌ FATAL: Tests detected sk_live_ key. Aborting.')
  console.error('   Use sk_test_ keys in .env.test')
  process.exit(1)
}

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.warn('⚠️  WARNING: STRIPE_SECRET_KEY should start with sk_test_')
}

// Optional fallback defaults for isolated CI only (disabled by default)
if (process.env.ALLOW_TEST_DEFAULTS === '1') {
  const testDefaults: Record<string, string> = {
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/liftgo_test',
    STRIPE_SECRET_KEY: 'sk_test_dummy_key_for_unit_tests',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy_key_for_unit_tests',
    STRIPE_WEBHOOK_SECRET: 'whsec_dummy_key_for_unit_tests',
  }
  for (const [key, value] of Object.entries(testDefaults)) {
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

// Verify required env vars
const required = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`)
  console.error('   Set USE_LIVE_ENV=1 to load .env.local, or provide .env.test/.env vars.')
  process.exit(1)
}

console.log('✅ Test environment loaded successfully')
console.log(`   Using Stripe key: ${process.env.STRIPE_SECRET_KEY?.substring(0, 12)}...`)
