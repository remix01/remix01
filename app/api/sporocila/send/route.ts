/**
 * POST /api/sporocila/send
 *
 * Sends a sporocilo (message) between a narocnik and obrtnik.
 * Server-side so we can:
 *  1. Enforce sender_id from session (not client-provided)
 *  2. Fetch receiver email without exposing it to other clients
 *  3. Send Resend email notification to offline receiver
 *  4. Create in-app notification record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sender'
import { novoSporociloEmail } from '@/lib/email/notification-templates'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { receiver_id, povprasevanje_id, message } = body

  if (!receiver_id || !povprasevanje_id || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use admin client for cross-user lookups (profiles, povprasevanja)
  const admin = createAdminClient()

  // Insert sporocilo — sender_id comes from verified session, not request body
  const { data: sporocilo, error: insertError } = await supabase
    .from('sporocila')
    .insert({
      povprasevanje_id,
      sender_id: user.id,
      receiver_id,
      message: message.trim(),
      is_read: false,
    })
    .select()
    .single()

  if (insertError || !sporocilo) {
    console.error('[sporocila/send] Insert error:', insertError)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }

  // Fetch receiver profile + povprasevanje title in parallel (non-blocking for response)
  Promise.all([
    admin.from('profiles').select('full_name, email').eq('id', receiver_id).single(),
    admin.from('profiles').select('full_name').eq('id', user.id).single(),
    admin.from('povprasevanja').select('title, naslov').eq('id', povprasevanje_id).single(),
  ]).then(async ([receiverRes, senderRes, povRes]) => {
    const receiverEmail = receiverRes.data?.email
    const receiverName = receiverRes.data?.full_name || 'Uporabnik'
    const senderName = senderRes.data?.full_name || 'Nekdo'
    // Support both 'title' (new schema) and 'naslov' (old schema)
    const povTitle = (povRes.data as any)?.title || (povRes.data as any)?.naslov || 'Povpraševanje'

    // 1. In-app notification
    await admin.from('notifications').insert({
      user_id: receiver_id,
      type: 'novo_sporocilo',
      title: `Novo sporočilo od ${senderName}`,
      body: message.trim().substring(0, 100),
      data: { povprasevanje_id, sporocilo_id: sporocilo.id },
      is_read: false,
    })

    // 2. Email via Resend (only if receiver has email)
    if (receiverEmail) {
      const template = novoSporociloEmail(senderName, message.trim(), povTitle, povprasevanje_id)
      await sendEmail(receiverEmail, template).catch((err) => {
        console.error('[sporocila/send] Email send failed:', err)
      })
    }
  }).catch((err) => {
    console.error('[sporocila/send] Post-send error:', err)
  })

  return NextResponse.json({ ok: true, sporocilo })
}
