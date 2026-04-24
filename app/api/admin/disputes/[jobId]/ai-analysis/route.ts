import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chat } from '@/lib/ai/providers'
import { ok, fail } from '@/lib/http/response'

interface RouteContext { params: Promise<{ jobId: string }> }

export async function GET(_: Request, context: RouteContext) {
  try {
    await requireAdmin()
    const { jobId } = await context.params

    const { data: job } = await supabaseAdmin
      .from('job')
      .select(`
        id,
        title,
        status,
        payment:payment_id(amount, platform_fee, dispute_reason, status),
        conversation:conversation_id(message(body, created_at, sender:user_id(name)))
      `)
      .eq('id', jobId)
      .single()

    if (!job) return fail('Not found', 404)

    const messages = (job as any).conversation?.message || []
    const transcript = messages.map((m: any) => `${m.sender?.name || 'Unknown'}: ${m.body}`).join('\n').slice(0, 6000)
    const payment = (job as any).payment

    const prompt = `Analiziraj spor in odgovori v slovenščini.\n\nProjekt: ${(job as any).title}\nStatus: ${(job as any).status}\nPlačilo: €${Number(payment?.amount || 0).toFixed(2)}\nProvizija: €${Number(payment?.platform_fee || 0).toFixed(2)}\nRazlog spora: ${payment?.dispute_reason || 'ni naveden'}\n\nPogovor:\n${transcript}\n\nVrni točno v formatu:\nPOVZETEK:\n...\n\nPREVERBA PRAVIL:\n...\n\nPREDLOG REŠITVE:\n...`

    const ai = await chat([{ role: 'user', content: prompt }], { temperature: 0.2, maxTokens: 700 })

    return ok({ analysis: ai.content })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return fail('Napaka pri AI analizi.', status)
  }
}
