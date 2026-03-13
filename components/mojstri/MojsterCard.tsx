import type { ObrtnikiPublic } from '@/lib/dal/obrtniki'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Briefcase } from 'lucide-react'
import Link from 'next/link'

interface MojsterCardProps {
  obrtnik: ObrtnikiPublic
}

export function MojsterCard({ obrtnik }: MojsterCardProps) {
  const displayName = obrtnik.podjetje || `${obrtnik.ime} ${obrtnik.priimek}`
  const specialnosti = obrtnik.specialnosti?.slice(0, 3) || []
  const lokacije = obrtnik.lokacije?.slice(0, 2) || []

  return (
    <Link href={`/obrtniki/${obrtnik.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {obrtnik.ime.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {displayName}
              </h3>
              {obrtnik.bio && (
                <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                  {obrtnik.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Location */}
          {lokacije.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{lokacije.join(', ')}</span>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(obrtnik.ocena)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold text-sm">
              {obrtnik.ocena.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">
              ({obrtnik.stevilo_ocen})
            </span>
          </div>

          {/* Specialnosti */}
          {specialnosti.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {specialnosti.map((spec, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {obrtnik.specialnosti && obrtnik.specialnosti.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{obrtnik.specialnosti.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Experience */}
          {obrtnik.leta_izkusenj && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Briefcase className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span className="text-xs text-slate-600">
                {obrtnik.leta_izkusenj}+ let izkušenj
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
