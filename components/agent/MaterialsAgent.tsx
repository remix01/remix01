'use client'

import { useState } from 'react'
import { Loader2, Package, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Material = {
  name: string
  description: string
  quantity: string
  unit: string
  pricePerUnit: number
  totalPrice: number
  supplier: string
  notes?: string
  isOptional: boolean
}

type MaterialsResult = {
  materials: Material[]
  totalEstimate: number
  laborHoursEstimate: number
  summary: string
  importantNotes: string[]
  ordersuggestedSuppliers: string[]
}

interface Props {
  description: string
  category?: string
}

export function MaterialsAgent({ description, category }: Props) {
  const [open, setOpen] = useState(false)
  const [area, setArea] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MaterialsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, area: area || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Napaka pri analizi materialov.')
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!result) return
    const rows = [
      ['Ime', 'Opis', 'Količina', 'Enota', 'Cena/enoto', 'Skupaj', 'Dobavitelj'],
      ...result.materials.map(m => [
        m.name, m.description, m.quantity, m.unit,
        m.pricePerUnit, m.totalPrice, m.supplier
      ]),
      ['', '', '', 'SKUPAJ', '', result.totalEstimate, ''],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'material-seznam.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Seznam materialov
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-xs text-emerald-600">
            AI predlaga seznam potrebnega materiala z okvirnimi cenami za slovenski trg.
          </p>

          <div className="flex gap-2">
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Površina/obseg (neobvezno): npr. 20m2"
              className="text-sm bg-white"
            />
            <Button
              type="button"
              onClick={analyze}
              disabled={loading || !description}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analiziraj'}
            </Button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {result && (
            <div className="space-y-3">
              {/* Summary */}
              <p className="text-xs text-slate-600 italic">{result.summary}</p>

              {/* Materials table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-emerald-100 text-emerald-800">
                      <th className="text-left p-2 rounded-tl">Material</th>
                      <th className="text-right p-2">Kol.</th>
                      <th className="text-right p-2">Enota</th>
                      <th className="text-right p-2">Cena</th>
                      <th className="text-right p-2 rounded-tr">Skupaj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.materials.map((m, i) => (
                      <tr
                        key={i}
                        className={`border-b border-emerald-100 ${m.isOptional ? 'opacity-60' : ''}`}
                      >
                        <td className="p-2 bg-white">
                          <p className="font-medium text-slate-700">{m.name}</p>
                          {m.description && (
                            <p className="text-slate-400 text-xs">{m.description}</p>
                          )}
                          {m.isOptional && (
                            <Badge variant="outline" className="text-xs mt-0.5">neobvezno</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right bg-white">{m.quantity}</td>
                        <td className="p-2 text-right bg-white text-slate-500">{m.unit}</td>
                        <td className="p-2 text-right bg-white">{m.pricePerUnit?.toFixed(2)} €</td>
                        <td className="p-2 text-right bg-white font-medium">
                          {m.totalPrice?.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50 font-semibold">
                      <td colSpan={4} className="p-2 text-right text-emerald-800">SKUPAJ MATERIAL:</td>
                      <td className="p-2 text-right text-emerald-800">
                        {result.totalEstimate?.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Labor estimate */}
              {result.laborHoursEstimate > 0 && (
                <p className="text-xs text-slate-500">
                  Ocenjene delovne ure: <strong>{result.laborHoursEstimate} h</strong>
                </p>
              )}

              {/* Important notes */}
              {result.importantNotes?.length > 0 && (
                <div className="rounded bg-amber-50 border border-amber-200 p-2">
                  {result.importantNotes.map((note, i) => (
                    <p key={i} className="text-xs text-amber-700">⚠ {note}</p>
                  ))}
                </div>
              )}

              {/* Suppliers */}
              {result.ordersuggestedSuppliers?.length > 0 && (
                <p className="text-xs text-slate-500">
                  Priporočeni dobavitelji:{' '}
                  {result.ordersuggestedSuppliers.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-xs mr-1">{s}</Badge>
                  ))}
                </p>
              )}

              {/* Export */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="border-emerald-200 text-emerald-700 w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Izvozi seznam (CSV)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
