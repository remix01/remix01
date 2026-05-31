import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/stranka/Sidebar'
import { ensureCustomerProfile } from '@/lib/auth/profiles'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  // Auth check: verify user is logged in and is narocnik
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/prijava')
  }

  // Get or create the user's profile with service role to avoid false
  // no-profile redirects when RLS blocks the session client.
  const profile = await ensureCustomerProfile(user, 'dashboard.stranka.layout.ensureProfile')
  if (profile.role === 'obrtnik') {
    redirect('/partner-dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:w-64 lg:bg-white lg:border-r lg:border-slate-200 lg:flex lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <div className="flex items-center justify-end border-b border-slate-200 px-4 py-2 lg:px-8">
          <NotificationBellClient userId={user.id} />
        </div>
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav - shown on mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
        <Sidebar mobile />
      </div>

      {/* Mobile safe area for bottom nav */}
      <div className="h-24 lg:h-0" />
    </div>
  )
}
