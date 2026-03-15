'use server';

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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
    await checkSuperAdminPermission();

    // Check if email already exists in admin_users
    const { data: existing } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', input.email)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Email že obstaja' };
    }

    // Create auth user via admin API (sends invite email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: {
        full_name: `${input.ime} ${input.priimek}`,
      },
    })

    if (authError) {
      // If auth user already exists, try to find it
      if (!authError.message.includes('already been registered')) {
        throw new Error(authError.message)
      }
    }

    const authUserId = authData?.user?.id ?? null

    // Insert into admin_users
    const { data: zaposleni, error } = await supabaseAdmin
      .from('admin_users')
      .insert({
        auth_user_id: authUserId,
        email: input.email,
        ime: input.ime,
        priimek: input.priimek,
        vloga: input.vloga,
        aktiven: true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/zaposleni');

    return { success: true, data: zaposleni };
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

    const updateData: any = {}
    if (input.ime) updateData.ime = input.ime
    if (input.priimek) updateData.priimek = input.priimek
    if (input.vloga) updateData.vloga = input.vloga
    if (input.aktiven !== undefined) updateData.aktiven = input.aktiven

    const { data: zaposleni, error } = await supabaseAdmin
      .from('admin_users')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/zaposleni');

    return { success: true, data: zaposleni };
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

    // Soft delete — set aktiven=false
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({ aktiven: false })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/zaposleni');

    return { success: true };
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
      .select('vloga')
      .eq('email', user.email)
      .single()

    if (!admin) {
      throw new Error('Not an admin');
    }

    const { data: zaposlenci, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, ime, priimek, vloga, aktiven, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: (zaposlenci || []).map((z: any) => ({
        id: z.id,
        email: z.email,
        ime: z.ime,
        priimek: z.priimek,
        vloga: z.vloga,
        aktiven: z.aktiven,
        createdAt: new Date(z.created_at),
      })),
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

    const { data: zaposleni, error } = await supabaseAdmin
      .from('admin_users')
      .select('id, email, ime, priimek, vloga, aktiven, created_at')
      .eq('id', id)
      .single()

    if (error || !zaposleni) {
      throw new Error('Employee not found');
    }

    return {
      success: true,
      data: {
        id: zaposleni.id,
        email: zaposleni.email,
        ime: zaposleni.ime,
        priimek: zaposleni.priimek,
        vloga: zaposleni.vloga,
        aktiven: zaposleni.aktiven,
        createdAt: new Date(zaposleni.created_at),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
