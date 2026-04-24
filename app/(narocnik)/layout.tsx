import { redirect } from 'next/navigation'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'
import { ProjectAssistant } from '@/components/customer/ProjectAssistant'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

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

  if (!user || userError) {
    console.log('[v0] Narocnik layout: No authenticated user, redirecting to login')
    redirect('/prijava?redirectTo=/dashboard')
  }

  type NarocnikRecord = {
    id?: string
    user_id?: string | null
    email?: string | null
    full_name?: string | null
    role?: string | null
  }

  const { data: narocnikByUserId, error: narocnikByUserIdError } = await supabaseAdmin
    .from('narocniki')
    .select('id, user_id, email, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (narocnikByUserIdError) {
    console.error('[v0] Narocnik layout: Failed loading narocnik profile by user_id', narocnikByUserIdError)
  }

  let narocnik = narocnikByUserId as NarocnikRecord | null

  if (!narocnik && user.email) {
    const { data: narocnikByEmail, error: narocnikByEmailError } = await supabaseAdmin
      .from('narocniki')
      .select('id, user_id, email, full_name')
      .eq('email', user.email)
      .maybeSingle()

    if (narocnikByEmailError) {
      console.error('[v0] Narocnik layout: Failed loading narocnik profile by email', narocnikByEmailError)
    }

    narocnik = narocnikByEmail as NarocnikRecord | null
  }

  if (!narocnik) {
    console.log('[v0] Narocnik layout: Narocnik profile not found, redirecting to registration')
    redirect('/registracija')
  }

  const { data: profileDataById, error: profileByIdError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { data: profileDataByAuthUserId, error: profileByAuthUserIdError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileByIdError || profileByAuthUserIdError) {
    console.error('[v0] Narocnik layout: Failed loading profile role', profileByIdError ?? profileByAuthUserIdError)
  }

  const profile = (profileDataById ?? profileDataByAuthUserId) as { role: string | null; full_name: string | null } | null

  if (profile?.role === 'obrtnik') {
    console.log('[v0] Narocnik layout: User has obrtnik role, redirecting to partner dashboard')
    redirect('/partner-dashboard')
  }

  const fullName = profile?.full_name ?? narocnik.full_name ?? null

  return (
    <div className="flex flex-col bg-background md:min-h-screen md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:block md:h-screen md:w-64 md:border-r">
        <NarocnikSidebar fullName={fullName} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col pb-20 md:ml-64 md:pb-0">
        <div className="flex items-center justify-between border-b p-4 md:justify-end md:border-b-0 md:p-6">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Odpri meni</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <NarocnikSidebar fullName={fullName} />
              </SheetContent>
            </Sheet>
          </div>

          <NotificationBellClient userId={user.id} />
        </div>

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-0">
          {children}
        </main>
      </div>
      <ProjectAssistant context={`Naročniški portal uporabnika ${user.id}. Odgovarjaj v slovenščini in vodi uporabnika skozi naslednje korake projekta.`} />

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden">
        <NarocnikBottomNav />
      </div>
    </div>
  )
}
