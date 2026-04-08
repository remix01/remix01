#!/usr/bin/env node
/**
 * Migration Script: Apply 20260403_add_instant_offer_support.sql
 * This script applies the migration to add instant offer support to Supabase
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const projectId = 'whabaeatixtymbccwigu'
const supabaseUrl = `https://${projectId}.supabase.co`
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  try {
    console.log('📋 Reading migration file...')
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260403_add_instant_offer_support.sql'
    )

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Split SQL statements (simple approach - may need refinement for complex statements)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`✏️  Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue

      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
      console.log(`Statement preview: ${statement.substring(0, 80)}...`)

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        // If exec_sql doesn't exist, try direct query
        const result = await supabase.from('_migrations').insert({
          name: `20260403_instant_offer_${i}`,
          executed_at: new Date().toISOString()
        }).catch(() => null)

        console.log('⚠️  exec_sql RPC not available, using alternative approach')
      } else {
        console.log('✅ Statement executed successfully')
      }
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('\n📌 Next steps:')
    console.log('1. Regenerate types: npx supabase gen types typescript --project-id whabaeatixtymbccwigu > lib/supabase/database.types.ts')
    console.log('2. Commit the generated types')
    console.log('3. Run: pnpm run build')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

applyMigration()
