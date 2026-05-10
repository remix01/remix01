'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Zap, RefreshCw, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  id: string
  business_name: string
  description: string | null
  location_city: string
  category_id: string | null
  profile_status: 'lead' | 'claimed' | 'active' | 'inactive'
  is_verified: boolean
  avg_rating: number
  total_reviews: number
  created_at: string
  source: string
}

type StatusFilter = 'lead' | 'claimed' | 'active' | 'inactive' | 'all'

const statusIcons: Record<Lead['profile_status'], React.ReactNode> = {
  lead: <AlertCircle className="h-5 w-5 text-yellow-500" />,
  claimed: <AlertCircle className="h-5 w-5 text-blue-500" />,
  active: <CheckCircle className="h-5 w-5 text-green-500" />,
  inactive: <XCircle className="h-5 w-5 text-red-500" />,
}

const statusColors: Record<Lead['profile_status'], string> = {
  lead: 'bg-yellow-100 text-yellow-800',
  claimed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('lead')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      let leads: Lead[] = []
      if (statusFilter === 'all') {
        const statuses = ['lead', 'claimed', 'active', 'inactive'] as const
        const allLeads: Lead[] = []
        for (const status of statuses) {
          const response = await fetch(`/api/admin/leads?status=${status}&limit=100`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (response.ok) {
            const data = (await response.json()) as { data: Lead[] }
            allLeads.push(...(Array.isArray(data.data) ? data.data : []))
          }
        }
        leads = allLeads
      } else {
        const response = await fetch(`/api/admin/leads?status=${statusFilter}&limit=100`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) throw new Error(`Napaka pri nalaganju (${response.status})`)
        const data = (await response.json()) as { data: Lead[] }
        leads = Array.isArray(data.data) ? data.data : []
      }
      setLeads(leads)
    } catch (fetchError) {
      console.error('[admin/leads] Error fetching leads:', fetchError)
      setError('Pri nalaganju leadov je prišlo do napake.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleApprove = async () => {
    if (selectedLeads.size === 0) {
      alert('Prosim izberite leade za odobritev')
      return
    }

    try {
      setSaving(true)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/leads/approve', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedLeads),
          status: 'active',
        }),
      })

      if (!response.ok) throw new Error(`Napaka pri odobritvi (${response.status})`)

      setLeads((prev) =>
        prev.map((l) =>
          selectedLeads.has(l.id) ? { ...l, profile_status: 'active' as const } : l
        )
      )
      setSelectedLeads(new Set())
      alert('Leadi so bili odobreni!')
    } catch (err) {
      console.error('[admin/leads] Error approving:', err)
      alert('Napaka pri odobritvi')
    } finally {
      setSaving(false)
    }
  }

  const handleAutoProcess = async () => {
    try {
      setProcessing(true)
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/admin/leads/auto-process', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 10 }),
      })

      if (!response.ok) throw new Error(`Napaka pri samodejni obdelavi (${response.status})`)

      const data = (await response.json()) as {
        ok: boolean
        processed: number
        approved: string[]
      }

      await fetchLeads()
      alert(`Obdelano: ${data.processed}, Odobreno: ${data.approved.length}`)
    } catch (err) {
      console.error('[admin/leads] Error auto-processing:', err)
      alert('Napaka pri samodejni obdelavi')
    } finally {
      setProcessing(false)
    }
  }

  const filteredLeads = useMemo(() => {
    if (statusFilter === 'all') return leads
    return leads.filter((l) => l.profile_status === statusFilter)
  }, [leads, statusFilter])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map((l) => l.id)))
    } else {
      setSelectedLeads(new Set())
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLeads(newSelected)
  }

  if (loading) return <div className="p-4">Nalagam...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leadi</h1>
          <p className="mt-2 text-muted-foreground">Upravljanje in odobritev obrtniških leadov.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLeads}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Osveži
          </button>
          <button
            onClick={handleAutoProcess}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {processing ? 'Obdelam...' : 'Samodejno obdelaj'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'lead', 'claimed', 'active', 'inactive'] as StatusFilter[]).map((status) => (
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

      {selectedLeads.size > 0 && (
        <div className="flex gap-2 rounded-lg border bg-blue-50 p-3">
          <span className="text-sm text-blue-900">
            Izbrano: {selectedLeads.size} leadov
          </span>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="ml-auto rounded-lg bg-primary px-4 py-1 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Shranjujem...' : 'Odobri izbrane'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Podjetje</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Lokacija</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Opis</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Vir</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                  Ni leadov
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{lead.business_name}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{lead.location_city}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                    {lead.description || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">{lead.source}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {statusIcons[lead.profile_status]}
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[lead.profile_status]}`}>
                        {lead.profile_status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
