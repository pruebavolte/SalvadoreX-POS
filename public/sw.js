// Service Worker para PWA - System International
// Version: 3.0.0 - Enhanced Offline Support (MDN Pattern)

const CACHE_NAME = 'SystemIntl-v3';
const OFFLINE_PAGE = '/offline.html';

// App Shell - Core files to cache on install
const APP_SHELL_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/si-icon-192.png',
  '/icons/si-icon-512.png',
  '/icons/si-icon-512-maskable.png',
  '/images/dashboard.png',
  '/images/dashboard1.png',
  '/images/mobile-pos.png',
  '/images/mobile-menu.png'
];

// Dynamic content paths to cache when fetched
const CACHEABLE_PATHS = [
  '/dashboard',
  '/dashboard/pos',
  '/dashboard/menu-digital',
  '/dashboard/inventory',
  '/dashboard/reports',
  '/dashboard/customers',
  '/dashboard/settings'
];

// ===== INSTALL EVENT - Cache App Shell =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v3.0.0...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Caching app shell files');
      
      // Cache app shell files
      await cache.addAll(APP_SHELL_FILES);
      
      console.log('[SW] App shell cached successfully');
      
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })()
  );
});

// ===== ACTIVATE EVENT - Clean Old Caches =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      // Take control of all clients immediately
      await self.clients.claim();
      console.log('[SW] Service Worker activated and controlling clients');
    })()
  );
});

// ===== FETCH EVENT - Serve from Cache with Network Fallback =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle share target separately
  if (url.pathname === '/share-target' && request.method === 'POST') {
    event.respondWith(handleShareTarget(request));
    return;
  }
  
  event.respondWith(
    (async () => {
      // Try to get from cache first
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        console.log(`[SW] Serving from cache: ${request.url}`);
        
        // For non-static resources, update cache in background
        if (!isStaticAsset(url.pathname)) {
          updateCacheInBackground(request);
        }
        
        return cachedResponse;
      }
      
      // Not in cache, try network
      console.log(`[SW] Fetching from network: ${request.url}`);
      
      try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          console.log(`[SW] Caching new resource: ${request.url}`);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        console.log(`[SW] Network failed for: ${request.url}`);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          console.log('[SW] Returning offline page');
          const offlinePage = await caches.match(OFFLINE_PAGE);
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        // Return a basic offline response for other requests
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// ===== HELPER FUNCTIONS =====

function isStaticAsset(pathname) {
  return pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|woff|woff2|ttf|eot)$/i) ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/images/') ||
         pathname === '/manifest.json';
}

async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - cache update is best-effort
  }
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-sales':
      event.waitUntil(syncPendingData('pendingSales', '/api/sales'));
      break;
    case 'sync-orders':
      event.waitUntil(syncPendingData('pendingOrders', '/api/orders'));
      break;
    case 'sync-data':
      event.waitUntil(syncAllPendingData());
      break;
  }
});

async function syncPendingData(storeName, apiEndpoint) {
  console.log(`[SW] Syncing ${storeName}...`);
  
  try {
    const db = await openDatabase();
    const pendingItems = await getAllFromStore(db, storeName);
    
    for (const item of pendingItems) {
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          await deleteFromStore(db, storeName, item.id);
          console.log(`[SW] Synced item ${item.id} successfully`);
        }
      } catch (error) {
        console.error(`[SW] Failed to sync item ${item.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`[SW] Sync ${storeName} failed:`, error);
  }
}

async function syncAllPendingData() {
  await syncPendingData('pendingSales', '/api/sales');
  await syncPendingData('pendingOrders', '/api/orders');
}

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic Sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'update-products':
      event.waitUntil(updateCacheForPath('/api/products'));
      break;
    case 'update-categories':
      event.waitUntil(updateCacheForPath('/api/categories'));
      break;
    case 'sync-inventory':
      event.waitUntil(updateCacheForPath('/api/ingredients/stock'));
      break;
  }
});

async function updateCacheForPath(path) {
  console.log(`[SW] Updating cache for: ${path}`);
  
  try {
    const response = await fetch(path);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(path, response);
      console.log(`[SW] Cache updated for: ${path}`);
    }
  } catch (error) {
    console.error(`[SW] Failed to update cache for ${path}:`, error);
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'System International POS',
    body: 'Tienes una nueva notificación',
    icon: '/icons/si-icon-192.png',
    badge: '/icons/si-icon-192.png',
    tag: 'general',
    data: { url: '/dashboard' }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Cerrar' }
    ],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (!event.data) return;
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(event.data.urls))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((names) => 
          Promise.all(names.map((name) => caches.delete(name)))
        )
      );
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          event.ports[0].postMessage({
            cacheSize: keys.length,
            cacheName: CACHE_NAME
          });
        })()
      );
      break;
  }
});

// ===== SHARE TARGET HANDLING =====
async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('files');
  
  const sharedData = {
    title,
    text,
    url,
    files: files.map((f) => f.name),
    timestamp: Date.now()
  };
  
  try {
    const db = await openDatabase();
    await addToStore(db, 'sharedData', sharedData);
  } catch (error) {
    console.error('[SW] Failed to store shared data:', error);
  }
  
  return Response.redirect(
    `/dashboard?shared=true&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`
  );
}

// ===== INDEXEDDB HELPERS =====
const DB_NAME = 'SystemIntlDB';
const DB_VERSION = 2;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      const stores = ['pendingSales', 'pendingOrders', 'sharedData', 'offlineQueue'];
      
      for (const storeName of stores) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      }
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function addToStore(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ===== ONLINE/OFFLINE STATUS =====
self.addEventListener('online', () => {
  console.log('[SW] App is back online');
  // Trigger sync when back online
  if (self.registration.sync) {
    self.registration.sync.register('sync-data').catch(console.error);
  }
});

self.addEventListener('offline', () => {
  console.log('[SW] App is offline');
});

console.log('[SW] Service Worker loaded - Version 3.0.0 - Enhanced Offline Support');
