'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry/client'

export type AppRole = 'customer' | 'craftsman' | 'admin' | null

function mapRole(role?: string | null, isAdmin?: boolean): AppRole {
  if (isAdmin) return 'admin'
  if (role === 'obrtnik' || role === 'CRAFTWORKER') return 'craftsman'
  if (role === 'narocnik' || role === 'CUSTOMER') return 'customer'
  return null
}

export function useAuth() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<AppRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function hydrate(currentSession: Session | null) {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (!currentSession?.user) {
        setRole(null)
        clearSentryUser()
        if (active) setIsLoading(false)
        return
      }

      const [profileRes, adminRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .maybeSingle(),
        supabase
          .from('admin_users')
          .select('id')
          .eq('auth_user_id', currentSession.user.id)
          .eq('aktiven', true)
          .maybeSingle(),
      ])

      const profileRole = (profileRes.data as { role?: string } | null)?.role ?? null
      const isAdmin = Boolean(adminRes.data)

      if (active) {
        setRole(mapRole(profileRole, isAdmin))
        setIsLoading(false)
        setSentryUser({
          id: currentSession.user.id,
          email: currentSession.user.email,
        })
      }
    }

    supabase.auth.getSession()
      .then(({ data }) => hydrate(data.session))
      .catch(err => console.error('[useAuth] getSession failed:', err))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return {
    user,
    session,
    role,
    isLoading,
    isAuthenticated: !!user,
    isCustomer: role === 'customer',
    isCraftsman: role === 'craftsman',
    isAdmin: role === 'admin',
  }
}
