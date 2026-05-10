export type OfferPriceType = 'fiksna' | 'ocena' | 'po_ogledu'

export interface Offer {
  id: string
  povprasevanje_id: string | null
  obrtnik_id: string
  title: string | null
  message: string | null
  description: string | null
  notes: string | null
  price_estimate: number | null
  price_type: OfferPriceType | null
  status: 'poslana' | 'sprejeta' | 'zavrnjena' | string
  available_date: string | null
  created_at: string
}

export interface CreateOfferPayload {
  povprasevanje_id: string
  title?: string
  message: string
  description?: string
  notes?: string
  price_estimate: number
  price_type?: OfferPriceType
  available_date?: string | null
}

export interface UpdateOfferPayload {
  title?: string
  message: string
  price_estimate: number
  available_date?: string | null
}
