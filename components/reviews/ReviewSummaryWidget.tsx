'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ReviewSummaryWidgetProps {
  obrtnik_id: string
  compact?: boolean
}

export function ReviewSummaryWidget({ obrtnik_id, compact = false }: ReviewSummaryWidgetProps) {
  const [stats, setStats] = useState({ avg: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('ocene')
          .select('rating')
          .eq('obrtnik_id', obrtnik_id)

        if (!error && data && data.length > 0) {
          const avg = data.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / data.length
          setStats({ avg, count: data.length })
        }
      } catch (err) {
        console.error('[v0] Error loading review stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [obrtnik_id])

  if (loading || stats.count === 0) {
    return null
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      <div className={compact ? 'text-sm font-semibold' : 'text-lg font-bold'}>
        {stats.avg.toFixed(1)}
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${
              compact ? 'w-3 h-3' : 'w-4 h-4'
            } ${star <= Math.round(stats.avg) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
      <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
        ({stats.count})
      </div>
    </div>
  )
}
