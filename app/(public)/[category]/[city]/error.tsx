'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Napaka pri nalaganju strani</h1>
        <p className="text-gray-600 mb-6">
          Stran trenutno ni dosegljiva. Poskusite znova ali se vrnite na domačo stran.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="outline">
            Poskusi znova
          </Button>
          <Link href="/novo-povprasevanje">
            <Button>Oddaj povpraševanje</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Domov</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
