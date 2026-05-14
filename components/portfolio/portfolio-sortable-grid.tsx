'use client'

import type React from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Edit, Trash2, Star } from 'lucide-react'
import { PortfolioItemForm } from './portfolio-item-form'

interface PortfolioItem {
  id: string
  title: string
  description: string | null
  category: string | null
  completed_at: string | null
  duration_days?: number | null
  price_approx?: number | null
  location_city?: string | null
  image_urls: string[] | null
  is_featured: boolean | null
  sort_order: number
}

interface PortfolioSortableGridProps {
  items: PortfolioItem[]
  obrtnikId: string
}

export function PortfolioSortableGrid({ items, obrtnikId }: PortfolioSortableGridProps) {
  const [sortedItems, setSortedItems] = useState(items)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const supabase = createClient()

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return
    const newItems = [...sortedItems]
    ;[newItems[idx], newItems[idx - 1]] = [newItems[idx - 1], newItems[idx]]
    setSortedItems(newItems)

    // Save to DB
    await Promise.all([
      supabase.from('portfolio_items').update({ sort_order: idx }).eq('id', newItems[idx].id),
      supabase
        .from('portfolio_items')
        .update({ sort_order: idx - 1 })
        .eq('id', newItems[idx - 1].id),
    ])
  }

  const handleMoveDown = async (idx: number) => {
    if (idx === sortedItems.length - 1) return
    const newItems = [...sortedItems]
    ;[newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]]
    setSortedItems(newItems)

    // Save to DB
    await Promise.all([
      supabase.from('portfolio_items').update({ sort_order: idx }).eq('id', newItems[idx].id),
      supabase
        .from('portfolio_items')
        .update({ sort_order: idx + 1 })
        .eq('id', newItems[idx + 1].id),
    ])
  }

  const handleToggleFeatured = async (item: PortfolioItem) => {
    const featured = sortedItems.filter((i: PortfolioItem) => i.is_featured)

    if (!item.is_featured && featured.length >= 3) {
      alert('Največ 3 izpostavljeni projekti')
      return
    }

    const newItems = sortedItems.map((i: PortfolioItem) =>
      i.id === item.id ? { ...i, is_featured: !i.is_featured } : i
    )
    setSortedItems(newItems)

    await supabase
      .from('portfolio_items')
      .update({ is_featured: !item.is_featured })
      .eq('id', item.id)
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {sortedItems.map((item: PortfolioItem, idx: number) => (
          <PortfolioItemCard
            key={item.id}
            item={item}
            idx={idx}
            total={sortedItems.length}
            onEdit={(item) => setEditingItem(item)}
            onMoveUp={() => handleMoveUp(idx)}
            onMoveDown={() => handleMoveDown(idx)}
            onToggleFeatured={() => handleToggleFeatured(item)}
          />
        ))}
      </div>

      {editingItem && (
        <PortfolioItemForm
          item={editingItem}
          obrtnikId={obrtnikId}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null)
            window.location.reload()
          }}
          featuredCount={sortedItems.filter((i: PortfolioItem) => i.is_featured && i.id !== editingItem.id).length}
        />
      )}
    </>
  )
}

function PortfolioItemCard({
  item,
  idx,
  total,
  onEdit,
  onMoveUp,
  onMoveDown,
  onToggleFeatured,
}: {
  key?: React.Key
  item: PortfolioItem
  idx: number
  total: number
  onEdit: (item: PortfolioItem) => void
  onMoveUp: () => void | Promise<void>
  onMoveDown: () => void | Promise<void>
  onToggleFeatured: () => void | Promise<void>
}) {
  const coverImage = item.image_urls?.[0]

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden border hover:shadow-lg transition">
      {/* Cover Image */}
      {coverImage && (
        <div className="aspect-square bg-gray-200 relative">
          <img src={coverImage} alt={item.title} className="w-full h-full object-cover" />

          {/* Overlay with Actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2">
            <button
              onClick={() => onEdit(item)}
              className="p-2 bg-white rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition"
            >
              <Edit className="w-5 h-5 text-gray-900" />
            </button>
            <button
              onClick={() => onToggleFeatured()}
              className={`p-2 rounded-full opacity-0 group-hover:opacity-100 transition ${
                item.is_featured ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
              }`}
            >
              <Star
                className={`w-5 h-5 ${item.is_featured ? 'fill-yellow-600 text-yellow-600' : 'text-gray-900'}`}
              />
            </button>
          </div>

          {/* Featured Badge */}
          {item.is_featured && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-xs font-bold rounded">
              ⭐ Izpostavljen
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h3>
        {item.category && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
            {item.category}
          </span>
        )}

        {/* Move buttons */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={onMoveUp}
            disabled={idx === 0}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={idx === total - 1}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  )
}
