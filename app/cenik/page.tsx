import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PricingComparison } from "@/components/pricing-comparison"
import { PricingFAQ } from "@/components/pricing-faq"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cenik za obrtnike | LiftGO",
  description:
    "Enostavan cenik. Plačaš samo, ko zaslužiš. Brez vezav, brez drobnega tiska. START paket brezplačno, PRO za 29 EUR/mesec.",
}

export default function CenikPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <PricingComparison />
        <PricingFAQ />
      </main>
      <Footer />
    </div>
  )
}
