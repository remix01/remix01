import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if super admin already exists
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('vloga', 'SUPER_ADMIN');

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Super admin already exists' },
        { status: 400 }
      );
    }

    const { ime, priimek } = await request.json();

    if (!ime || !priimek) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create super admin from current user
    const { data: zaposleni, error } = await supabase
      .from('admin_users')
      .insert({
        auth_user_id: user.id,
        email: user.email!,
        ime,
        priimek,
        vloga: 'SUPER_ADMIN',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: zaposleni,
    });
  } catch (error) {
    console.error('Error setting up admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
