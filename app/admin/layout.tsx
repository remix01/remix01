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
  // Server-side admin check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is an admin in database
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .single()

  if (error || !adminUser) {
    redirect('/auth/login')
  }

  return (
    <AdminAuthProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar user={adminUser} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader user={adminUser} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthProvider>
  )
}
