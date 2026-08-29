const CACHE_NAME = 'gabycejas-cache-v2';
const urlsToCache = [
    './agenda_belleza.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js'
    // Agrega aquí cualquier otra librería externa que uses
];

// Instalación: guarda en caché los archivos base de la app
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Activación: elimina cachés de versiones anteriores
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: intenta la red primero para el HTML (para que siempre veas cambios nuevos
// cuando hay conexión) y usa caché como respaldo cuando no hay internet.
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Actualiza la caché con la respuesta fresca
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});
