'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import {
  odobriPartnerja,
  zavrniPartnerja,
  suspendiranjPartnerja,
  reaktivirajPartnerja,
  deletePartner,
} from '@/app/admin/actions'

export function PartnerDetailClient({ partner, partnerId }: { partner: any; partnerId: string }) {
  const router = useRouter()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const handleOdobri = async () => {
    setIsLoading(true)
    await odobriPartnerja(partnerId)
    router.refresh()
    setIsLoading(false)
  }

  const handleSuspendiraj = async () => {
    setIsLoading(true)
    await suspendiranjPartnerja(partnerId)
    router.refresh()
    setIsLoading(false)
  }

  const handleReaktiviraj = async () => {
    setIsLoading(true)
    await reaktivirajPartnerja(partnerId)
    router.refresh()
    setIsLoading(false)
  }

  const handleZavrni = async () => {
    if (!rejectReason.trim()) return
    setIsLoading(true)
    await zavrniPartnerja(partnerId, rejectReason)
    setRejectDialogOpen(false)
    router.refresh()
    setIsLoading(false)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    await deletePartner(partnerId)
    router.push('/admin/partnerji')
  }

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
            <div className="text-sm font-medium text-muted-foreground">Ime</div>
            <div className="mt-1 text-base">{partner.ime}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Podjetje</div>
            <div className="mt-1 text-base">{partner.podjetje || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Tip</div>
            <div className="mt-1 text-base">{partner.tip}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="mt-1 text-base">{partner.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Telefon</div>
            <div className="mt-1 text-base">{partner.telefon || 'Ni na voljo'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className="mt-1">
              <StatusBadge status={partner.status} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Član od</div>
            <div className="mt-1 text-base">{new Date(partner.createdAt).toLocaleDateString('sl-SI')}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Ocena</div>
            <div className="mt-1 flex items-center gap-2">
              {renderStars(partner.ocena)}
              <span className="text-sm text-muted-foreground">({partner.ocena.toFixed(1)})</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Število prevozov</div>
            <div className="mt-1 text-base">{partner.steviloPrevozov}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {partner.status === 'PENDING' && (
          <>
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleOdobri}
              disabled={isLoading}
            >
              Odobri
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setRejectDialogOpen(true)}
              disabled={isLoading}
            >
              Zavrni
            </Button>
          </>
        )}

        {partner.status === 'AKTIVEN' && (
          <Button 
            variant="destructive"
            onClick={handleSuspendiraj}
            disabled={isLoading}
          >
            Suspendiraj
          </Button>
        )}

        {partner.status === 'SUSPENDIRAN' && (
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
            onClick={handleReaktiviraj}
            disabled={isLoading}
          >
            Reaktiviraj
          </Button>
        )}

        <ConfirmDialog
          trigger={
            <Button variant="destructive" className="gap-2" disabled={isLoading}>
              <Trash2 className="h-4 w-4" />
              Izbriši partnerja
            </Button>
          }
          title="Izbriši partnerja"
          description="Ali ste prepričani, da želite izbrisati tega partnerja? To dejanje je trajno in ga ni mogoče razveljaviti."
          confirmText="Izbriši"
          cancelText="Prekliči"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zavrni partnerja</DialogTitle>
            <DialogDescription>Vnesite razlog za zavrnitev partnerja.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Razlog zavrnitve..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Prekliči
            </Button>
            <Button 
              variant="destructive" 
              disabled={!rejectReason.trim() || isLoading}
              onClick={handleZavrni}
            >
              Zavrni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
