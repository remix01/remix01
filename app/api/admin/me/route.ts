import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch admin from Zaposleni table
    const admin = await prisma.zaposleni.findUnique({
      where: { email: session.user.email },
    });

    if (!admin || !admin.aktiven) {
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
