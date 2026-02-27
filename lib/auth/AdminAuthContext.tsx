'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER'

export interface AdminUser {
  id: string
  auth_user_id: string
  email: string
  ime: string
  priimek: string
  vloga: AdminRole
  aktiven: boolean
}

interface AdminAuthContextType {
  user: User | null
  adminUser: AdminUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  hasRole: (role: AdminRole) => boolean
  canAccess: (requiredRole: AdminRole) => boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const roleHierarchy: Record<AdminRole, number> = {
    SUPER_ADMIN: 3,
    MODERATOR: 2,
    OPERATER: 1,
  }

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      try {
        const supabase = createClient()
        if (!supabase) {
          console.warn('[v0] Supabase client not available')
          setLoading(false)
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchAdminUser(session.user.id, supabase)
        }
      } catch (error) {
        console.error('[v0] Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  useEffect(() => {
    const setupAuthListener = async () => {
      try {
        const supabase = createClient()
        if (!supabase) return

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setUser(session?.user ?? null)
            
            if (session?.user) {
              await fetchAdminUser(session.user.id, supabase)
            } else {
              setAdminUser(null)
            }
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('[v0] Error setting up auth listener:', error)
      }
    }

    const unsubscribe = setupAuthListener()
    return () => {
      unsubscribe.then(unsub => unsub?.())
    }
  }, [])

  const fetchAdminUser = async (authUserId: string, supabase: ReturnType<typeof createClient>) => {
    try {
      if (!supabase) {
        console.warn('[v0] Supabase client not available')
        setAdminUser(null)
        return
      }
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .eq('aktiven', true)
        .single()

      if (error) {
        console.error('[v0] Error fetching admin user:', error)
        setAdminUser(null)
        return
      }

      setAdminUser(data as AdminUser)
    } catch (error) {
      console.error('[v0] Error fetching admin user:', error)
      setAdminUser(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      if (data.user) {
        await fetchAdminUser(data.user.id, supabase)
      }
    } catch (error) {
      console.error('[v0] Sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const supabase = createClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }
      
      await supabase.auth.signOut()
      setUser(null)
      setAdminUser(null)
    } catch (error) {
      console.error('[v0] Sign out error:', error)
      throw error
    }
  }

  const hasRole = (role: AdminRole): boolean => {
    return adminUser?.vloga === role
  }

  const canAccess = (requiredRole: AdminRole): boolean => {
    if (!adminUser) return false
    return roleHierarchy[adminUser.vloga] >= roleHierarchy[requiredRole]
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        adminUser,
        loading,
        signIn,
        signOut,
        hasRole,
        canAccess,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
