import type { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = { title: 'Oddajte povpraševanje — LiftGO' }

export default function OddajLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 py-3 flex items-center">
        <Link href="/" className="font-bold text-primary text-xl tracking-tight">LiftGO</Link>
      </header>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
}
