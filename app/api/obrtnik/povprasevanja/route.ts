import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // In production, verify contractor authentication
    // For now, accept obrtnik_id as query parameter
    const searchParams = request.nextUrl.searchParams;
    const obrtnik_id = searchParams.get('obrtnik_id');

    if (!obrtnik_id) {
      return NextResponse.json(
        { error: 'obrtnik_id required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Group by status
    const grouped = {
      novo: data?.filter((p) => p.status === 'novo') || [],
      sprejeto: data?.filter((p) => p.status === 'sprejeto') || [],
      zavrnjeno: data?.filter((p) => p.status === 'zavrnjeno') || [],
      zakljuceno: data?.filter((p) => p.status === 'zakljuceno') || [],
    };

    return NextResponse.json({
      success: true,
      inquiries: data || [],
      grouped,
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
