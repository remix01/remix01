import { supabaseAdmin } from '@/lib/supabase-admin';
import { ok, fail } from '@/lib/http/response'


export async function GET() {
  try {
    // Check if any super admin exists
    const { count, error } = await supabaseAdmin
      .from('zaposleni')
      .select('*', { count: 'exact', head: true })
      .eq('vloga', 'SUPER_ADMIN');

    if (error) throw new Error(error.message);

    return ok({
      needsSetup: (count || 0) === 0,
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return fail('Internal server error', 500);
  }
}
