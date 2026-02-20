import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PovprasevanjeCard } from '@/components/liftgo/PovprasevanjeCard'
import { PlusCircle, FileText } from 'lucide-react'
import Link from 'next/link'

export default async function PovprasevanjaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('*, categories(name)')
    .eq('narocnik_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select('povprasevanje_id')
    .in('povprasevanje_id', povprasevanja?.map(p => p.id) || [])

  const ponudbeByPovprasevanje = ponudbe?.reduce((acc: Record<string, number>, p) => {
    acc[p.povprasevanje_id] = (acc[p.povprasevanje_id] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Moja povpraševanja
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pregled vseh povpraševanj in ponudb
          </p>
        </div>
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
          {povprasevanja.map((povprasevanje) => (
            <PovprasevanjeCard
              key={povprasevanje.id}
              povprasevanje={povprasevanje}
              ponudbeCount={ponudbeByPovprasevanje[povprasevanje.id] || 0}
              href={`/narocnik/povprasevanja/${povprasevanje.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
