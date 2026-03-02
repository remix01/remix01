// Service Worker for LiftGO
// Provides offline support and caching strategies

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Passthrough - no offline caching for now
  // Can be extended with caching strategies later
  if (event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline - please check your connection', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    })
  )
})
