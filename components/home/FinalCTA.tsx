import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-12 lg:px-8">
      <div className="rounded-3xl border bg-primary p-8 text-primary-foreground sm:p-12">
        <h2 className="text-3xl font-bold tracking-tight">Pridružite se tisočim zadovoljnim uporabnikom.</h2>
        <p className="mt-2 text-sm text-primary-foreground/85 sm:text-base">Oddajte povpraševanje ali razširite posel kot LiftGO partner.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary" className="min-h-11">
            <Link href="/povprasevanje/novo">Oddaj povpraševanje</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 border-white/40 bg-transparent text-primary-foreground hover:bg-white/10">
            <Link href="/prijava">Prijava za partnerje</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
