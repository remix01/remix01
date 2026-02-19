import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side admin check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Check if user is ADMIN in database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, name: true, email: true }
  })

  if (!dbUser || dbUser.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar user={dbUser} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={dbUser} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
