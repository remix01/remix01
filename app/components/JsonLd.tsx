// Generic component for all JSON-LD types
// This must be a Server Component to avoid hydration mismatches with dangerouslySetInnerHTML
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
