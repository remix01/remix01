import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PovprasevanjeCard } from '@/components/liftgo/PovprasevanjeCard'
import { FileText, MessageSquare, CheckCircle, PlusCircle } from 'lucide-react'
import Link from 'next/link'

export default async function NarocnikDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('*, categories(name)')
    .eq('narocnik_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select('povprasevanje_id')
    .in('povprasevanje_id', povprasevanja?.map(p => p.id) || [])

  const aktivna = povprasevanja?.filter(p => p.status === 'odprto' || p.status === 'v_teku').length || 0
  const prejete = ponudbe?.length || 0
  const zakljucena = povprasevanja?.filter(p => p.status === 'zakljuceno').length || 0

  const ponudbeByPovprasevanje = ponudbe?.reduce((acc: Record<string, number>, p) => {
    acc[p.povprasevanje_id] = (acc[p.povprasevanje_id] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Dobrodošli nazaj, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pregled vaših povpraševanj in ponudb
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktivna povpraševanja</p>
              <p className="text-2xl font-bold text-foreground">{aktivna}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Prejete ponudbe</p>
              <p className="text-2xl font-bold text-foreground">{prejete}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Zaključena dela</p>
              <p className="text-2xl font-bold text-foreground">{zakljucena}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Nedavna povpraševanja
        </h2>
        <Button asChild>
          <Link href="/narocnik/novo-povprasevanje">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo povpraševanje
          </Link>
        </Button>
      </div>

      {!povprasevanja || povprasevanja.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-semibold text-foreground">Še nimate povpraševanj</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Začnite z oddajo prvega povpraševanja
          </p>
          <Button asChild className="mt-4">
            <Link href="/narocnik/novo-povprasevanje">Oddaj povpraševanje</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {povprasevanja.slice(0, 5).map((povprasevanje) => (
            <PovprasevanjeCard
              key={povprasevanje.id}
              povprasevanje={povprasevanje}
              ponudbeCount={ponudbeByPovprasevanje[povprasevanje.id] || 0}
              href={`/narocnik/povprasevanja/${povprasevanje.id}`}
            />
          ))}

          {povprasevanja.length > 5 && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/narocnik/povprasevanja">Poglej vsa povpraševanja</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
