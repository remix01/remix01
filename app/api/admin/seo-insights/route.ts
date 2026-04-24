import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chat } from '@/lib/ai/providers'
import { ok, fail } from '@/lib/http/response'

export async function POST() {
  try {
    await requireAdmin()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: inquiries } = await supabaseAdmin
      .from('povprasevanja')
      .select('title, description, kategorija, search_query')
      .gte('created_at', since)
      .or('kategorija.eq.other,kategorija.is.null')
      .limit(300)

    const sample = (inquiries || []).map((x: any) => `- ${x.title} | ${x.description || ''}`).join('\n').slice(0, 9000)
    const prompt = `Na podlagi spodnjih poizvedb predlagaj nove kategorije za LiftGO.\nVrni:\n1) 5 predlogov kategorij (ime, slug, opis)\n2) 5 SEO blog tem.\nOdgovori v slovenščini.\n\nPodatki:\n${sample}`
    const result = await chat([{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 800 })

    return ok({ insights: result.content })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return fail('Napaka pri AI SEO analizi.', status)
  }
}
