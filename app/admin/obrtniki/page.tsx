'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'
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

const statusIcons: Record<string, React.ReactNode> = {
  pending: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  verified: <CheckCircle className="h-5 w-5 text-green-500" />,
  blocked: <XCircle className="h-5 w-5 text-red-500" />,
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
}

export default function ObrtnikiPage() {
  const [obrtniki, setObrtniki] = useState<Obrtnik[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedObrtnik, setSelectedObrtnik] = useState<Obrtnik | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [csvInput, setCsvInput] = useState('ime,mesto,kategorija\n')
  const [uploadingLeads, setUploadingLeads] = useState(false)

  useEffect(() => {
    const fetchObrtniki = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const response = await fetch('/api/obrtniki?admin=true', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setObrtniki(data)
      } catch (error) {
        console.error('[v0] Error fetching obrtniki:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchObrtniki()
  }, [])

  const filteredObrtniki = statusFilter === 'all' 
    ? obrtniki 
    : obrtniki.filter(o => o.status === statusFilter)

  const handleStatusChange = async (obrtnik: Obrtnik, newStatus: string) => {
    if (newStatus === 'blocked' && !blockReason) {
      alert('Prosim vnesite razlog za blokiranje')
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const response = await fetch(`/api/obrtniki/${obrtnik.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'blocked' && { blocked_reason: blockReason }),
        }),
      })

      if (response.ok) {
        setObrtniki(obrtniki.map(o => 
          o.id === obrtnik.id 
            ? { ...o, status: newStatus as any }
            : o
        ))
        setShowModal(false)
        setBlockReason('')
        alert('Sprememba shranjena!')
      }
    } catch (error) {
      console.error('[v0] Error updating obrtnik:', error)
      alert('Napaka pri shranjevanju')
    }
  }


  const handleLeadImport = async () => {
    if (!csvInput.trim()) {
      alert('CSV vsebina je obvezna.')
      return
    }

    try {
      setUploadingLeads(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const response = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvInput }),
      })

      const payload = await response.json()
      if (!response.ok) {
        alert(payload?.error || 'Napaka pri uvozu leadov')
        return
      }

      alert(`Uspešno uvoženih lead profilov: ${payload.imported}`)
    } catch (error) {
      console.error('[v0] Error importing leads:', error)
      alert('Napaka pri uvozu leadov')
    } finally {
      setUploadingLeads(false)
    }
  }

  if (loading) return <div className="p-4">Nalagam...</div>

  return (
    <div className="min-h-screen bg-bg-muted p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-text-foreground">Obrtniki</h1>


        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-text-foreground">Bulk upload lead podjetij (CSV)</h2>
          <p className="mb-3 text-sm text-text-muted-foreground">
            Podjetja bodo uvožena kot <strong>lead</strong> (neverified, brez ocen, brez kontaktiranja).
          </p>
          <textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            className="mb-3 h-36 w-full rounded-md border border-border-border p-3 text-sm"
            placeholder="ime,mesto,kategorija"
          />
          <button
            onClick={handleLeadImport}
            disabled={uploadingLeads}
            className="rounded-lg bg-text-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploadingLeads ? 'Uvažam...' : 'Uvozi LEAD profile'}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {['all', 'pending', 'verified', 'blocked'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-4 py-2 transition ${
                statusFilter === status
                  ? 'bg-text-primary text-white'
                  : 'bg-white text-text-foreground hover:bg-bg-muted'
              }`}
            >
              {status === 'all' ? 'Vsi' : status}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-border-border bg-bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Ime</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Specialnosti</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Ocena</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filteredObrtniki.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-text-muted-foreground">
                    Ni obrtnikov
                  </td>
                </tr>
              ) : (
                filteredObrtniki.map(o => (
                  <tr key={o.id} className="border-b border-border-border hover:bg-bg-muted">
                    <td className="px-6 py-4 text-sm font-medium text-text-foreground">
                      {o.ime} {o.priimek}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-foreground">{o.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {o.specialnosti?.slice(0, 2).map(s => (
                          <span key={s} className="rounded-full bg-bg-secondary px-2 py-1 text-xs">
                            {s}
                          </span>
                        ))}
                        {o.specialnosti?.length > 2 && (
                          <span className="text-xs text-text-muted-foreground">
                            +{o.specialnosti.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{o.ocena.toFixed(1)}</span>
                        <span className="text-text-muted-foreground">({o.stevilo_ocen})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {statusIcons[o.status]}
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[o.status]}`}>
                          {o.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {o.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedObrtnik(o)
                            setShowModal(true)
                          }}
                          className="flex items-center gap-1 rounded-lg bg-text-primary px-3 py-1 text-white hover:opacity-90"
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

        {/* Modal */}
        {showModal && selectedObrtnik && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-w-md rounded-lg bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-foreground">
                {selectedObrtnik.status === 'pending' ? 'Verificiraj obrtnika' : 'Blokiraj obrtnika'}
              </h2>
              {selectedObrtnik.status === 'verified' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-foreground">Razlog</label>
                  <textarea
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="Zapiši razlog za blokiranje..."
                    className="mt-2 w-full rounded-lg border border-border-border px-3 py-2"
                    rows={3}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-border-border px-4 py-2 text-text-foreground hover:bg-bg-muted"
                >
                  Prekliči
                </button>
                <button
                  onClick={() => handleStatusChange(
                    selectedObrtnik,
                    selectedObrtnik.status === 'pending' ? 'verified' : 'blocked'
                  )}
                  className={`flex-1 rounded-lg px-4 py-2 text-white ${
                    selectedObrtnik.status === 'pending' 
                      ? 'bg-text-primary hover:opacity-90'
                      : 'bg-red-500 hover:opacity-90'
                  }`}
                >
                  {selectedObrtnik.status === 'pending' ? 'Verificiraj' : 'Blokiraj'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
