import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http/response'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'development-anon-key'
);

export async function GET(request: NextRequest) {
  try {
    // In production, verify contractor authentication
    // For now, accept obrtnik_id as query parameter
    const searchParams = request.nextUrl.searchParams;
    const obrtnik_id = searchParams.get('obrtnik_id');

    if (!obrtnik_id) {
      return fail('obrtnik_id required', 400);
    }

    // Get all inquiries for this contractor
    const { data, error } = await supabase
      .from('povprasevanja')
      .select(
        `
        id,
        storitev,
        lokacija,
        opis,
        termin_datum,
        termin_ura,
        status,
        email,
        telefon,
        created_at
      `
      )
      .eq('obrtnik_id', obrtnik_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Query error:', error);
      return fail(error.message, 500);
    }

    // Group by status
    const grouped = {
      novo: data?.filter((p) => p.status === 'novo') || [],
      sprejeto: data?.filter((p) => p.status === 'sprejeto') || [],
      zavrnjeno: data?.filter((p) => p.status === 'zavrnjeno') || [],
      zakljuceno: data?.filter((p) => p.status === 'zakljuceno') || [],
    };

    return ok({
      success: true,
      inquiries: data || [],
      grouped,
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return fail('Internal server error', 500);
  }
}
