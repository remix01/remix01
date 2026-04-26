export type OfferPriceType = 'fiksna' | 'ocena' | 'po_ogledu'

export interface Offer {
  id: string
  povprasevanje_id: string | null
  obrtnik_id: string
  message: string | null
  price_estimate: number | null
  price_type: OfferPriceType | null
  status: 'poslana' | 'sprejeta' | 'zavrnjena' | string
  available_date: string | null
  created_at: string
}

export interface CreateOfferPayload {
  povprasevanje_id: string
  message: string
  price_estimate: number
  price_type?: OfferPriceType
  available_date?: string | null
}

export interface UpdateOfferPayload {
  message: string
  price_estimate: number
  available_date?: string | null
}
