import { z } from 'zod'

const trimmedString = z.string().trim()

export const publicInquirySchema = z.object({
  storitev: trimmedString.min(2, 'Storitev je obvezna').max(120, 'Storitev je predolga'),
  lokacija: trimmedString.min(2, 'Lokacija je obvezna').max(120, 'Lokacija je predolga'),
  opis: trimmedString.max(1000, 'Opis je predolg').optional().default(''),
  stranka_email: trimmedString.email('Neveljaven e-poštni naslov').optional(),
  stranka_telefon: trimmedString
    .regex(/^(\+386|0)[0-9\s]{8,12}$/, 'Neveljavna telefonska številka')
    .optional(),
  stranka_ime: trimmedString.max(120, 'Ime je predolgo').optional(),
})

export type PublicInquiryInput = z.infer<typeof publicInquirySchema>
