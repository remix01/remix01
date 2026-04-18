import type { Metadata } from 'next'
import MojstriCatalogPage from '@/app/(public)/mojstri/page'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Katalog mojstrov | LiftGO',
  description: 'Odkrijte preverjene mojstre in obrtnika blizu vas. Primerjajte ocene, cene in storitve.',
  keywords: 'mojstri, obrtniki, storitve, Ljubljana, Slovenija',
  openGraph: {
    title: 'Katalog mojstrov | LiftGO',
    description: 'Odkrijte preverjene mojstre in obrtnika blizu vas.',
    type: 'website',
    locale: 'sl_SI',
    siteName: 'LiftGO',
  },
}

export default MojstriCatalogPage
