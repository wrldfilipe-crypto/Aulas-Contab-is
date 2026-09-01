/*
 * ContaGlobal — Service Worker Otimizado para iOS Safari
 * Versão leve e compatível com WebKit iOS sem Push Notifications ou background-sync pesados
 */

const IOS_CACHE_VERSION = "contaglobal-ios-v1";
const IOS_STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.svg",
  "/contaestudo-logo.png",
  "/logo_icone_192.png",
  "/logo_icone_512.png",
  "/icon-invoice.png",
  "/icon-ai.png",
  "/icon-study.png",
  "/icon-calc.png",
  "/sem-ligacao.html",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(IOS_CACHE_VERSION).then((cache) => {
      return Promise.allSettled(
        IOS_STATIC_FILES.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== IOS_CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: network first com fallback para cache/index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(IOS_CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(IOS_CACHE_VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match("/index.html")) ||
            (await cache.match("/")) ||
            (await cache.match("/offline.html"))
          );
        })
    );
    return;
  }

  // Assets estáticos: Cache-first / Stale-While-Revalidate seguro
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(IOS_CACHE_VERSION).then((c) => c.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      return cached || fetchPromise || new Response("Offline", { status: 503 });
    })
  );
});
