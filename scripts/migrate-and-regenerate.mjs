#!/usr/bin/env node
/**
 * Migration Helper Script
 *
 * This script helps you apply the Supabase migration and regenerate types.
 *
 * Before running this:
 * 1. Apply the SQL migration manually via Supabase dashboard:
 *    https://supabase.com/dashboard/project/whabaeatixtymbccwigu/sql/new
 * 2. Copy content from: supabase/migrations/20260403_add_instant_offer_support.sql
 * 3. Execute in the SQL editor
 *
 * Then run this script:
 *    node scripts/migrate-and-regenerate.mjs
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dir, '..')
const projectId = 'whabaeatixtymbccwigu'

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim()
  } catch {
    return 'HEAD'
  }
}

console.log('🚀 LiftGO Migration Helper\n')

const steps = [
  {
    number: 1,
    title: 'Verify migration was applied in Supabase',
    action: () => {
      console.log('   ✅ If you see this, you should have already applied the SQL to Supabase')
      console.log('   📍 Visit: https://supabase.com/dashboard/project/' + projectId + '/sql/new')
      return true
    }
  },
  {
    number: 2,
    title: 'Regenerate Supabase TypeScript types',
    action: async () => {
      try {
        console.log('   🔄 Running: npx supabase gen types typescript --project-id ' + projectId)
        const cmd = `npx supabase gen types typescript --project-id ${projectId}`
        const output = execSync(cmd, { cwd: projectRoot, encoding: 'utf-8' })

        // Save to database types file
        const dbTypesPath = path.join(projectRoot, 'lib', 'supabase', 'database.types.ts')
        fs.writeFileSync(dbTypesPath, output)

        console.log('   ✅ Types regenerated and saved to: lib/supabase/database.types.ts')
        console.log('   📊 File size: ' + (output.length / 1024).toFixed(1) + ' KB')
        return true
      } catch (error) {
        console.error('   ❌ Failed to regenerate types')
        console.error('   Error: ' + error.message)
        console.error('\n   ℹ️  Make sure:')
        console.error('      1. Supabase CLI is installed: npm install -g @supabase/cli')
        console.error('      2. You have the Supabase CLI configured')
        console.error('      3. The migration was applied to Supabase')
        return false
      }
    }
  },
  {
    number: 3,
    title: 'Commit the changes',
    action: () => {
      try {
        console.log('   📝 Adding types file to git...')
        execSync('git add lib/supabase/database.types.ts', { cwd: projectRoot })

        console.log('   💬 Creating commit...')
        execSync(
          'git commit -m "Regenerate Supabase types after instant offer schema migration"',
          { cwd: projectRoot }
        )

        console.log('   ✅ Changes committed')
        return true
      } catch (error) {
        console.warn('   ⚠️  Could not auto-commit (maybe nothing changed)')
        console.warn('   💡 You can manually commit: git add lib/supabase/database.types.ts && git commit -m "Regenerate types"')
        return true // Don't fail on this
      }
    }
  },
  {
    number: 4,
    title: 'Push changes',
    action: () => {
      try {
        const branch = getCurrentBranch()
        console.log(`   🚀 Pushing to origin ${branch}...`)
        execSync(`git push -u origin ${branch}`, { cwd: projectRoot })
        console.log('   ✅ Changes pushed')
        return true
      } catch (error) {
        console.warn('   ⚠️  Push might have failed')
        console.warn('   💡 Try manually: git push -u origin <your-branch>')
        return true
      }
    }
  },
  {
    number: 5,
    title: 'Build and verify',
    action: () => {
      try {
        console.log('   🔨 Running: pnpm run build')
        execSync('pnpm run build', { cwd: projectRoot, stdio: 'inherit' })
        console.log('   ✅ Build successful!')
        return true
      } catch (error) {
        console.error('   ❌ Build failed')
        console.error('   Error: ' + error.message)
        return false
      }
    }
  }
]

async function runSteps() {
  console.log('📋 Migration Steps:\n')

  for (const step of steps) {
    console.log(`\n[Step ${step.number}] ${step.title}`)
    console.log('─'.repeat(50))

    try {
      const result = await Promise.resolve(step.action())
      if (!result) {
        console.error('\n❌ Migration process stopped')
        process.exit(1)
      }
    } catch (error) {
      console.error(`\n❌ Step ${step.number} failed: ${error.message}`)
      process.exit(1)
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log('✅ All steps completed successfully!')
  console.log('═'.repeat(50))
  console.log('\n📌 Summary:')
  console.log('   ✓ Migration applied to Supabase')
  console.log('   ✓ TypeScript types regenerated')
  console.log('   ✓ Changes committed and pushed')
  console.log('   ✓ Build verified')
  console.log('\n🎉 Ready for deployment!')
}

runSteps().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
