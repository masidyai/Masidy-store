/// <reference lib="webworker" />

const CACHE_VERSION = 'v1'
const CACHE_NAMES = {
  PRECACHE: `masidy-precache-${CACHE_VERSION}`,
  RUNTIME: `masidy-runtime-${CACHE_VERSION}`,
  IMAGES: `masidy-images-${CACHE_VERSION}`,
}

// Assets to cache on install
const PRECACHE_ASSETS = ['/', '/offline.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.PRECACHE)
      await cache.addAll(PRECACHE_ASSETS)
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.map((key) => {
          if (!Object.values(CACHE_NAMES).includes(key)) {
            return caches.delete(key)
          }
        }),
      )
      self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') return

  // Skip API calls - network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
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
            const cache = caches.open(CACHE_NAMES.RUNTIME)
            cache.then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match('/offline.html')
        }),
    )
    return
  }

  // Cache first for images
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const cache = caches.open(CACHE_NAMES.IMAGES)
              cache.then((c) => c.put(request, response.clone()))
            }
            return response
          })
        )
      }),
    )
    return
  }

  // Cache first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request)
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
