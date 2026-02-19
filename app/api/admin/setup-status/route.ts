import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if any super admin exists
    const superAdminCount = await prisma.zaposleni.count({
      where: { vloga: 'SUPER_ADMIN' },
    });

    return NextResponse.json({
      needsSetup: superAdminCount === 0,
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
