import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <p className="text-sm uppercase tracking-wide text-blue-700 mb-2">LiftGO</p>
        <h1 className="text-3xl font-bold mb-4">Strani nismo našli</h1>
        <p className="text-gray-600 mb-8">
          Iskana pot ne obstaja ali je bila premaknjena. Nadaljujte z iskanjem mojstrov ali oddajte povpraševanje in pomagali vam bomo najti pravega izvajalca.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/novo-povprasevanje"><Button>Oddaj povpraševanje</Button></Link>
          <Link href="/mojstri"><Button variant="outline">Poglej mojstre</Button></Link>
          <Link href="/"><Button variant="ghost">Domov</Button></Link>
        </div>
      </div>
    </main>
  )
}
