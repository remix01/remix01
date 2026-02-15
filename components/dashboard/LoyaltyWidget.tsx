'use client'

import { useState } from 'react'
import { Copy, Check, TrendingDown, Gift, Award } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { CraftworkerProfile } from '@prisma/client'
import { getEffectiveCommission, getCommissionExplanation } from '@/lib/loyalty/commissionCalculator'

interface LoyaltyWidgetProps {
  profile: CraftworkerProfile
}

export function LoyaltyWidget({ profile }: LoyaltyWidgetProps) {
  const [copied, setCopied] = useState(false)
  
  const commission = getEffectiveCommission(profile)
  const explanation = getCommissionExplanation(commission)
  
  // Calculate progress percentage to next tier
  const progressPercent = commission.nextTierAt 
    ? Math.min(100, ((profile.totalJobsCompleted % (commission.nextTierAt + profile.totalJobsCompleted)) / (commission.nextTierAt + profile.totalJobsCompleted)) * 100)
    : 100

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'}/join?ref=${profile.referralCode}`

  const handleCopyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Referral link kopiran!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Napaka pri kopiranju')
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Zvestobni Program
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Vaša trenutna provizija in nagrade
            </p>
          </div>
        </div>

        {/* Current Commission Rate */}
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-primary">{commission.rate}%</span>
            <span className="text-sm text-muted-foreground">provizija</span>
          </div>
          <p className="text-sm text-muted-foreground">{commission.tierName}</p>
          {commission.savingsVsStandard > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <TrendingDown className="h-3 w-3" />
              <span>Prihranite {commission.savingsVsStandard}% na vsako delo</span>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="text-sm text-muted-foreground">
          {explanation}
        </div>

        {/* Progress to Next Tier */}
        {commission.nextTierAt !== null && commission.nextTierAt > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Napredek do naslednjega tiera</span>
              <span className="font-medium">{profile.totalJobsCompleted} / {profile.totalJobsCompleted + commission.nextTierAt} del</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Še {commission.nextTierAt} {commission.nextTierAt === 1 ? 'delo' : commission.nextTierAt < 5 ? 'dela' : 'del'} do {commission.rate - 1}% provizije!
            </p>
          </div>
        )}

        {commission.nextTierAt === null && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Dosegli ste najvišji tier! 🏆
            </p>
          </div>
        )}

        {/* Loyalty Points */}
        {profile.loyaltyPoints > 0 && (
          <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Zvestobne točke</span>
            </div>
            <div className="text-right">
              <p className="font-bold">{profile.loyaltyPoints}</p>
              <p className="text-xs text-muted-foreground">= {(profile.loyaltyPoints / 100 * 0.5).toFixed(2)}% popust</p>
            </div>
          </div>
        )}

        {/* Referral Link */}
        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium">Povabi mojstra in prejmi bonus</label>
          <p className="text-xs text-muted-foreground">
            Ko se novi mojster registrira s tvojo kodo in opravi prvo delo, prejmeš 100 zvestobnih točk (0.5% popust).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-muted rounded-md font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyReferralLink}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Kopirano
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Kopiraj
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Commission Breakdown */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Prikaz izračuna provizije
          </summary>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Osnovna stopnja ({profile.packageType}):</span>
              <span className="font-medium">{commission.breakdown.baseRate}%</span>
            </div>
            {commission.breakdown.tierDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Tier popust:</span>
                <span className="font-medium">-{commission.breakdown.tierDiscount}%</span>
              </div>
            )}
            {commission.breakdown.loyaltyBonus > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Zvestobni bonus:</span>
                <span className="font-medium">-{commission.breakdown.loyaltyBonus}%</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t font-bold">
              <span>Končna provizija:</span>
              <span>{commission.rate}%</span>
            </div>
          </div>
        </details>
      </div>
    </Card>
  )
}
