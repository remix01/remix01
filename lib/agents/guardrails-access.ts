import { createClient } from '@/lib/supabase/server'
import { runGuardrails } from '@/lib/agent/guardrails'
import type { Role } from '@/lib/agent/permissions'

function mapProfileRoleToGuardrailRole(profileRole: string | null | undefined): Role {
  if (profileRole === 'admin') return 'admin'
  if (profileRole === 'narocnik') return 'user'
  if (profileRole === 'obrtnik') return 'partner'
  return 'guest'
}

export async function runRouteGuardrails(
  toolName: string,
  params: Record<string, unknown>,
  user: { id: string; email?: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const session = {
    user: {
      id: user.id,
      email: user.email,
      role: mapProfileRoleToGuardrailRole(profileData?.role),
    },
  }

  await runGuardrails(toolName, params, session)
}
