import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, MapPin, Banknote } from 'lucide-react'

interface Povprasevanje {
  id: string
  title: string
  description: string
  status: string
  budget?: number
  created_at: string
  narocnik_id: string
  category_id: string
  categories?: {
    name: string
    icon_name: string
  }
  profiles?: {
    location_city: string
  }
}

export default async function PovprasevanjePage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  // Fetch open povprasevanja from new system
  const { data: povprasevanja, error } = await supabase
    .from('povprasevanja')
    .select(
      `*, 
      categories:category_id(name, icon_name),
      profiles:narocnik_id(location_city)`
    )
    .eq('status', 'odprto')
    .order('created_at', { ascending: false })
    .limit(20)

  const requests = (povprasevanja || []) as Povprasevanje[]

  // Urgency badge based on created_at
  const getUrgency = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 2) return { label: 'Pospešeno', color: 'bg-red-100 text-red-800' }
    if (hoursAgo < 24) return { label: 'Novo', color: 'bg-blue-100 text-blue-800' }
    return { label: 'Odprto', color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Nova povpraševanja</h1>
            <p className="text-muted-foreground">
              Preglejte povpraševanja naročnikov in pošljite svoje ponudbe
            </p>
          </div>

          {requests.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Trenutno ni novih povpraševanj
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Preverite ponovno čez nekaj časa ali se naročite na obvestila
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((request) => {
                const urgency = getUrgency(request.created_at)
                const descriptionPreview =
                  request.description.length > 120
                    ? request.description.substring(0, 120) + '...'
                    : request.description

                return (
                  <Card key={request.id} className="p-6 hover:shadow-md transition-shadow">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-foreground">
                              {request.categories?.name || 'Neznana kategorija'}
                            </h3>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${urgency.color}`}
                            >
                              {urgency.label}
                            </span>
                          </div>
                          <p className="font-semibold text-foreground">
                            {request.title}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      {request.profiles?.location_city && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{request.profiles.location_city}</span>
                        </div>
                      )}

                      {/* Description Preview */}
                      <p className="text-sm text-muted-foreground">
                        {descriptionPreview}
                      </p>

                      {/* Budget */}
                      {request.budget && (
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            Budget: {request.budget.toLocaleString('sl-SI')} EUR
                          </span>
                        </div>
                      )}

                      {/* CTA Button */}
                      <div className="pt-2">
                        <Link href="/obrtnik/povprasevanja">
                          <Button className="gap-2 w-full sm:w-auto">
                            Pošlji ponudbo
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
