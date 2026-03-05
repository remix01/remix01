// Service Worker for LiftGO with Workbox caching strategies
// Import Workbox from CDN (no build step needed)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js')

// CRITICAL: prevent page reload when coming back online - this prevents losing form data
workbox.core.skipWaiting()
workbox.core.clientsClaim()
workbox.navigationPreload.enable()

const { registerRoute } = workbox.routing
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies
const { ExpirationPlugin } = workbox.expiration
const { Queue } = workbox.backgroundSync

// ─── 1. CACHE FIRST — Static assets (JS, CSS, fonts, icons) ────────────────
registerRoute(
  ({ request }) => 
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'liftgo-static-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      })
    ]
  })
)

// ─── 2. STALE WHILE REVALIDATE — API lists ─────────────────────────────────
registerRoute(
  ({ url }) => 
    url.pathname.startsWith('/api/categories') ||
    url.pathname.startsWith('/api/search') ||
    url.pathname.startsWith('/api/obrtniki'),
  new StaleWhileRevalidate({
    cacheName: 'liftgo-api-lists-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      })
    ]
  })
)

// ─── 3. NETWORK FIRST — Critical user data ──────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/profile') ||
    url.pathname.startsWith('/api/povprasevanje') ||
    url.pathname.startsWith('/api/partner'),
  new NetworkFirst({
    cacheName: 'liftgo-user-data-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60, // 1 minute fallback
      })
    ]
  })
)

// ─── 4. BACKGROUND SYNC — Queue failed povprasevanje submissions ────────────
const bgSyncQueue = new Queue('liftgo-povprasevanje-queue', {
  maxRetentionTime: 24 * 60, // 24 hours
  onSync: async ({ queue }) => {
    let entry
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request)
        console.log('[SW] Background sync: request replayed successfully')
      } catch (error) {
        await queue.unshiftRequest(entry)
        throw error
      }
    }
  }
})

// Intercept failed POST to /api/povprasevanje/public
self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('/api/povprasevanje/public') &&
    event.request.method === 'POST'
  ) {
    const bgSyncLogic = async () => {
      try {
        return await fetch(event.request.clone())
      } catch (error) {
        await bgSyncQueue.pushRequest({ request: event.request.clone() })
        return new Response(
          JSON.stringify({ 
            success: true, 
            offline: true,
            message: 'Povpraševanje shranjeno. Poslalo se bo samodejno, ko bo vzpostavljena povezava.' 
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    event.respondWith(bgSyncLogic())
  }
})

// ─── 5. OFFLINE FALLBACK for page navigation ────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html').then(r => r || new Response('Offline', { status: 503 }))
      )
    )
  }
})

// ─── 6. PRECACHE key pages ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open('liftgo-precache-v1').then((cache) =>
      cache.addAll([
        '/',
        '/offline.html',
        '/cenik',
        '/kako-deluje',
        '/prijava',
      ])
    )
  )
  self.skipWaiting()
})

// ─── 7. CLEANUP old cache versions ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith('liftgo-') && name !== 'liftgo-precache-v1')
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})
