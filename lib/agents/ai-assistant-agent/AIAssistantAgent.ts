/**
 * AIAssistantAgent — Handles AI-powered assistance features
 *
 * Integrates with the MessageBus system to provide:
 * - Work description generation (narocnik)
 * - Offer comparison (narocnik)
 * - Quote generation (obrtnik)
 * - Appointment scheduling suggestions (narocnik)
 * - Job summary reports (obrtnik)
 * - Materials list generation (obrtnik PRO)
 * - Partner matching (narocnik)
 *
 * Each action delegates to the same business logic used by the standalone
 * /api/agent/* routes, but runs server-side without HTTP overhead.
 */

import Anthropic from '@anthropic-ai/sdk'
import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import { isAgentAccessible, getAgentDailyLimit } from '@/lib/agents/ai-router'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { matchPartnersForRequest } from '@/lib/agents/matching/smartMatchingAgent'

const anthropic = new Anthropic()

export class AIAssistantAgent extends BaseAgent {
  type: AgentType = 'ai_assistant'
  handledActions = [
    'describeWork',
    'compareOffers',
    'generateQuote',
    'scheduleAppointment',
    'generateJobSummary',
    'generateMaterials',
    'matchPartners',
  ]

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace(message.action)

    try {
      const { action, payload, userId } = message

      switch (action) {
        case 'describeWork':
          return await this.describeWork(payload, userId, startTime)
        case 'compareOffers':
          return await this.compareOffers(payload, userId, startTime)
        case 'generateQuote':
          return await this.generateQuote(payload, userId, startTime)
        case 'scheduleAppointment':
          return await this.scheduleAppointment(payload, userId, startTime)
        case 'generateJobSummary':
          return await this.generateJobSummary(payload, userId, startTime)
        case 'generateMaterials':
          return await this.generateMaterials(payload, userId, startTime)
        case 'matchPartners':
          return await this.matchPartners(payload, userId, startTime)
        default:
          return {
            success: false,
            error: `Unknown AI action: ${action}`,
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.log('ai_assistant_error', { error: errorMsg })
      span.status = 'error'
      span.attributes['error'] = errorMsg
      return {
        success: false,
        error: errorMsg,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } finally {
      span.end()
    }
  }

  /**
   * Generate work description variants from keywords
   */
  private async describeWork(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const keywords = payload.keywords as string
    const category = (payload.category as string) || 'splošno'
    const existingDescription = payload.existingDescription as string | undefined

    if (!keywords?.trim()) {
      return { success: false, error: 'Ključne besede so obvezne.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const systemPrompt = `Si LiftGO asistent za pomoč pri opisovanju del v Sloveniji.
Pomagaš naročniku napisati jasno in popolno povpraševanje za mojstra.
Vedno odgovarjaš v slovenščini.
Pripravi tri različice opisa in 2-3 dodatna vprašanja.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = `Kategorija dela: ${category}
Ključne besede: ${keywords}
${existingDescription ? `Obstoječi opis: ${existingDescription}` : ''}

Pripravi JSON:
{
  "variants": {
    "kratek": "kratek opis (1-2 stavka)",
    "podroben": "podroben opis (3-5 stavkov)",
    "tehnicen": "tehnični opis"
  },
  "questions": ["vprašanje 1", "vprašanje 2", "vprašanje 3"],
  "suggestedTitle": "predlagani naslov"
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let parsed
    try {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { variants: { kratek: text }, questions: [], suggestedTitle: keywords }
    } catch {
      parsed = { variants: { kratek: text }, questions: [], suggestedTitle: keywords }
    }

    this.log('describe_work_done', { userId })
    return { success: true, data: parsed, handledBy: this.type, durationMs: Date.now() - startTime }
  }

  /**
   * Compare offers for a povpraševanje and recommend the best one
   */
  private async compareOffers(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const povprasevanjeId = payload.povprasevanjeId as string
    if (!povprasevanjeId) {
      return { success: false, error: 'ID povpraševanja je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, narocnik_id, title')
      .eq('id', povprasevanjeId)
      .single()

    if (!pov || pov.narocnik_id !== userId) {
      return { success: false, error: 'Ni dovoljenja.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: ponudbe } = await supabaseAdmin
      .from('ponudbe')
      .select(`
        id, message, price_estimate, price_type, available_date, status, created_at,
        obrtnik:obrtnik_profiles(business_name, avg_rating, total_reviews, is_verified, response_time_hours)
      `)
      .eq('povprasevanje_id', povprasevanjeId)
      .eq('status', 'poslana')

    if (!ponudbe || ponudbe.length < 2) {
      return { success: false, error: 'Za primerjavo potrebujete vsaj 2 ponudbi.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const ponudbeText = ponudbe.map((p, i) => {
      const o = p.obrtnik as any
      return `Ponudba ${i + 1} (ID: ${p.id}):
- Mojster: ${o?.business_name || 'Neznan'}
- Ocena: ${o?.avg_rating?.toFixed(1) || 'N/A'}/5 (${o?.total_reviews || 0} ocen)
- Verificiran: ${o?.is_verified ? 'Da' : 'Ne'}
- Cena: ${p.price_estimate ? p.price_estimate + ' EUR' : 'Po dogovoru'} (${p.price_type})
- Sporočilo: ${p.message?.slice(0, 200) || 'Ni sporočila'}`
    }).join('\n\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `Si LiftGO asistent za primerjavo ponudb v Sloveniji. Odgovarjaš v slovenščini. Odgovori SAMO v JSON formatu.`,
      messages: [{
        role: 'user',
        content: `Analiziraj ponudbe za "${pov.title}":\n\n${ponudbeText}\n\nVrni JSON: { "summary": "...", "recommendation": "...", "warnings": [], "comparison": [{ "ponudbaId": "...", "businessName": "...", "strengths": [], "weaknesses": [], "valueScore": 7, "comment": "..." }], "avgPrice": 0, "priceRange": "..." }`,
      }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let analysis
    try {
      const match = text.match(/\{[\s\S]*\}/)
      analysis = match ? JSON.parse(match[0]) : { summary: text, comparison: [] }
    } catch {
      analysis = { summary: text, comparison: [] }
    }

    this.log('compare_offers_done', { userId, povprasevanjeId, count: ponudbe.length })
    return { success: true, data: { analysis, ponudbe }, handledBy: this.type, durationMs: Date.now() - startTime }
  }

  /**
   * Generate a quote draft for an obrtnik
   */
  private async generateQuote(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const povprasevanjeId = payload.povprasevanjeId as string
    const extraNotes = payload.extraNotes as string | undefined
    if (!povprasevanjeId) {
      return { success: false, error: 'ID povpraševanja je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, hourly_rate, years_experience, subscription_tier, avg_rating')
      .eq('id', userId)
      .maybeSingle()
    if (!obrtnik) {
      return { success: false, error: 'Profil obrtnika ni najden.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const tier = obrtnik.subscription_tier ?? 'start'
    if (!isAgentAccessible('quote_generator' as AIAgentType, tier)) {
      return { success: false, error: 'Ni dostopa do generatorja ponudb.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, location_city, urgency, budget_min, budget_max')
      .eq('id', povprasevanjeId)
      .maybeSingle()
    if (!pov) {
      return { success: false, error: 'Povpraševanje ni najdeno.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const agentDef = await getAgentDefinition('quote_generator')
    const context = {
      obrtnik: { business_name: obrtnik.business_name, hourly_rate: obrtnik.hourly_rate, years_experience: obrtnik.years_experience, avg_rating: obrtnik.avg_rating },
      povprasevanje: { title: pov.title, description: pov.description, location_city: pov.location_city, urgency: pov.urgency, budget_min: pov.budget_min, budget_max: pov.budget_max },
      extra_notes: extraNotes,
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: agentDef.system_prompt + `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}`,
      messages: [{ role: 'user', content: 'Generiraj osnutek ponudbe za to povpraševanje.' }],
    })

    const draftText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')

    const { data: draft } = await supabaseAdmin
      .from('agent_quote_drafts')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id: povprasevanjeId,
        draft_text: draftText,
        context_used: context,
        status: 'draft',
      })
      .select('id')
      .single()

    this.log('quote_generated', { userId, povprasevanjeId, draftId: draft?.id })
    return {
      success: true,
      data: { draft_text: draftText, draft_id: draft?.id },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Suggest appointment slots for a ponudba
   */
  private async scheduleAppointment(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const ponudbaId = payload.ponudbaId as string
    const preferredDates = payload.preferredDates as string | undefined
    const preferredTimeOfDay = payload.preferredTimeOfDay as string | undefined
    if (!ponudbaId) {
      return { success: false, error: 'ID ponudbe je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: ponudba } = await supabaseAdmin
      .from('ponudbe')
      .select(`
        id, available_date,
        povprasevanje:povprasevanja(narocnik_id, title, preferred_date_from, urgency),
        obrtnik:obrtnik_profiles(id, business_name)
      `)
      .eq('id', ponudbaId)
      .single()

    if (!ponudba) {
      return { success: false, error: 'Ponudba ni najdena.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const pov = ponudba.povprasevanje as any
    if (pov?.narocnik_id !== userId) {
      return { success: false, error: 'Ni dovoljenja.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const today = new Date()
    const userPrompt = `Danes je ${today.toLocaleDateString('sl-SI')}.
Delo: ${pov?.title || 'Ni navedeno'}
Nujnost: ${pov?.urgency || 'normalno'}
Mojstrova razpoložljivost: ${ponudba.available_date ? new Date(ponudba.available_date).toLocaleDateString('sl-SI') : 'Ni navedena'}
Željeni datum naročnika: ${pov?.preferred_date_from ? new Date(pov.preferred_date_from).toLocaleDateString('sl-SI') : 'Ni naveden'}
${preferredDates ? `Preference naročnika: ${preferredDates}` : ''}
${preferredTimeOfDay ? `Preferred čas dneva: ${preferredTimeOfDay}` : ''}

Predlagaj 3 konkretne termine v naslednjih 14 dneh. Vrni JSON:
{
  "slots": [{ "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "label": "...", "reason": "..." }],
  "message": "kratko sporočilo naročniku"
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `Si LiftGO urnik asistent za Slovenijo. Predlagaš termine med stranko in mojstrom. Odgovarjaš v slovenščini. Odgovori SAMO v JSON formatu.`,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let suggestions
    try {
      const match = text.match(/\{[\s\S]*\}/)
      suggestions = match ? JSON.parse(match[0]) : { slots: [], message: text }
    } catch {
      suggestions = { slots: [], message: text }
    }

    this.log('schedule_suggested', { userId, ponudbaId })
    return { success: true, data: { suggestions }, handledBy: this.type, durationMs: Date.now() - startTime }
  }

  /**
   * Generate job completion summary for an obrtnik
   */
  private async generateJobSummary(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const povprasevanjeId = payload.povprasevanjeId as string
    const ponudbaId = payload.ponudbaId as string | undefined
    const workNotes = payload.workNotes as string | undefined
    const materialsUsed = payload.materialsUsed as string | undefined

    if (!povprasevanjeId) {
      return { success: false, error: 'ID povpraševanja je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, subscription_tier')
      .eq('id', userId)
      .maybeSingle()
    if (!obrtnik) {
      return { success: false, error: 'Profil obrtnika ni najden.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, location_city')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    let ponudba = null
    if (ponudbaId) {
      const { data: p } = await supabaseAdmin
        .from('ponudbe')
        .select('id, price_estimate, price_type, estimated_duration, accepted_at')
        .eq('id', ponudbaId)
        .maybeSingle()
      ponudba = p
    }

    const agentDef = await getAgentDefinition('job_summary')
    const context = {
      obrtnik: { business_name: obrtnik.business_name },
      povprasevanje: pov,
      ponudba,
      work_notes: workNotes,
      materials_used: materialsUsed,
      date: new Date().toLocaleDateString('sl-SI'),
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: agentDef.system_prompt + `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}`,
      messages: [{ role: 'user', content: 'Generiraj zaključno poročilo za to delo.' }],
    })

    const reportText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')

    const { data: report } = await supabaseAdmin
      .from('agent_job_reports')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id: povprasevanjeId,
        ponudba_id: ponudbaId ?? null,
        report_text: reportText,
        report_data: context,
        sent_to_customer: false,
      })
      .select('id')
      .single()

    this.log('job_summary_done', { userId, povprasevanjeId, reportId: report?.id })
    return {
      success: true,
      data: { report_text: reportText, report_id: report?.id },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Generate materials list for a job (PRO obrtnik only)
   */
  private async generateMaterials(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const workDescription = payload.workDescription as string
    const povprasevanjeId = payload.povprasevanjeId as string | undefined

    if (!workDescription?.trim()) {
      return { success: false, error: 'Opis dela je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, subscription_tier')
      .eq('id', userId)
      .maybeSingle()
    if (!obrtnik) {
      return { success: false, error: 'Profil obrtnika ni najden.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const tier = obrtnik.subscription_tier ?? 'start'
    if (!isAgentAccessible('materials_agent' as AIAgentType, tier)) {
      return {
        success: false,
        error: 'Materiali so samo za PRO obrtnike. Nadgradite naročnino na /cenik.',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    const agentDef = await getAgentDefinition('materials_agent')
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: agentDef.system_prompt,
      messages: [{ role: 'user', content: `Opis dela: "${workDescription}"` }],
    })

    const raw = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let parsed: Record<string, any>
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { raw, material_list: [] }
    } catch {
      parsed = { raw, material_list: [] }
    }

    const { data: matList } = await supabaseAdmin
      .from('agent_material_lists')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id: povprasevanjeId ?? null,
        material_list: parsed.material_list ?? [],
        total_min_eur: parsed.skupaj_ocena_eur?.min ?? null,
        total_max_eur: parsed.skupaj_ocena_eur?.max ?? null,
        suppliers: parsed.dobavitelji ?? [],
        predracun_text: parsed.predracun_tekst ?? null,
      })
      .select('id')
      .single()

    this.log('materials_generated', { userId, listId: matList?.id })
    return {
      success: true,
      data: {
        material_list: parsed.material_list ?? [],
        total_min_eur: parsed.skupaj_ocena_eur?.min,
        total_max_eur: parsed.skupaj_ocena_eur?.max,
        suppliers: parsed.dobavitelji ?? [],
        predracun_text: parsed.predracun_tekst,
        list_id: matList?.id,
      },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  /**
   * Match partners for a povpraševanje using the smart matching algorithm
   */
  private async matchPartners(
    payload: Record<string, unknown>,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const povprasevanjeId = payload.povprasevanjeId as string
    if (!povprasevanjeId) {
      return { success: false, error: 'ID povpraševanja je obvezen.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    // Verify ownership
    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('narocnik_id, location_lat, location_lng, category_id')
      .eq('id', povprasevanjeId)
      .single()

    if (!pov || pov.narocnik_id !== userId) {
      return { success: false, error: 'Ni dovoljenja.', handledBy: this.type, durationMs: Date.now() - startTime }
    }

    const result = await matchPartnersForRequest({
      lat: pov.location_lat || 46.0,
      lng: pov.location_lng || 14.5,
      categoryId: pov.category_id || '',
      requestId: povprasevanjeId,
    })

    this.log('match_partners_done', { userId, povprasevanjeId, matchCount: result.matches?.length ?? 0 })
    return {
      success: true,
      data: result,
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }
}
