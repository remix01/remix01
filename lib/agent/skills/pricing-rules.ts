export const PRICING_BENCHMARKS: Record<string, {
  minHourly: number
  maxHourly: number  
  currency: 'EUR'
  notes: string
}> = {
  'vodovodna-dela': { 
    minHourly: 35, maxHourly: 65, currency: 'EUR',
    notes: 'Vključuje standardno orodje' 
  },
  'elektrika': { 
    minHourly: 40, maxHourly: 75, currency: 'EUR',
    notes: 'Certificiran električar' 
  },
  'slikopleskarstvo': { 
    minHourly: 25, maxHourly: 45, currency: 'EUR',
    notes: 'Brez materiala' 
  },
  'tesarstvo': { 
    minHourly: 35, maxHourly: 60, currency: 'EUR',
    notes: 'Odvisno od zahtevnosti' 
  },
  'ogrevanje-klima': { 
    minHourly: 45, maxHourly: 80, currency: 'EUR',
    notes: 'Servis ali montaža' 
  },
  'selitev': { 
    minHourly: 20, maxHourly: 40, currency: 'EUR',
    notes: 'Po osebi na uro' 
  },
  'ciscenje': { 
    minHourly: 15, maxHourly: 30, currency: 'EUR',
    notes: 'Generalno čiščenje' 
  },
  'stresna-dela': { 
    minHourly: 40, maxHourly: 70, currency: 'EUR',
    notes: 'Odvisno od dostopa' 
  },
  'keramika': { 
    minHourly: 30, maxHourly: 55, currency: 'EUR',
    notes: 'Brez materiala' 
  },
  'default': { 
    minHourly: 25, maxHourly: 60, currency: 'EUR',
    notes: 'Splošna ocena' 
  }
}

export function getPricingForCategory(slug: string): {
  minHourly: number
  maxHourly: number
  withWeekendSurcharge: { min: number, max: number }
  withUrgentSurcharge: { min: number, max: number }
} {
  const base = PRICING_BENCHMARKS[slug] || PRICING_BENCHMARKS['default']
  return {
    minHourly: base.minHourly,
    maxHourly: base.maxHourly,
    withWeekendSurcharge: {
      min: Math.round(base.minHourly * 1.25),
      max: Math.round(base.maxHourly * 1.25)
    },
    withUrgentSurcharge: {
      min: Math.round(base.minHourly * 1.15),
      max: Math.round(base.maxHourly * 1.15)
    }
  }
}
