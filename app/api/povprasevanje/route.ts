import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storitev, lokacija, opis, obrtnik_id, termin_datum, termin_ura, email, telefon } = body;

    // Validate required fields
    if (!storitev || !lokacija || !opis || !obrtnik_id || !termin_datum || !termin_ura) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert inquiry
    const { data, error } = await supabase
      .from('povprasevanja')
      .insert({
        storitev,
        lokacija,
        opis,
        obrtnik_id,
        termin_datum,
        termin_ura,
        status: 'novo',
        email,
        telefon,
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Supabase insert error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Send notification email to contractor
    if (data && email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            povprasevanje_id: data.id,
            obrtnik_id,
            email,
          }),
        });
      } catch (emailError) {
        console.log('[v0] Email notification skipped:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      inquiry_id: data.id,
      message: 'Povpraševanje uspešno oddano',
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
