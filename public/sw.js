/*
 * ContaEstudo PWA Service Worker — PGC Angola & Contabilidade
 * Cache-first para assets estáticos (JS, CSS, fontes, imagens, ícones)
 * Network-only para API, Firestore, Gemini, Firebase Auth (nunca cachear pedidos dinâmicos)
 * Fallback offline para app shell e offline.html
 */

const CACHE_NAME = 'contaestudo-static-v1';
const OFFLINE_FALLBACK = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/sem-ligacao.html',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/logo.svg'
];

// Instalação: pre-caching de assets estáticos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          fetch(asset, { cache: 'reload' })
            .then((res) => {
              if (res.ok) return cache.put(asset, res);
            })
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Ativação: limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de pedidos
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Apenas requisições GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. REQUISITOS NETWORK-ONLY: NUNCA CACHEAR API, FIRESTORE, GEMINI, FIREBASE AUTH
  const isNetworkOnly =
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken');

  if (isNetworkOnly) {
    // Deixar a rede lidar directamente, sem interferência nem cache
    return;
  }

  // 2. NAVEGAÇÃO SPA (HTML document)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            (await cache.match(OFFLINE_FALLBACK))
          );
        })
    );
    return;
  }

  // 3. ASSETS ESTÁTICOS (JS, CSS, Fontes, Imagens): Cache-first com revalidação em background
  const isStaticAsset =
    /\.(?:js|css|mjs|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname) ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidação em background silenciosa
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse)).catch(() => {});
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Se não estiver em cache, busca na rede e guarda em cache
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response('Asset offline indisponível', { status: 503 });
          });
      })
    );
    return;
  }

  // Padrão para outros pedidos GET de mesma origem
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((res) => {
              if (res && res.ok) {
                const copy = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
              }
              return res;
            })
            .catch(() => new Response('Offline', { status: 503 }))
        );
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
