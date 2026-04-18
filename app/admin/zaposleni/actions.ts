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

  if (!user?.id) {
    throw new Error('Unauthorized');
  }

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .single()

  if (!admin || admin.vloga !== 'SUPER_ADMIN') {
    throw new Error('Only super admins can manage employees');
  }

  return admin;
}

export async function createZaposleni(input: CreateZaposleniInput) {
  try {
    const superAdmin = await checkSuperAdminPermission();

    const normalizedEmail = input.email.trim().toLowerCase()
    const { data: existingZaposleni } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingZaposleni) {
      return { success: false, error: 'Admin z istim email naslovom že obstaja.' };
    }

    const tempPassword = `LiftGO-${Math.random().toString(36).slice(2)}#A1`
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: input.ime,
        last_name: input.priimek,
      },
    })

    if (authError || !authUser.user?.id) {
      throw new Error(authError?.message || 'Ustvarjanje auth računa ni uspelo.');
    }

    const { data: zaposleni, error } = await supabaseAdmin
      .from('admin_users')
      .insert([{
        auth_user_id: authUser.user.id,
        email: normalizedEmail,
        ime: input.ime.trim(),
        priimek: input.priimek.trim(),
        vloga: input.vloga,
        aktiven: true,
        created_by: superAdmin.id,
      }])
      .select()
      .single()

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw error
    }

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

    const { data: existing } = await supabaseAdmin
      .from('admin_users')
      .select('id, auth_user_id')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return { success: false, error: 'Zaposleni ne obstaja.' }
    }

    const { error } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (existing.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(existing.auth_user_id)
    }

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

    if (!user?.id) throw new Error('Unauthorized');

    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .single()

    if (!admin) throw new Error('Not an admin');

    const { data: zaposlenci, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: zaposlenci || [] };
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

    if (!user?.id) throw new Error('Unauthorized');

    const { data: admin } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .single()

    if (!admin) throw new Error('Not an admin');

    const { data: zaposleni, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !zaposleni) throw new Error('Employee not found');

    return { success: true, data: zaposleni };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
