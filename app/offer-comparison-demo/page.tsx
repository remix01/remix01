'use client'

import React, { useState } from 'react'
import { OfferComparison, type Offer } from '@/components/offer/OfferComparison'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const sampleOffers: Offer[] = [
  {
    id: 'offer-1',
    mojsterId: 'mojster-1',
    mojsterName: 'Mojster Janez',
    price: 450,
    duration: '2 dni',
    rating: 4.8,
    reviewCount: 45,
    materialIncluded: true,
    warranty: '2 leti',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'offer-2',
    mojsterId: 'mojster-2',
    mojsterName: 'Mojster Boris',
    price: 380,
    duration: '3 dni',
    rating: 4.5,
    reviewCount: 12,
    materialIncluded: false,
    warranty: '1 leto',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    id: 'offer-3',
    mojsterId: 'mojster-3',
    mojsterName: 'Mojster Marko',
    price: 520,
    duration: '1 dan',
    rating: 4.9,
    reviewCount: 8,
    materialIncluded: true,
    warranty: '2 leti',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
]

export default function OfferComparisonDemo() {
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null)
  const [contactedMojster, setContactedMojster] = useState<string | null>(null)
  const [viewedProfile, setViewedProfile] = useState<string | null>(null)

  const handleSelectOffer = (offerId: string) => {
    setSelectedOffer(offerId)
    alert(`Ponudba izbrana: ${sampleOffers.find(o => o.id === offerId)?.mojsterName}`)
  }

  const handleContactMojster = (mojsterId: string) => {
    setContactedMojster(mojsterId)
    const mojster = sampleOffers.find(o => o.mojsterId === mojsterId)
    alert(`Kontaktirani ste: ${mojster?.mojsterName}`)
  }

  const handleViewProfile = (mojsterId: string) => {
    setViewedProfile(mojsterId)
    const mojster = sampleOffers.find(o => o.mojsterId === mojsterId)
    alert(`Ogled profila: ${mojster?.mojsterName}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">
            Primerjava ponudb
          </h1>
          <p className="text-lg text-slate-600">
            Primerjajte ponudbe treh mojstrov za popravilo curka v kopalnici
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Naloga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-slate-900">
                Popravilo curka v kopalnici
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Lokacija
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-slate-900">Ljubljana</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Ugodnost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-slate-900">Ta teden</p>
            </CardContent>
          </Card>
        </div>

        {/* Selected Offer Feedback */}
        {selectedOffer && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <p className="text-sm text-green-800">
                ✓ Ponudba izbrana:{' '}
                <strong>
                  {sampleOffers.find(o => o.id === selectedOffer)?.mojsterName}
                </strong>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Comparison Widget */}
        <OfferComparison
          offers={sampleOffers}
          recommendedId="offer-1"
          onSelectOffer={handleSelectOffer}
          onContactMojster={handleContactMojster}
          onViewProfile={handleViewProfile}
        />

        {/* Action Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contactedMojster && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-800">
                  📞 Kontaktirani:{' '}
                  <strong>
                    {sampleOffers.find(o => o.mojsterId === contactedMojster)?.mojsterName}
                  </strong>
                </p>
              </CardContent>
            </Card>
          )}

          {viewedProfile && (
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <p className="text-sm text-purple-800">
                  👤 Profil ogledan:{' '}
                  <strong>
                    {sampleOffers.find(o => o.mojsterId === viewedProfile)?.mojsterName}
                  </strong>
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>Funkcionalnosti</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>✓ Priporočilo na vrhu z best-value ponudbo</li>
              <li>✓ Primerjalna tabela z highlights najboljših vrednosti</li>
              <li>✓ Zlata barva za priporočeno ponudbo</li>
              <li>✓ Trikrat - Prednosti, Slabosti, Akcije</li>
              <li>✓ Interaktivne ikone (Phone, User, CheckCircle)</li>
              <li>✓ Hover effects za izbiro stolpcev</li>
              <li>✓ Responsive design - tabela se drsi na mobilnih napravah</li>
              <li>✓ Slovenski jezik za vse oznake in besedila</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
