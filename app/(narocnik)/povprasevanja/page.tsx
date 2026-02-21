import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getNarocnikPovprasevanja } from '@/lib/dal/povprasevanja'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Povprasevanje } from '@/types/marketplace'

export const metadata = {
  title: 'Moja povpraševanja | LiftGO',
  description: 'Pregled vseh vaših povpraševanj in ponudb',
}

export default async function PovprasevanjaPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    redirect('/prijava')
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'narocnik') {
    redirect('/partner-dashboard')
  }

  // Fetch all povprasevanja
  const povprasevanja = await getNarocnikPovprasevanja(user.id)

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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Moja povpraševanja
        </h1>
        <Link href="/narocnik/novo-povprasevanje">
          <Button className="bg-primary hover:bg-primary/90">
            + Novo povpraševanje
          </Button>
        </Link>
      </div>

      {povprasevanja.length === 0 ? (
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
          {povprasevanja.map((povprasevanje) => (
            <Card key={povprasevanje.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left side - title and description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      {/* Category dot/icon */}
                      <div className="flex-shrink-0 w-3 h-3 rounded-full bg-primary mt-1.5" />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {povprasevanje.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {povprasevanje.description}
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          📍 {povprasevanje.location_city}
                          {povprasevanje.ponudbe_count ? ` • ${povprasevanje.ponudbe_count} ponudbe` : ' • 0 ponudb'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - badges and action button */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge className={getUrgencyColor(povprasevanje.urgency)}>
                        {getUrgencyLabel(povprasevanje.urgency)}
                      </Badge>
                      <Badge className={getStatusColor(povprasevanje.status)}>
                        {getStatusLabel(povprasevanje.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(povprasevanje.created_at)}
                      </span>
                    </div>
                    <Link href={`/narocnik/povprasevanja/${povprasevanje.id}`} className="md:flex-shrink-0">
                      <Button variant="outline" className="w-full md:w-auto">
                        Poglej →
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
