'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, X, LogOut, User } from 'lucide-react'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        setProfile(profileData)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (!session?.user) {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const getDashboardLink = () => {
    if (!profile) return '/prijava'
    return profile.role === 'narocnik' ? '/narocnik/dashboard' : '/obrtnik/dashboard'
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '??'

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">L</span>
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Lift<span className="text-primary">GO</span>
              </span>
            </Link>

            <div className="hidden items-center gap-6 lg:flex">
              <Link
                href="/obrtniki"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Obrtniki
              </Link>
              <Link
                href="/kako-deluje"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Kako deluje
              </Link>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              {user && profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{profile.full_name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(getDashboardLink())}>
                      <User className="mr-2 h-4 w-4" />
                      Nadzorna plošča
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Odjava
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/prijava">Prijava</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/registracija">Registracija</Link>
                  </Button>
                </>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-accent lg:hidden"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <div
            className={`overflow-hidden border-t transition-all duration-200 lg:hidden ${
              isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-t-0'
            }`}
          >
            <div className="flex flex-col gap-4 px-4 py-4">
              <Link
                href="/obrtniki"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                Obrtniki
              </Link>
              <Link
                href="/kako-deluje"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                Kako deluje
              </Link>

              {user && profile ? (
                <>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    Nadzorna plošča
                  </Link>
                  <Button variant="outline" onClick={handleLogout} className="w-full">
                    Odjava
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/prijava" onClick={() => setIsOpen(false)}>
                      Prijava
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/registracija" onClick={() => setIsOpen(false)}>
                      Registracija
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-background py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">L</span>
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Lift<span className="text-primary">GO</span>
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} LiftGO. Vse pravice pridržane.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
