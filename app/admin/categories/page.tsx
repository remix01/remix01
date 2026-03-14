'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Edit2, ToggleLeft, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon_name: string | null
  is_active: boolean
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('[v0] Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (category: Category) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id)

      if (error) throw error

      setCategories(categories.map(c =>
        c.id === category.id ? { ...c, is_active: !c.is_active } : c
      ))
    } catch (error) {
      console.error('[v0] Error toggling category:', error)
      alert('Napaka pri spreminjanju kategorije')
    } finally {
      setSaving(false)
    }
  }

  const handleEditOpen = (category: Category) => {
    setSelectedCategory(category)
    setEditName(category.name)
    setEditIcon(category.icon_name || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedCategory) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('categories')
        .update({
          name: editName,
          icon_name: editIcon || null,
        })
        .eq('id', selectedCategory.id)

      if (error) throw error

      setCategories(categories.map(c =>
        c.id === selectedCategory.id
          ? { ...c, name: editName, icon_name: editIcon || null }
          : c
      ))

      setShowEditModal(false)
      setSelectedCategory(null)
    } catch (error) {
      console.error('[v0] Error saving category:', error)
      alert('Napaka pri shranjevanju kategorije')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Kategorije storitev</h1>
        <p className="text-muted-foreground mt-1">Upravljajte {categories.length} kategorij</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vse kategorije</CardTitle>
          <CardDescription>Spremenite ime, ikono ali aktivnost kategorije</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>Ikona</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ustvarjena</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {category.icon_name || '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {category.is_active ? 'Aktivna' : 'Neaktivna'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString('sl-SI')}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditOpen(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={category.is_active ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleToggleActive(category)}
                        disabled={saving}
                      >
                        <ToggleLeft className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uredi kategorijo</DialogTitle>
            <DialogDescription>Spremenite podatke o kategoriji</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ime kategorije</Label>
              <Input
                id="name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="npr. Klemparstvo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ikona (opciono)</Label>
              <Input
                id="icon"
                value={editIcon}
                onChange={e => setEditIcon(e.target.value)}
                placeholder="npr. wrench, hammer, zap"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Prekliči
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Shrani spremembe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
