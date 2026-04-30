import { redirect } from 'next/navigation'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'
import { ProjectAssistant } from '@/components/customer/ProjectAssistant'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { assertCanAccessBuyerDashboard, redirectForOnboardingGuard } from '@/lib/onboarding/guards'

export const metadata = {
  title: 'LiftGO - Naročnik',
}

export default async function NarocnikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    redirect('/prijava?redirectTo=/dashboard')
  }

  // Check profiles table (new schema) — narocniki table is legacy and unused
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  // Obrtniki ne sodijo sem
  if (profile?.role === 'obrtnik') {
    redirect('/obrtnik/dashboard')
  }

  try {
    await assertCanAccessBuyerDashboard(user.id)
  } catch (error) {
    redirectForOnboardingGuard(error)
  }

  const fullName = profile?.full_name ?? user.email?.split('@')[0] ?? null

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
