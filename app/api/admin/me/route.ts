import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
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
