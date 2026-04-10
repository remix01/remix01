export type CheckStatus = 'ok' | 'missing'

export interface IntegrationReadiness {
  status: CheckStatus
  configured: string[]
  missing: string[]
}

export interface ConfigReadiness {
  core: IntegrationReadiness
  google: {
    mapsApiKey: boolean
    searchEngineId: boolean
    projectId: boolean
    allConfigured: boolean
  }
  integrations: {
    stripe: IntegrationReadiness
    resend: IntegrationReadiness
    upstash: IntegrationReadiness
    sentry: IntegrationReadiness
  }
  score: {
    configured: number
    total: number
    percent: number
  }
}

function makeReadiness(keys: string[]): IntegrationReadiness {
  const configured = keys.filter((key) => !!process.env[key])
  const missing = keys.filter((key) => !process.env[key])

  return {
    status: missing.length === 0 ? 'ok' : 'missing',
    configured,
    missing,
  }
}

export function getConfigReadiness(): ConfigReadiness {
  const core = makeReadiness([
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])

  const google = {
    mapsApiKey: !!process.env.GOOGLE_MAPS_API_KEY,
    searchEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
    projectId: !!process.env.GOOGLE_PROJECT_ID,
    allConfigured:
      !!process.env.GOOGLE_MAPS_API_KEY &&
      !!process.env.GOOGLE_SEARCH_ENGINE_ID &&
      !!process.env.GOOGLE_PROJECT_ID,
  }

  const stripe = makeReadiness([
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ])

  const resend = makeReadiness(['RESEND_API_KEY'])
  const upstash = makeReadiness(['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'])
  const sentry = makeReadiness(['NEXT_PUBLIC_SENTRY_DSN'])

  const groups = [
    core,
    stripe,
    resend,
    upstash,
    sentry,
    {
      status: google.allConfigured ? 'ok' : 'missing',
      configured: [
        ...(google.mapsApiKey ? ['GOOGLE_MAPS_API_KEY'] : []),
        ...(google.searchEngineId ? ['GOOGLE_SEARCH_ENGINE_ID'] : []),
        ...(google.projectId ? ['GOOGLE_PROJECT_ID'] : []),
      ],
      missing: [
        ...(!google.mapsApiKey ? ['GOOGLE_MAPS_API_KEY'] : []),
        ...(!google.searchEngineId ? ['GOOGLE_SEARCH_ENGINE_ID'] : []),
        ...(!google.projectId ? ['GOOGLE_PROJECT_ID'] : []),
      ],
    } satisfies IntegrationReadiness,
  ]

  const total = groups.reduce((acc, g) => acc + g.configured.length + g.missing.length, 0)
  const configured = groups.reduce((acc, g) => acc + g.configured.length, 0)

  return {
    core,
    google,
    integrations: {
      stripe,
      resend,
      upstash,
      sentry,
    },
    score: {
      configured,
      total,
      percent: total === 0 ? 100 : Math.round((configured / total) * 100),
    },
  }
}
