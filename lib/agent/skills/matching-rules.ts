export const MATCHING_RULES = {
  // Location scoring
  location: {
    sameCity: 40,          // +40 points if same city
    sameRegion: 20,        // +20 points if same region
    differentRegion: 0     // no location bonus
  },
  
  // Rating scoring  
  rating: {
    above4_5: 30,          // +30 points
    above4_0: 20,          // +20 points
    above3_5: 10,          // +10 points
    below3_5: -20          // penalty
  },
  
  // Response time scoring
  responseTime: {
    under1hour: 20,        // +20 points
    under4hours: 10,       // +10 points
    under24hours: 5,       // +5 points
    over24hours: -10       // penalty
  },
  
  // Urgency rules
  urgency: {
    nujno: {
      minResponseTimeHours: 2,    // only show obrtniki with <2h response
      locationBonus: 20           // extra bonus for same city when urgent
    },
    kmalu: {
      minResponseTimeHours: 24
    },
    normalno: {
      minResponseTimeHours: 48
    }
  },
  
  // Weekend surcharge
  pricing: {
    weekendSurcharge: 0.25,       // +25% on weekends
    urgentSurcharge: 0.15,        // +15% for urgent
    normalRate: 1.0
  },
  
  // Minimum requirements to appear in results
  minimumRequirements: {
    minRating: 3.0,
    mustBeVerified: true,
    mustBeAvailable: true
  }
} as const

export const AGENT_INSTRUCTIONS = `
Ti si LiftGO AI agent za Slovenijo. Upoštevaj ta pravila:

MATCHMAKING PRAVILA:
- Verificirani obrtniki imajo prednost pred neverificiranimi
- Če je nujnost "nujno", prikaži SAMO obrtnike z odzivnim časom < 2 uri
- Lokacija je ključna — vedno daj prednost obrtniku v istem mestu
- Ne priporočaj obrtnikov z oceno pod 3.0
- Maksimalno 3 priporočila na povpraševanje

CENOVANJE:
- Vikend dela: +25% na osnovno ceno
- Nujna dela: +15% na osnovno ceno
- Cene so okvirne in niso zavezujoče

KOMUNIKACIJA:
- Vedno komuniciraj v slovenščini
- Bodi kratek in jasen
- Ne obljubljaj česar ne moreš zagotoviti
` as const
