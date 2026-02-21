import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNarocnikPovprasevanja, countNarocnikPovprasevanjaByStatus } from '@/lib/dal/povprasevanja'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Povprasevanje } from '@/types/marketplace'

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'narocnik') {
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
        return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'v_teku':
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'zakljuceno':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'preklicano':
        return 'bg-gray-50 text-gray-700 border border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200'
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
        return 'bg-gray-100 text-gray-700'
      case 'kmalu':
        return 'bg-yellow-100 text-yellow-700'
      case 'nujno':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
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

      {/* Recent Requests Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Vaša povpraševanja</h2>
          <Link href="/narocnik/novo-povprasevanje">
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
              <Link href="/narocnik/novo-povprasevanje">
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
                    <Link href={`/narocnik/povprasevanja/${povprasevanje.id}`}>
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
