'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, Upload, CheckCircle, Search, RefreshCw, UserPlus, FileUp, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Lead {
  id: string
  business_name: string
  description: string
  profile_status: string
  is_verified: boolean
  is_claimed: boolean
  source: string
  avg_rating: number
  total_reviews: number
  created_at: string
  profile: { full_name: string; location_city: string; email: string | null } | null
}

type Tab = 'lead' | 'active' | 'claimed'

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('lead')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ ime: '', mesto: '', kategorija: '', opis: '', telefon: '', email: '' })
  const [addLoading, setAddLoading] = useState(false)

  const [showImport, setShowImport] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [autoLoading, setAutoLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const params = new URLSearchParams({ status: tab, limit: '50' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLeads(json.data || [])
      setTotal(json.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri nalaganju')
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const toggleSelect = (id: string) => {
    setSelected((prev: Set<string>) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l: Lead) => l.id)))
    }
  }

  const handleApprove = async () => {
    if (selected.size === 0) return
    setApproving(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/leads/approve', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setSuccess(`Odobreno ${json.approved} leadov`)
      setSelected(new Set())
      fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri odobritvi')
    } finally {
      setApproving(false)
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setSuccess('Lead dodan!')
      setAddForm({ ime: '', mesto: '', kategorija: '', opis: '', telefon: '', email: '' })
      setShowAddForm(false)
      fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka')
    } finally {
      setAddLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText((ev.target?.result as string) || '')
    reader.readAsText(file)
  }

  const handleAutoProcess = async (dryRun = false) => {
    setAutoLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/leads/auto-process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      if (dryRun) {
        setSuccess(`Dry-run: ${json.eligible} leadov bi bilo odobrenih`)
      } else {
        setSuccess(`Avtomatično odobreno ${json.approved} od ${json.eligible} kvalificiranih leadov`)
        fetchLeads()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka')
    } finally {
      setAutoLoading(false)
    }
  }

  const handleImport = async () => {
    if (!csvText.trim()) return
    setImportLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setSuccess(`Uvoženo ${json.imported} leadov`)
      setCsvText('')
      setShowImport(false)
      fetchLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri uvozu')
    } finally {
      setImportLoading(false)
    }
  }

  const tabLabel: Record<Tab, string> = { lead: 'Leadi', active: 'Aktivni', claimed: 'Zahtevani' }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead management</h1>
          <p className="mt-1 text-muted-foreground">Ročno dodajanje, CSV uvoz in odobritev leadov obrtnikov.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAddForm(true); setShowImport(false) }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" /> Dodaj ročno
          </button>
          <button
            onClick={() => { setShowImport(true); setShowAddForm(false) }}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <FileUp className="h-4 w-4" /> Uvozi CSV
          </button>
          <button
            onClick={() => handleAutoProcess(false)}
            disabled={autoLoading}
            title="Avtomatično odobri leade, ki izpolnjujejo pogoje kakovosti"
            className="inline-flex items-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
          >
            <Zap className="h-4 w-4" /> {autoLoading ? 'Obdelujem...' : 'Auto-odobri'}
          </button>
          <button onClick={fetchLeads} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-lg border border-green-400/40 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {showAddForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><PlusCircle className="h-5 w-5" /> Ročno dodajanje obrtnika</h2>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Ime podjetja *</label>
              <input
                required
                value={addForm.ime}
                onChange={(e) => setAddForm((f) => ({ ...f, ime: e.target.value }))}
                placeholder="npr. Elektro Novak d.o.o."
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mesto *</label>
              <input
                required
                value={addForm.mesto}
                onChange={(e) => setAddForm((f) => ({ ...f, mesto: e.target.value }))}
                placeholder="npr. Ljubljana"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategorija</label>
              <input
                value={addForm.kategorija}
                onChange={(e) => setAddForm((f) => ({ ...f, kategorija: e.target.value }))}
                placeholder="npr. elektrika, vodovodne storitve"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@podjetje.si"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input
                value={addForm.telefon}
                onChange={(e) => setAddForm((f) => ({ ...f, telefon: e.target.value }))}
                placeholder="+386 40 123 456"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Opis</label>
              <input
                value={addForm.opis}
                onChange={(e) => setAddForm((f) => ({ ...f, opis: e.target.value }))}
                placeholder="Kratek opis storitev"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
                Prekliči
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {addLoading ? 'Dodajam...' : 'Dodaj lead'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {showImport && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold flex items-center gap-2"><Upload className="h-5 w-5" /> CSV uvoz leadov</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Pričakovani stolpci: <code className="rounded bg-muted px-1 text-xs">ime, mesto, kategorija, opis</code>
          </p>
          <div className="mb-3">
            <input type="file" accept=".csv" ref={fileRef} onChange={handleFileChange} className="block text-sm" />
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'ime,mesto,kategorija,opis\n"Elektro Novak d.o.o.",Ljubljana,elektrika,"Elektroinštalacije in vzdrževanje"'}
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowImport(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              Prekliči
            </button>
            <button
              disabled={!csvText.trim() || importLoading}
              onClick={handleImport}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {importLoading ? 'Uvažam...' : 'Uvozi'}
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(['lead', 'active', 'claimed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelected(new Set()) }}
              className={`rounded-lg px-4 py-2 text-sm transition ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            >
              {tabLabel[t]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Išči po imenu..."
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <span className="text-sm text-muted-foreground">{total} skupaj</span>
      </div>

      {tab === 'lead' && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <CheckCircle className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{selected.size} izbranih</span>
          <button
            onClick={handleApprove}
            disabled={approving}
            className="ml-auto rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {approving ? 'Odobravam...' : 'Odobri izbrane → aktivni'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {tab === 'lead' && (
                <th className="px-4 py-3">
                  <input type="checkbox" checked={leads.length > 0 && selected.size === leads.length} onChange={toggleAll} />
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold">Podjetje</th>
              <th className="px-4 py-3 text-left font-semibold">Mesto</th>
              <th className="px-4 py-3 text-left font-semibold">Opis</th>
              <th className="px-4 py-3 text-left font-semibold">Vir</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Dodano</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nalagam...</td></tr>
            )}
            {!loading && leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Ni rezultatov</td></tr>
            )}
            {!loading && leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                {tab === 'lead' && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                )}
                <td className="px-4 py-3 font-medium">{lead.business_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{lead.profile?.location_city || '—'}</td>
                <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{lead.description}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.source === 'manual' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {lead.source === 'manual' ? 'ročno' : 'uvoz'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    lead.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {lead.profile_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString('sl-SI')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
