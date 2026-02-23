import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/callback`
)

export async function getCalendarAuthUrl(
  userId: string,
  role: 'narocnik' | 'obrtnik'
): Promise<{ url: string }> {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: JSON.stringify({ userId, role }),
    prompt: 'consent'
  })
  return { url }
}

export async function saveCalendarTokens(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tokens } = await oauth2Client.getToken(code)
    const supabase = await createClient()

    const { error } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expiry_date: tokens.expiry_date || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('[v0] Failed to save calendar tokens:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Calendar token save error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function createAppointmentEvent(params: {
  narocnikId: string
  obrtknikId: string
  title: string
  description: string
  locationCity: string
  startDateTime: string
  endDateTime: string
  ponudbaId: string
}): Promise<{
  narocnikEventId: string | null
  obrtknikEventId: string | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    let narocnikEventId: string | null = null
    let obrtknikEventId: string | null = null

    // Fetch calendar connections for both users
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('*')
      .in('user_id', [params.narocnikId, params.obrtknikId])

    const connectionMap = new Map(
      connections?.map(c => [c.user_id, c]) || []
    )

    // Event details
    const eventBody = {
      summary: `LiftGO: ${params.title}`,
      description: `${params.description}\n\nPovezava: https://liftgo.net`,
      location: `${params.locationCity}, Slovenija`,
      start: {
        dateTime: params.startDateTime,
        timeZone: 'Europe/Ljubljana'
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: 'Europe/Ljubljana'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 }
        ]
      }
    }

    // Create event for narocnik if calendar connected
    const narocnikConnection = connectionMap.get(params.narocnikId)
    if (narocnikConnection) {
      try {
        oauth2Client.setCredentials({
          access_token: narocnikConnection.access_token,
          refresh_token: narocnikConnection.refresh_token,
          expiry_date: narocnikConnection.expiry_date
        })

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        const { data } = await calendar.events.create({
          calendarId: 'primary',
          requestBody: eventBody
        })

        narocnikEventId = data.id || null
      } catch (error) {
        console.error('[v0] Narocnik calendar event creation failed:', error)
      }
    }

    // Create event for obrtnik if calendar connected
    const obrtknikConnection = connectionMap.get(params.obrtknikId)
    if (obrtknikConnection) {
      try {
        oauth2Client.setCredentials({
          access_token: obrtknikConnection.access_token,
          refresh_token: obrtknikConnection.refresh_token,
          expiry_date: obrtknikConnection.expiry_date
        })

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        const { data } = await calendar.events.create({
          calendarId: 'primary',
          requestBody: eventBody
        })

        obrtknikEventId = data.id || null
      } catch (error) {
        console.error('[v0] Obrtnik calendar event creation failed:', error)
      }
    }

    // Save appointment record
    if (narocnikEventId || obrtknikEventId) {
      await supabase
        .from('appointments')
        .insert({
          ponudba_id: params.ponudbaId,
          narocnik_id: params.narocnikId,
          obrtnik_id: params.obrtknikId,
          scheduled_start: params.startDateTime,
          scheduled_end: params.endDateTime,
          narocnik_calendar_event_id: narocnikEventId,
          obrtnik_calendar_event_id: obrtknikEventId,
          status: 'scheduled'
        })
        .catch(err => console.error('[v0] Appointment record insert error:', err))
    }

    return { narocnikEventId, obrtknikEventId }
  } catch (error) {
    console.error('[v0] Appointment creation error:', error)
    return {
      narocnikEventId: null,
      obrtknikEventId: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function cancelAppointmentEvent(params: {
  narocnikId: string
  obrtknikId: string
  ponudbaId: string
}): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient()

    // Fetch appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('ponudba_id', params.ponudbaId)
      .single()

    if (!appointment) {
      return { success: false }
    }

    // Fetch calendar connections
    const { data: connections } = await supabase
      .from('calendar_connections')
      .select('*')
      .in('user_id', [params.narocnikId, params.obrtknikId])

    const connectionMap = new Map(
      connections?.map(c => [c.user_id, c]) || []
    )

    // Delete narocnik event
    if (appointment.narocnik_calendar_event_id) {
      const narocnikConnection = connectionMap.get(params.narocnikId)
      if (narocnikConnection) {
        try {
          oauth2Client.setCredentials({
            access_token: narocnikConnection.access_token,
            refresh_token: narocnikConnection.refresh_token,
            expiry_date: narocnikConnection.expiry_date
          })

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: appointment.narocnik_calendar_event_id
          })
        } catch (error) {
          console.error('[v0] Narocnik event deletion failed:', error)
        }
      }
    }

    // Delete obrtnik event
    if (appointment.obrtnik_calendar_event_id) {
      const obrtknikConnection = connectionMap.get(params.obrtknikId)
      if (obrtknikConnection) {
        try {
          oauth2Client.setCredentials({
            access_token: obrtknikConnection.access_token,
            refresh_token: obrtknikConnection.refresh_token,
            expiry_date: obrtknikConnection.expiry_date
          })

          const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: appointment.obrtnik_calendar_event_id
          })
        } catch (error) {
          console.error('[v0] Obrtnik event deletion failed:', error)
        }
      }
    }

    // Update appointment status
    await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('ponudba_id', params.ponudbaId)

    return { success: true }
  } catch (error) {
    console.error('[v0] Appointment cancellation error:', error)
    return { success: false }
  }
}

export async function generateIcsFile(params: {
  title: string
  description: string
  locationCity: string
  startDateTime: string
  endDateTime: string
}): Promise<{ icsContent: string }> {
  // Format dates for iCal (YYYYMMDDTHHMMSSZ format)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LiftGO//LiftGO//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${formatDate(params.startDateTime)}
DTEND:${formatDate(params.endDateTime)}
SUMMARY:LiftGO: ${params.title}
DESCRIPTION:${params.description}\\n\\nPovezava: https://liftgo.net
LOCATION:${params.locationCity}, Slovenija
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

  return { icsContent }
}
