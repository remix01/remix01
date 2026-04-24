import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http/response'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { povprasevanje_id, obrtnik_id, termin_datum, termin_ura } = body;

    if (!povprasevanje_id || !obrtnik_id) {
      return fail('Missing required fields', 400);
    }

    // Check if slot is available (simplified - in production, implement real availability logic)
    const { data: existingBookings, error: checkError } = await supabase
      .from('rezervacije')
      .select('*')
      .eq('obrtnik_id', obrtnik_id)
      .eq('status', 'potrjena')
      .eq('termin_datum', termin_datum)
      .eq('termin_ura', termin_ura);

    if (checkError) {
      return fail(checkError.message, 500);
    }

    // Limit to 3 concurrent bookings per slot
    if (existingBookings && existingBookings.length >= 3) {
      return fail('Termin ni več na voljo. Izberite drugi termin.', 409);
    }

    // Create booking
    const { data, error } = await supabase
      .from('rezervacije')
      .insert({
        povprasevanje_id,
        obrtnik_id,
        status: 'potrjena',
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Booking error:', error);
      return fail(error.message, 500);
    }

    // Update inquiry status
    await supabase
      .from('povprasevanja')
      .update({ status: 'sprejeto' })
      .eq('id', povprasevanje_id);

    return ok({
      success: true,
      booking_id: data.id,
      message: 'Rezervacija uspešno potrdjena',
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return fail('Internal server error', 500);
  }
}
