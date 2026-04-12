'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Category = {
  id: string
  name: string
  name_slo?: string
  slug?: string
  description?: string
  meta_title?: string
  meta_description?: string
  icon?: string
  is_active: boolean
  sort_order?: number
}

const emptyForm = {
  name: '', name_slo: '', slug: '', description: '', meta_title: '', meta_description: '', icon: '', sort_order: 0,
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<any>(emptyForm)
  const [seoInsights, setSeoInsights] = useState('')

  const load = async () => {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories || [])
  }

  useEffect(() => { load() }, [])

  const createCategory = async () => {
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm(emptyForm)
    await load()
  }

  const updateCategory = async (category: Category, updates: Partial<Category>) => {
    await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...category, ...updates, id: category.id }),
    })
    await load()
  }

  const getAIRecommendations = async () => {
    const res = await fetch('/api/admin/seo-insights', { method: 'POST' })
    const data = await res.json()
    setSeoInsights(data.insights || 'Ni priporočil.')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kategorije & SEO</h1>
          <p className="text-muted-foreground">CRUD + meta podatki za admin upravljanje</p>
        </div>
        <Button onClick={getAIRecommendations}>Pridobi AI priporočila</Button>
      </div>

      {seoInsights && (
        <Card>
          <CardHeader><CardTitle>AI SEO Advisor</CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-sm">{seoInsights}</pre></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Nova kategorija</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="name_slo" value={form.name_slo} onChange={(e) => setForm({ ...form, name_slo: e.target.value })} />
          <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <Input placeholder="icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <Input placeholder="meta_title" value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} />
          <Input placeholder="meta_description" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} />
          <Input className="md:col-span-2" placeholder="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button className="md:col-span-2" onClick={createCategory}>Dodaj kategorijo</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Obstoječe kategorije</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {categories.map((c) => (
            <div key={c.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.name_slo || c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span></p>
                  <p className="text-xs text-muted-foreground">{c.description || 'Brez opisa'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => updateCategory(c, { is_active: !c.is_active })}>{c.is_active ? 'Deactivate' : 'Activate'}</Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
