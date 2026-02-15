import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Blog - LiftGO | Nasveti za dom in obnovo",
  description: "Koristni nasveti za vzdrževanje doma, prenove, varčevanje energije in izbiro pravega obrtnika.",
}

const posts = [
  {
    title: "5 napak pri izbiri vodoinstalaterja (in kako se jim izogniti)",
    excerpt: "Preden pokličete prvega mojstra iz Googla, preberite teh 5 najpogostejših napak, ki jih delajo lastniki stanovanj...",
    category: "Nasveti",
    readTime: "4 min",
    date: "10. feb 2026",
    slug: "#",
  },
  {
    title: "Koliko stane prenova kopalnice v 2026?",
    excerpt: "Realen pregled stroškov prenove kopalnice v Sloveniji - od ekonomične do luksuzne variante z dejanskimi cenami...",
    category: "Cene",
    readTime: "6 min",
    date: "3. feb 2026",
    slug: "#",
  },
  {
    title: "Kako izbrati pravega električarja za pametni dom",
    excerpt: "Pametni domovi niso več prihodnost - so sedanjost. Ampak ne more vsak električar pravilno nastaviti sistema...",
    category: "Nasveti",
    readTime: "5 min",
    date: "28. jan 2026",
    slug: "#",
  },
  {
    title: "Energetska sanacija: koliko prihranite s toplotno izolacijo",
    excerpt: "Z naraščajočimi cenami energije je toplotna izolacija ena najboljših naložb. Poglejmo dejanske številke...",
    category: "Prihrankii",
    readTime: "7 min",
    date: "20. jan 2026",
    slug: "#",
  },
]

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Blog</p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
                Nasveti za vaš dom
              </h1>
              <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
                Praktični nasveti za vzdrževanje doma, prenove, varčevanje energije in izbiro pravega mojstra.
              </p>
            </div>

            <div className="mt-14 flex flex-col gap-8">
              {posts.map((post) => (
                <article
                  key={post.title}
                  className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/30 lg:p-8"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                      {post.category}
                    </span>
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors lg:text-2xl">
                    {post.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Preberi več
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Več člankov prihaja kmalu. Spremljajte nas!
              </p>
              <Button className="mt-4 gap-2" asChild>
                <Link href="/#oddaj-povprasevanje">
                  Oddajte povpraševanje
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
