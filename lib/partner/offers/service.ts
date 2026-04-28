import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateOfferPayload, UpdateOfferPayload } from '@/lib/types/offer'
import { toOfferDto } from './adapter'

export class PartnerOfferServiceError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'PartnerOfferServiceError'
    this.code = code
    this.status = status
  }
}

function assertCreatePayload(body: CreateOfferPayload) {
  if (!body?.povprasevanje_id) {
    throw new PartnerOfferServiceError('MISSING_INQUIRY_ID', 'Povpraševanje je obvezno.', 400)
  }
  if (!body.message?.trim()) {
    throw new PartnerOfferServiceError('MISSING_MESSAGE', 'Sporočilo je obvezno.', 400)
  }
  if (!Number.isFinite(body.price_estimate) || body.price_estimate <= 0) {
    throw new PartnerOfferServiceError('INVALID_PRICE', 'Cena mora biti večja od 0.', 400)
  }
}

function assertUpdatePayload(body: UpdateOfferPayload) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!title || !message) {
    throw new PartnerOfferServiceError(
      'MISSING_TITLE_OR_MESSAGE',
      'Naslov in sporočilo sta obvezna.',
      400
    )
  }

  const price =
    typeof body.price_estimate === 'number'
      ? body.price_estimate
      : Number(body.price_estimate)

  if (!Number.isFinite(price) || price <= 0) {
    throw new PartnerOfferServiceError('INVALID_PRICE', 'Cena mora biti večja od 0.', 400)
  }

  return {
    title,
    message,
    price_estimate: price,
    available_date:
      typeof body.available_date === 'string' && body.available_date.length > 0
        ? body.available_date
        : null,
  }
}

export const partnerOfferService = {
  async list(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('ponudbe')
      .select('*')
      .eq('obrtnik_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new PartnerOfferServiceError('OFFER_LIST_FAILED', error.message, 500)
    }

    return (data ?? []).map(toOfferDto)
  },

  async create(supabase: SupabaseClient, userId: string, body: CreateOfferPayload) {
    assertCreatePayload(body)

    const { data: existing } = await supabase
      .from('ponudbe')
      .select('id')
      .eq('povprasevanje_id', body.povprasevanje_id)
      .eq('obrtnik_id', userId)
      .maybeSingle()

    if (existing) {
      throw new PartnerOfferServiceError(
        'DUPLICATE_OFFER',
        'Za to povpraševanje ste že oddali ponudbo.',
        409
      )
    }

    const { data, error } = await supabase
      .from('ponudbe')
      .insert({
        povprasevanje_id: body.povprasevanje_id,
        obrtnik_id: userId,
        title: body.title?.trim() ?? null,
        message: body.message.trim(),
        price_estimate: body.price_estimate,
        price_type: body.price_type ?? 'ocena',
        status: 'poslana',
        available_date: body.available_date ?? null,
      })
      .select('*')
      .single()

    if (error) {
      throw new PartnerOfferServiceError('OFFER_CREATE_FAILED', error.message, 500)
    }

    return toOfferDto(data)
  },

  async update(
    supabase: SupabaseClient,
    userId: string,
    offerId: string,
    body: UpdateOfferPayload
  ) {
    const payload = assertUpdatePayload(body)

    const { data: currentOffer, error: fetchError } = await supabase
      .from('ponudbe')
      .select('id, status, obrtnik_id')
      .eq('id', offerId)
      .maybeSingle()

    if (fetchError || !currentOffer) {
      throw new PartnerOfferServiceError('OFFER_NOT_FOUND', 'Ponudba ni bila najdena.', 404)
    }

    if (currentOffer.obrtnik_id !== userId) {
      throw new PartnerOfferServiceError('FORBIDDEN', 'Nimate dostopa do te ponudbe.', 403)
    }

    if (currentOffer.status === 'sprejeta' || currentOffer.status === 'zavrnjena') {
      throw new PartnerOfferServiceError(
        'OFFER_NOT_EDITABLE',
        'Sprejetih ali zavrnjenih ponudb ni mogoče urejati.',
        400
      )
    }

    const { data, error } = await supabase
      .from('ponudbe')
      .update(payload)
      .eq('id', offerId)
      .eq('obrtnik_id', userId)
      .select('*')
      .single()

    if (error) {
      throw new PartnerOfferServiceError('OFFER_UPDATE_FAILED', error.message, 500)
    }

    return toOfferDto(data)
  },

  async remove(supabase: SupabaseClient, userId: string, offerId: string) {
    const { data: currentOffer, error: fetchError } = await supabase
      .from('ponudbe')
      .select('id, status, obrtnik_id')
      .eq('id', offerId)
      .maybeSingle()

    if (fetchError || !currentOffer) {
      throw new PartnerOfferServiceError('OFFER_NOT_FOUND', 'Ponudba ni bila najdena.', 404)
    }

    if (currentOffer.obrtnik_id !== userId) {
      throw new PartnerOfferServiceError('FORBIDDEN', 'Nimate dostopa do te ponudbe.', 403)
    }

    if (currentOffer.status === 'sprejeta') {
      throw new PartnerOfferServiceError(
        'OFFER_NOT_DELETABLE',
        'Sprejete ponudbe ni mogoče izbrisati.',
        400
      )
    }

    const { error } = await supabase
      .from('ponudbe')
      .delete()
      .eq('id', offerId)
      .eq('obrtnik_id', userId)

    if (error) {
      throw new PartnerOfferServiceError('OFFER_DELETE_FAILED', error.message, 500)
    }

    return { deleted: true }
  },
}
