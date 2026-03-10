'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import type { Category } from '@/types/marketplace'

interface PriceEstimatorProps {
  categories: Category[]
  onEstimate?: (category: Category, scope: string) => Promise<{ min: number; max: number }>
}

export function PriceEstimator({ categories, onEstimate }: PriceEstimatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [scope, setScope] = useState<string>('small')
  const [estimate, setEstimate] = useState<{ min: number; max: number } | null>(null)
  const [loading, setLoading] = useState(false)

  // Default price ranges by category (can be customized per category)
  const priceRanges: Record<string, Record<string, { min: number; max: number }>> = {
    // Plumbing
    'vodovodna-dela': {
      small: { min: 50, max: 150 },
      medium: { min: 150, max: 400 },
      large: { min: 400, max: 1000 },
    },
    // Electrical work
    'elektricna-dela': {
      small: { min: 60, max: 180 },
      medium: { min: 180, max: 500 },
      large: { min: 500, max: 1500 },
    },
    // Carpentry
    'tesarstvo': {
      small: { min: 40, max: 120 },
      medium: { min: 120, max: 350 },
      large: { min: 350, max: 800 },
    },
    // Painting
    'slikopleskarstvo': {
      small: { min: 30, max: 100 },
      medium: { min: 100, max: 300 },
      large: { min: 300, max: 700 },
    },
    // Tiling
    'keramika': {
      small: { min: 50, max: 150 },
      medium: { min: 150, max: 400 },
      large: { min: 400, max: 900 },
    },
  }

  const handleEstimate = async () => {
    if (!selectedCategory || !scope) return

    setLoading(true)
    try {
      const category = categories.find((c) => c.id === selectedCategory)
      if (!category) return

      let estimatedPrice = priceRanges[category.slug]?.[scope] || {
        min: 50,
        max: 200,
      }

      // If custom handler provided, use it
      if (onEstimate) {
        estimatedPrice = await onEstimate(category, scope)
      }

      setEstimate(estimatedPrice)
    } catch (error) {
      console.error('[v0] Error calculating estimate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Kalkulator cen</h2>
        </div>

        {/* Description */}
        <p className="text-slate-600">
          Ocenite približno ceno za vaše delo na podlagi kategorije in obsega.
        </p>

        {/* Category Selection */}
        <div>
          <Label htmlFor="category" className="text-base font-semibold mb-2 block">
            Izberi kategorijo
          </Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Izberi kategorijo..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scope Selection */}
        <div>
          <Label className="text-base font-semibold mb-4 block">
            Obseg dela
          </Label>
          <RadioGroup value={scope} onValueChange={setScope}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="small" id="small" />
                <label htmlFor="small" className="cursor-pointer flex-1">
                  <div className="font-semibold">Majhno</div>
                  <div className="text-sm text-slate-600">
                    Manjša naloga, do 2 uri
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="medium" id="medium" />
                <label htmlFor="medium" className="cursor-pointer flex-1">
                  <div className="font-semibold">Srednje</div>
                  <div className="text-sm text-slate-600">
                    Običajna naloga, 2-4 ur
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value="large" id="large" />
                <label htmlFor="large" className="cursor-pointer flex-1">
                  <div className="font-semibold">Veliko</div>
                  <div className="text-sm text-slate-600">
                    Večja naloga, več kot 4 ure
                  </div>
                </label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Calculate Button */}
        <Button
          onClick={handleEstimate}
          disabled={!selectedCategory || !scope || loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Računam...' : 'Izračunaj ceno'}
        </Button>

        {/* Result */}
        {estimate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Ocenjena cena
                </p>
                <div className="text-2xl font-bold text-green-700">
                  €{estimate.min} - €{estimate.max}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  To je približna ocena. Pravi stroški se lahko razlikujejo glede na specifične pogoje.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            <strong>Opomba:</strong> Te cene so samo okvirne. Pravi stroški se lahko razlikujejo
            glede na specifične zahteve vašega projekta. Kontaktirajte mojstre za natančno ponudbo.
          </p>
        </div>
      </div>
    </Card>
  )
}
