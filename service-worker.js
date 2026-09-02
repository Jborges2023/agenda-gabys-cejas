const CACHE_NAME = 'gabycejas-cache-v5';

// Recursos propios de la app (mismo origen)
const OWN_URLS = [
    './agenda_belleza.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './icon-192-maskable.png',
    './icon-512-maskable.png'
];

// Librerías externas (CDN) que la app necesita para funcionar (Tailwind, Lucide, Tone.js)
const CDN_URLS = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js'
];

// Instalación: guarda en caché los archivos base de la app.
// IMPORTANTE: cada recurso se descarga y guarda POR SEPARADO (no con cache.addAll),
// para que si uno solo falla (ej: un CDN lento en ese momento) no se pierda el resto
// y la app siga funcionando offline con todo lo que sí se pudo guardar.
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            const ownResults = await Promise.allSettled(
                OWN_URLS.map(url => cache.add(url))
            );
            // Los recursos de CDN se piden en modo 'no-cors' para evitar que el navegador
            // rechace la descarga por políticas de CORS del servidor externo
            const cdnResults = await Promise.allSettled(
                CDN_URLS.map(url =>
                    fetch(url, { mode: 'no-cors' }).then(response => cache.put(url, response))
                )
            );
            [...ownResults, ...cdnResults].forEach((r, i) => {
                if (r.status === 'rejected') {
                    console.warn('No se pudo cachear (se reintentará en el próximo uso):', [...OWN_URLS, ...CDN_URLS][i]);
                }
            });
        })
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

// Fetch: intenta la red primero (para traer cambios nuevos cuando hay internet) y usa
// el caché como respaldo cuando no hay conexión. Si es la página principal y no está
// ni en red ni en caché (primer uso sin haber abierto antes con internet), no hay forma
// de mostrarla sin conexión — por eso es clave abrir la app con internet al menos una vez.
self.addEventListener('fetch', event => {
    // Solo interceptamos peticiones GET (evita interferir con nada más)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone)).catch(() => {});
                return networkResponse;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                // Si es una navegación (abrir la app) y no hay nada en caché para esta URL exacta,
                // devolvemos el archivo principal de la app como respaldo final
                if (event.request.mode === 'navigate') {
                    const fallback = await caches.match('./agenda_belleza.html');
                    if (fallback) return fallback;
                }
                return Response.error();
            })
    );
});
