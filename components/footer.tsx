'use client'

import Link from "next/link"
import { Mail, MapPin, Globe } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const footerLinks = {
  Storitve: [
    { label: "Gradnja & adaptacije", href: "/search?storitev=Gradnja+%26+adaptacije" },
    { label: "Vodovod & ogrevanje", href: "/search?storitev=Vodovod+%26+ogrevanje" },
    { label: "Elektrika & pametni sistemi", href: "/search?storitev=Elektrika+%26+pametni+sistemi" },
    { label: "Mizarstvo & kovinarstvo", href: "/search?storitev=Mizarstvo+%26+kovinarstvo" },
    { label: "Zaključna dela", href: "/search?storitev=Zaklju%C4%8Dna+dela" },
    { label: "Okolica & zunanja ureditev", href: "/search?storitev=Okolica+%26+zunanja+ureditev" },
  ],
  "Za obrtnike": [
    { label: "Cenik za obrtnike", href: "/cenik" },
    { label: "Postanite partner", href: "/partner-auth/sign-up" },
    { label: "Prijava za partnerje", href: "/partner-auth/login" },
    { label: "Nadzorna plošča", href: "/partner-dashboard", requiresAuth: true },
  ],
  Podjetje: [
    { label: "O nas", href: "/about" },
    { label: "Kariera (kmalu)", href: "", disabled: true },
    { label: "Blog (kmalu)", href: "", disabled: true },
    { label: "Kontakt", href: "/contact" },
  ],
  Podpora: [
    { label: "Orodja za lastnike", href: "/orodja" },
    { label: "Video Diagnoza", href: "/#video-diagnoza" },
    { label: "E-Ključ", href: "/e-kljuc" },
    { label: "Pogosta vprašanja", href: "/faq" },
    { label: "Pomoč", href: "/contact" },
    { label: "Pogoji uporabe", href: "/terms" },
    { label: "Zasebnost", href: "/privacy" },
  ],
}

export function Footer() {
  const router = useRouter()

  const handleProtectedLinkClick = async (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      router.push(href)
    } else {
      router.push('/partner-auth/login')
    }
  }

  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand & company info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">L</span>
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Lift<span className="text-primary">GO</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tvoj lokalni mojster, takoj pri roki. Povezujemo vas z zanesljivimi
              obrtniki po vsej Sloveniji.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col">
                  <span>Liftgo d.o.o.</span>
                  <span>Kuraltova ulica 12</span>
                  <span>4208 Šenčur</span>
                  <span>Matična št.: 9724346000</span>
                  <span>ID za DDV: SI24728381</span>
                </div>
              </div>
              <a
                href="mailto:info@liftgo.net"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                info@liftgo.net
              </a>
              <a
                href="https://liftgo.net"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Globe className="h-4 w-4 shrink-0 text-primary" />
                liftgo.net
              </a>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Liftgo d.o.o. Vse pravice pridržane.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.disabled ? (
                      <span
                        className="text-sm cursor-not-allowed py-1"
                        style={{ color: '#9ca3af' }}
                      >
                        {link.label}
                      </span>
                    ) : link.href.startsWith('mailto:') ? (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground inline-block py-1"
                      >
                        {link.label}
                      </a>
                    ) : link.requiresAuth ? (
                      <a
                        href={link.href}
                        onClick={(e) => handleProtectedLinkClick(e, link.href)}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer inline-block py-1"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground inline-block py-1"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
