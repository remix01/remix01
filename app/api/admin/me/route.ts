import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch admin from admin_users table
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !admin || !admin.aktiven) {
      return NextResponse.json(
        { error: 'Not an active admin' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        ime: admin.ime,
        priimek: admin.priimek,
        vloga: admin.vloga,
        aktiven: admin.aktiven,
      },
    });
  } catch (error) {
    console.error('Error fetching admin role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
