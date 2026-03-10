'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Zap, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { ObrtnikProfile } from '@/types/marketplace'

interface InstantMatchesProps {
  matches: ObrtnikProfile[]
  povprasevanjeId: string
  loading?: boolean
}

export function InstantMatches({
  matches,
  povprasevanjeId,
  loading = false,
}: InstantMatchesProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin">
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </Card>
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-slate-600">
          Ni trenutno dostopnih ujemanj. Poskusite kasneje.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-slate-900">Hitri ujemki</h2>
          <Badge className="ml-auto">{matches.length} ujemkov</Badge>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Tukaj so top-priporočeni mojstri za vaše povpraševanje, na podlagi ocene,
          dostopnosti in lokacije.
        </p>

        {/* Matches List */}
        <div className="space-y-3">
          {matches.map((match, index) => (
            <div
              key={match.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left Side - Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/obrtniki/${match.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 truncate"
                    >
                      {match.business_name}
                    </Link>
                    {match.is_verified && (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm">
                        {match.avg_rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      ({match.total_reviews} ocen)
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {match.profile?.location_city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.profile.location_city}
                      </div>
                    )}
                    {match.is_available && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700"
                      >
                        Dostopen
                      </Badge>
                    )}
                  </div>

                  {/* Categories */}
                  {match.categories && match.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {match.categories.slice(0, 2).map((cat) => (
                        <Badge
                          key={cat.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {cat.name}
                        </Badge>
                      ))}
                      {match.categories.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{match.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side - Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/obrtniki/${match.id}`}>
                    <Button variant="outline" size="sm" className="whitespace-nowrap">
                      Profil
                    </Button>
                  </Link>
                  <Button size="sm" className="whitespace-nowrap">
                    Pošlji zahtevo
                  </Button>
                </div>
              </div>

              {/* Rank Badge */}
              {index < 3 && (
                <div className="mt-3 pt-3 border-t">
                  <Badge className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                    #{index + 1} ujemek za vas
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="pt-4 border-t mt-6">
          <p className="text-sm text-slate-600 mb-3">
            Želite videti več možnosti?
          </p>
          <Link href="/mojstri">
            <Button variant="outline" className="w-full">
              Brskaj celoten katalog
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
