import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Home, PlusCircle, FileText, User, LogOut } from 'lucide-react'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export default async function NarocnikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/prijava')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'narocnik') {
    redirect('/obrtnik/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Lift<span className="text-primary">GO</span>
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          <Link
            href="/narocnik/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Home className="h-4 w-4" />
            Nadzorna plošča
          </Link>
          <Link
            href="/narocnik/novo-povprasevanje"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <PlusCircle className="h-4 w-4" />
            Novo povpraševanje
          </Link>
          <Link
            href="/narocnik/povprasevanja"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FileText className="h-4 w-4" />
            Moja povpraševanja
          </Link>
          <Link
            href="/narocnik/profil"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <User className="h-4 w-4" />
            Profil
          </Link>
        </nav>

        <div className="absolute bottom-0 w-64 border-t bg-card p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium text-foreground">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">Naročnik</p>
          </div>
          <form action={logout}>
            <Button variant="outline" size="sm" className="w-full gap-2" type="submit">
              <LogOut className="h-4 w-4" />
              Odjava
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Lift<span className="text-primary">GO</span>
            </span>
          </Link>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
