import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storitev, lokacija, opis, stranka_email, stranka_telefon, stranka_ime } = body

    if (!storitev || !lokacija) {
      return NextResponse.json({ error: 'Manjkajo obvezna polja' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('povprasevanja')
      .insert({
        title: storitev,
        description: opis || '',
        location_city: lokacija,
        status: 'odprto',
        narocnik_id: null,
        stranka_email: stranka_email || null,
        stranka_telefon: stranka_telefon || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[public] DB error:', error)
      return NextResponse.json({ error: 'Napaka pri shranjevanju' }, { status: 500 })
    }

    if (stranka_email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'LiftGO <info@liftgo.net>',
          to: stranka_email,
          subject: `✅ Povpraševanje oddano: ${storitev}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0d9488;">Vaše povpraševanje je bilo uspešno oddano!</h2>
              <p>Pozdravljeni${stranka_ime ? ' ' + stranka_ime : ''},</p>
              <p>Prejeli smo vaše povpraševanje za <strong>${storitev}</strong> v kraju <strong>${lokacija}</strong>.</p>
              <p style="background:#f0fdf4;border-left:4px solid #0d9488;padding:12px;border-radius:4px;">
                ⏱️ Preverjen mojster vas bo kontaktiral v <strong>manj kot 2 urah</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="color:#94a3b8;font-size:12px;">LiftGO — <a href="https://liftgo.net" style="color:#0d9488;">liftgo.net</a></p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('[public] Email error:', emailError)
      }
    }

    // Notify admin
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'LiftGO <info@liftgo.net>',
          to: process.env.ADMIN_EMAIL,
          subject: `🔔 Novo povpraševanje: ${storitev}`,
          html: `
            <h3>Novo povpraševanje prejeto</h3>
            <p><strong>Storitev:</strong> ${storitev}</p>
            <p><strong>Lokacija:</strong> ${lokacija}</p>
            <p><strong>Email:</strong> ${stranka_email || 'N/A'}</p>
            <p><strong>Telefon:</strong> ${stranka_telefon || 'N/A'}</p>
            <a href="https://liftgo.net/admin/povprasevanja">Poglej v admin →</a>
          `
        })
      } catch (e) { 
        console.error('[admin notify]', e)
      }
    }

    return NextResponse.json({ success: true, id: data.id })

  } catch (err) {
    console.error('[public] Unexpected error:', err)
    return NextResponse.json({ error: 'Napaka strežnika' }, { status: 500 })
  }
}
