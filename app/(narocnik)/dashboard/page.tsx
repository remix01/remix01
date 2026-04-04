import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNarocnikPovprasevanja, countNarocnikPovprasevanjaByStatus } from '@/lib/dal/povprasevanja'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Povprasevanje } from '@/types/marketplace'
import { DashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | LiftGO',
  description: 'Upravljajte vaša povpraševanja in prejete ponudbe',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/prijava')
  }

  // Fetch user profile to get full name
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()
  const profile = profileData as { full_name: string | null; role: string | null } | null

  if (!profile || profile.role !== 'narocnik') {
    redirect('/partner-dashboard')
  }

  // Fetch povprasevanja
  const povprasevanja = await getNarocnikPovprasevanja(user.id)

  // Calculate stats
  const aktivna = povprasevanja.filter(p => p.status === 'odprto' || p.status === 'v_teku').length
  const zaprta = povprasevanja.filter(p => p.status === 'zakljuceno').length
  const ponudbe_count = povprasevanja.reduce((sum, p) => sum + (p.ponudbe_count || 0), 0)

  // Get last 5 povprasevanja
  const recentPovprasevanja = povprasevanja.slice(0, 5)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate()
    const month = new Intl.DateTimeFormat('sl-SI', { month: 'short' }).format(date)
    const year = date.getFullYear()
    return `${day}. ${month} ${year}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'odprto':
        return 'bg-primary/10 text-primary border border-primary/20'
      case 'v_teku':
        return 'bg-amber-100 text-amber-700 border border-amber-200'
      case 'zakljuceno':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'preklicano':
        return 'bg-muted text-muted-foreground border border-border'
      default:
        return 'bg-muted text-muted-foreground border border-border'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'odprto':
        return 'Odprto'
      case 'v_teku':
        return 'V teku'
      case 'zakljuceno':
        return 'Zaključeno'
      case 'preklicano':
        return 'Preklicano'
      default:
        return status
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'normalno':
        return 'bg-muted text-muted-foreground'
      case 'kmalu':
        return 'bg-amber-100 text-amber-700'
      case 'nujno':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'normalno':
        return 'Normalno'
      case 'kmalu':
        return 'Kmalu'
      case 'nujno':
        return 'Nujno'
      default:
        return urgency
    }
  }

  return (
    <DashboardClient
      fullName={profile?.full_name}
      aktivna={aktivna}
      ponudbe_count={ponudbe_count}
      zaprta={zaprta}
      recentPovprasevanja={recentPovprasevanja}
      getStatusColor={getStatusColor}
      getStatusLabel={getStatusLabel}
      getUrgencyColor={getUrgencyColor}
      getUrgencyLabel={getUrgencyLabel}
      formatDate={formatDate}
    />
  )
}
