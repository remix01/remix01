import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Star, MapPin, Calendar, DollarSign, Shield } from 'lucide-react'
import { AcceptOfferButton } from '@/components/dashboard/stranka/AcceptOfferButton'
import { ReviewModal } from '@/components/dashboard/stranka/ReviewModal'
import { MarkCompleteButton } from '@/components/dashboard/stranka/MarkCompleteButton'
import { InstantMatchPanel } from '@/components/dashboard/stranka/InstantMatchPanel'

export const metadata = {
  title: 'Podrobnosti povpraševanja | LiftGO',
}

const statusBadgeColors = {
  odprto: 'bg-blue-100 text-blue-800',
  v_teku: 'bg-amber-100 text-amber-800',
  zakljuceno: 'bg-green-100 text-green-800',
  preklicano: 'bg-slate-100 text-slate-800',
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prijava')

  // Fetch inquiry details
  const { data: povprasevanje } = await supabase
    .from('povprasevanja')
    .select('*')
    .eq('id', id)
    .eq('narocnik_id', user.id)
    .single() as { data: any }

  if (!povprasevanje) {
    return <div className="p-8 text-center text-slate-600">Povpraševanje ni najdeno.</div>
  }

  // Fetch offers sorted: accepted first, then by creation date
  const { data: ponudbe } = await supabase
    .from('ponudbe')
    .select(
      `id,
       created_at,
       status,
       price_estimate,
       price_type,
       message,
       available_date,
       obrtnik_profiles:obrtnik_id(
         id,
         business_name,
         avg_rating,
         is_verified,
         profiles:id(
           full_name,
           email
         )
       )`
    )
    .eq('povprasevanje_id', id)
    .order('status', { ascending: false })
    .order('created_at', { ascending: true }) as { data: any[] | null }

  const acceptedOffer = ponudbe?.find((p) => p.status === 'sprejeta')
  const showReviewSection =
    povprasevanje.status === 'zakljuceno' && !!acceptedOffer
  const showMarkComplete =
    povprasevanje.status === 'v_teku' && !!acceptedOffer
  const showInstantMatch =
    povprasevanje.status === 'odprto' && (!ponudbe || ponudbe.length === 0)

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{povprasevanje.naslov}</h1>
            <p className="text-slate-600 mt-2">{povprasevanje.opis}</p>
          </div>
          <Badge className={statusBadgeColors[povprasevanje.status]}>
            {povprasevanje.status}
          </Badge>
        </div>
      </div>

      {/* Inquiry Details Card */}
      <Card className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Podrobnosti povpraševanja</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div>
            <p className="text-sm text-slate-600 font-medium">Kategorija</p>
            <p className="text-slate-900 font-semibold mt-1">{povprasevanje.kategorija}</p>
          </div>

          {/* Location */}
          <div>
            <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Lokacija
            </p>
            <p className="text-slate-900 font-semibold mt-1">{povprasevanje.lokacija}</p>
          </div>

          {/* Budget */}
          <div>
            <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budžet
            </p>
            <p className="text-slate-900 font-semibold mt-1">
              €{povprasevanje.budget_od}–€{povprasevanje.budget_do}
            </p>
          </div>

          {/* Date */}
          <div>
            <p className="text-sm text-slate-600 font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Datum
            </p>
            <p className="text-slate-900 font-semibold mt-1">
              {new Date(povprasevanje.created_at).toLocaleDateString('sl-SI')}
            </p>
          </div>
        </div>
      </Card>

      {/* Offers Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Prejete ponudbe</h2>

        {!ponudbe || ponudbe.length === 0 ? (
          <Card className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-600">Nimate prejete nobene ponudbe.</p>
            <p className="text-sm text-slate-500 mt-2">
              Obrtniki bodo odgovorili na vaše povpraševanje čim prej.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {ponudbe.map((offer) => {
              const craftsman = offer.obrtnik_profiles as any
              const isAccepted = offer.status === 'sprejeta'

              return (
                <Card
                  key={offer.id}
                  className={`bg-white border rounded-xl p-6 transition-colors ${
                    isAccepted
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Craftsman Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {craftsman.business_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Craftsman Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">
                            {craftsman.business_name}
                          </h3>
                          {craftsman.is_verified && (
                            <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(craftsman.avg_rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {craftsman.avg_rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isAccepted && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-600 text-white">✓ Sprejeta</Badge>
                      </div>
                    )}
                  </div>

                  {/* Offer Details */}
                  <div className="bg-white rounded-lg p-4 mb-4 border border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Price */}
                      <div>
                        <p className="text-sm text-slate-600 font-medium">Cena</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          €{offer.price_estimate}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{offer.price_type}</p>
                      </div>

                      {/* Availability */}
                      {offer.available_date && (
                        <div>
                          <p className="text-sm text-slate-600 font-medium">Razpoložljivost</p>
                          <p className="text-slate-900 font-semibold mt-1">
                            {new Date(offer.available_date).toLocaleDateString('sl-SI')}
                          </p>
                        </div>
                      )}

                      {/* Duration */}
                      {offer.estimated_duration && (
                        <div>
                          <p className="text-sm text-slate-600 font-medium">Trajanje</p>
                          <p className="text-slate-900 font-semibold mt-1">
                            {offer.estimated_duration}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  {offer.message && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700 line-clamp-4">
                        {offer.message}
                      </p>
                    </div>
                  )}

                  {/* CTA Button */}
                  {offer.status === 'poslana' && (
                    <AcceptOfferButton offerId={offer.id} povprasevanjId={id} />
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Instant Match — shown when open and no offers yet */}
      {showInstantMatch && (
        <div className="mb-8">
          <InstantMatchPanel povprasevanjeId={id} />
        </div>
      )}

      {/* Mark Complete — shown when job is in progress */}
      {showMarkComplete && acceptedOffer && (
        <Card className="bg-white border border-green-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Delo je končano?</h2>
          <p className="text-slate-600 mb-4 text-sm">
            Ko potrdite zaključek, bo plačilo sproščeno mojstru in povpraševanje zaključeno.
          </p>
          <MarkCompleteButton
            povprasevanjeId={id}
            acceptedOfferId={acceptedOffer.id}
          />
        </Card>
      )}

      {/* Review Section - shown only if inquiry is completed */}
      {showReviewSection && (
        <Card className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Ocenite vašega mojstra</h2>
          <p className="text-slate-600 mb-4">
            Vaša povratna informacija pomaga drugim strankom pri odločanju.
          </p>
          <ReviewModal povprasevanjId={id} />
        </Card>
      )}
    </div>
  )
}
