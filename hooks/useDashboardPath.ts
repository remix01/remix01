'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DASHBOARD_PATHS } from '@/components/navigation/config'

interface DashboardTarget {
  userId: string | null
  dashboardPath: string
  isLoading: boolean
}

export function useDashboardPath(): DashboardTarget {
  const [userId, setUserId] = useState<string | null>(null)
  const [dashboardPath, setDashboardPath] = useState(DASHBOARD_PATHS.customer)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function resolve() {
      const supabase = createClient()
      if (!supabase) {
        if (mounted) setIsLoading(false)
        return
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error || !user) {
        setIsLoading(false)
        return
      }

      setUserId(user.id)

      // All role lookups in parallel — no sequential waterfall
      const [adminRes, obrtnikRes, partnerRes, profileRes, profileByAuthRes] = await Promise.all([
        supabase.from('admin_users').select('id').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('obrtnik_profiles').select('id').eq('id', user.id).maybeSingle(),
        supabase.from('partners').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('profiles').select('role').eq('auth_user_id', user.id).maybeSingle(),
      ])

      if (!mounted) return

      if (adminRes.data) {
        setDashboardPath(DASHBOARD_PATHS.admin)
      } else if (obrtnikRes.data || partnerRes.data) {
        setDashboardPath(DASHBOARD_PATHS.partner)
      } else {
        const role = (profileRes.data ?? profileByAuthRes.data)?.role
        if (role === 'obrtnik' || role === 'CRAFTWORKER') {
          setDashboardPath(DASHBOARD_PATHS.partner)
        }
      }

      setIsLoading(false)
    }

    resolve()
    return () => { mounted = false }
  }, [])

  return { userId, dashboardPath, isLoading }
}
