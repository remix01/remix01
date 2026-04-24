import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Supported image media types for Claude Vision
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type SupportedMediaType = typeof SUPPORTED_TYPES[number]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Nepooblaščen dostop.', 401)

    if (!process.env.ANTHROPIC_API_KEY) {
      return fail('Agent ni konfiguriran.', 503)
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const additionalContext = (formData.get('context') as string) || ''

    if (!file) {
      return fail('Datoteka je obvezna.', 400)
    }

    // Validate file type
    const mediaType = file.type as SupportedMediaType
    if (!SUPPORTED_TYPES.includes(mediaType)) {
      return fail('Podprti formati: JPEG, PNG, GIF, WebP. Za video prosimo zajemite posnetek zaslona.', 400)
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return fail('Datoteka je prevelika. Maksimalna velikost je 5MB.', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const systemPrompt = `Si LiftGO video diagnozni asistent za Slovenijo.
Analiziraš fotografije okvar, poškodb in gradbenih problemov.
Na podlagi slike pripravi začetno oceno za mojstra in naročnika.
Vedno odgovarjaš v slovenščini.
Bodi konservativen — ne diagnoziraj brez zadostnih informacij.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = additionalContext
      ? `Dodatni kontekst od naročnika: ${additionalContext}\n\nAnaliziraj priloženo sliko.`
      : 'Analiziraj priloženo sliko problema.'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `${userPrompt}

Vrni JSON z naslednjo strukturo:
{
  "problemDescription": "opis vidnega problema",
  "severity": "nizka|srednja|visoka",
  "suggestedCategories": ["kategorija1", "kategorija2"],
  "recommendedExperts": ["vrsta strokovnjaka"],
  "urgency": "normalno|kmalu|nujno",
  "descriptionForMaster": "opis za mojstra (tehničen)",
  "descriptionForCustomer": "opis za naročnika (razumljiv)",
  "suggestedTitle": "predlagani naslov povpraševanja",
  "warnings": ["opozorilo če obstaja"],
  "additionalPhotosNeeded": ["kaj bi pomagalo videti"],
  "canDiagnose": true
}
Če slike ni mogoče diagnosticirati, vrni canDiagnose: false in razloži zakaj.`,
            },
          ],
        },
      ],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let diagnosis
    try {
      diagnosis = JSON.parse(text)
    } catch {
      diagnosis = {
        canDiagnose: false,
        problemDescription: 'Ni bilo mogoče analizirati slike.',
        suggestedCategories: [],
        warnings: [text.slice(0, 200)],
      }
    }

    return ok({ diagnosis })
  } catch (error) {
    console.error('[agent/video-diagnosis] error:', error)
    if (error instanceof Anthropic.APIError) {
      return fail(`AI napaka: ${error.message}`, error.status)
    }
    return fail('Napaka pri analizi slike.', 500)
  }
}
