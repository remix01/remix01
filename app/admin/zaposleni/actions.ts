'use server';

import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('Unauthorized');
  }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!admin || admin.vloga !== 'SUPER_ADMIN') {
    throw new Error('Only super admins can manage employees');
  }

  return admin;
}

export async function createZaposleni(input: CreateZaposleniInput) {
  try {
    const superAdmin = await checkSuperAdminPermission();
    const supabase = await createClient()

    // Check if email already exists
    const { data: existingZaposleni } = await supabase
      .from('Zaposleni')
      .select('*')
      .eq('email', input.email)
      .single()

    if (existingZaposleni) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    const { data: zaposleni, error } = await supabase
      .from('Zaposleni')
      .insert([{
        email: input.email,
        ime: input.ime,
        priimek: input.priimek,
        vloga: input.vloga,
        aktiven: true,
      }])
      .select()
      .single()

    if (error) throw error

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
    const supabase = await createClient()

    const updateData: any = {}
    if (input.ime) updateData.ime = input.ime
    if (input.priimek) updateData.priimek = input.priimek
    if (input.vloga) updateData.vloga = input.vloga
    if (input.aktiven !== undefined) updateData.aktiven = input.aktiven

    const { data: zaposleni, error } = await supabase
      .from('Zaposleni')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (error) throw error

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
    const supabase = await createClient()

    const { error } = await supabase
      .from('Zaposleni')
      .delete()
      .eq('id', id)

    if (error) throw error

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      throw new Error('Unauthorized');
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!admin) {
      throw new Error('Not an admin');
    }

    const { data: zaposlenci, error } = await supabase
      .from('Zaposleni')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: zaposlenci || [],
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      throw new Error('Unauthorized');
    }

    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!admin) {
      throw new Error('Not an admin');
    }

    const { data: zaposleni, error } = await supabase
      .from('Zaposleni')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !zaposleni) {
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

