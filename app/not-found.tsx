'use client'

import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-lg text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Stran ni najdena
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Žal, stran, ki ste jo iskali, ne obstaja. Morda je bila izbrisana ali se je naslov spremenil.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="w-4 h-4" />
              Nazaj na domov
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazaj
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">
            Potrebna pomoč?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <Link href="/narocnik/novo-povprasevanje" className="text-blue-600 hover:text-blue-700 font-medium">
              Oddaj povpraševanje
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link href="/za-obrtnike" className="text-blue-600 hover:text-blue-700 font-medium">
              Za obrtnike
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link href="/kontakt" className="text-blue-600 hover:text-blue-700 font-medium">
              Kontaktiraj nas
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
