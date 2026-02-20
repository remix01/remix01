import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Lift<span className="text-primary">GO</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="border-t bg-background py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground lg:px-8">
          © {new Date().getFullYear()} LiftGO. Vse pravice pridržane.
        </div>
      </footer>
    </div>
  )
}
