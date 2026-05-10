import Link from 'next/link'

export function BrandLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <span className="text-lg font-bold text-primary-foreground">L</span>
      </div>
      <span className="font-display text-xl font-bold tracking-tight text-foreground">
        Lift<span className="text-primary">GO</span>
      </span>
    </Link>
  )
}
