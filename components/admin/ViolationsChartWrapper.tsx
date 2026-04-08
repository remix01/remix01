'use client'

import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Dynamically import chart component
const ViolationsChartContent = dynamic(
  () => import('./ViolationsChart').then(mod => ({ default: mod.ViolationsChart })),
  { 
    loading: () => <Skeleton className="w-full h-[300px] rounded-lg" />,
    ssr: false
  }
)

interface ViolationsChartProps {
  data: Record<string, number>
}

export function ViolationsChartWrapper({ data }: ViolationsChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Violations Over Time (Last 30 Days)
      </h3>
      <ViolationsChartContent data={data} />
    </Card>
  )
}
