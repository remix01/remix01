import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { createClient } from '@/lib/supabase/server'
import {
  getPartner,
  odobriPartnerja,
  zavrniPartnerja,
  suspendiranjPartnerja,
  reaktivirajPartnerja,
  deletePartner,
} from '@/app/admin/actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/prijava')

  const partner = await getPartner(id)
  if (!partner) redirect('/admin/partnerji')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/partnerji"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazaj na partnerje
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{partner.ime}</h1>
        <p className="text-muted-foreground">Podrobnosti partnerja</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Osnovni podatki</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Ime / Podjetje</div>
            <div className="mt-1 text-base">{partner.ime}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="mt-1 text-base">{partner.email || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Telefon</div>
            <div className="mt-1 text-base">{partner.telefon || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Tip</div>
            <div className="mt-1 text-base">{partner.tip}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className="mt-1">
              <StatusBadge status={partner.status} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Član od</div>
            <div className="mt-1 text-base">
              {new Date(partner.createdAt).toLocaleDateString('sl-SI')}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Ocena</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i <= Math.round(partner.ocena)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({partner.ocena.toFixed(1)})</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Število storitev</div>
            <div className="mt-1 text-base">{partner.steviloPrevozov}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {partner.status === 'PENDING' && (
          <form
            action={async () => {
              'use server'
              await odobriPartnerja(id)
              redirect(`/admin/partnerji/${id}`)
            }}
          >
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Odobri partnerja
            </Button>
          </form>
        )}

        {partner.status === 'PENDING' && (
          <form
            action={async () => {
              'use server'
              await zavrniPartnerja(id, 'Zavrnjeno s strani admina')
              redirect(`/admin/partnerji/${id}`)
            }}
          >
            <Button type="submit" variant="destructive">
              Zavrni partnerja
            </Button>
          </form>
        )}

        {partner.status === 'AKTIVEN' && (
          <form
            action={async () => {
              'use server'
              await suspendiranjPartnerja(id)
              redirect(`/admin/partnerji/${id}`)
            }}
          >
            <Button type="submit" variant="destructive">
              Suspendiraj
            </Button>
          </form>
        )}

        {(partner.status === 'SUSPENDIRAN' || partner.status === 'ZAVRNJEN') && (
          <form
            action={async () => {
              'use server'
              await reaktivirajPartnerja(id)
              redirect(`/admin/partnerji/${id}`)
            }}
          >
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Reaktiviraj
            </Button>
          </form>
        )}

        <ConfirmDialog
          trigger={
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Izbriši partnerja
            </Button>
          }
          title="Izbriši partnerja"
          description="Ali ste prepričani, da želite izbrisati tega partnerja? To dejanje je trajno in ga ni mogoče razveljaviti."
          confirmText="Izbriši"
          cancelText="Prekliči"
          variant="destructive"
          onConfirm={async () => {
            'use server'
            await deletePartner(id)
            redirect('/admin/partnerji')
          }}
        />
      </div>
    </div>
  )
}
