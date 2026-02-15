import { Badge } from '@/components/ui/badge'
import { User2, Package, CreditCard, Star, Briefcase } from 'lucide-react'

interface CraftworkerProfileCardProps {
  craftworker: {
    name: string
    email: string
    phone: string | null
  }
  profile: {
    packageType: string
    stripeAccountId: string | null
    stripeOnboardingComplete: boolean
    totalJobsCompleted: number
    avgRating: any
    loyaltyPoints: number
    isVerified: boolean
  }
}

export function CraftworkerProfileCard({ craftworker, profile }: CraftworkerProfileCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User2 className="h-5 w-5" />
        Osebni podatki
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">Ime:</span>
          <span className="ml-2 font-medium">{craftworker.name}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Email:</span>
          <span className="ml-2 font-medium">{craftworker.email}</span>
        </div>
        {craftworker.phone && (
          <div>
            <span className="text-muted-foreground">Telefon:</span>
            <span className="ml-2 font-medium">{craftworker.phone}</span>
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Paket</div>
            <Badge variant={profile.packageType === 'PRO' ? 'default' : 'secondary'}>
              {profile.packageType}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Stripe status</div>
            <Badge variant={profile.stripeOnboardingComplete ? 'default' : 'destructive'}>
              {profile.stripeOnboardingComplete ? 'Povezan' : 'Ni povezan'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Zaključena dela</div>
            <div className="font-semibold">{profile.totalJobsCompleted}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Povprečna ocena</div>
            <div className="font-semibold">
              {Number(profile.avgRating) > 0 ? Number(profile.avgRating).toFixed(1) : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
