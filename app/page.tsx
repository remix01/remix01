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
import { JsonLd } from './components/JsonLd'

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "LiftGO",
  "url": "https://www.liftgo.net",
  "description": "Platforma za iskanje zanesljivih obrtnikov po vsej Sloveniji. Brezplačno povpraševanje, odziv v 24 urah.",
  "inLanguage": "sl-SI",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.liftgo.net/search?storitev={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}

const reviewsSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "LiftGO — Obrtniki v Sloveniji",
  "url": "https://www.liftgo.net",
  "image": "https://www.liftgo.net/images/hero-craftsman.jpg",
  "description": "Povežemo vas z zanesljivimi preverjenimi obrtniki po vsej Sloveniji v manj kot 24 urah.",
  "areaServed": {
    "@type": "Country",
    "name": "Slovenia"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "1200",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Matej Novak"
      },
      "reviewBody": "Mojster je prišel v obljubljenem času in delo je bilo opravljeno strokovno. Kopalnica izgleda kot nova.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "datePublished": "2026-01-15"
    },
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Janez Horvat"
      },
      "reviewBody": "Zamenjal sem več mojstrov, ampak od zdaj samo LiftGO. Mizar je prinesel kuhinjski načrt in montiral vse v 2 dneh.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "datePublished": "2025-12-10"
    }
  ]
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Kako deluje LiftGO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Oddajte brezplačno povpraševanje, mi pa vas povežemo s preverjenimi obrtniki v vaši okolici. Ponudbo prejmete v manj kot 24 urah."
      }
    },
    {
      "@type": "Question",
      "name": "Koliko stane iskanje mojstra prek LiftGO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Iskanje in oddaja povpraševanja je za stranke popolnoma brezplačna. Plačate samo opravljeno delo neposredno mojstru."
      }
    },
    {
      "@type": "Question",
      "name": "Ali so mojstri preverjeni?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vsak obrtnik na LiftGO gre skozi 4-stopenjski postopek preverjanja: identiteta, reference, zavarovanje odgovornosti in sprotno ocenjevanje strank."
      }
    },
    {
      "@type": "Question",
      "name": "Kako hitro dobim ponudbo?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Garantiramo odziv v manj kot 2 urah po oddaji povpraševanja. Povprečni odzivni čas je krajši od 24 ur."
      }
    }
  ]
}

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsSchema) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        suppressHydrationWarning
      />
      <Navbar />
      {/* FIX: Na mobilnih dodaj pb-20 da gumb ne prekriva vsebine, na md+ pa pb-0 */}
      <main className="flex-1 pb-20 sm:pb-0">
        <Hero />
        <Stats />
        <OfferPreview />
        <CaseStudies />
        <Categories />
        <BlogPreview />
        <HowItWorks />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      <VideoDiagnozaButton variant="floating" />
    </div>
  )
}
