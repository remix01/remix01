"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const scrollToForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setIsOpen(false)
    const el = document.getElementById("oddaj-povprasevanje")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" ref={mobileMenuRef}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Lift<span className="text-primary">GO</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center">
              Domov
            </Link>
            <Link href="/kako-deluje" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center">
              Kako deluje
            </Link>
            <Link href="/orodja" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center">
              Orodja
            </Link>
            <Link href="/e-kljuc" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground min-h-[44px] flex items-center">
              E-Ključ
            </Link>
            <Link href="/za-obrtnike" className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 min-h-[44px] flex items-center">
              Za obrtnike
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden gap-3 lg:flex">
            <Button variant="outline" asChild className="min-h-[48px]">
              <Link href="/prijava">Prijava</Link>
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
            {isOpen ? (
              <X className="h-6 w-6 transition-transform" />
            ) : (
              <Menu className="h-6 w-6 transition-transform" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`overflow-hidden border-t transition-all duration-200 ease-out lg:hidden ${
            isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-t-0'
          }`}
        >
          <div className="flex flex-col gap-4 px-4 py-4">
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)} 
              className="text-sm font-medium text-foreground transition-colors hover:text-primary min-h-[44px] flex items-center"
            >
              Domov
            </Link>
            <Link 
              href="/kako-deluje" 
              onClick={() => setIsOpen(false)} 
              className="text-sm font-medium text-foreground transition-colors hover:text-primary min-h-[44px] flex items-center"
            >
              Kako deluje
            </Link>
            <Link 
              href="/orodja" 
              onClick={() => setIsOpen(false)} 
              className="text-sm font-medium text-foreground transition-colors hover:text-primary min-h-[44px] flex items-center"
            >
              Orodja
            </Link>
            <Link 
              href="/e-kljuc" 
              onClick={() => setIsOpen(false)} 
              className="text-sm font-medium text-foreground transition-colors hover:text-primary min-h-[44px] flex items-center"
            >
              E-Ključ
            </Link>
            <Link 
              href="/za-obrtnike" 
              onClick={() => setIsOpen(false)} 
              className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 min-h-[44px] flex items-center"
            >
              Za obrtnike
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button variant="outline" size="lg" asChild className="w-full min-h-[48px]">
                <Link href="/prijava" onClick={() => setIsOpen(false)}>Prijava</Link>
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
