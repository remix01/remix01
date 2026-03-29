'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ObrtnikProfileDisplay } from '@/lib/types'

interface AboutTabProps {
  obrtnik: ObrtnikProfileDisplay
}

export function AboutTab({ obrtnik }: AboutTabProps) {
  const categories = (obrtnik.obrtnik_categories as any[])?.map(cat => cat.categories.name) || []
  const workingSince = obrtnik.working_since ? new Date(obrtnik.working_since).getFullYear() : null

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Description */}
      {obrtnik.description && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">O podjetju</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{obrtnik.description}</p>
        </Card>
      )}

      {/* Experience & Details */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Izkušnje & podrobnosti</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {obrtnik.years_experience && (
            <div>
              <p className="text-sm text-gray-600">Izkušnje</p>
              <p className="text-lg font-semibold text-gray-900">{obrtnik.years_experience}+ let</p>
            </div>
          )}
          {workingSince && (
            <div>
              <p className="text-sm text-gray-600">Aktivni od</p>
              <p className="text-lg font-semibold text-gray-900">Leta {workingSince}</p>
            </div>
          )}
          {obrtnik.hourly_rate && (
            <div>
              <p className="text-sm text-gray-600">Urna tarifa</p>
              <p className="text-lg font-semibold text-gray-900">{obrtnik.hourly_rate}€/uro</p>
            </div>
          )}
          {obrtnik.service_radius_km && (
            <div>
              <p className="text-sm text-gray-600">Pokritost</p>
              <p className="text-lg font-semibold text-gray-900">{obrtnik.service_radius_km} km</p>
            </div>
          )}
        </div>
      </Card>

      {/* AJPES Info */}
      {obrtnik.ajpes_id && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Registriran pri AJPES</h3>
          <p className="text-sm text-blue-800">
            Številka: <span className="font-mono font-semibold">{obrtnik.ajpes_id}</span>
          </p>
        </Card>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Področja</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge key={cat} variant="secondary" className="text-sm">
                {cat}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Website Link */}
      {obrtnik.website_url && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Spletna stran</h3>
          <a
            href={obrtnik.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline break-all"
          >
            {obrtnik.website_url}
          </a>
        </Card>
      )}
    </div>
  )
}
