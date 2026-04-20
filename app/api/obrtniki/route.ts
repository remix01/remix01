import { verifyAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { partnerService, handleServiceError } from '@/lib/services'
import { z } from 'zod'

const createObrtnikiSchema = z.object({
  email: z.string().email('Neveljaven e-poštni naslov'),
  ime: z.string().min(1, 'Ime je obvezno').max(100),
  priimek: z.string().min(1, 'Priimek je obvezen').max(100),
  podjetje: z.string().max(200).optional(),
  telefon: z.string().max(20).optional(),
  storitve: z.array(z.string()).optional(),
  lokacija: z.string().max(100).optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storitev = searchParams.get('storitev') || undefined
  const lokacija = searchParams.get('lokacija') || undefined
  const adminReq = searchParams.get('admin') === 'true'

  const admin = adminReq ? await verifyAdmin(req) : null
  if (adminReq && !admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await partnerService.getObrtniki({
      storitev,
      lokacija,
      includeUnverified: !!admin,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[obrtniki] error:', error)
    return handleServiceError(error)
  }
}

export async function POST(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rawBody: unknown = await req.json()
    const parsed = createObrtnikiSchema.safeParse(rawBody)

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = await partnerService.createObrtnik(parsed.data)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[obrtniki] POST error:', error)
    return handleServiceError(error)
  }
}
