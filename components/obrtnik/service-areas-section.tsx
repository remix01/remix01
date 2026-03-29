'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import type { ServiceAreaDisplay } from '@/lib/types'
import { SERVICE_AREA_DEFAULTS } from '@/lib/types'

interface ServiceAreasSectionProps {
  obrtnikId: string
  initialServiceAreas: ServiceAreaDisplay[]
}

export function ServiceAreasSection({
  obrtnikId,
  initialServiceAreas,
}: ServiceAreasSectionProps) {
  const supabase = createClient()
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaDisplay[]>(initialServiceAreas)
  const [newCity, setNewCity] = useState('')
  const [newRadius, setNewRadius] = useState<number>(SERVICE_AREA_DEFAULTS.radius_km)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleAddArea = async () => {
    if (!newCity.trim()) {
      setErrorMessage('Vnesite mesto ali kraj')
      return
    }

    if (serviceAreas.length >= 10) {
      setErrorMessage('Lahko dodate največ 10 območij')
      return
    }

    setIsAdding(true)
    try {
      const { data, error } = await supabase
        .from('service_areas')
        .insert({
          obrtnik_id: obrtnikId,
          city: newCity.trim(),
          region: SERVICE_AREA_DEFAULTS.region,
          radius_km: newRadius,
          is_active: SERVICE_AREA_DEFAULTS.is_active,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        const displayArea: ServiceAreaDisplay = {
          id: data.id,
          city: data.city,
          region: data.region,
          radius_km: data.radius_km ?? SERVICE_AREA_DEFAULTS.radius_km,
        }
        setServiceAreas((prev) => [...prev, displayArea])
        setNewCity('')
        setNewRadius(SERVICE_AREA_DEFAULTS.radius_km)
        setSuccessMessage('Območje uspešno dodano')
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (err) {
      console.error('Napaka pri dodajanju območja:', err)
      setErrorMessage('Napaka pri dodajanju območja')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteArea = async (areaId: string) => {
    setIsDeleting(areaId)
    try {
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', areaId)

      if (error) throw error
      setServiceAreas((prev) => prev.filter((area) => area.id !== areaId))
      setSuccessMessage('Območje uspešno izbrisano')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Napaka pri brisanju območja:', err)
      setErrorMessage('Napaka pri brisanju območja')
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pokrita območja</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Areas */}
        {serviceAreas.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-900 mb-3">Vaša območja:</p>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <div
                  key={area.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
                >
                  <span className="text-sm text-blue-900">
                    {area.city || area.region} ({area.radius_km}km)
                  </span>
                  <button
                    onClick={() => handleDeleteArea(area.id)}
                    disabled={isDeleting === area.id}
                    className="ml-1 text-blue-600 hover:text-blue-900 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Area */}
        <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm font-medium text-slate-900">Dodaj novo območje:</p>

          {/* City Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mesto ali kraj
            </label>
            <input
              type="text"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="npr. Ljubljana, Maribor..."
              disabled={isAdding}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
            />
          </div>

          {/* Radius Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700">
                Radij delovanja
              </label>
              <span className="text-sm font-medium text-blue-600">
                {newRadius} km od centra
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              value={newRadius}
              onChange={(e) => setNewRadius(parseInt(e.target.value))}
              disabled={isAdding}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>10 km</span>
              <span>150 km</span>
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddArea}
            disabled={isAdding || serviceAreas.length >= 10}
            className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {isAdding ? 'Dodajanje...' : '+ Dodaj'}
          </button>

          {serviceAreas.length >= 10 && (
            <p className="text-xs text-amber-700 p-2 bg-amber-50 rounded">
              ⚠️ Največje število območij je 10
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            📍 Stranke iz teh mest bodo vaš profil videle prej v iskanju
          </p>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
