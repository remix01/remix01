‘use client’
// components/ServiceWorkerRegistration.tsx
// Registracija Service Workerja v Next.js App Router
// Dodaj <ServiceWorkerRegistration /> v app/layout.tsx → <body>

import { useEffect } from ‘react’

export default function ServiceWorkerRegistration() {
useEffect(() => {
if (typeof window === ‘undefined’) return
if (!(‘serviceWorker’ in navigator)) {
console.warn(’[SW] Service Worker ni podprt v tem brskalniku’)
return
}

```
const registerSW = async () => {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      // updateViaCache: 'none' → vedno preveri za novo verzijo SW
      updateViaCache: 'none',
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
          // Nova verzija PWA je na voljo
          // Tukaj lahko pokažeš toast/banner "Posodobitev na voljo"
          console.log('[SW] Nova verzija na voljo — reload za posodobitev')

          // Opcijsko: avtomatski reload
          // window.location.reload()

          // Priporočeno: pokaži UI obvestilo
          if (window.__liftgo_onSwUpdate) {
            window.__liftgo_onSwUpdate()
          }
        }
      })
    })

    // Preveri za posodobitve vsakih 60 sekund (ko je tab aktiven)
    setInterval(() => {
      registration.update().catch(console.error)
    }, 60 * 1000)

  } catch (error) {
    console.error('[SW] Registracija neuspešna:', error)
  }
}

// Registriraj po page load da ne blokira critical path
if (document.readyState === 'complete') {
  registerSW()
} else {
  window.addEventListener('load', registerSW)
  return () => window.removeEventListener('load', registerSW)
}
```

}, [])

// Registracija push obvestil
useEffect(() => {
if (!(‘Notification’ in window)) return
if (!(‘PushManager’ in window)) return

```
// Samo če user že da dovoljenje — ne sprašuj avtomatsko!
if (Notification.permission === 'granted') {
  subscribeToPush()
}
```

}, [])

return null  // Ta komponenta ne renderira ničesar
}

// ─── PUSH SUBSCRIPTION ────────────────────────────────────────────────────
async function subscribeToPush() {
try {
const registration = await navigator.serviceWorker.ready

```
const existingSubscription = await registration.pushManager.getSubscription()
if (existingSubscription) return  // Že naročen

// VAPID public key — nastavi v .env.local
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
if (!vapidPublicKey) {
  console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY ni nastavljen')
  return
}

const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
})

// Pošlji subscription na server
await fetch('/api/push/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(subscription),
})

console.log('[Push] Naročnina uspešna')
```

} catch (error) {
console.error(’[Push] Napaka pri naročnini:’, error)
}
}

// Pomočna funkcija za VAPID ključ
function urlBase64ToUint8Array(base64String: string): Uint8Array {
const padding = ‘=’.repeat((4 - (base64String.length % 4)) % 4)
const base64 = (base64String + padding).replace(/-/g, ‘+’).replace(/_/g, ‘/’)
const rawData = window.atob(base64)
return Uint8Array.from([…rawData].map((char) => char.charCodeAt(0)))
}

// Type za globalni callback
declare global {
interface Window {
__liftgo_onSwUpdate?: () => void
}
}
