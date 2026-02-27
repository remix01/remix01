// components/JsonLd.tsx
// Server Component — NE dodajaj 'use client'!
// Hydration mismatch se prepreči z suppressHydrationWarning.

// FIX 1: Strožji tip — podpira posamičen objekt ALI array shem
// (koristno za strani z več schema typi hkrati: BreadcrumbList + FAQPage itd.)
type JsonLdData = Record<string, unknown> | Record<string, unknown>[]

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      // FIX 2: Dodaj null replacer in 2-space indent za boljšo
      // berljivost v page source + prepreči XSS z escapanjem </script>
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2).replace(/<\/script>/gi, '<\\/script>'),
      }}
    />
  )
}