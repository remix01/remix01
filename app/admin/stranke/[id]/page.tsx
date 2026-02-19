import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { createClient } from '@/lib/supabase/server'
import { getStranka, updateStrankaStatus, deleteStranka } from '@/app/admin/actions'

interface PageProps {
  params: {
    id: string
  }
}

export default async function StrankaDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const stranka = await getStranka(params.id)
  if (!stranka) redirect('/admin/stranke')

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
            <div className="text-sm font-medium text-muted-foreground">Ime</div>
            <div className="mt-1 text-base">{stranka.ime}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Priimek</div>
            <div className="mt-1 text-base">{stranka.priimek}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="mt-1 text-base">{stranka.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Telefon</div>
            <div className="mt-1 text-base">{stranka.telefon || 'Ni na voljo'}</div>
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

        <ConfirmDialog
          trigger={
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Izbriši stranko
            </Button>
          }
          title="Izbriši stranko"
          description="Ali ste prepričani, da želite izbrisati to stranko? To dejanje je trajno in ga ni mogoče razveljaviti."
          confirmText="Izbriši"
          cancelText="Prekliči"
          variant="destructive"
          onConfirm={async () => {
            'use server'
            await deleteStranka(params.id)
            redirect('/admin/stranke')
          }}
        />
      </div>
    </div>
  )
}
