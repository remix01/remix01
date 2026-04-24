import { getErrorMessage } from '@/lib/utils/error'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return fail('Unauthorized', 401);
    }

    // Check if super admin already exists
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
      .eq('vloga', 'SUPER_ADMIN')

    if ((count ?? 0) > 0) {
      return fail('Super admin already exists', 400);
    }

    const { ime, priimek } = await request.json();

    if (!ime || !priimek) {
      return fail('Missing required fields', 400);
    }

    // Create super admin from current user
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .insert({
        auth_user_id: user.id,
        email: user.email,
        ime,
        priimek,
        vloga: 'SUPER_ADMIN',
        aktiven: true,
      })
      .select()
      .single()

    if (error) {
      return fail(getErrorMessage(error), 500)
    }

    return ok({
      success: true,
      data: adminUser,
    });
  } catch (error) {
    console.error('Error setting up admin:', error);
    return fail('Internal server error', 500);
  }
}
