import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  requiredTier: 'pro' | 'elite'
  description: string
}

export function TierGate({ requiredTier, description }: Props) {
  const tierLabel = requiredTier === 'elite' ? 'ELITE' : 'PRO'
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center border-amber-200 bg-amber-50">
        <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">{tierLabel} Paket Obvezen</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <Button asChild className="w-full">
          <Link href="/partner-dashboard/account/narocnina">Nadgradi v {tierLabel}</Link>
        </Button>
      </Card>
    </div>
  )
}
