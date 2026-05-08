"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`
}

// Push via dataLayer so the update is queued even before gtag.js loads.
// gtag() is a thin wrapper around dataLayer.push — calling it directly
// would silently no-op if the script hasn't initialized yet.
function updateGtagConsent(granted: boolean) {
  if (typeof window === "undefined") return
  const value = granted ? "granted" : "denied"
  ;(window as any).dataLayer = (window as any).dataLayer || []
  ;(window as any).dataLayer.push(["consent", "update", {
    analytics_storage: value,
    ad_storage: value,
  }])
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
      // Returning visitor: re-apply stored consent so GA isn't left denied
      // for the entire page load. Queued via dataLayer, so this is safe
      // even if gtag.js hasn't initialized yet.
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
