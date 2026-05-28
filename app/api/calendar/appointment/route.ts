import { createAppointmentEvent } from '@/lib/mcp/calendar'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendNotification } from '@/lib/notifications'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ponudbaId, startDateTime, endDateTime } = body

    if (!ponudbaId || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Ponudba not found' },
        { status: 404 }
      )
    }

    // Verify user is the narocnik for this ponudba
    const { data: povprasevanje } = await supabase
      .from('povprasevanja')
      .select('narocnik_id')
      .eq('id', ponudba.povprasevanje_id)
      .single()

    if (povprasevanje?.narocnik_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const result = await createAppointmentEvent({
      narocnikId: povprasevanje.narocnik_id,
      obrtknikId: ponudba.obrtnik_id,
      title: ponudba.povprasevanje.title,
      description: ponudba.povprasevanje.description ?? '',
      locationCity: ponudba.povprasevanje.location_city ?? '',
      startDateTime,
      endDateTime,
      ponudbaId
    })

    // Notify both parties on successful appointment creation (non-blocking)
    if (!result.error) {
      const dateLabel = new Date(startDateTime).toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' })
      Promise.all([
        sendNotification({
          userId: povprasevanje.narocnik_id,
          type: 'termin_potrjen',
          title: 'Termin potrjen',
          message: `Vaš termin za ${ponudba.povprasevanje.title} je potrjen za ${dateLabel}.`,
          link: `/narocnik/povprasevanja/${ponudba.povprasevanje_id}`,
          metadata: { ponudbaId, startDateTime },
        }),
        sendNotification({
          userId: ponudba.obrtnik_id,
          type: 'termin_potrjen',
          title: 'Termin potrjen',
          message: `Naročnik je potrdil termin za ${dateLabel}.`,
          link: '/obrtnik/ponudbe',
          metadata: { ponudbaId, startDateTime },
        }),
      ]).catch((err: any) => console.error('[v0] termin_potrjen notification error:', err))
    }

    return NextResponse.json({
      success: !result.error,
      narocnikEventId: result.narocnikEventId,
      obrtknikEventId: result.obrtknikEventId,
      error: result.error
    })
  } catch (error) {
    console.error('[v0] Appointment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
