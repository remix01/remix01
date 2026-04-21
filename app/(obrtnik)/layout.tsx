import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObrtknikSidebar } from '@/components/obrtnik/sidebar'
import { ObrtknikBottomNav } from '@/components/obrtnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'
import { AvailabilityToggle } from '@/components/obrtnik/availability-toggle'

export const metadata = {
  title: 'LiftGO - Partner',
}

export default async function ObrtknikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login?redirectTo=/partner-dashboard')
  }

  const { data: profile, error: profileError } = await supabase
    .from('obrtnik_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    redirect('/partner-auth/login')
  }

  const [{ data: userProfileById }, { data: userProfileByAuth }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('subscription_tier').eq('auth_user_id', user.id).maybeSingle(),
  ])
  const userProfile = userProfileById ?? userProfileByAuth

  const { count: unreadMessages } = await supabase
    .from('sporocila')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  return (
    <div className="flex flex-col md:flex-row md:min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:h-screen md:border-r z-30">
        <ObrtknikSidebar
          fullName={profile.business_name || 'Obrtnik'}
          subscriptionTier={userProfile?.subscription_tier ?? undefined}
          unreadMessages={unreadMessages || 0}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 pb-20 md:pb-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 border-b bg-background/95 backdrop-blur sticky top-0 z-20">
          {/* Mobile: Logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="font-bold text-primary">LiftGO</span>
          </div>
          {/* Desktop: Breadcrumb space */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-3">
            <AvailabilityToggle initialStatus={profile.is_available || false} obrtnikId={profile.id} />
            <NotificationBellClient userId={user.id} />
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-30">
        <ObrtknikBottomNav unreadMessages={unreadMessages || 0} />
      </div>
    </div>
  )
}
