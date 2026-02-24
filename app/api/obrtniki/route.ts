import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storitev = searchParams.get('storitev');
    const lokacija = searchParams.get('lokacija');

    let query = supabase
      .from('obrtniki')
      .select('*')
      .eq('verified', true);

    // Filter by service type
    if (storitev && storitev !== 'Vse storitve') {
      query = query.eq('storitev', storitev);
    }

    // Filter by location - partial match
    if (lokacija && lokacija !== '') {
      query = query.ilike('lokacija', `%${lokacija}%`);
    }

    const { data, error } = await query.order('ocena', { ascending: false });

    if (error) {
      console.error('[v0] Supabase query error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contractors: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
