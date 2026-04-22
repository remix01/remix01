'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updatePovprasevanjeAdmin } from '@/app/admin/actions'

type DetailData = {
  id: string
  title: string
  description: string
  status: string
  location_city: string
  category_name: string
  urgency: string
  budget_min: number | null
  budget_max: number | null
  preferred_date_from: string | null
  preferred_date_to: string | null
  assigned_to: string | null
  admin_opomba: string
  narocnik_ime: string
  narocnik_email: string
  narocnik_telefon: string
  obrtniki: { id: string; business_name: string }[]
}

const STATUS_OPTIONS = [
  { value: 'odprto', label: 'Odprto' },
  { value: 'v_teku', label: 'V teku' },
  { value: 'zakljuceno', label: 'Zaključeno' },
  { value: 'preklicano', label: 'Preklicano' },
]

const URGENCY_OPTIONS = [
  { value: 'normalno', label: 'Normalno' },
  { value: 'kmalu', label: 'Kmalu' },
  { value: 'nujno', label: 'Nujno' },
]

export function PovprasevanjeEditForm({ data }: { data: DetailData }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [status, setStatus] = useState(data.status ?? 'odprto')
  const [assignedTo, setAssignedTo] = useState(data.assigned_to ?? '')
  const [urgency, setUrgency] = useState(data.urgency ?? 'normalno')
  const [budgetMin, setBudgetMin] = useState(data.budget_min?.toString() ?? '')
  const [budgetMax, setBudgetMax] = useState(data.budget_max?.toString() ?? '')
  const [dateFrom, setDateFrom] = useState(data.preferred_date_from?.slice(0, 10) ?? '')
  const [dateTo, setDateTo] = useState(data.preferred_date_to?.slice(0, 10) ?? '')
  const [adminOpomba, setAdminOpomba] = useState(data.admin_opomba ?? '')

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    const result = await updatePovprasevanjeAdmin(data.id, {
      status,
      assigned_to: assignedTo || null,
      urgency,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      preferred_date_from: dateFrom || null,
      preferred_date_to: dateTo || null,
      admin_opomba: adminOpomba,
    })
    setSaving(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error ?? 'Napaka pri shranjevanju')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.category_name} · {data.location_city}</p>
        </div>
      </div>

      {/* Read-only narocnik info */}
      <Card>
        <CardHeader><CardTitle>Podatki stranke</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <div><span className="text-muted-foreground">Ime:</span> {data.narocnik_ime}</div>
          <div><span className="text-muted-foreground">Email:</span> {data.narocnik_email}</div>
          <div><span className="text-muted-foreground">Telefon:</span> {data.narocnik_telefon || '—'}</div>
        </CardContent>
      </Card>

      {/* Read-only inquiry details */}
      <Card>
        <CardHeader><CardTitle>Opis povpraševanja</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap">{data.description}</p>
        </CardContent>
      </Card>

      {/* Editable fields */}
      <Card>
        <CardHeader><CardTitle>Upravljanje</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Nujnost</Label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {URGENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Dodeli obrtnika</Label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Ni dodeljeno —</option>
                {data.obrtniki.map(o => (
                  <option key={o.id} value={o.id}>{o.business_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Ocena cene (€)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={budgetMin}
                  onChange={e => setBudgetMin(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={budgetMax}
                  onChange={e => setBudgetMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Zaželeni datum od</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Zaželeni datum do</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Admin opomba</Label>
            <Textarea
              value={adminOpomba}
              onChange={e => setAdminOpomba(e.target.value)}
              placeholder="Interno..."
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Shranjeno.</p>}

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Shranjujem...' : 'Shrani'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
