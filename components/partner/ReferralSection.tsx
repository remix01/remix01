'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Share2, Users, Gift } from 'lucide-react'

interface ReferralStats {
  referralCode: string
  referralLink: string
  creditBalance: number
  successfulReferrals: number
  pendingReferrals: number
}

export function ReferralSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/referral/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (err) {
        console.error('[v0] Failed to load referral stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleCopyLink = async () => {
    if (stats?.referralLink) {
      await navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (stats?.referralLink && navigator.share) {
      try {
        await navigator.share({
          title: 'Povabite prijatelja na LiftGO',
          text: 'Pridružite se LiftGO platformi in prejemite bonus - €5 kredita!',
          url: stats.referralLink,
        })
      } catch (err) {
        console.error('[v0] Share error:', err)
      }
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 mb-2" />
          <div className="h-4 bg-muted rounded w-64" />
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded mb-4" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Referral Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Povabi prijatelje
              </CardTitle>
              <CardDescription>
                Skupaj zaslužite - vi in vaš prijatelj!
              </CardDescription>
            </div>
            <Badge className="ml-4">Zaslužki</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* How it works */}
          <div className="bg-white/50 rounded-lg p-4 space-y-3 border border-primary/10">
            <h4 className="font-semibold text-sm">Kako to deluje:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Podelite vašo povezavo s prijatelji</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Prijatelj se registrira preko vaše povezave</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Ko prijatelj zaključi prvo naročilo - oba prejemeta €5!</span>
              </li>
            </ul>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vaša referralna povezava:</label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={stats?.referralLink || ''}
                className="bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Kopirano!' : 'Kopiraj'}
              </Button>
            </div>
          </div>

          {/* Share Button */}
          {typeof navigator !== 'undefined' && !!navigator.share && (
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Deli s prijatelji
            </Button>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/50 p-3 text-center border border-primary/10">
              <div className="text-2xl font-bold text-primary">
                {stats?.successfulReferrals || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Uspešne povabila
              </div>
            </div>
            <div className="rounded-lg bg-white/50 p-3 text-center border border-primary/10">
              <div className="text-2xl font-bold text-primary">
                {stats?.pendingReferrals || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                V teku
              </div>
            </div>
            <div className="rounded-lg bg-white/50 p-3 text-center border border-primary/10">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                <Gift className="h-4 w-4" />
                €{stats?.creditBalance || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Zasluženi krediti
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              💡 Namig: Delite vašo povezavo na družbenih omrežjih ali pošljite prijateljem neposredno. Vsak prijatelj, ki se registrira, vam prinaša €5 bonusa!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kaj dobite z referrali?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 pb-3 border-b">
              <div className="font-bold text-primary min-w-fit">€5 + €5</div>
              <div>
                <p className="font-medium">Oboji prejemeta €5 kredita</p>
                <p className="text-muted-foreground text-xs">Ko vaš prijatelj zaključi prvo naročilo</p>
              </div>
            </div>
            <div className="flex gap-3 pb-3 border-b">
              <div className="font-bold text-primary min-w-fit">Neomejeno</div>
              <div>
                <p className="font-medium">Povabite koliko koli prijateljev</p>
                <p className="text-muted-foreground text-xs">Ni omejitve glede števila povabil</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="font-bold text-primary min-w-fit">Hiter</div>
              <div>
                <p className="font-medium">Krediti se dodajo takoj</p>
                <p className="text-muted-foreground text-xs">Uporabite jih za plačila na platformi</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
