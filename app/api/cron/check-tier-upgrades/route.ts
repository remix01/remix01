import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEffectiveCommission } from '@/lib/loyalty/commissionCalculator'
import { sendEmail } from '@/lib/email/sender'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[tier-upgrades] Starting tier upgrade check...')

    // Get all active craftworkers from canonical obrtnik_profiles
    const { data: craftworkers, error } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, commission_rate, total_jobs_completed, loyalty_points, subscription_tier')
      .eq('is_available', true)

    if (error) throw new Error(error.message)

    let upgradeCount = 0
    const upgrades: Array<{ name: string; oldRate: number; newRate: number; tierName: string }> = []

    for (const craftworker of (craftworkers || [])) {
      const currentCommission = getEffectiveCommission(craftworker)
      const currentRate = Number(craftworker.commission_rate) || 10

      if (currentCommission.rate < currentRate && currentCommission.rate !== currentRate) {
        // Update commission_rate in canonical obrtnik_profiles
        const { error: updateError } = await supabaseAdmin
          .from('obrtnik_profiles')
          .update({ commission_rate: currentCommission.rate })
          .eq('id', craftworker.id)

        if (updateError) throw new Error(updateError.message)

        // Fetch profile for email
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', craftworker.id)
          .maybeSingle()

        upgradeCount++
        upgrades.push({
          name: profile?.full_name || craftworker.id,
          oldRate: currentRate,
          newRate: currentCommission.rate,
          tierName: currentCommission.tierName
        })

        try {
          if (profile?.email) {
            await sendEmail(profile.email, {
              subject: 'Prešli ste na nižjo provizijsko stopnjo!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Čestitamo!</h2>
                  <p>Pozdravljeni ${profile.full_name || ''},</p>
                  <p>Vesele novice! Zaradi vaših uspešno opravljenih del ste dosegli nov tier in <strong>znižali svojo provizijo</strong>.</p>
                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0;"><strong>Stara provizija:</strong> ${currentRate}%</p>
                    <p style="margin: 8px 0 0 0;"><strong>Nova provizija:</strong> ${currentCommission.rate}%</p>
                    <p style="margin: 8px 0 0 0;"><strong>Tier:</strong> ${currentCommission.tierName}</p>
                  </div>
                  <p>Hvala, da ste del LiftGO skupnosti!</p>
                  <p>Ekipa LiftGO</p>
                </div>
              `
            })
          }
        } catch (emailError) {
          console.error(`[tier-upgrades] Email error for ${craftworker.id}:`, emailError)
        }
      }
    }

    console.log(`[tier-upgrades] Processed ${craftworkers?.length || 0} craftworkers, ${upgradeCount} upgrades`)

    return NextResponse.json({
      success: true,
      checked: craftworkers?.length || 0,
      upgrades: upgradeCount,
      details: upgrades
    })

  } catch (error) {
    console.error('[tier-upgrades] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
