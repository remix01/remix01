import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side admin check
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/')
  }

  // Check if user is an admin (zaposleni) in database
  const zaposleni = await prisma.zaposleni.findUnique({
    where: { email: session.user.email },
    select: { 
      id: true,
      email: true,
      ime: true,
      priimek: true,
      vloga: true,
      aktiven: true
    }
  })

  if (!zaposleni || !zaposleni.aktiven) {
    redirect('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar user={zaposleni} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={zaposleni} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
