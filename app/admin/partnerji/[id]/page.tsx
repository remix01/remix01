import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/admin/StatusBadge'
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
  const partner = await getPartner(id)

  if (!partner) {
    redirect('/admin/partnerji')
  }

  async function rejectPartner(formData: FormData) {
    'use server'
    const razlog = String(formData.get('razlog') || '').trim()
    if (!razlog) return
    await zavrniPartnerja(id, razlog)
  }

  async function removePartner() {
    'use server'
    await deletePartner(id)
    redirect('/admin/partnerji')
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/partnerji"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazaj na partnerje
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{partner.ime}</h1>
        <p className="text-muted-foreground">Podrobnosti partnerja</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Osnovni podatki</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><div className="text-sm text-muted-foreground">Ime</div><div>{partner.ime}</div></div>
          <div><div className="text-sm text-muted-foreground">Podjetje</div><div>{partner.podjetje || 'Ni na voljo'}</div></div>
          <div><div className="text-sm text-muted-foreground">Email</div><div>{partner.email}</div></div>
          <div><div className="text-sm text-muted-foreground">Telefon</div><div>{partner.telefon || 'Ni na voljo'}</div></div>
          <div><div className="text-sm text-muted-foreground">Ocena</div><div>{partner.ocena.toFixed(1)}</div></div>
          <div><div className="text-sm text-muted-foreground">Status</div><StatusBadge status={partner.status} /></div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {partner.status === 'PENDING' && (
          <form action={() => odobriPartnerja(id)}>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Odobri</Button>
          </form>
        )}

        {partner.status === 'AKTIVEN' && (
          <form action={() => suspendiranjPartnerja(id)}>
            <Button type="submit" variant="destructive">Suspendiraj</Button>
          </form>
        )}

        {partner.status === 'SUSPENDIRAN' && (
          <form action={() => reaktivirajPartnerja(id)}>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Reaktiviraj</Button>
          </form>
        )}
      </div>

      {partner.status === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>Zavrni partnerja</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={rejectPartner} className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <Label htmlFor="razlog">Razlog</Label>
                <Input id="razlog" name="razlog" placeholder="Vnesite razlog zavrnitve" required />
              </div>
              <Button type="submit" variant="destructive">Zavrni</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <form action={removePartner}>
        <Button type="submit" variant="destructive">Izbriši partnerja</Button>
      </form>
    </div>
  )
}
