import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { confirmSchedulingRequest } from '@/lib/agent/scheduling/confirmAppointment'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/agent/scheduling
// Suggests appointment slots and creates appointment via existing calendar system
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { ponudbaId, preferredDates, preferredTimeOfDay, notes } = await req.json()
    if (!ponudbaId) {
      return NextResponse.json({ error: 'ID ponudbe je obvezen.' }, { status: 400 })
    }

    // Load ponudba with related data
    const { data: ponudba } = await supabaseAdmin
      .from('ponudbe')
      .select(`
        id,
        status,
        available_date,
        povprasevanje:povprasevanja(
          narocnik_id,
          title,
          preferred_date_from,
          preferred_date_to,
          urgency
        ),
        obrtnik:obrtnik_profiles(
          id,
          business_name,
          response_time_hours
        )
      `)
      .eq('id', ponudbaId)
      .single()

    if (!ponudba) return NextResponse.json({ error: 'Ponudba ni najdena.' }, { status: 404 })

    const pov = ponudba.povprasevanje as any
    if (pov?.narocnik_id !== user.id) {
      return NextResponse.json({ error: 'Ni dovoljenja.' }, { status: 403 })
    }

    // Check if appointment already exists
    const { data: existingAppt } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_start, scheduled_end, status')
      .eq('ponudba_id', ponudbaId)
      .maybeSingle()

    if (existingAppt && existingAppt.status === 'scheduled') {
      return NextResponse.json({
        alreadyScheduled: true,
        appointment: existingAppt,
      })
    }

    // Check calendar connections
    const obrtnik = ponudba.obrtnik as any
    const { data: narocnikCal } = await supabaseAdmin
      .from('calendar_connections')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: obrtnikCal } = await supabaseAdmin
      .from('calendar_connections')
      .select('user_id')
      .eq('user_id', obrtnik?.id)
      .maybeSingle()

    // Use Claude Haiku to suggest optimal slots
    const systemPrompt = `Si LiftGO urnik asistent za Slovenijo.
Pomagaš dogovoriti termine med stranko in mojstrom.
Predlagaš konkretne datume in ure glede na podane preference.
Vedno odgovarjaš v slovenščini.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const today = new Date()
    const userPrompt = `Danes je ${today.toLocaleDateString('sl-SI')}.
Delo: ${pov?.title || 'Ni navedeno'}
Nujnost: ${pov?.urgency || 'normalno'}
Mojstrova razpoložljivost: ${ponudba.available_date ? new Date(ponudba.available_date).toLocaleDateString('sl-SI') : 'Ni navedena'}
Željeni datum naročnika: ${pov?.preferred_date_from ? new Date(pov.preferred_date_from).toLocaleDateString('sl-SI') : 'Ni naveden'}
${preferredDates ? `Preference naročnika: ${preferredDates}` : ''}
${preferredTimeOfDay ? `Preferred čas dneva: ${preferredTimeOfDay}` : ''}
${notes ? `Opombe: ${notes}` : ''}

Predlagaj 3 konkretne termine v naslednjih 14 dneh. Vrni JSON:
{
  "slots": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "label": "opis termina",
      "reason": "zakaj je ta termin primeren"
    }
  ],
  "message": "kratko sporočilo naročniku",
  "calendarIntegration": ${!!narocnikCal || !!obrtnikCal}
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let suggestions
    try {
      suggestions = JSON.parse(text)
    } catch {
      suggestions = { slots: [], message: text, calendarIntegration: false }
    }

    return NextResponse.json({
      suggestions,
      narocnikHasCalendar: !!narocnikCal,
      obrtnikHasCalendar: !!obrtnikCal,
      existingAppointment: existingAppt,
    })
  } catch (error) {
    console.error('[agent/scheduling] error:', error)
    return NextResponse.json({ error: 'Napaka pri pripravi urnika.' }, { status: 500 })
  }
}

// Legacy confirm endpoint kept for backward compatibility.
// Prefer REST endpoint: POST /api/agent/scheduling/confirm
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    return confirmSchedulingRequest(req)
  } catch (error) {
    console.error('[agent/scheduling PUT] error:', error)
    return NextResponse.json({ error: 'Napaka pri potrditvi termina.' }, { status: 500 })
  }
}
