import { Navbar } from '@/components/navbar'
import { Hero } from '@/components/hero'
import { Stats } from '@/components/stats'
import { OfferPreview } from '@/components/offer-preview'
import { CaseStudies } from '@/components/case-studies'
import { Categories } from '@/components/categories'
import { BlogPreview } from '@/components/blog-preview'
import { HowItWorks } from '@/components/how-it-works'
import { Features } from '@/components/features'
import { Testimonials } from '@/components/testimonials'
import { CTA } from '@/components/cta'
import { Footer } from '@/components/footer'
import { VideoDiagnozaButton } from '@/components/video-diagnoza-button'
import { JsonLd } from '@/app/components/JsonLd'

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "LiftGO",
  "url": "https://www.liftgo.net",
  "description": "Poveži se s najboljšimi obrtniki in storitvami v tvoji bližini",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.liftgo.net/{query}"
    },
    "query-input": "required name=query"
  }
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "LiftGO",
  "url": "https://www.liftgo.net",
  "logo": "https://www.liftgo.net/logo.png",
  "description": "Digitalna platforma, ki povezuje stranke z obrtniki in ponudniki storitev.",
  "sameAs": [
    "https://www.facebook.com/liftgo",
    "https://www.instagram.com/liftgo"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@liftgo.net"
  }
}

export default function Home() {
  return (
    <>
      <JsonLd schema={websiteSchema} />
      <JsonLd schema={organizationSchema} />
      <Navbar />
      <main>
        <Hero />
        <VideoDiagnozaButton />
        <OfferPreview />
        <Stats />
        <Categories />
        <CaseStudies />
        <HowItWorks />
        <Features />
        <BlogPreview />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
