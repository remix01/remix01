import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'

export const metadata = {
  title: 'LiftGO - Naročnik',
}

export default async function NarocnikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/prijava')
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .single()

  // Check profile exists and has correct role
  if (profileError || !profile || profile.role !== 'narocnik') {
    redirect('/partner-dashboard')
  }

  return (
    <div className="flex flex-col md:flex-row md:min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:h-screen md:border-r">
        <NarocnikSidebar fullName={profile.full_name} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 md:pb-0 pb-20">
        <main className="flex-1 p-4 md:p-6">
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
