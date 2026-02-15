'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'

interface BypassWarningLogProps {
  violations: any[]
}

export function BypassWarningLog({ violations }: BypassWarningLogProps) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const toggleReveal = (id: string) => {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">Bypass opozorila log</h3>
      <div className="space-y-3">
        {violations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ni kršitev</p>
        ) : (
          violations.map((v) => (
            <div key={v.id} className="rounded-lg bg-muted p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Badge variant="destructive">{v.type}</Badge>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleDateString('sl-SI')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleReveal(v.id)}
                >
                  {revealed.has(v.id) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {revealed.has(v.id) && (
                <div className="text-sm bg-destructive/10 p-2 rounded mt-2">
                  {v.detectedContent}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
