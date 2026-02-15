import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'E-Ključ — Varno upravljanje dostopa | LiftGO',
  description: 'Omogočite mojstru varen in časovno omejen dostop do objekta brez fizičnega predaje ključev. PIN koda, pametna ključavnica ali fizični ključ.',
  keywords: 'e-ključ, digitalni dostop, pametna ključavnica, PIN koda, varnost, obrtnik, mojster',
  openGraph: {
    title: 'E-Ključ — Mojster pride, ko vi niste doma',
    description: 'Varno in preprosto upravljajte dostop do vašega doma brez fizičnega predaje ključev',
    type: 'website',
  },
}

export default function EKljucLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
