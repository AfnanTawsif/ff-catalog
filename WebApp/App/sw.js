const CACHE_NAME = 'ff-catalog-app-v2.0.0';
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

// Fetch Event - Cache-First strategy for local UI assets
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // Skip external CDN requests from being cached by SW
    if (event.request.url.includes('database.msgpack.gz') || event.request.url.includes('cdn.jsdelivr.net')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});