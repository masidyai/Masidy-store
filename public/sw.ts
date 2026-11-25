/// <reference lib="webworker" />

const CACHE_NAME = 'masidy-v1'
const urlsToCache = [
  '/',
  '/search',
  '/product',
  '/account',
  '/offline.html',
]

// Install: Cache core assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(urlsToCache)
      self.skipWaiting()
    })(),
  )
})

// Activate: Clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
      self.clients.claim()
    })(),
  )
})

// Fetch: Network first, fallback to cache
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls - network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'application/json' }),
        })
      }),
    )
    return
  }

  // Network first for HTML pages
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME)
            cache.then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/offline.html')
          })
        }),
    )
    return
  }

  // Cache first for assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request)
    }),
  )
})

// Handle messages from client
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
