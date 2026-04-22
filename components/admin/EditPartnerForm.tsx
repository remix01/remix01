'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePartner } from '@/app/admin/actions'
import type { Partner } from '@/types/admin'

const SUBSCRIPTION_TIERS = [
  { value: 'start', label: 'START (brezplačen)' },
  { value: 'pro', label: 'PRO (29€/mes)' },
  { value: 'elite', label: 'ELITE' },
]

export function EditPartnerForm({
  partner,
  currentTier,
}: {
  partner: Partner
  currentTier?: string
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [businessName, setBusinessName] = useState(partner.podjetje ?? partner.ime)
  const [telefon, setTelefon] = useState(partner.telefon ?? '')
  const [tier, setTier] = useState(currentTier ?? 'start')

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updatePartner(partner.id, {
      business_name: businessName,
      telefon,
      subscription_tier: tier,
    })
    setSaving(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? 'Napaka pri shranjevanju')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uredi podatke partnerja</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="business_name">Ime podjetja</Label>
            <Input
              id="business_name"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partner_telefon">Telefon</Label>
            <Input
              id="partner_telefon"
              type="tel"
              value={telefon}
              onChange={e => setTelefon(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tier">Paket (subscription tier)</Label>
            <select
              id="tier"
              value={tier}
              onChange={e => setTier(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {SUBSCRIPTION_TIERS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Shranjeno.</p>}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Shranjujem...' : 'Shrani'}
        </Button>
      </CardContent>
    </Card>
  )
}
