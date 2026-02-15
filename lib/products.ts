export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
  features: string[]
}

// This is the source of truth for all products.
// All UI to display products should pull from this array.
// IDs passed to the checkout session should be the same as IDs from this array.
export const PRODUCTS: Product[] = [
  {
    id: 'start-package',
    name: 'START Paket',
    description: 'Brezplačen vstop v platformo LiftGO',
    priceInCents: 0, // Free
    features: [
      'Brezplačna registracija',
      '10% provizija po zaključku',
      'Osnovna vidnost',
      'Email podpora',
    ],
  },
  {
    id: 'pro-package',
    name: 'PRO Paket',
    description: 'Več naročil, nižja provizija, prioritetna vidnost',
    priceInCents: 4900, // €49.00 per month
    features: [
      'Samo 5% provizija',
      'Prioritetna vidnost',
      '3x več povpraševanj',
      'Prednostna podpora 24/7',
      'Analitika v realnem času',
    ],
  },
]
