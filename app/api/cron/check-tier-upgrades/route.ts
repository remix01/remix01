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

    // Commission/loyalty data lives in craftworker_profile (not obrtnik_profiles).
    // Fetch email via the joined user row.
    const { data: craftworkers, error } = await supabaseAdmin
      .from('craftworker_profile')
      .select('id, user_id, commission_rate, commission_override, total_jobs_completed, loyalty_points, package_type, user:user_id(email, full_name)')
      .eq('is_suspended', false)

    if (error) throw new Error(error.message)

    let upgradeCount = 0
    const upgrades: Array<{ name: string; oldRate: number; newRate: number; tierName: string }> = []

    for (const craftworker of (craftworkers || [])) {
      const currentCommission = getEffectiveCommission(craftworker)
      const currentRate = Number(craftworker.commission_rate) || 10

      if (currentCommission.rate < currentRate && currentCommission.rate !== currentRate) {
        const { error: updateError } = await supabaseAdmin
          .from('craftworker_profile')
          .update({ commission_rate: currentCommission.rate })
          .eq('id', craftworker.id)

        if (updateError) throw new Error(updateError.message)

        const userRow = Array.isArray(craftworker.user) ? craftworker.user[0] : craftworker.user
        const fullName = (userRow as any)?.full_name ?? craftworker.user_id
        const email = (userRow as any)?.email

        upgradeCount++
        upgrades.push({
          name: fullName,
          oldRate: currentRate,
          newRate: currentCommission.rate,
          tierName: currentCommission.tierName
        })

        try {
          if (email) {
            await sendEmail(email, {
              subject: 'Prešli ste na nižjo provizijsko stopnjo!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">Čestitamo!</h2>
                  <p>Pozdravljeni ${fullName},</p>
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
