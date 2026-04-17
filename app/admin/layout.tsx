import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminAuthProvider } from '@/lib/auth/AdminAuthContext'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side admin check using server Supabase client
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    redirect('/prijava?redirectTo=/admin')
  }

  // Check if user is an active admin in database
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()

  if (adminError || !adminUser) {
    redirect('/prijava')
  }

  return (
    <AdminAuthProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar - hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
          <AdminSidebar user={adminUser as { ime: string; priimek: string; email: string; vloga: 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER' }} />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader user={adminUser as { ime: string; priimek: string; email: string; vloga: 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER' }} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthProvider>
  )
}
