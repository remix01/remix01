'use client'

import Link from "next/link"
import { Mail, MapPin, Globe } from "lucide-react"
import { BrandLogo } from "@/components/layout/BrandLogo"
import { ProtectedNavLink } from "@/components/navigation/ProtectedNavLink"
import { FOOTER_SECTIONS } from "@/components/navigation/config"

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand & company info */}
          <div className="lg:col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tvoj lokalni mojster, takoj pri roki. Povezujemo vas z zanesljivimi
              obrtniki po vsej Sloveniji.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col">
                  <span>Liftgo d.o.o.</span>
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
          {FOOTER_SECTIONS.map(({ title, links }) => (
            <div key={title}>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.disabled ? (
                      <span className="text-sm py-1 text-muted-foreground/60 cursor-not-allowed">
                        {link.label}
                      </span>
                    ) : link.requiresAuth ? (
                      <ProtectedNavLink
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer inline-block py-1"
                      >
                        {link.label}
                      </ProtectedNavLink>
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
