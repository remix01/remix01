import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { EditStrankaForm } from '@/components/admin/EditStrankaForm'
import { createClient } from '@/lib/supabase/server'
import { getStranka, getStrankaActivity, updateStrankaStatus } from '@/app/admin/actions'

interface PageProps {
  params: {
    id: string
  }
}

export default async function StrankaDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stranka = await getStranka(params.id)
  if (!stranka) redirect('/admin/stranke')

  const activity = await getStrankaActivity(params.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/stranke"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazaj na stranke
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">
          {stranka.ime} {stranka.priimek}
        </h1>
        <p className="text-muted-foreground">Podrobnosti stranke</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Osnovni podatki</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="mt-1 text-base">{stranka.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Telefon</div>
            <div className="mt-1 text-base">{stranka.telefon || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Mesto</div>
            <div className="mt-1 text-base">{stranka.lokacija || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className="mt-1">
              <StatusBadge status={stranka.status} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Član od</div>
            <div className="mt-1 text-base">{new Date(stranka.createdAt).toLocaleDateString('sl-SI')}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Število naročil</div>
            <div className="mt-1 text-base">{stranka.narocil}</div>
          </div>
        </CardContent>
      </Card>

      <EditStrankaForm stranka={stranka} />

      <Card>
        <CardHeader>
          <CardTitle>Aktivnost uporabnika</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 font-medium">Povpraševanja</h3>
            <div className="space-y-2 text-sm">
              {activity.inquiries.length === 0 ? <p className="text-muted-foreground">Ni aktivnosti</p> : activity.inquiries.map((item: any) => (
                <div key={item.id} className="rounded border p-2">
                  <p className="font-medium">{item.title || item.id}</p>
                  <p className="text-xs text-muted-foreground">{item.status} · {new Date(item.created_at).toLocaleDateString('sl-SI')}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Ponudbe</h3>
            <div className="space-y-2 text-sm">
              {activity.offers.length === 0 ? <p className="text-muted-foreground">Ni aktivnosti</p> : activity.offers.map((item: any) => (
                <div key={item.id} className="rounded border p-2">
                  <p className="font-medium">Ponudba #{item.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{item.status} · €{Number(item.price_estimate || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Plačila</h3>
            <div className="space-y-2 text-sm">
              {activity.payments.length === 0 ? <p className="text-muted-foreground">Ni aktivnosti</p> : activity.payments.map((item: any) => (
                <div key={item.id} className="rounded border p-2">
                  <p className="font-medium">€{Number(item.amount || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{item.status} · {new Date(item.created_at).toLocaleDateString('sl-SI')}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {stranka.status === 'AKTIVEN' ? (
          <form
            action={async () => {
              'use server'
              await updateStrankaStatus(params.id, 'SUSPENDIRAN')
            }}
          >
            <Button type="submit" variant="destructive">
              Suspendiraj
            </Button>
          </form>
        ) : (
          <form
            action={async () => {
              'use server'
              await updateStrankaStatus(params.id, 'AKTIVEN')
            }}
          >
            <Button type="submit" variant="default" className="bg-green-600 hover:bg-green-700">
              Aktiviraj
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
