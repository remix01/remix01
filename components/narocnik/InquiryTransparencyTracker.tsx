'use client'

import { Card } from '@/components/ui/card'

interface TrackerProps {
  createdAt: string
  offersCount: number
}

export function InquiryTransparencyTracker({ createdAt, offersCount }: TrackerProps) {
  const created = new Date(createdAt)
  const now = new Date()
  const elapsedHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

  const items = [
    'Povpraševanje poslano obrtnikom.',
    offersCount > 0
      ? `${offersCount} obrtnik(ov) je oddalo ponudbo.`
      : 'Čakamo na prve odzive obrtnikov.',
    elapsedHours >= 2 && offersCount === 0
      ? 'AI predlog: Razširite območje iskanja ali izboljšajte opis.'
      : 'Prvi odziv pričakujte v kratkem.',
  ]

  return (
    <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50">
      <h3 className="font-semibold text-amber-900 mb-2">AI Transparency Tracker</h3>
      <ul className="space-y-2 text-sm text-amber-800">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
