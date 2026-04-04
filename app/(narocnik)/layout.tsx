import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'
import { NarocnikLayoutClient } from './layout-client'

export const metadata = {
  title: 'LiftGO - Naročnik',
}

export default async function NarocnikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication - getUser() from server client with cookies
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    console.log('[v0] Narocnik layout: No authenticated user, redirecting to login')
    redirect('/prijava?redirectTo=/dashboard')
  }

  // Fetch profile with error handling
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()
  const profile = profileData as { role: string | null; full_name: string | null } | null

  // If profile doesn't exist or user is not narocnik, redirect appropriately
  if (profileError || !profile) {
    console.log('[v0] Narocnik layout: Profile not found, redirecting to registration')
    redirect('/registracija')
  }

  if (profile.role !== 'narocnik') {
    console.log(`[v0] Narocnik layout: User has role ${profile.role}, not narocnik, redirecting`)
    redirect(profile.role === 'obrtnik' ? '/partner-dashboard' : '/dashboard')
  }

  return (
    <NarocnikLayoutClient
      fullName={profile.full_name}
      userId={user.id}
    >
      {children}
    </NarocnikLayoutClient>
  )
}
