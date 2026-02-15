"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem("liftgo-cookie-consent")
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("liftgo-cookie-consent", "accepted")
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem("liftgo-cookie-consent", "declined")
    setShowBanner(false)
  }

  if (!showBanner) return null

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
