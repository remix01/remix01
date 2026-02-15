import { Check, ArrowRight, HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const examples = [
  {
    title: "Popravilo pipe",
    price: 120,
    start: { rate: 0.10, fee: 12 },
    pro: { rate: 0.05, fee: 6 },
  },
  {
    title: "Prenova kopalnice",
    price: 3500,
    start: { rate: 0.10, fee: 150 },
    pro: { rate: 0.05, fee: 175 },
  },
  {
    title: "Montaža kuhinje",
    price: 800,
    start: { rate: 0.10, fee: 80 },
    pro: { rate: 0.05, fee: 40 },
  },
]

export function CommissionExplainer() {
  return (
    <section className="py-20 lg:py-28 border-t">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Transparentna provizija
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl text-balance">
            Brez skritih stroškov. Poglejte primere.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Provizija se obračuna samo po uspešno zaključenem delu. Nikoli vnaprej.
          </p>
        </div>

        {/* How commission works */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-muted-foreground">START paket</p>
            <p className="mt-2 font-display text-4xl font-bold text-foreground">10%</p>
            <p className="mt-1 text-sm text-muted-foreground">provizija po zaključenem delu</p>
            <div className="mt-4 rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">
                Min. 10 EUR / Max. 150 EUR na posel
              </p>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                0 EUR mesečna naročnina
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Brez obveznosti
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Idealno za občasne mojstre
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 lg:p-8">
            <p className="text-sm font-medium text-primary">PRO paket</p>
            <p className="mt-2 font-display text-4xl font-bold text-primary">5%</p>
            <p className="mt-1 text-sm text-muted-foreground">provizija po zaključenem delu</p>
            <div className="mt-4 rounded-lg bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground">
                29 EUR/mesec + nižja provizija
              </p>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Pol nižja provizija
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Neomejeno povpraševanj
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Idealno za aktivne mojstre
              </li>
            </ul>
          </div>
        </div>

        {/* Practical examples */}
        <div className="mt-12">
          <h3 className="text-center font-display text-lg font-bold text-foreground">
            Primeri iz prakse
          </h3>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold text-foreground">Delo</th>
                  <th className="pb-3 font-semibold text-foreground">Cena dela</th>
                  <th className="pb-3 font-semibold text-foreground">START (10%)</th>
                  <th className="pb-3 font-semibold text-primary">PRO (5%)</th>
                  <th className="pb-3 font-semibold text-foreground">Prihranek</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((ex) => (
                  <tr key={ex.title} className="border-b last:border-0">
                    <td className="py-3 text-muted-foreground">{ex.title}</td>
                    <td className="py-3 font-medium text-foreground">{ex.price} EUR</td>
                    <td className="py-3 text-muted-foreground">{ex.start.fee} EUR</td>
                    <td className="py-3 font-medium text-primary">{ex.pro.fee} EUR</td>
                    <td className="py-3 font-semibold text-foreground">
                      {ex.start.fee - ex.pro.fee > 0 ? `${ex.start.fee - ex.pro.fee} EUR` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            START ima omejitev min. 10 EUR in max. 150 EUR provizije na posel. Pri PRO paketu ni omejitve navzgor.
          </p>
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" className="gap-2" asChild>
            <Link href="/partner-auth/sign-up">
              Začnite brezplačno s START
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
