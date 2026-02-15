import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Orodja za lastnike | Kalkulator cene del | LiftGO',
  description: 'Brezplačni kalkulatorji in orodja za oceno stroškov vzdrževanja doma. Izračunajte ceno vodovodnih del, elektrike, pleskanja, keramike in drugih obrtniških storitev v Sloveniji.',
  keywords: 'kalkulator cene, ocena stroškov, vzdrževanje doma, obrtniške storitve, Slovenija, vodovodna dela, električna dela, pleskanje, keramika',
  openGraph: {
    title: 'Orodja za lastnike nepremičnin | LiftGO',
    description: 'Brezplačni kalkulatorji in orodja za oceno stroškov vzdrževanja doma.',
    url: 'https://liftgo.net/orodja',
    siteName: 'LiftGO',
    locale: 'sl_SI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Orodja za lastnike nepremičnin | LiftGO',
    description: 'Brezplačni kalkulatorji in orodja za oceno stroškov vzdrževanja doma.',
  },
}

export default function OrodjaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
