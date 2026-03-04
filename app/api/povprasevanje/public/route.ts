import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { enqueue } from '@/lib/jobs/queue'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { storitev, lokacija, opis, stranka_email, stranka_telefon, stranka_ime } = body

    // Validation
    if (!storitev || !lokacija || !stranka_email || !stranka_ime) {
      return NextResponse.json(
        { error: 'Manjkajo obvezna polja' },
        { status: 400 }
      )
    }

    // Check if povprasevanja table has stranka_email and stranka_telefon columns
    // If not, we still save the inquiry but without these fields
    const insertData: any = {
      storitev,
      lokacija,
      opis: opis || '',
      stranka_ime,
      status: 'novo',
    }

    // Add email and telefon fields if they exist in the table schema
    // The table should have these columns for public submissions
    insertData.stranka_email = stranka_email || null
    insertData.stranka_telefon = stranka_telefon || null

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('[v0] Database insert error:', error)
      return NextResponse.json(
        { error: 'Napaka pri hrambi povpraševanja' },
        { status: 500 }
      )
    }

    // Send confirmation email to customer
    // Email failure must NOT prevent success response
    if (stranka_email) {
      try {
        await enqueue('sendEmail', {
          jobType: 'povprasevanje_confirmation_public',
          povprasevanjeId: data.id,
          narocnikEmail: stranka_email,
          narocnikName: stranka_ime,
          title: storitev,
          location: lokacija,
          category: null,
        })
      } catch (emailError) {
        // Log but don't fail the request
        console.error('[v0] Error enqueueing confirmation email:', emailError)
      }
    }

    return NextResponse.json(
      { id: data.id, status: data.status },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v0] Public povprasevanje error:', error)
    return NextResponse.json(
      { error: 'Napaka pri obdelavi povpraševanja' },
      { status: 500 }
    )
  }
}
