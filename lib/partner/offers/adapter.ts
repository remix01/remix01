import type { Offer } from '@/lib/types/offer'

type OfferRow = {
  id: string
  povprasevanje_id: string | null
  obrtnik_id: string
  title: string | null
  message: string | null
  description: string | null
  notes: string | null
  price_estimate: number | null
  price_type: Offer['price_type']
  status: string
  available_date: string | null
  created_at: string
}

/**
 * Normalizes DB row data into stable Offer DTO shape used by partner UI.
 */
export function toOfferDto(row: OfferRow): Offer {
  return {
    id: row.id,
    povprasevanje_id: row.povprasevanje_id,
    obrtnik_id: row.obrtnik_id,
    title: row.title ?? null,
    message: row.message ?? null,
    description: row.description ?? null,
    notes: row.notes ?? null,
    price_estimate: row.price_estimate ?? null,
    price_type: row.price_type ?? 'ocena',
    status: row.status,
    available_date: row.available_date ?? null,
    created_at: row.created_at,
  }
}
