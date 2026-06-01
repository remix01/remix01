'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_TRANSLATIONS } from '@/lib/seo/i18n'

type SeoPage = {
  id: string
  slug: string
  locale: string
  category_slug: string | null
  city_slug: string | null
  meta_title: string | null
  meta_description: string | null
  h1_override: string | null
  is_indexed: boolean
  updated_at: string
}

const LOCALES = ['de', 'hr', 'sl']

const emptyForm = {
  locale: 'de',
  categorySlug: '',
  categoryName: '',
  citySlug: '',
  cityName: '',
}

export default function AdminSeoPage() {
  const [pages, setPages] = useState<SeoPage[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editIndexed, setEditIndexed] = useState(true)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await fetch('/api/admin/seo-pages')
    const data = await res.json()
    setPages(data.pages || [])
  }

  useEffect(() => { load() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const generate = async () => {
    if (!form.locale || !form.categorySlug || !form.categoryName) {
      flash('Izpolni vsa obvezna polja')
      return
    }
    const key = `${form.locale}:${form.categorySlug}:${form.citySlug}`
    setGenerating(key)
    try {
      const res = await fetch('/api/admin/seo-pages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: form.locale,
          categorySlug: form.categorySlug,
          categoryName: form.categoryName,
          citySlug: form.citySlug || undefined,
          cityName: form.cityName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) flash(`Napaka: ${data.error}`)
      else { flash('Vsebina generirana in shranjena'); await load() }
    } finally {
      setGenerating(null)
    }
  }

  const toggleIndexed = async (page: SeoPage) => {
    await fetch('/api/admin/seo-pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: page.id, is_indexed: !page.is_indexed }),
    })
    await load()
  }

  const saveEdit = async () => {
    if (!editId) return
    await fetch('/api/admin/seo-pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, meta_title: editTitle, meta_description: editDesc, is_indexed: editIndexed }),
    })
    setEditId(null)
    await load()
  }

  const deletePage = async (id: string) => {
    if (!confirm('Zbriši ta vnos?')) return
    await fetch(`/api/admin/seo-pages?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const startEdit = (p: SeoPage) => {
    setEditId(p.id)
    setEditTitle(p.meta_title || '')
    setEditDesc(p.meta_description || '')
    setEditIndexed(p.is_indexed)
  }

  const autoFillFromLocale = (locale: string, slSlug: string) => {
    const t = CATEGORY_TRANSLATIONS[slSlug]
    if (!t) return
    const slug = t[locale as 'de' | 'hr']?.slug || ''
    const name = t[locale as 'de' | 'hr']?.name || ''
    setForm(f => ({ ...f, locale, categorySlug: slug, categoryName: name }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">SEO strani</h1>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded text-sm">{msg}</div>
      )}

      {/* ── AI Generator ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Generator vsebine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Jezik *</label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm"
                value={form.locale}
                onChange={e => setForm(f => ({ ...f, locale: e.target.value }))}
              >
                {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">SL slug (za prevod)</label>
              <select
                className="w-full border rounded px-2 py-1.5 text-sm"
                onChange={e => autoFillFromLocale(form.locale, e.target.value)}
              >
                <option value="">Izberi...</option>
                {Object.keys(CATEGORY_TRANSLATIONS).map(sl => (
                  <option key={sl} value={sl}>{sl}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Lokalni slug *</label>
              <Input
                value={form.categorySlug}
                onChange={e => setForm(f => ({ ...f, categorySlug: e.target.value }))}
                placeholder="elektroinstallation"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ime kategorije *</label>
              <Input
                value={form.categoryName}
                onChange={e => setForm(f => ({ ...f, categoryName: e.target.value }))}
                placeholder="Elektroinstallation"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Slug mesta</label>
              <Input
                value={form.citySlug}
                onChange={e => setForm(f => ({ ...f, citySlug: e.target.value }))}
                placeholder="wien"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Ime mesta</label>
              <Input
                value={form.cityName}
                onChange={e => setForm(f => ({ ...f, cityName: e.target.value }))}
                placeholder="Wien"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={!!generating}
            size="sm"
          >
            {generating ? 'Generiram z AI...' : 'Generiraj vsebino z AI'}
          </Button>
          <p className="text-xs text-gray-400">Klic se izvede enkrat in shrani v tabelo. Ni ponavljajočih stroškov AI.</p>
        </CardContent>
      </Card>

      {/* ── Pages list ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vsi vnosi ({pages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <p className="text-sm text-gray-500">Ni vnosov. Generiraj prve vsebine zgoraj.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-2 pr-3">Locale</th>
                    <th className="pb-2 pr-3">Slug</th>
                    <th className="pb-2 pr-3">Mesto</th>
                    <th className="pb-2 pr-3">Meta title</th>
                    <th className="pb-2 pr-3">Indeks</th>
                    <th className="pb-2">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">{p.locale.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{p.slug}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{p.city_slug || '—'}</td>
                      <td className="py-2 pr-3 max-w-xs truncate text-xs">{p.meta_title || '—'}</td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => toggleIndexed(p)}
                          className={`text-xs px-2 py-0.5 rounded border ${p.is_indexed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                        >
                          {p.is_indexed ? 'index' : 'noindex'}
                        </button>
                      </td>
                      <td className="py-2 flex gap-2">
                        <button onClick={() => startEdit(p)} className="text-blue-600 hover:underline text-xs">Uredi</button>
                        <button onClick={() => deletePage(p.id)} className="text-red-600 hover:underline text-xs">Zbriši</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Inline edit modal ─────────────────────────────────────── */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle className="text-base">Uredi meta podatke</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Meta title (max 60)</label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={60} />
                <span className="text-xs text-gray-400">{editTitle.length}/60</span>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Meta description (max 160)</label>
                <textarea
                  className="w-full border rounded p-2 text-sm resize-none"
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  maxLength={160}
                />
                <span className="text-xs text-gray-400">{editDesc.length}/160</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editIndexed} onChange={e => setEditIndexed(e.target.checked)} />
                Indeksiraj stran (index/noindex)
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEdit}>Shrani</Button>
                <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Prekliči</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
