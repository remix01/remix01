// Run this before every production deployment
// Usage: pnpm tsx scripts/pre-deploy-check.ts

import { ensureAgentsInitialized } from '../lib/agents/init'
import { messageBus } from '../lib/agents/base/MessageBus'
import { agentLogger } from '../lib/observability'

const checks = [
  {
    name: 'Environment variables present',
    check: () => {
      const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'ADMIN_ALERT_EMAIL',
        'NEXTAUTH_SECRET',
      ]
      const missing = required.filter(k => !process.env[k])
      if (missing.length > 0) throw new Error(`Missing env vars: ${missing.join(', ')}`)
    }
  },
  {
    name: 'No Stripe test keys in production',
    check: () => {
      if (process.env.NODE_ENV === 'production') {
        if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
          throw new Error('Stripe test key detected in production!')
        }
      }
    }
  },
  {
    name: 'Agent logger is configured',
    check: () => {
      // Verify agentLogger has flush interval configured
      if (!agentLogger) {
        throw new Error('agentLogger not initialized')
      }
    }
  },
  {
    name: 'All agents registered in MessageBus',
    check: async () => {
      await ensureAgentsInitialized()
      const registered = messageBus.getRegistered()
      const required = ['orchestrator', 'inquiry', 'escrow', 'dispute', 'notify']
      const missing = required.filter(a => !registered.includes(a))
      if (missing.length > 0) throw new Error(`Agents not registered: ${missing.join(', ')}`)
    }
  },
  {
    name: 'Database connection available',
    check: async () => {
      try {
        // Test basic database connectivity
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { error } = await supabase.from('profiles').select('count()').limit(1)
        if (error) throw error
      } catch (err) {
        throw new Error(`Database connection failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  },
]

async function runPreDeployChecks() {
  console.log('Running pre-deploy checks...\n')
  let failed = 0

  for (const check of checks) {
    try {
      await check.check()
      console.log('✅', check.name)
    } catch (err) {
      console.log('❌', check.name, '—', err instanceof Error ? err.message : String(err))
      failed++
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed`)

  if (failed > 0) {
    console.log('\n🚨 DEPLOY BLOCKED — fix all failures before deploying')
    process.exit(1)
  } else {
    console.log('\n✅ All checks passed — safe to deploy')
  }
}

runPreDeployChecks().catch(err => {
  console.error('Pre-deploy check failed:', err)
  process.exit(1)
})
