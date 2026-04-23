'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAccountTarget() {
  const [userId, setUserId] = useState<string | null>(null)
  const [dashboardPath, setDashboardPath] = useState('/dashboard')

  useEffect(() => {
    let mounted = true

    async function resolve() {
      const supabase = createClient()
      if (!supabase) return

      const { data: { user }, error } = await supabase.auth.getUser()
      if (!mounted || error || !user) return

      setUserId(user.id)

      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (adminUser) {
        if (mounted) setDashboardPath('/admin')
        return
      }

      const { data: obrtnikProfile } = await supabase
        .from('obrtnik_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (obrtnikProfile) {
        if (mounted) setDashboardPath('/partner-dashboard')
        return
      }

      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (partner) {
        if (mounted) setDashboardPath('/partner-dashboard')
        return
      }

      const [{ data: profileById }, { data: profileByAuthId }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('role').eq('auth_user_id', user.id).maybeSingle(),
      ])

      const role = (profileById ?? profileByAuthId)?.role
      if (mounted && role === 'obrtnik') {
        setDashboardPath('/partner-dashboard')
      }
    }

    resolve()
    return () => { mounted = false }
  }, [])

  return { userId, dashboardPath }
}
