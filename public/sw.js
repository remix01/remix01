// public/sw.js
// Service Worker za liftgo.net PWA
// Pokriva: offline cache, background sync, push obvestila
//
// PRIPOROČILO: Za produkcijo uporabi next-pwa paket:
//   npm install next-pwa
//   → Avtomatično generira optimiziran SW z Workbox
//
// Ta datoteka je manual fallback ali za razumevanje logike.

const CACHE_VERSION = 'v2'
const CACHE_STATIC = `liftgo-static-${CACHE_VERSION}`
const CACHE_DYNAMIC = `liftgo-dynamic-${CACHE_VERSION}`
const CACHE_IMAGES = `liftgo-images-${CACHE_VERSION}`

// Datoteke ki se cachirajo ob instalaciji (app shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline',                // /offline page — ustvari app/offline/page.tsx
]

// ─── INSTALL ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Takoj prevzame kontrolo brez čakanja na reload
  self.skipWaiting()
})

// ─── ACTIVATE ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Izbriši stare verzije cache
            return (
              name.startsWith('liftgo-') &&
              name !== CACHE_STATIC &&
              name !== CACHE_DYNAMIC &&
              name !== CACHE_IMAGES
            )
          })
          .map((name) => caches.delete(name))
      )
    })
  )
  // Takoj prevzame vse odprte tabs
  self.clients.claim()
})

// ─── FETCH STRATEGIJE ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Preskoči non-GET requeste (POST, PUT...)
  if (request.method !== 'GET') return

  // Preskoči browser-extensions in non-http
  if (!url.protocol.startsWith('http')) return

  // Preskoči Next.js HMR in development
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // 1. Next.js statični assets → Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, CACHE_STATIC))
    return
  }

  // 2. Slike → Cache First z dolgim TTL
  if (
    request.destination === 'image' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES))
    return
  }

  // 3. API klici → Network Only (nikoli ne cachiramo API odgovorov)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request))
    return
  }

  // 4. HTML strani → Network First (svežina) z offline fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // 5. Ostalo → Network First
  event.respondWith(networkFirst(request, CACHE_DYNAMIC))
})

// ─── CACHE STRATEGIJE ─────────────────────────────────────────────────────

// Cache First: najprej iz cache, nato mreža
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Network First: najprej mreža, fallback na cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}

// Network First za HTML z offline page fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_DYNAMIC)
    cache.put(request, response.clone())
    return response
  } catch {
    const cache = await caches.open(CACHE_DYNAMIC)
    const cached = await cache.match(request)
    if (cached) return cached

    // Vrni /offline stran kot fallback
    const offlineCache = await caches.open(CACHE_STATIC)
    return offlineCache.match('/offline') || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// Network Only: brez cachiranja
async function networkOnly(request) {
  return fetch(request)
}

// ─── PUSH OBVESTILA ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'LiftGo', body: event.data.text() }
  }

  const options = {
    body: data.body || 'Nova obvestila za vas',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',   // Monochrome ikona za status bar
    image: data.image || null,          // Velika slika v obvestilu
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Odpri',
        icon: '/icons/action-open.png',
      },
      {
        action: 'close',
        title: 'Zapri',
        icon: '/icons/action-close.png',
      },
    ],
    // Prepreči duplicirana obvestila
    tag: data.tag || 'liftgo-notification',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LiftGo', options)
  )
})

// Klik na obvestilo
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  if (event.action === 'close') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Če je app že odprta, jo fokusiraj
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      // Drugače odpri novo okno
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────
// Za retry failed API klicov ko se vrne internet
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncPendingOrders())
  }
})

async function syncPendingOrders() {
  // Implementiraj po potrebi — pošlji cached naročila na server
  console.log('[SW] Background sync: orders')
}

// ─── PERIODIC BACKGROUND SYNC ─────────────────────────────────────────────
// Osveži vsebino v ozadju (zahteva user engagement)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(updateCache())
  }
})

async function updateCache() {
  const cache = await caches.open(CACHE_DYNAMIC)
  // Osveži ključne strani
  await cache.add('/')
}