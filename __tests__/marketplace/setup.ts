import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.test') })
config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Only enable live-DB assertions when a real remote Supabase project is configured.
// Exclude localhost (Supabase dev default) and placeholder values.
const hasSupabase =
  !!url &&
  !url.includes('localhost') &&
  !url.includes('127.0.0.1') &&
  url !== 'https://your-project-ref.supabase.co' &&
  !!key &&
  key !== 'development-service-role-key'

if (hasSupabase) {
  console.log('✅ Remote Supabase detected — live DB assertions enabled')
  console.log(`   URL: ${url}`)
} else {
  console.log('ℹ️  No remote Supabase env — running mock-only path')
}

process.env.TEST_HAS_SUPABASE = hasSupabase ? '1' : '0'
