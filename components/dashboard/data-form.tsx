'use client'

import React from "react"

import { useState } from 'react'

interface DataFormProps {
  record?: any
  onSave: (data: any) => void
  onCancel: () => void
}

export function DataForm({ record, onSave, onCancel }: DataFormProps) {
  const [formData, setFormData] = useState(
    record || {
      title: '',
      description: '',
      category: '',
      status: 'pending',
      value: '',
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Naslov
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          placeholder="Vnesite naslov"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Opis
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Vnesite opis"
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Kategorija
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Izberi kategorijo</option>
            <option value="vodovod">Vodovod</option>
            <option value="elektrika">Elektrika</option>
            <option value="gradnja">Gradnja</option>
            <option value="mizarstvo">Mizarstvo</option>
            <option value="zaključna">Zaključna dela</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="pending">V teku</option>
            <option value="completed">Končano</option>
            <option value="cancelled">Opuščeno</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Vrednost
          </label>
          <input
            type="number"
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
            }
            placeholder="0"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {record ? 'Posodobi' : 'Dodaj'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Prekliči
        </button>
      </div>
    </form>
  )
}
