import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ObrtknikSidebar } from '@/components/obrtnik/sidebar'
import { ObrtknikBottomNav } from '@/components/obrtnik/bottom-nav'
import { NotificationBell } from '@/components/liftgo/NotificationBell'

export const metadata = {
  title: 'LiftGO - Obrtnik',
}

export default async function ObrtknikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik profile
  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    redirect('/partner-auth/login')
  }

  return (
    <div className="flex flex-col md:flex-row md:min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:h-screen md:border-r">
        <ObrtknikSidebar fullName={profile.business_name || 'Obrtnik'} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 md:pb-0 pb-20">
        {/* Top Bar with Notification Bell */}
        <div className="flex items-center justify-end p-4 md:p-6 border-b md:border-b-0">
          <NotificationBell userId={user.id} />
        </div>

        <main className="flex-1 p-4 md:p-6">
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
