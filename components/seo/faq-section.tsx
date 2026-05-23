import { generateFAQSchema } from '@/lib/seo/meta'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  categoryName: string
  categorySlug: string
  cityName?: string
  canonicalPath?: string
  items?: FAQItem[]
}

export function FAQSection({ categoryName, cityName, canonicalPath, items }: FAQSectionProps) {
  const faqs = items && items.length >= 3 ? items.slice(0, 5) : []
  const schema = generateFAQSchema(faqs, canonicalPath)

  if (faqs.length === 0) return null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Pogosta vprašanja</h2>
          <p className="text-center text-gray-600 mb-8">
            Odgovori za {categoryName.toLowerCase()} {cityName ? `v mestu ${cityName}` : 'po Sloveniji'}.
          </p>
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
