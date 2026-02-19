'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Vloga } from '@/hooks/use-admin-role';

interface CreateZaposleniInput {
  email: string;
  ime: string;
  priimek: string;
  vloga: Vloga;
}

interface UpdateZaposleniInput {
  id: string;
  ime?: string;
  priimek?: string;
  vloga?: Vloga;
  aktiven?: boolean;
}

async function checkSuperAdminPermission() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const admin = await prisma.zaposleni.findUnique({
    where: { email: session.user.email },
  });

  if (!admin || admin.vloga !== 'SUPER_ADMIN') {
    throw new Error('Only super admins can manage employees');
  }

  return admin;
}

export async function createZaposleni(input: CreateZaposleniInput) {
  try {
    const superAdmin = await checkSuperAdminPermission();

    // Check if email already exists
    const existingZaposleni = await prisma.zaposleni.findUnique({
      where: { email: input.email },
    });

    if (existingZaposleni) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    const zaposleni = await prisma.zaposleni.create({
      data: {
        email: input.email,
        ime: input.ime,
        priimek: input.priimek,
        vloga: input.vloga,
        createdBy: superAdmin.id,
      },
    });

    revalidatePath('/admin/zaposleni');

    return {
      success: true,
      data: zaposleni,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateZaposleni(input: UpdateZaposleniInput) {
  try {
    await checkSuperAdminPermission();

    const zaposleni = await prisma.zaposleni.update({
      where: { id: input.id },
      data: {
        ...(input.ime && { ime: input.ime }),
        ...(input.priimek && { priimek: input.priimek }),
        ...(input.vloga && { vloga: input.vloga }),
        ...(input.aktiven !== undefined && { aktiven: input.aktiven }),
      },
    });

    revalidatePath('/admin/zaposleni');

    return {
      success: true,
      data: zaposleni,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteZaposleni(id: string) {
  try {
    await checkSuperAdminPermission();

    await prisma.zaposleni.delete({
      where: { id },
    });

    revalidatePath('/admin/zaposleni');

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getZaposleniList() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error('Unauthorized');
    }

    const admin = await prisma.zaposleni.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      throw new Error('Not an admin');
    }

    const zaposlenci = await prisma.zaposleni.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: zaposlenci,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getZaposleniById(id: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      throw new Error('Unauthorized');
    }

    const admin = await prisma.zaposleni.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      throw new Error('Not an admin');
    }

    const zaposleni = await prisma.zaposleni.findUnique({
      where: { id },
    });

    if (!zaposleni) {
      throw new Error('Employee not found');
    }

    return {
      success: true,
      data: zaposleni,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
