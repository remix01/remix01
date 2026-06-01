// AI-powered SEO content generator — stores results in seo_pages table.
// Call from admin UI or one-off scripts only, NOT from ISR/request handlers.

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { env } from '@/lib/env'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  return _client
}

const SeoContentSchema = z.object({
  meta_title: z.string().max(60),
  meta_description: z.string().max(160),
  h1_override: z.string(),
  intro_text: z.string().min(200),
  faq_items: z.array(z.object({ question: z.string(), answer: z.string() })).min(3).max(6),
})

type SeoContent = z.infer<typeof SeoContentSchema>

const LOCALE_PROMPTS: Record<string, string> = {
  de: `Du erstellst SEO-Inhalte für eine Handwerker-Plattform in Österreich.
Antworte AUSSCHLIESSLICH mit validem JSON ohne Markdown-Code-Blöcke.`,
  hr: `Pišeš SEO sadržaj za platformu za majstore u Hrvatskoj.
Odgovori ISKLJUČIVO valjanim JSON-om bez Markdown blokova koda.`,
  sl: `Pišeš SEO vsebino za platformo za obrtnike v Sloveniji.
Odgovori IZKLJUČNO z veljavnim JSON brez Markdown blokov kode.`,
}

function buildPrompt(locale: string, categoryName: string, cityName?: string): string {
  const location = cityName
    ? (locale === 'de' ? `in ${cityName}` : locale === 'hr' ? `u ${cityName}` : `v ${cityName}`)
    : (locale === 'de' ? 'in Österreich' : locale === 'hr' ? 'u Hrvatskoj' : 'v Sloveniji')

  return `${LOCALE_PROMPTS[locale] ?? LOCALE_PROMPTS.sl}

Ustvari SEO vsebino za stran: "${categoryName} ${location}"

Vrni točno ta JSON objekt (brez dodatnih polj):
{
  "meta_title": "... (max 60 znakov)",
  "meta_description": "... (max 160 znakov)",
  "h1_override": "...",
  "intro_text": "... (vsaj 200 besed, bogata, edinstvena vsebina)",
  "faq_items": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`
}

export async function generateSeoContent(
  locale: string,
  categoryName: string,
  cityName?: string,
): Promise<SeoContent> {
  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(locale, categoryName, cityName) }],
  })

  const raw = (response.content[0] as { type: string; text: string }).text.trim()
  const parsed = JSON.parse(raw)
  return SeoContentSchema.parse(parsed)
}

export async function generateAndStorePage(params: {
  locale: string
  categorySlug: string
  categoryName: string
  citySlug?: string
  cityName?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const content = await generateSeoContent(params.locale, params.categoryName, params.cityName)

    const slug = params.citySlug
      ? `${params.locale}/${params.categorySlug}/${params.citySlug}`
      : `${params.locale}/${params.categorySlug}`

    const { error } = await supabaseAdmin
      .from('seo_pages')
      .upsert(
        {
          slug,
          locale: params.locale,
          category_slug: params.categorySlug,
          city_slug: params.citySlug ?? null,
          meta_title: content.meta_title,
          meta_description: content.meta_description,
          h1_override: content.h1_override,
          intro_text: content.intro_text,
          faq_items: content.faq_items,
          is_indexed: true,
        },
        { onConflict: 'slug' },
      )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
