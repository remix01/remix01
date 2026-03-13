'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface CoverageTabProps {
  serviceAreas: any[]
  availability: any[]
}

const DAYS_OF_WEEK_SI = [
  'Ponedeljek',
  'Torek',
  'Sreda',
  'Četrtek',
  'Petek',
  'Sobota',
  'Nedelja',
]

export function CoverageTab({ serviceAreas, availability }: CoverageTabProps) {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Service Areas */}
      {serviceAreas && serviceAreas.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Pokrivana območja</h3>
          <div className="space-y-3">
            {serviceAreas.map((area, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{area.city}</p>
                  {area.region && <p className="text-sm text-gray-600">{area.region}</p>}
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {area.radius_km} km
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Availability Schedule */}
      {availability && availability.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Urnik</h3>
          <div className="space-y-2">
            {DAYS_OF_WEEK_SI.map((day, dayIndex) => {
              const dayAvailability = availability.find(
                (a) => parseInt(a.day_of_week) === dayIndex
              )
              const isAvailable = dayAvailability?.is_available ?? false

              return (
                <div key={dayIndex} className="flex items-center justify-between p-3 border rounded">
                  <span className="font-medium text-gray-900 w-28">{day}</span>
                  <div className="flex-1">
                    {isAvailable && dayAvailability ? (
                      <span className="text-gray-700">
                        {dayAvailability.time_from} - {dayAvailability.time_to}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Nedostopno</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {isAvailable ? '✓' : '✗'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {!serviceAreas?.length && !availability?.length && (
        <div className="text-center py-12">
          <p className="text-gray-500">Informacije o pokritosti in urniku niso dostopne</p>
        </div>
      )}
    </div>
  )
}
