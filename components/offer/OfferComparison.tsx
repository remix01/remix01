'use client'

import React, { useState } from 'react'
import { Crown, Check, X, Phone, User, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export interface Offer {
  id: string
  mojsterId: string
  mojsterName: string
  price: number
  duration: string
  rating: number
  reviewCount: number
  materialIncluded: boolean
  warranty: string
  profilePicture?: string
}

interface OfferComparisonProps {
  offers: Offer[]
  recommendedId?: string
  onSelectOffer?: (offerId: string) => void
  onContactMojster?: (mojsterId: string) => void
  onViewProfile?: (mojsterId: string) => void
}

interface CriteriaValue {
  value: string | number | boolean
  isGood?: boolean
}

const getCriteriaValues = (offers: Offer[]): Record<string, CriteriaValue[]> => {
  return {
    'Cena': offers.map(o => {
      const prices = offers.map(off => off.price)
      const minPrice = Math.min(...prices)
      return {
        value: `${o.price}€`,
        isGood: o.price === minPrice,
      }
    }),
    'Čas dokončanja': offers.map(o => ({
      value: o.duration,
      isGood: o.duration === '1 dan',
    })),
    'Ocene': offers.map(o => {
      const ratings = offers.map(off => off.rating)
      const maxRating = Math.max(...ratings)
      return {
        value: `${o.rating}⭐ (${o.reviewCount})`,
        isGood: o.rating === maxRating,
      }
    }),
    'Material': offers.map(o => ({
      value: o.materialIncluded ? 'Vključen' : 'Ni vključen',
      isGood: o.materialIncluded,
    })),
    'Garancija': offers.map(o => ({
      value: o.warranty,
      isGood: o.warranty === '2 leti',
    })),
  }
}

const getPros = (offer: Offer): string[] => {
  const pros: string[] = []
  
  const allPrices = [offer.price] // standalone fallback; full list passed from component
  if (offer.price === Math.min(...allPrices)) pros.push('Najnižja cena')
  
  if (offer.rating >= 4.7) pros.push('Odličnega ocenjena')
  if (offer.materialIncluded) pros.push('Material je vključen')
  if (offer.warranty === '2 leti') pros.push('Dolga garancija')
  if (offer.duration === '1 dan') pros.push('Najhitrejše dokončanje')
  
  return pros.length > 0 ? pros : ['Solidna ponudba']
}

const getCons = (offer: Offer, offers: Offer[]): string[] => {
  const cons: string[] = []
  
  const allPrices = offers.map(o => o.price)
  if (offer.price > Math.min(...allPrices)) cons.push('Višja cena')
  
  if (offer.rating < 4.5) cons.push('Nižja ocena')
  if (!offer.materialIncluded) cons.push('Material ni vključen')
  if (offer.warranty === '1 leto') cons.push('Krajša garancija')
  if (offer.duration === '3 dni') cons.push('Daljši rok za dokončanje')
  
  return cons.length > 0 ? cons : []
}

export function OfferComparison({
  offers,
  recommendedId,
  onSelectOffer,
  onContactMojster,
  onViewProfile,
}: OfferComparisonProps) {
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('prednosti')

  const isRecommended = (offerId: string) => offerId === recommendedId
  const recommended = offers.find(o => o.id === recommendedId)
  const criteria = getCriteriaValues(offers)

  return (
    <div className="w-full space-y-6">
      {/* Recommendation Card */}
      {recommended && (
        <Card className="border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Crown className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  PRIPOROČILO: {recommended.mojsterName}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Najboljše razmerje cena/kvaliteta
                </p>
              </div>
              <Button
                onClick={() => onSelectOffer?.(recommended.id)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Izberi to ponudbo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="sticky left-0 z-10 bg-slate-50 w-32 font-semibold text-slate-900">
                    Kriterij
                  </TableHead>
                  {offers.map(offer => (
                    <TableHead
                      key={offer.id}
                      className={`text-center font-semibold cursor-pointer transition-colors ${
                        isRecommended(offer.id)
                          ? 'bg-yellow-50 border-l-4 border-yellow-400'
                          : 'bg-slate-50'
                      } ${
                        hoveredColumn === offer.id
                          ? 'bg-blue-50'
                          : ''
                      }`}
                      onMouseEnter={() => setHoveredColumn(offer.id)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      onClick={() => onViewProfile?.(offer.mojsterId)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {offer.profilePicture && (
                          <img
                            src={offer.profilePicture}
                            alt={offer.mojsterName}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium text-slate-900">
                          {offer.mojsterName}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(criteria).map(([criteriaName, values]) => (
                  <TableRow key={criteriaName}>
                    <TableCell className="sticky left-0 z-10 bg-white font-medium text-slate-900 w-32">
                      {criteriaName}
                    </TableCell>
                    {values.map((value, index) => {
                      const offer = offers[index]
                      return (
                        <TableCell
                          key={`${criteriaName}-${offer.id}`}
                          className={`text-center transition-colors ${
                            isRecommended(offer.id)
                              ? 'bg-yellow-50 border-l-4 border-yellow-400'
                              : 'bg-white'
                          } ${
                            hoveredColumn === offer.id
                              ? 'bg-blue-50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className={`${
                              value.isGood ? 'text-green-700 font-semibold' : 'text-slate-600'
                            }`}>
                              {value.value}
                            </span>
                            {value.isGood && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="w-full rounded-none border-b bg-white">
              <TabsTrigger value="prednosti" className="flex-1 rounded-none">
                Prednosti
              </TabsTrigger>
              <TabsTrigger value="slabosti" className="flex-1 rounded-none">
                Slabosti
              </TabsTrigger>
              <TabsTrigger value="akcije" className="flex-1 rounded-none">
                Akcije
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prednosti" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map(offer => (
                  <div key={offer.id}>
                    <h4 className="font-semibold text-slate-900 mb-3">
                      {offer.mojsterName}
                    </h4>
                    <ul className="space-y-2">
                      {getPros(offer).map((pro, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-600">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="slabosti" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map(offer => (
                  <div key={offer.id}>
                    <h4 className="font-semibold text-slate-900 mb-3">
                      {offer.mojsterName}
                    </h4>
                    {getCons(offer, offers).length > 0 ? (
                      <ul className="space-y-2">
                        {getCons(offer, offers).map((con, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-600">{con}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        Nobenih resnih pomanjkljivosti
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="akcije" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {offers.map(offer => (
                  <div key={offer.id} className="space-y-3">
                    <h4 className="font-semibold text-slate-900">
                      {offer.mojsterName}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onContactMojster?.(offer.mojsterId)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Kontaktiraj mojstra
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => onViewProfile?.(offer.mojsterId)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Poglej profil
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => onSelectOffer?.(offer.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Sprejmi ponudbo
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
