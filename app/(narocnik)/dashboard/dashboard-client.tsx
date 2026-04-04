'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Povprasevanje } from '@/types/marketplace'

interface DashboardClientProps {
  fullName: string | null
  aktivna: number
  ponudbe_count: number
  zaprta: number
  recentPovprasevanja: Povprasevanje[]
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
  getUrgencyColor: (urgency: string) => string
  getUrgencyLabel: (urgency: string) => string
  formatDate: (dateString: string) => string
}

export function DashboardClient({
  fullName,
  aktivna,
  ponudbe_count,
  zaprta,
  recentPovprasevanja,
  getStatusColor,
  getStatusLabel,
  getUrgencyColor,
  getUrgencyLabel,
  formatDate,
}: DashboardClientProps) {
  return (
    <main className="p-4 md:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Pozdravljeni, {fullName} 👋
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
