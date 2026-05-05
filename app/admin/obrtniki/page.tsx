'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Obrtnik {
  id: string
  ime: string
  priimek: string
  podjetje: string
  email: string
  telefon: string
  specialnosti: string[]
  lokacije: string[]
  cena_min: number
  cena_max: number
  ocena: number
  stevilo_ocen: number
  status: 'pending' | 'verified' | 'blocked'
  leto_izkusenj: number
  created_at: string
}

type StatusFilter = 'all' | Obrtnik['status']

const statusIcons: Record<Obrtnik['status'], React.ReactNode> = {
  pending: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  verified: <CheckCircle className="h-5 w-5 text-green-500" />,
  blocked: <XCircle className="h-5 w-5 text-red-500" />,
}

const statusColors: Record<Obrtnik['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
}

export default function ObrtnikiPage() {
  const [obrtniki, setObrtniki] = useState<Obrtnik[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedObrtnik, setSelectedObrtnik] = useState<Obrtnik | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const fetchObrtniki = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/obrtniki?admin=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error(`Napaka pri nalaganju (${response.status})`)
      }

      const data = (await response.json()) as Obrtnik[]
      setObrtniki(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      console.error('[admin/obrtniki] Error fetching obrtniki:', fetchError)
      setError('Pri nalaganju obrtnikov je prišlo do napake.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchObrtniki()
  }, [fetchObrtniki])

  const filteredObrtniki = useMemo(() => {
    if (statusFilter === 'all') return obrtniki
    return obrtniki.filter((o) => o.status === statusFilter)
  }, [obrtniki, statusFilter])

  const handleStatusChange = async (obrtnik: Obrtnik, newStatus: Obrtnik['status']) => {
    if (newStatus === 'blocked' && !blockReason.trim()) {
      alert('Prosim vnesite razlog za blokiranje')
      return
    }

    try {
      setSaving(true)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/obrtniki/${obrtnik.id}`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'blocked' ? { blocked_reason: blockReason.trim() } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(`Napaka pri posodobitvi (${response.status})`)
      }

      setObrtniki((prev) => prev.map((o) => (o.id === obrtnik.id ? { ...o, status: newStatus } : o)))
      setShowModal(false)
      setSelectedObrtnik(null)
      setBlockReason('')
      alert('Sprememba shranjena!')
    } catch (updateError) {
      console.error('[admin/obrtniki] Error updating obrtnik:', updateError)
      alert('Napaka pri shranjevanju')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Nalagam...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Obrtniki</h1>
          <p className="mt-2 text-muted-foreground">Pregled, verifikacija in moderacija obrtniških računov.</p>
        </div>
        <button
          onClick={fetchObrtniki}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Osveži
        </button>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-2">
        {(['all', 'pending', 'verified', 'blocked'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-4 py-2 transition ${
              statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            {status === 'all' ? 'Vsi' : status}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Ime</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Specialnosti</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Ocena</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filteredObrtniki.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                  Ni obrtnikov
                </td>
              </tr>
            ) : (
              filteredObrtniki.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {o.ime} {o.priimek}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{o.email}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {o.specialnosti?.slice(0, 2).map((s) => (
                        <span key={s} className="rounded-full bg-secondary px-2 py-1 text-xs">
                          {s}
                        </span>
                      ))}
                      {o.specialnosti?.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{o.specialnosti.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{o.ocena.toFixed(1)}</span>
                      <span className="text-muted-foreground">({o.stevilo_ocen})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {statusIcons[o.status]}
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[o.status]}`}>{o.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {o.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedObrtnik(o)
                          setShowModal(true)
                        }}
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-primary-foreground hover:opacity-90"
                      >
                        <Shield className="h-4 w-4" />
                        Verificiraj
                      </button>
                    )}
                    {o.status === 'verified' && (
                      <button
                        onClick={() => {
                          setSelectedObrtnik(o)
                          setShowModal(true)
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Blokiraj
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selectedObrtnik && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {selectedObrtnik.status === 'pending' ? 'Verificiraj obrtnika' : 'Blokiraj obrtnika'}
            </h2>
            {selectedObrtnik.status === 'verified' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground">Razlog</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Zapiši razlog za blokiranje..."
                  className="mt-2 w-full rounded-lg border px-3 py-2"
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedObrtnik(null)
                  setBlockReason('')
                }}
                className="flex-1 rounded-lg border px-4 py-2 text-foreground hover:bg-muted"
              >
                Prekliči
              </button>
              <button
                disabled={saving}
                onClick={() =>
                  handleStatusChange(selectedObrtnik, selectedObrtnik.status === 'pending' ? 'verified' : 'blocked')
                }
                className={`flex-1 rounded-lg px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  selectedObrtnik.status === 'pending' ? 'bg-primary hover:opacity-90' : 'bg-red-500 hover:opacity-90'
                }`}
              >
                {saving ? 'Shranjujem...' : selectedObrtnik.status === 'pending' ? 'Verificiraj' : 'Blokiraj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
