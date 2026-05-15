import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNarocnikPovprasevanja } from '@/lib/dal/povprasevanja'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLeadStatusLabelSl } from '@/lib/lead-status'

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
  const { data: profileDataById } = await supabase
    .from('profiles')
    .select('full_name, role, subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  const { data: profileDataByAuthUserId } = await supabase
    .from('profiles')
    .select('full_name, role, subscription_tier')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const profile = (profileDataById ?? profileDataByAuthUserId) as {
    full_name: string | null
    role: string | null
    subscription_tier: 'start' | 'pro' | 'elite' | null
  } | null

  if (!profile || profile.role !== 'narocnik') {
    redirect(profile?.role === 'obrtnik' ? '/partner-dashboard' : '/registracija')
  }

  // Fetch povprasevanja
  const povprasevanja = await getNarocnikPovprasevanja(user.id)

  // Calculate stats
  const aktivna = povprasevanja.filter(p => ['new', 'matched', 'contacted', 'in_progress'].includes(p.status)).length
  const zaprta = povprasevanja.filter(p => p.status === 'completed').length
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
      case 'new':
        return 'bg-primary/10 text-primary border border-primary/20'
      case 'in_progress':
        return 'bg-amber-100 text-amber-700 border border-amber-200'
      case 'completed':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'cancelled':
        return 'bg-muted text-muted-foreground border border-border'
      default:
        return 'bg-muted text-muted-foreground border border-border'
    }
  }

  const getStatusLabel = (status: string) => getLeadStatusLabelSl(status as any)

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

  const subscriptionTier = profile.subscription_tier || 'start'
  const subscriptionLabel = subscriptionTier === 'elite' ? 'ELITE' : subscriptionTier.toUpperCase()

  return (
    <main className="p-4 md:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Pozdravljeni, {profile?.full_name} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Upravljajte vaša povpraševanja in prejete ponudbe</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">{aktivna}</div>
            <div className="text-sm text-muted-foreground">Aktivna povpraševanja</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">{ponudbe_count}</div>
            <div className="text-sm text-muted-foreground">Prejete ponudbe</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">{zaprta}</div>
            <div className="text-sm text-muted-foreground">Zaključena dela</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription */}
      <Card className="mb-8 border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Naročniški paket</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={subscriptionTier === 'start' ? 'secondary' : 'default'}>
                {subscriptionLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {subscriptionTier === 'start'
                  ? '5 AI sporočil/dan'
                  : subscriptionTier === 'pro'
                    ? '100 AI sporočil/dan'
                    : 'Neomejeno AI sporočil'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/narocnina">
              <Button variant={subscriptionTier === 'start' ? 'default' : 'outline'}>
                {subscriptionTier === 'start' ? 'Nadgradi paket' : 'Upravljaj paket'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Vaša povpraševanja</h2>
          <Link href="/novo-povprasevanje">
            <Button className="bg-primary hover:bg-primary/90">
              + Novo povpraševanje
            </Button>
          </Link>
        </div>

        {recentPovprasevanja.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-5xl mb-4">📥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Še nimate oddanih povpraševanj
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Oddajte prvo povpraševanje in prejmite ponudbe preverjenih mojstrov.
              </p>
              <Link href="/novo-povprasevanje">
                <Button className="bg-primary hover:bg-primary/90">
                  Oddaj prvo povpraševanje →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recentPovprasevanja.map((povprasevanje) => (
              <Card key={povprasevanje.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-1">
                        {povprasevanje.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {povprasevanje.category?.name}
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={getUrgencyColor(povprasevanje.urgency)}>
                          {getUrgencyLabel(povprasevanje.urgency)}
                        </Badge>
                        <Badge className={getStatusColor(povprasevanje.status)}>
                          {getStatusLabel(povprasevanje.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(povprasevanje.created_at)}
                        </span>
                      </div>
                    </div>
                    <Link href={`/povprasevanja/${povprasevanje.id}`}>
                      <Button variant="outline" className="whitespace-nowrap">
                        Poglej ponudbe →
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
