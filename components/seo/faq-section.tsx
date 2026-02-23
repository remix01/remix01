import { generateFAQSchema } from '@/lib/seo/meta'
import { getPricingForCategory } from '@/lib/agent/skills/pricing-rules'

interface FAQSectionProps {
  categoryName: string
  categorySlug: string
  cityName?: string
}

export function FAQSection({
  categoryName,
  categorySlug,
  cityName
}: FAQSectionProps) {
  // Get pricing for this category
  const pricing = getPricingForCategory(categorySlug)
  
  const location = cityName || 'Sloveniji'
  const locationWithPreposition = cityName ? 'v ' + cityName : 'po vsej Sloveniji'

  // Generate dynamic FAQs
  const faqs = [
    {
      question: 'Koliko stane ' + categoryName.toLowerCase() + ' ' + locationWithPreposition + '?',
      answer: 'Povprečna cena za ' + categoryName.toLowerCase() + ' je od €' + pricing.minHourly + 
              ' do €' + pricing.maxHourly + ' na uro. Končna cena je odvisna od obsega dela in zahtevnosti. ' +
              'Na LiftGO dobite brezplačne ponudbe od več preverjenih mojstrov in si izberete najboljšo ceno.'
    },
    {
      question: 'Kako hitro pride ' + categoryName.toLowerCase() + ' mojster?',
      answer: 'Na LiftGO se mojstri odzovejo v povprečju v 2 urah. Ponudbe prejmate hitro od preverjenih ' +
              'strokovnjakov ' + locationWithPreposition + ', ki so takoj dosegljivi.'
    },
    {
      question: 'Kako preveriti kakovost ' + categoryName.toLowerCase() + ' mojstra?',
      answer: 'Vsi mojstri na LiftGO so preverjeni — vidite lahko njihov profil, ocene strank, ' +
              'leta izkušenj in reference. Vsak mojster mora imeti dokaze o strokovnosti in zavarovanje.'
    },
    {
      question: 'Ali je povpraševanje brezplačno?',
      answer: 'Da, oddaja povpraševanja je popolnoma brezplačna. Ker jih obvežete samo, če se dogovorite ' +
              'z mojstrom, ki vam je poslal ponudbo.'
    }
  ]

  const schema = generateFAQSchema(faqs)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      
      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Pogosta vprašanja
          </h2>

          <div className="space-y-6">
            {faqs.map((item, i) => (
              <div key={i} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="font-semibold mb-3 text-lg">{item.question}</h3>
                <p className="text-gray-600 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
