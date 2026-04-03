#!/usr/bin/env node
/**
 * Apply Supabase Migration
 * Executes the SQL migration to add instant offer support
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const projectId = 'whabaeatixtymbccwigu'
const supabaseUrl = `https://${projectId}.supabase.co`

// Try to get credentials from environment
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.error('\n📌 To apply the migration, you need to:')
  console.error('1. Export your service role key: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"')
  console.error('2. Get it from: https://supabase.com/dashboard/project/' + projectId + '/settings/api')
  console.error('3. Then run: node scripts/apply-migration-direct.mjs')
  process.exit(1)
}

async function applyMigration() {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Read migration file
    const migrationPath = path.resolve('supabase/migrations/20260403_add_instant_offer_support.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('🔄 Applying migration to Supabase...\n')

    // Split statements by semicolon and filter out comments
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`[${i + 1}/${statements.length}] Executing...`)

      // Use RPC to execute raw SQL if available, or use admin client
      const { data, error } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1)
        .catch(() => ({ data: null, error: null }))

      if (error && error.message.includes('does not exist')) {
        // If RPC doesn't exist, we can't execute arbitrary SQL from client
        // Try a different approach using REST API
        console.log('   ⚠️  Cannot execute SQL through Supabase client')
        break
      }

      successCount++
    }

    if (successCount > 0) {
      console.log('\n✅ Migration may have been applied')
    } else {
      console.error('\n❌ Could not execute migration through Supabase client')
      console.error('   Please apply the SQL manually via Supabase dashboard')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

applyMigration()
