"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

const CONSENT_COOKIE_NAME = "liftgo-cookie-consent"
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function getConsentCookie(): string | null {
  if (typeof document === "undefined") return null

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`))

  return cookie ? decodeURIComponent(cookie.split("=")[1] || "") : null
}

function setConsentCookie(value: "accepted" | "declined") {
  if (typeof document === "undefined") return

  // Secure atribut zagotovi, da se piškotek pošilja samo prek HTTPS
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax; Secure`
}

function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
  })
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    const consent = getConsentCookie()
    if (!consent) {
      setShowBanner(true)
    } else if (consent === "accepted") {
      // Vrneči obiskovalec: posodobi GA consent iz shranjenega piškotka
      updateGtagConsent(true)
    }
  }, [])

  const handleAccept = () => {
    setConsentCookie("accepted")
    updateGtagConsent(true)
    setShowBanner(false)
  }

  const handleDecline = () => {
    setConsentCookie("declined")
    updateGtagConsent(false)
    setShowBanner(false)
  }

  if (!isMounted || !showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-4 shadow-lg sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm text-foreground">
              <strong>Piškotki</strong> — Uporabljamo piškotke za izboljšanje vaše izkušnje.
              Nujni piškotki so potrebni za delovanje strani, ostali pa za analitiko in funkcionalnost.{" "}
              <Link href="/privacy" className="text-primary underline hover:no-underline">
                Preberite več
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="min-w-[100px]"
            >
              Zavrni
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="min-w-[100px]"
            >
              Sprejmi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
