'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type GoogleEnv = {
  mapsApiKey: boolean
  searchEngineId: boolean
  projectId: boolean
  allConfigured: boolean
}

type HealthPayload = {
  env?: {
    google?: GoogleEnv
  }
}

interface Props {
  compact?: boolean
}

export function GoogleEnvStatusCard({ compact = false }: Props) {
  const [google, setGoogle] = useState<GoogleEnv | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Health endpoint returned ${res.status}`)
        }

        const data = (await res.json()) as HealthPayload
        if (!data.env?.google) {
          throw new Error('Google env status is not available in /api/health')
        }

        setGoogle(data.env.google)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const rows = useMemo(
    () => [
      { label: 'GOOGLE_MAPS_API_KEY', ok: !!google?.mapsApiKey },
      { label: 'GOOGLE_SEARCH_ENGINE_ID', ok: !!google?.searchEngineId },
      { label: 'GOOGLE_PROJECT_ID', ok: !!google?.projectId },
    ],
    [google]
  )

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className={compact ? 'pb-2' : ''}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className={compact ? 'text-base' : 'text-lg'}>Google Integration Status</CardTitle>
          {!loading && !error && (
            <Badge variant={google?.allConfigured ? 'default' : 'secondary'}>
              {google?.allConfigured ? 'Configured' : 'Missing config'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Checking /api/health ...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && !error && (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <span className="text-xs sm:text-sm font-mono">{row.label}</span>
                <Badge variant={row.ok ? 'default' : 'destructive'}>{row.ok ? 'OK' : 'Missing'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
