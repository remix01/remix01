// Service Worker for LiftGo PWA

const CACHE_NAME = 'liftgo-cache-v1'
const RUNTIME_CACHE = 'liftgo-runtime-v1'

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install event: cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache failed:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event: network-first strategy for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls — always fetch fresh
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE)
            cache.then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // For navigation and assets: network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(RUNTIME_CACHE)
          cache.then((c) => c.put(request, response.clone()))
        }
        return response
      })
      .catch(() => {
        return caches.match(request) || caches.match('/')
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Novo obvestilo',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'liftgo-notification',
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification('LiftGo', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Background sync (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/api/sync', { method: 'POST' }).catch(() => {
        console.warn('[SW] Background sync failed')
      })
    )
  }
})
