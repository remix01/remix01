import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObrtknikSidebar } from '@/components/obrtnik/sidebar'
import { ObrtknikBottomNav } from '@/components/obrtnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'
import { AvailabilityToggle } from '@/components/obrtnik/availability-toggle'
import { assertCanAccessProviderDashboard, redirectForOnboardingGuard } from '@/lib/onboarding/guards'

export const metadata = {
  title: 'LiftGO - Obrtnik',
}

export default async function ObrtknikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user with proper error handling
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('[v0] Obrtnik layout: No authenticated user, redirecting to partner login')
    redirect('/partner-auth/login?redirectTo=/partner-dashboard')
  }

  // Get obrtnik profile (id = auth user id, no separate user_id column)
  const { data: profile, error: profileError } = await supabase
    .from('obrtnik_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.log(`[v0] Obrtnik layout: Profile not found for user ${user.id}, redirecting`)
    redirect('/partner-auth/login')
  }

  console.log(`[v0] Obrtnik layout: User ${user.id} has obrtnik profile, allowing access`)

  try {
    await assertCanAccessProviderDashboard(user.id)
  } catch (error) {
    redirectForOnboardingGuard(error)
  }

  return (
    <div className="flex flex-col md:flex-row md:min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:h-screen md:border-r">
        <ObrtknikSidebar fullName={profile.business_name || 'Obrtnik'} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 md:pb-0 pb-20">
        {/* Top Bar with Notification Bell & Availability Toggle */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b md:border-b-0 gap-4">
          <AvailabilityToggle initialStatus={profile.is_available || false} obrtnikId={profile.id} />
          <NotificationBellClient userId={user.id} />
        </div>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background">
        <ObrtknikBottomNav />
      </div>
    </div>
  )
}
