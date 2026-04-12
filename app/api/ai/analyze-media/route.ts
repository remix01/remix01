import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { imageUrl, description } = await req.json()
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 })
    }

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'video_diagnosis',
      userMessage: `Analiziraj sliko in pripravi kratek povzetek problema, predlagane korake popravila in okviren seznam materiala. Kontekst: ${description || ''}`,
      imageUrl,
      useRAG: false,
      useTools: false,
    })

    return NextResponse.json({ success: true, data: ai.response })
  } catch (error) {
    console.error('[analyze-media] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI analizi medija' }, { status: 500 })
  }
}
