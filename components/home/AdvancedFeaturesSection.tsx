import { Bot, BriefcaseBusiness, Gauge, Sparkles, Video, Wand2 } from 'lucide-react'

const features = [
  { title: 'AI Concierge', icon: Bot },
  { title: 'Video diagnoza', icon: Video },
  { title: 'Pametno ujemanje kategorij', icon: Sparkles },
  { title: 'Partner CRM', icon: BriefcaseBusiness },
  { title: 'AI generator ponudb', icon: Wand2 },
  { title: 'Admin nadzor in verifikacije', icon: Gauge },
]

export function AdvancedFeaturesSection() {
  return (
    <section className="border-b py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Napredne funkcije, ki niso samo marketing
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <feature.icon className="h-4 w-4" />
                {feature.title}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
