'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'

interface Povprasevanje {
  id: string
  storitev: string
  lokacija: string
  stranka_ime: string
  stranka_email: string
  stranka_telefon: string
  opis: string
  status: string
  obrtnik_id: string
  termin_datum: string
  termin_ura: string
  cena_ocena_min: number
  cena_ocena_max: number
  admin_opomba: string
}

interface Obrtnik {
  id: string
  ime: string
  priimek: string
  email: string
  ocena: number
}

export default function PovprasevanjeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [povprasevanje, setPovprasevanje] = useState<Povprasevanje | null>(null)
  const [obrtniki, setObrtniki] = useState<Obrtnik[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Povprasevanje>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('sb-token')

        // Fetch povprasevanje
        const response = await fetch(`/api/povprasevanje/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setPovprasevanje(data)
        setFormData(data)

        // Fetch contractors
        const contractorResponse = await fetch('/api/obrtniki?admin=true', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const contractors = await contractorResponse.json()
        setObrtniki(contractors)
      } catch (error) {
        console.error('[v0] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  const handleSave = async () => {
    if (!povprasevanje) return

    setSaving(true)
    try {
      const token = localStorage.getItem('sb-token')
      const response = await fetch(`/api/povprasevanje/${povprasevanje.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Shranjeno!')
        router.push('/admin/povprasevanja')
      }
    } catch (error) {
      console.error('[v0] Error saving:', error)
      alert('Napaka pri shranjevanju')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Nalagam...</div>
  if (!povprasevanje) return <div className="p-4">Povpraševanje ni najdeno</div>

  return (
    <div className="min-h-screen bg-bg-muted p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-border-border p-2 hover:bg-bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold text-text-foreground">Povpraševanje: {povprasevanje.storitev}</h1>
        </div>

        {/* Form */}
        <div className="space-y-6 rounded-lg bg-white p-6 shadow-sm">
          {/* Customer Info */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-foreground">Podatki stranke</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-foreground">Ime</label>
                <input
                  type="text"
                  value={formData.stranka_ime || ''}
                  onChange={e => setFormData({ ...formData, stranka_ime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Email</label>
                <input
                  type="email"
                  value={formData.stranka_email || ''}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2 opacity-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Telefon</label>
                <input
                  type="tel"
                  value={formData.stranka_telefon || ''}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2 opacity-50"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-foreground">Storitev</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-foreground">Storitev</label>
                <input
                  type="text"
                  value={formData.storitev || ''}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2 opacity-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Lokacija</label>
                <input
                  type="text"
                  value={formData.lokacija || ''}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2 opacity-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Opis</label>
                <textarea
                  value={formData.opis || ''}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2 opacity-50"
                  disabled
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Assignment & Status */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-foreground">Dodelitev in status</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-foreground">Obrtnik</label>
                <select
                  value={formData.obrtnik_id || ''}
                  onChange={e => setFormData({ ...formData, obrtnik_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2"
                >
                  <option value="">Izberi obrtnika</option>
                  {obrtniki.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.ime} {o.priimek} ({o.ocena.toFixed(1)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Status</label>
                <select
                  value={formData.status || ''}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border-border px-3 py-2"
                >
                  <option value="novo">Novo</option>
                  <option value="dodeljeno">Dodeljeno</option>
                  <option value="sprejeto">Sprejeto</option>
                  <option value="zavrnjeno">Zavrnjeno</option>
                  <option value="v_izvajanju">V izvajanju</option>
                  <option value="zakljuceno">Zaključeno</option>
                  <option value="preklicano">Preklicano</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-foreground">Termin</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formData.termin_datum || ''}
                    onChange={e => setFormData({ ...formData, termin_datum: e.target.value })}
                    className="flex-1 rounded-lg border border-border-border px-3 py-2"
                  />
                  <input
                    type="time"
                    value={formData.termin_ura || ''}
                    onChange={e => setFormData({ ...formData, termin_ura: e.target.value })}
                    className="flex-1 rounded-lg border border-border-border px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Price Estimate */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-foreground">Ocena cene</h2>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Min"
                value={formData.cena_ocena_min || ''}
                onChange={e => setFormData({ ...formData, cena_ocena_min: parseInt(e.target.value) })}
                className="flex-1 rounded-lg border border-border-border px-3 py-2"
              />
              <input
                type="number"
                placeholder="Max"
                value={formData.cena_ocena_max || ''}
                onChange={e => setFormData({ ...formData, cena_ocena_max: parseInt(e.target.value) })}
                className="flex-1 rounded-lg border border-border-border px-3 py-2"
              />
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text-foreground">Admin opomba</h2>
            <textarea
              value={formData.admin_opomba || ''}
              onChange={e => setFormData({ ...formData, admin_opomba: e.target.value })}
              placeholder="Interno..."
              className="w-full rounded-lg border border-border-border px-3 py-2"
              rows={3}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-text-primary px-6 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Shranjujem...' : 'Shrani'}
          </button>
        </div>
      </div>
    </div>
  )
}
