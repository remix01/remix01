"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { NotificationBellClient } from "@/components/liftgo/NotificationBellClient"
import { BrandLogo } from "@/components/layout/BrandLogo"
import { useDashboardPath } from "@/hooks/useDashboardPath"
import { NAV_LINKS } from "@/components/navigation/config"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const { userId, dashboardPath } = useDashboardPath()

  const scrollToForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsOpen(false)
    document.getElementById("oddaj-povprasevanje")?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  return (
    <nav
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      ref={mobileMenuRef}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <BrandLogo />

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.variant === 'primary'
                    ? 'text-sm font-semibold text-primary transition-colors hover:text-primary/80 min-h-[44px] flex items-center'
                    : 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden gap-3 lg:flex items-center">
            <NotificationBellClient userId={userId} />
            <Button variant="outline" asChild className="min-h-[48px]">
              <Link href={userId ? dashboardPath : "/prijava"}>
                {userId ? "Moj račun" : "Prijava"}
              </Link>
            </Button>
            <Button asChild className="min-h-[48px]">
              <a href="#oddaj-povprasevanje" onClick={scrollToForm}>
                Oddajte povprasevanje
              </a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-lg transition-colors hover:bg-accent lg:hidden"
            aria-label={isOpen ? "Zapri meni" : "Odpri meni"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`overflow-hidden border-t transition-all duration-200 ease-out lg:hidden ${
            isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
          }`}
        >
          <div className="flex flex-col gap-4 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={
                  link.variant === 'primary'
                    ? 'text-sm font-semibold text-primary transition-colors hover:text-primary/80 min-h-[44px] flex items-center'
                    : 'text-sm font-medium text-foreground transition-colors hover:text-primary min-h-[44px] flex items-center'
                }
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button variant="outline" size="lg" asChild className="w-full min-h-[48px]">
                <Link href={userId ? dashboardPath : "/prijava"} onClick={() => setIsOpen(false)}>
                  {userId ? "Moj račun" : "Prijava"}
                </Link>
              </Button>
              <Button size="lg" asChild className="w-full min-h-[48px]">
                <a href="#oddaj-povprasevanje" onClick={scrollToForm}>
                  Oddajte povpraševanje
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
