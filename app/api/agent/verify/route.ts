import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startVerification } from '@/lib/mcp/ajpes'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ajpesId, businessName } = body

    if (!ajpesId || !businessName) {
      return NextResponse.json(
        { error: 'Manjka matična številka ali ime podjetja' },
        { status: 400 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Nepooblaščeni dostop' },
        { status: 401 }
      )
    }

    // Get obrtnik profile
    const { data: obrtnikProfile } = await supabase
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json(
        { error: 'Obrtnik profil ni najden' },
        { status: 404 }
      )
    }

    // Start verification
    const result = await startVerification({
      obrtknikId: user.id,
      ajpesId,
      businessName,
    })

    const messages: Record<string, string> = {
      auto_verified: 'Podjetje je avtomatično verificirano! ✅',
      manual_review: 'Podjetje je poslano v pregled administratorjem. ⏳',
      failed: 'Napaka pri verifikaciji. Poskusite ponovno. ❌',
    }

    return NextResponse.json({
      status: result.status,
      message: messages[result.status],
      verificationId: result.verificationId,
      error: result.error,
    })
  } catch (error) {
    console.error('[v0] Verify endpoint error:', error)
    return NextResponse.json(
      { error: 'Napaka pri obdelavi zahteve' },
      { status: 500 }
    )
  }
}
