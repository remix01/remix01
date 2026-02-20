import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PonudbaCard } from '@/components/liftgo/PonudbaCard'
import { FileText, MessageSquare, CheckCircle, Search } from 'lucide-react'
import Link from 'next/link'

export default async function ObrtnikDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select(`
      *,
      povprasevanja!inner(*, categories(name))
    `)
    .eq('obrtnik_id', user!.id)
    .order('created_at', { ascending: false })

  const poslane = ponudbe?.length || 0
  const sprejete = ponudbe?.filter(p => p.status === 'sprejeta').length || 0
  const aktivne = ponudbe?.filter(p => p.status === 'poslana').length || 0

  const avgOcena = obrtnikProfile?.avg_rating || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Dobrodošli nazaj, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pregled vaših ponudb in možnosti
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktivne ponudbe</p>
              <p className="text-2xl font-bold text-foreground">{aktivne}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sprejete</p>
              <p className="text-2xl font-bold text-foreground">{sprejete}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Poslane ponudbe</p>
              <p className="text-2xl font-bold text-foreground">{poslane}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Povprečna ocena</p>
              <p className="text-2xl font-bold text-foreground">
                {avgOcena > 0 ? avgOcena.toFixed(1) : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Nova povpraševanja
        </h2>
        <Button asChild>
          <Link href="/obrtnik/povprasevanja">
            <Search className="mr-2 h-4 w-4" />
            Išči več
          </Link>
        </Button>
      </div>

      <Card className="p-6 text-center">
        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-semibold text-foreground">Najdite nova povpraševanja</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Brskajte po odprtih povprasevanjih in pošiljajte ponudbe
        </p>
        <Button asChild className="mt-4">
          <Link href="/obrtnik/povprasevanja">Brskaj povpraševanja</Link>
        </Button>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
          Nedavne ponudbe
        </h2>

        {!ponudbe || ponudbe.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-foreground">Še nimate ponudb</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Brskajte po povprasevanjih in pošljite svojo prvo ponudbo
            </p>
            <Button asChild className="mt-4">
              <Link href="/obrtnik/povprasevanja">Brskaj povpraševanja</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {ponudbe.slice(0, 5).map((ponudba) => (
              <PonudbaCard
                key={ponudba.id}
                ponudba={ponudba}
                showActions={false}
              />
            ))}

            {ponudbe.length > 5 && (
              <div className="text-center">
                <Button variant="outline" asChild>
                  <Link href="/obrtnik/ponudbe">Poglej vse ponudbe</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
