'use client'

import type React from 'react'
import type { Ponudba } from '@/types/marketplace'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Star, MapPin } from 'lucide-react'
import Link from 'next/link'

interface OfferCardProps {
  key?: React.Key
  offer: Ponudba
}

export function OfferCard({ offer }: OfferCardProps) {
  const obrtnik = offer.obrtnik
  if (!obrtnik) return null

  const statusLabel: Record<string, string> = {
    'poslana': 'Poslana',
    'sprejeta': 'Sprejeta',
    'zavrnjena': 'Zavrnjena',
  }

  const priceTypeLabel: Record<string, string> = {
    'fiksna': 'Fiksna cena',
    'ocena': 'Ocena cene',
    'po_ogledu': 'Po ogledu',
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Obrtnik Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <Link
                href={`/obrtniki/${obrtnik.id}`}
                className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
              >
                {obrtnik.business_name}
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                <MapPin className="w-4 h-4" />
                {obrtnik.profile?.location_city}
              </div>
            </div>
            {obrtnik.verification_status === 'verified' && (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-sm">
                {obrtnik.avg_rating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              ({obrtnik.total_reviews} ocen)
            </span>
          </div>

          {/* Offer Message */}
          <p className="text-slate-700 text-sm mb-3 line-clamp-2">
            {offer.message}
          </p>

          {/* Price and Date */}
          <div className="flex flex-wrap gap-2 items-center">
            {offer.price_estimate && (
              <Badge variant="secondary" className="text-xs">
                {offer.price_estimate} €
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {priceTypeLabel[offer.price_type] || offer.price_type}
            </Badge>
            {offer.available_date && (
              <Badge variant="outline" className="text-xs">
                {new Date(offer.available_date).toLocaleDateString('sl-SI')}
              </Badge>
            )}
          </div>
        </div>

        {/* Status and Action */}
        <div className="flex flex-col items-end justify-between md:w-48">
          <Badge
            className={
              offer.status === 'sprejeta'
                ? 'bg-green-50 text-green-700'
                : offer.status === 'zavrnjena'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }
          >
            {statusLabel[offer.status] || offer.status}
          </Badge>

          <Button
            size="sm"
            asChild
            className="mt-4"
            disabled={offer.status === 'zavrnjena'}
          >
            <Link href={`/obrtniki/${obrtnik.id}`}>
              Ogled profila
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
