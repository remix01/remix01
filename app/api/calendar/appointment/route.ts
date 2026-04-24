import { createAppointmentEvent } from '@/lib/mcp/calendar'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    const body = await request.json()
    const { ponudbaId, startDateTime, endDateTime } = body

    if (!ponudbaId || !startDateTime || !endDateTime) {
      return fail('Missing required parameters', 400)
    }

    // Fetch ponudba to verify ownership and get details
    const { data: ponudba } = await supabase
      .from('ponudbe')
      .select(`
        *,
        povprasevanje:povprasevanja(title, description, location_city),
        obrtnik:obrtnik_profiles(id)
      `)
      .eq('id', ponudbaId)
      .single()

    if (!ponudba) {
      return fail('Ponudba not found', 404)
    }

    // Verify user is the narocnik for this ponudba
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', ponudba.povprasevanje_id)
      .single()

    if (povprasevanje?.narocnik_id !== user.id) {
      return fail('Unauthorized', 403)
    }

    const result = await createAppointmentEvent({
      narocnikId: povprasevanje.narocnik_id,
      obrtknikId: ponudba.obrtnik_id,
      title: ponudba.povprasevanje.title,
      description: ponudba.povprasevanje.description,
      locationCity: ponudba.povprasevanje.location_city,
      startDateTime,
      endDateTime,
      ponudbaId
    })

    return ok({
      success: !result.error,
      narocnikEventId: result.narocnikEventId,
      obrtknikEventId: result.obrtknikEventId,
      error: result.error
    })
  } catch (error) {
    console.error('[v0] Appointment creation error:', error)
    return fail('Failed to create appointment', 500)
  }
}
