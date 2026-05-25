/**
 * Chat-to-Lead Agent
 *
 * Converts website chatbot conversations into qualified lead records.
 * Saves task_drafts, sends follow-up emails, and triggers supply-side
 * discovery when no craftsmen are available in the requested city.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { AI } from '@/lib/ai/extended-orchestrator'
import { getResendClient, FROM_EMAIL } from '@/lib/resend'
import { enqueue } from '@/lib/jobs/queue'
import { env } from '@/lib/env'

const APP_URL = env.NEXT_PUBLIC_APP_URL

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LeadData {
  category?:    string
  city?:        string
  urgency?:     1 | 2 | 3
  description?: string
  budgetRange?: string
  email?:       string
  phone?:       string
  countryCode:  string
}

export interface ChatToLeadResult {
  lead:          LeadData
  draftId?:      string
  matchFound:    boolean
  followUpSent:  boolean
}

const EXTRACTION_PROMPT = `You are a lead qualification specialist for LiftGO, a home services marketplace in Slovenia.

From the conversation extract:
- category: one of [vodovodne_instalacije, elektro_instalacije, ogrevanje_klima, zidarstvo, krovstvo, slikarstvo, tesarstvo_mizarstvo, keramičarstvo, fasaderstvo, splošna_gradbena_dela, čiščenje, selitev, vrtnarstvo, other]
- city: city name if mentioned
- urgency: 1=urgent(today/tomorrow), 2=this_week, 3=flexible — default 2
- description: brief job description
- budgetRange: if mentioned
- email: if provided
- phone: if provided

Return ONLY valid JSON with these exact fields. Use null for unknown fields.`

export async function qualifyVisitor(
  sessionId: string,
  messages: ChatMessage[],
  meta: {
    countryCode?: string
    utmSource?:   string
    utmMedium?:   string
    utmCampaign?: string
    ipCity?:      string
  } = {},
): Promise<ChatToLeadResult> {
  const supabase = createAdminClient()
  const countryCode = meta.countryCode ?? 'SI'

  const conversation = messages
    .map(m => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
    .join('\n')

  let lead: LeadData = { countryCode }

  try {
    const result = await AI.sequential({
      userId:         sessionId,
      initialMessage: conversation,
      steps: [
        {
          agentType:   'onboarding_assistant',
          userMessage: `${EXTRACTION_PROMPT}\n\nConversation:\n${conversation}`,
        },
      ],
    })

    const parsed = JSON.parse(result.finalOutput)
    lead = {
      ...parsed,
      countryCode,
      city: parsed.city ?? meta.ipCity ?? null,
    }
  } catch {
    lead = { countryCode, city: meta.ipCity ?? undefined }
  }

  let draftId: string | undefined
  if (lead.category || lead.city) {
    const { data: draft } = await supabase
      .from('task_drafts')
      .insert({
        session_id:   sessionId,
        category:     lead.category ?? null,
        city:         lead.city ?? null,
        country_code: countryCode,
        urgency:      lead.urgency ?? 2,
        description:  lead.description ?? null,
        budget_range: lead.budgetRange ?? null,
        email:        lead.email ?? null,
        phone:        lead.phone ?? null,
        source:       'chatbot',
        utm_source:   meta.utmSource ?? null,
        utm_medium:   meta.utmMedium ?? null,
        utm_campaign: meta.utmCampaign ?? null,
        status:       'draft',
      })
      .select('id')
      .single()

    if (draft) draftId = draft.id
  }

  // Check craftsman availability in requested city
  let matchFound = false
  if (lead.city && lead.category) {
    const { count } = await supabase
      .from('obrtnik_profiles')
      .select('id', { count: 'exact', head: true })
      .contains('categories', [lead.category])
      .eq('city', lead.city)
      .eq('is_verified', true)
      .eq('is_available', true)

    matchFound = (count ?? 0) > 0

    if (!matchFound) {
      await enqueue('craftsman_discovery_triggered', {
        city:        lead.city,
        countryCode,
        category:    lead.category,
        triggeredBy: 'chat_to_lead',
      }, { delay: 0, retries: 2 })
    }
  }

  // Send follow-up email if visitor provided their email
  let followUpSent = false
  if (lead.email && draftId) {
    const resend = getResendClient()
    if (resend) {
      const continueUrl = `${APP_URL}/novo-povprasevanje?draft=${draftId}`
      try {
        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [lead.email],
          subject: 'Vaše povpraševanje na LiftGO — dokončajte oddajo',
          html: `
            <p>Pozdravljeni,</p>
            <p>Začeli ste z opisom potrebe na LiftGO${lead.city ? ` v mestu <strong>${lead.city}</strong>` : ''}. Dokončajte oddajo, da vam poiščemo najboljše izvajalce.</p>
            ${lead.description ? `<p><em>"${lead.description}"</em></p>` : ''}
            <p>
              <a href="${continueUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
                Dokončaj povpraševanje →
              </a>
            </p>
            ${!matchFound ? `<p style="color:#6b7280;font-size:14px">Trenutno iščemo izvajalce na vašem območju. Obvestili vas bomo v 24 urah.</p>` : ''}
            <p>Ekipa LiftGO</p>
          `,
          text: `Dokončajte oddajo povpraševanja: ${continueUrl}`,
          tags: [
            { name: 'type',  value: 'lead_followup' },
            { name: 'draft', value: draftId },
          ],
        })
        followUpSent = true
      } catch (err) {
        console.warn('[ChatToLead] Follow-up email failed', err)
      }
    }
  }

  return { lead, draftId, matchFound, followUpSent }
}

export async function convertDraftToTask(
  draftId: string,
  userId: string,
): Promise<{ taskId: string | null; error?: string }> {
  const supabase = createAdminClient()

  const { data: draft } = await supabase
    .from('task_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('status', 'draft')
    .single()

  if (!draft) return { taskId: null, error: 'Draft not found or already converted' }

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title:       (draft.description as string | null)?.slice(0, 100) ?? 'Novo povpraševanje',
      description: draft.description,
      status:      'open',
      customer_id: userId,
      created_by:  userId,
    })
    .select('id')
    .single()

  if (error || !task) return { taskId: null, error: error?.message }

  await supabase
    .from('task_drafts')
    .update({
      status:            'converted',
      user_id:           userId,
      converted_task_id: task.id,
      converted_at:      new Date().toISOString(),
    })
    .eq('id', draftId)

  return { taskId: task.id }
}
