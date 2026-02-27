'use client'
// components/liftgo/ServiceWorkerRegistration.tsx

import { useEffect } from 'react'

// FIX 1: layout.tsx importa { ServiceWorkerRegistration } — named export,
// ampak ta datoteka ima "export default". Spremenimo v named export.
export function ServiceWorkerRegistration() {
  // ─── Service Worker registracija ────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Worker ni podprt v tem brskalniku')
      return
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Vedno preveri za novo verzijo SW
        })

        console.log('[SW] Registriran:', registration.scope)

        // Posluša za posodobitve
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[SW] Nova verzija na voljo — reload za posodobitev')
              if (window.__liftgo_onSwUpdate) {
                window.__liftgo_onSwUpdate()
              }
            }
          })
        })

        // Preveri za posodobitve vsakih 60 sekund ko je tab aktiven
        const updateInterval = setInterval(() => {
          registration.update().catch(console.error)
        }, 60 * 1000)

        // FIX 2: Cleanup interval ob unmount
        return () => clearInterval(updateInterval)

      } catch (error) {
        console.error('[SW] Registracija neuspešna:', error)
      }
    }

    let cleanup: (() => void) | undefined

    if (document.readyState === 'complete') {
      registerSW().then(c => { cleanup = c })
    } else {
      const onLoad = () => { registerSW().then(c => { cleanup = c }) }
      window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }

    return () => cleanup?.()
  }, [])

  // ─── Push obvestila ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (!('PushManager' in window)) return

    // Samo če user je že dal dovoljenje — nikoli ne sprašuj avtomatsko!
    if (Notification.permission === 'granted') {
      subscribeToPush()
    }
  }, [])

  return null
}

// ─── PUSH SUBSCRIPTION ──────────────────────────────────────────────────────
async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready

    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) return // Že naročen

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY ni nastavljen v .env.local')
      return
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })

    console.log('[Push] Naročnina uspešna')
  } catch (error) {
    console.error('[Push] Napaka pri naročnini:', error)
  }
}

// ─── VAPID helper ────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  // FIX 3: spread operator [...rawData] je povzročal TS napake v nekaterih
  // konfiguracijah — Array.from je bolj zanesljiv
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)))
}

// ─── Global type ─────────────────────────────────────────────────────────────
declare global {
  interface Window {
    __liftgo_onSwUpdate?: () => void
  }
}