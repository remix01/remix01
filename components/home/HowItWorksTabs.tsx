'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const TABS = ['Za stranke', 'Za mojstre'] as const

const steps = {
  'Za stranke': [
    '1. Opišite delo (lahko tudi z videom).',
    '2. Prejmite primerljive ponudbe preverjenih mojstrov.',
    '3. Izberite najboljšega in spremljajte izvedbo.',
  ],
  'Za mojstre': [
    '1. Registrirajte se in dopolnite profil.',
    '2. Prejemajte relevantna povpraševanja iz vaše regije.',
    '3. Pošljite ponudbo in povečajte zaslužek.',
  ],
}

export function HowItWorksTabs() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Za stranke')

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <h2 className="text-center text-3xl font-bold tracking-tight">Kako LiftGO deluje</h2>
      <div className="mx-auto mt-6 flex w-fit rounded-full border p-1">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'min-h-11 rounded-full px-4 text-sm font-medium',
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps[activeTab].map((step) => (
          <div key={step} className="rounded-2xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {step}
          </div>
        ))}
      </div>
    </section>
  )
}
