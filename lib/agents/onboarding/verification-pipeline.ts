/**
 * 4-Step Craftsman Verification Pipeline
 *
 * Steps:
 *   1. identity    — Stripe Identity document check
 *   2. license     — National business registry (AJPES / Handelsregister / …)
 *   3. insurance   — AI analysis of uploaded insurance certificate
 *   4. references  — Review score check from DB
 */

import { createAdminClient } from '@/lib/supabase/server'
import { AI } from '@/lib/ai/extended-orchestrator'
import { lookupRegistry } from './registry-connectors'
import Stripe from 'stripe'
import { env } from '@/lib/env'

export interface VerificationContext {
  obrnikId:          string
  countryCode:       string
  taxNumber?:        string
  oib?:              string
  companyName?:      string
  city?:             string
  insuranceFileUrl?: string
  portfolioUrls?:    string[]
  stripeCustomerId?: string
}

export interface VerificationStepResult {
  step:    'identity' | 'license' | 'insurance' | 'references'
  status:  'passed' | 'failed' | 'pending_hitl' | 'skipped'
  details: Record<string, unknown>
}

export interface VerificationPipelineResult {
  obrnikId:    string
  allPassed:   boolean
  steps:       VerificationStepResult[]
  finalStatus: 'verified' | 'rejected' | 'pending_review'
}

async function logVerificationStep(
  obrnikId: string,
  step: string,
  status: string,
  resultData: Record<string, unknown>,
  verifiedBy = 'ai',
) {
  const supabase = createAdminClient()
  await supabase.from('craftsman_verification_log').insert({
    obrtnik_id:  obrnikId,
    step,
    status,
    result_data: resultData,
    verified_by: verifiedBy,
  })
}

async function verifyIdentity(ctx: VerificationContext): Promise<VerificationStepResult> {
  if (!ctx.stripeCustomerId) {
    await logVerificationStep(ctx.obrnikId, 'identity', 'pending_hitl', {
      reason: 'no_stripe_customer',
    }, 'human')

    await AI.hitl.create({
      executionId: `verify:identity:${ctx.obrnikId}`,
      agentName:   'verification_agent',
      description: `Identity verification required for obrtnik ${ctx.obrnikId}`,
      context: { obrnikId: ctx.obrnikId, step: 'identity' },
    })

    return { step: 'identity', status: 'pending_hitl', details: { reason: 'no_stripe_customer' } }
  }

  try {
    const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' as any })
    const session = await stripeClient.identity.verificationSessions.create({
      type:     'document',
      metadata: { obrtnik_id: ctx.obrnikId },
      options:  { document: { allowed_types: ['id_card', 'passport', 'driving_license'] } },
    })

    await logVerificationStep(ctx.obrnikId, 'identity', 'pending_hitl', {
      stripe_session_id: session.id,
      stripe_url:        session.url,
    }, 'stripe_identity')

    return {
      step:    'identity',
      status:  'pending_hitl',
      details: { stripe_session_id: session.id, url: session.url },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logVerificationStep(ctx.obrnikId, 'identity', 'failed', { error: message })
    return { step: 'identity', status: 'failed', details: { error: message } }
  }
}

async function verifyLicense(ctx: VerificationContext): Promise<VerificationStepResult> {
  const registryResult = await lookupRegistry(ctx.countryCode, {
    taxNumber:   ctx.taxNumber,
    oib:         ctx.oib,
    companyName: ctx.companyName,
    city:        ctx.city,
  })

  const details: Record<string, unknown> = { ...registryResult }

  if (registryResult.needsManualCheck) {
    await logVerificationStep(ctx.obrnikId, 'license', 'pending_hitl', details, 'human')

    await AI.hitl.create({
      executionId: `verify:license:${ctx.obrnikId}`,
      agentName:   'verification_agent',
      description: `Manual license check required for obrtnik ${ctx.obrnikId} in ${ctx.countryCode}`,
      context: { obrnikId: ctx.obrnikId, step: 'license', ...details },
    })

    return { step: 'license', status: 'pending_hitl', details }
  }

  const status = registryResult.found && registryResult.isActive ? 'passed' : 'failed'
  await logVerificationStep(ctx.obrnikId, 'license', status, details)
  return { step: 'license', status, details }
}

async function verifyInsurance(ctx: VerificationContext): Promise<VerificationStepResult> {
  if (!ctx.insuranceFileUrl) {
    await logVerificationStep(ctx.obrnikId, 'insurance', 'skipped', { reason: 'no_document_provided' })
    return { step: 'insurance', status: 'skipped', details: { reason: 'no_document_provided' } }
  }

  try {
    const result = await AI.sequential({
      userId: ctx.obrnikId,
      initialMessage: `Analyse insurance certificate: ${ctx.insuranceFileUrl}`,
      steps: [
        {
          agentType: 'onboarding_assistant',
          userMessage: `Analyse this insurance certificate URL: ${ctx.insuranceFileUrl}
Check for: valid liability/professional coverage, expiry date, policy holder.
Return JSON: { "isValid": boolean, "coverageType": string, "expiryDate": string|null, "issues": string[] }`,
        },
      ],
    })

    let analysis: { isValid?: boolean; issues?: string[] } = {}
    try { analysis = JSON.parse(result.finalOutput) } catch { /* use defaults */ }

    const status = analysis.isValid ? 'passed' : 'failed'
    await logVerificationStep(ctx.obrnikId, 'insurance', status, analysis as Record<string, unknown>)
    return { step: 'insurance', status, details: analysis as Record<string, unknown> }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await logVerificationStep(ctx.obrnikId, 'insurance', 'failed', { error: message })
    return { step: 'insurance', status: 'failed', details: { error: message } }
  }
}

async function verifyReferences(ctx: VerificationContext): Promise<VerificationStepResult> {
  const supabase = createAdminClient()

  const { data: reviews } = await supabase
    .from('ponudbe')
    .select('rating, review')
    .eq('obrtnik_id', ctx.obrnikId)
    .not('rating', 'is', null)
    .limit(20)

  const avgRating = reviews?.length
    ? reviews.reduce((s, r) => s + (r.rating as number ?? 0), 0) / reviews.length
    : null

  const status = avgRating === null ? 'skipped' : avgRating >= 3.5 ? 'passed' : 'failed'
  const details = { avgRating, reviewCount: reviews?.length ?? 0, portfolioCount: ctx.portfolioUrls?.length ?? 0 }

  await logVerificationStep(ctx.obrnikId, 'references', status, details)
  return { step: 'references', status, details }
}

export async function runVerificationPipeline(
  obrnikId: string,
  ctx: Omit<VerificationContext, 'obrnikId'>,
): Promise<VerificationPipelineResult> {
  const fullCtx: VerificationContext = { ...ctx, obrnikId }
  const supabase = createAdminClient()

  const steps: VerificationStepResult[] = []

  steps.push(await verifyIdentity(fullCtx))
  steps.push(await verifyLicense(fullCtx))
  steps.push(await verifyInsurance(fullCtx))
  steps.push(await verifyReferences(fullCtx))

  const hardFailures = steps.filter(s => s.status === 'failed')
  const pendingHitl  = steps.filter(s => s.status === 'pending_hitl')

  const finalStatus: 'verified' | 'rejected' | 'pending_review' =
    hardFailures.length > 0 ? 'rejected' :
    pendingHitl.length  > 0 ? 'pending_review' :
    'verified'

  if (finalStatus === 'verified') {
    await supabase
      .from('obrtnik_profiles')
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq('id', obrnikId)
  } else if (finalStatus === 'rejected') {
    await supabase
      .from('obrtnik_profiles')
      .update({ is_verified: false })
      .eq('id', obrnikId)
  }

  console.log('[Verification] Pipeline complete', { obrnikId, finalStatus })
  return { obrnikId, allPassed: finalStatus === 'verified', steps, finalStatus }
}
