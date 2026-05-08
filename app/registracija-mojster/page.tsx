import { Suspense } from 'react'
import type { Metadata } from 'next'
import RegistracijaMojsterForm from './registracija-form'

export const metadata: Metadata = {
  title: 'Registracija za obrtnike | LiftGO',
  description: 'Pridružite se platformi LiftGO kot preverjen obrtnik. Brezplačna registracija, START ali PRO paket.',
  alternates: {
    canonical: 'https://www.liftgo.net/registracija-mojster',
  },
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Nalagam obrazec...</p>
      </div>
    </div>
  )
}

export default function RegistracijaMojsterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegistracijaMojsterForm />
    </Suspense>
  )
}
