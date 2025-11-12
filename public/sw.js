const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `ai-nav-static-${CACHE_VERSION}`,
  mapbox: `ai-nav-mapbox-${CACHE_VERSION}`,
  tiles: `ai-nav-tiles-${CACHE_VERSION}`,
  routes: `ai-nav-routes-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return Object.values(CACHE_NAMES).indexOf(name) === -1;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === 'https://api.mapbox.com') {
    event.respondWith(handleMapboxRequest(request));
  } else if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleMapboxRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.includes('/styles/') || 
      url.pathname.includes('/sprites/') || 
      url.pathname.includes('/fonts/')) {
    const cacheName = CACHE_NAMES.mapbox;
    const req = new Request(request);
    const cachedResponse = await caches.match(req);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', url.pathname);
      return cachedResponse;
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(req, response.clone());
      }
      return response;
    } catch (error) {
      console.error('[SW] Fetch failed for Mapbox resource:', error);
      return new Response('Offline', { status: 503 });
    }
  }

  if (url.pathname.includes('/v4/') && url.pathname.includes('.vector.pbf')) {
    const cacheName = CACHE_NAMES.tiles;
    const req = new Request(request);
    const cachedResponse = await caches.match(req);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(cacheName);
        cache.put(req, response.clone());
      }
      return response;
    } catch (error) {
      console.error('[SW] Tile fetch failed');
      return cachedResponse || new Response('Offline', { status: 503 });
    }
  }

  return fetch(request);
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.static);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

const activePrefetches = new Map();

self.addEventListener('message', async (event) => {
  if (!event.origin.startsWith('http')) {
    console.warn('[SW] Rejected message from invalid origin:', event.origin);
    return;
  }

  const { type, payload } = event.data;

  if (type === 'PREFETCH_TILES') {
    await prefetchTiles(payload.tiles, payload.clientId, payload.sessionId);
  }

  if (type === 'ABORT_PREFETCH') {
    const state = activePrefetches.get(payload.sessionId);
    if (state) {
      state.aborted = true;
      notifyClient(state.clientId, {
        type: 'PREFETCH_FAILED',
        payload: { error: 'Download cancelled by user' },
      });
      activePrefetches.delete(payload.sessionId);
    }
  }

  if (type === 'CLEAR_CACHE') {
    const allowedCaches = Object.keys(CACHE_NAMES);
    if (!allowedCaches.includes(payload.cacheName)) {
      console.warn('[SW] Rejected arbitrary cache clear:', payload.cacheName);
      return;
    }
    await clearNamedCache(payload.cacheName);
  }

  if (type === 'GET_CACHE_SIZE') {
    const size = await getCacheSize();
    event.ports[0].postMessage({ size });
  }
});

async function prefetchTiles(tileUrls, clientId, sessionId) {
  const state = {
    aborted: false,
    clientId,
  };
  activePrefetches.set(sessionId, state);

  const cache = await caches.open(CACHE_NAMES.tiles);
  const BATCH_SIZE = 50;
  
  let cached = 0;
  let bytesDownloaded = 0;
  const total = tileUrls.length;

  for (let i = 0; i < tileUrls.length; i += BATCH_SIZE) {
    if (state.aborted) {
      activePrefetches.delete(sessionId);
      return;
    }

    const batch = tileUrls.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (tileUrl) => {
        if (state.aborted) {
          return { success: false };
        }

        try {
          const request = new Request(tileUrl);
          const response = await fetch(request);
          
          if (response.ok) {
            const clonedResponse = response.clone();
            const blob = await response.blob();
            bytesDownloaded += blob.size;
            
            await cache.put(request, clonedResponse);
            return { success: true, bytes: blob.size };
          }
          return { success: false };
        } catch (error) {
          console.error('[SW] Failed to cache tile:', tileUrl, error);
          return { success: false };
        }
      })
    );

    cached += results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    notifyClient(clientId, {
      type: 'PREFETCH_PROGRESS',
      payload: { cached, total, bytesDownloaded },
    });
  }

  if (!state.aborted) {
    notifyClient(clientId, {
      type: 'PREFETCH_COMPLETE',
      payload: { cached, total, bytesDownloaded },
    });
  }

  activePrefetches.delete(sessionId);
}

async function clearNamedCache(cacheName) {
  const targetCache = CACHE_NAMES[cacheName];
  if (targetCache) {
    await caches.delete(targetCache);
    
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_CLEARED',
          payload: { cacheName: targetCache },
        });
      });
    });
  }
}

function notifyClient(clientId, message) {
  self.clients.matchAll().then((clients) => {
    const targetClient = clientId 
      ? clients.find(c => c.id === clientId)
      : null;
    
    if (targetClient) {
      targetClient.postMessage(message);
    } else {
      clients.forEach((client) => {
        client.postMessage(message);
      });
    }
  });
}

async function getCacheSize() {
  let totalSize = 0;
  
  for (const cacheName of Object.values(CACHE_NAMES)) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}
