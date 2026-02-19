import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if super admin already exists
    const superAdminCount = await prisma.zaposleni.count({
      where: { vloga: 'SUPER_ADMIN' },
    });

    if (superAdminCount > 0) {
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
    const zaposleni = await prisma.zaposleni.create({
      data: {
        email: session.user.email,
        ime,
        priimek,
        vloga: 'SUPER_ADMIN',
        createdBy: 'system', // Initial setup
      },
    });

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
