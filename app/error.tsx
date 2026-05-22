'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-wide text-blue-700 mb-2">LiftGO</p>
        <h1 className="text-3xl font-bold mb-4">Prišlo je do napake</h1>
        <p className="text-gray-600 mb-8">Stran trenutno ni dosegljiva. Poskusite znova ali nadaljujte z oddajo povpraševanja.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={reset}>Poskusi znova</Button>
          <Link href="/novo-povprasevanje"><Button>Oddaj povpraševanje</Button></Link>
          <Link href="/"><Button variant="ghost">Domov</Button></Link>
        </div>
      </div>
    </main>
  )
}
