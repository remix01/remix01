import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'

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
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

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
    <div className="flex flex-col md:flex-row md:min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:h-screen md:border-r">
        <NarocnikSidebar fullName={profile.full_name} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 md:pb-0 pb-20">
        {/* Top Bar with Notification Bell */}
        <div className="flex items-center justify-end p-4 md:p-6 border-b md:border-b-0">
          <NotificationBellClient userId={user.id} />
        </div>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background">
        <NarocnikBottomNav />
      </div>
    </div>
  )
}
