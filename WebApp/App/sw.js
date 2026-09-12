const CACHE_NAME = 'ff-catalog-app-v2.0.1';
const ASSETS = [
    './',
    './index.html',
    './script.js',
    './db-worker.js',
    './icons/icon.svg',
    './icons/error.webp',
    './icons/error-403.webp',       
    './icons/network-error.webp', 
    './icons/banner.jpg',
    './manifest.json',
    './robots.txt',
    './sitemap.xml',
    './icons/apple-touch-icon-192.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install Event - Cache website files and skip waiting
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Cache-First strategy for same-origin app shell only.
// External requests (CDNs, APIs, etc.) are left untouched so the app's
// own fetch-with-fallback logic stays in full control of its timeouts.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    let url;
    try {
        url = new URL(event.request.url);
    } catch (_) {
        return;
    }

    // Let anything that isn't same-origin pass straight through to the network.
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            // Hard timeout so a hung network request can never stall the page
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            return fetch(event.request, { signal: controller.signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    return response;
                })
                .catch(() => {
                    clearTimeout(timeoutId);
                    // Fail fast for optional local resources (manifest, icons, etc.)
                    return new Response('', {
                        status: 503,
                        statusText: 'Offline'
                    });
                });
        })
    );
});