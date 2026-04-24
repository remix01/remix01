import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEffectiveCommission } from '@/lib/loyalty/commissionCalculator'
import { sendEmail } from '@/lib/email/sender'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return fail('Unauthorized', 401)
    }

    console.log('[tier-upgrades] Starting tier upgrade check...')

    // Get all craftworkers
    const { data: craftworkers, error } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*, user:user_id(*)')
      .eq('is_suspended', false)

    if (error) throw new Error(error.message)

    let upgradeCount = 0
    const upgrades: Array<{ name: string; oldRate: number; newRate: number; tierName: string }> = []

    for (const craftworker of (craftworkers || [])) {
      // Calculate current effective commission
      const currentCommission = getEffectiveCommission(craftworker)
      const currentRate = Number(craftworker.commission_rate) || 10

      // Check if there's a change in tier (lower rate = upgrade)
      if (currentCommission.rate < currentRate && currentCommission.rate !== currentRate) {
        // Update the stored commission rate
        const { error: updateError } = await supabaseAdmin
          .from('craftworker_profile')
          .update({ commission_rate: currentCommission.rate })
          .eq('id', craftworker.id)

        if (updateError) throw new Error(updateError.message)

        upgradeCount++
        upgrades.push({
          name: craftworker.user.name,
          oldRate: currentRate,
          newRate: currentCommission.rate,
          tierName: currentCommission.tierName
        })

        // Send congratulations email
        try {
          await sendEmail(craftworker.user.email, {
            subject: '🎉 Prešli ste na nižjo provizijsko stopnjo!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">🎉 Čestitamo!</h2>
                <p>Pozdravljeni ${craftworker.user.name},</p>
                <p>Vesele novice! Zaradi vaših uspešno opravljenih del ste dosegli nov tier in <strong>znižali svojo provizijo</strong>.</p>

                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0;"><strong>Stara provizija:</strong> ${currentRate}%</p>
                  <p style="margin: 8px 0 0 0;"><strong>Nova provizija:</strong> ${currentCommission.rate}% ✨</p>
                  <p style="margin: 8px 0 0 0;"><strong>Tier:</strong> ${currentCommission.tierName}</p>
                </div>

                <p><strong>Opravljenih del:</strong> ${craftworker.total_jobs_completed}</p>

                ${currentCommission.nextTierAt
                  ? `<p>Do naslednjega tiera še <strong>${currentCommission.nextTierAt} del</strong>!</p>`
                  : '<p>Dosegli ste najvišji tier! 🏆</p>'
                }

                <p>Prihranek na vsakem delu se avtomatično upošteva pri naslednjem plačilu.</p>

                <p>Hvala, da ste del LiftGO skupnosti!</p>
                <p>Ekipa LiftGO</p>
              </div>
            `
          })
        } catch (emailError) {
          console.error(`[tier-upgrades] Email error for ${craftworker.user.email}:`, emailError)
          // Continue processing other craftworkers even if email fails
        }
      }
    }

    console.log(`[tier-upgrades] Processed ${craftworkers?.length || 0} craftworkers, ${upgradeCount} upgrades`)

    return ok({
      success: true,
      checked: craftworkers?.length || 0,
      upgrades: upgradeCount,
      details: upgrades
    })

  } catch (error) {
    console.error('[tier-upgrades] Error:', error)
    return fail('Internal server error', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
