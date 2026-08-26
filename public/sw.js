/*
 * ContaGlobal Offline — Service Worker + Cache API
 * Sem Firebase, Supabase ou bibliotecas externas.
 *
 * Estratégias:
 * - App shell e rotas principais: network-first com fallback para index.html.
 * - JavaScript, CSS, fontes e imagens: stale-while-revalidate.
 * - GET JSON same-origin: network-first e cache automático.
 * - POST/PUT/DELETE: nunca são interceptados pelo cache.
 */

const VERSION = "v6";
const STATIC_CACHE = `contaglobal-static-${VERSION}`;
const RUNTIME_CACHE = `contaglobal-runtime-${VERSION}`;
const DATA_CACHE = `contaglobal-data-${VERSION}`;
const OFFLINE_PAGE = "/sem-ligacao.html";
const MANIFEST_URL = "/asset-manifest.json";

const OFFLINE_ROUTES = [
  "/",
  "/index.html",
  "/notas",
  "/estudos",
  "/quizzes",
  "/sem-ligacao.html",
  "/offline.html"
];

const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
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

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isOfflineRoute(pathname) {
  const path = pathname.toLowerCase();
  return OFFLINE_ROUTES.some((route) => {
    const normalized = route.toLowerCase();
    return path === normalized || path.startsWith(`${normalized}/`);
  });
}

function isAssetRequest(request) {
  const url = new URL(request.url);
  return /\.(?:js|css|mjs|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname) ||
    url.pathname.includes("/assets/");
}

function isDataRequest(request) {
  const url = new URL(request.url);
  const contentType = request.headers.get("accept") || "";
  return contentType.includes("application/json") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.endsWith(".json");
}

async function readBuildAssets() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) return [];

    const manifest = await response.json();
    const files = new Set();
    const visited = new Set();

    function addEntry(keyOrEntry) {
      const key = typeof keyOrEntry === "string" ? keyOrEntry : null;
      const entry = key ? manifest[key] : keyOrEntry;
      if (!entry || typeof entry !== "object" || (key && visited.has(key))) return;
      if (key) visited.add(key);

      if (typeof entry.file === "string") files.add(`/${entry.file.replace(/^\//, "")}`);
      for (const field of ["css", "assets"]) {
        if (Array.isArray(entry[field])) {
          entry[field].forEach((file) => files.add(`/${String(file).replace(/^\//, "")}`));
        }
      }
      if (Array.isArray(entry.imports)) entry.imports.forEach(addEntry);
      if (Array.isArray(entry.dynamicImports)) entry.dynamicImports.forEach(addEntry);
    }

    Object.keys(manifest).forEach(addEntry);
    return [...files];
  } catch {
    return [];
  }
}

async function cacheResources(cacheName, resources) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(resources.map(async (resource) => {
    try {
      const response = await fetch(resource, { cache: "reload" });
      if (response.ok) await cache.put(resource, response);
    } catch {
      // Um asset opcional ausente não deve impedir a instalação do PWA.
    }
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const buildAssets = await readBuildAssets();
    await cacheResources(STATIC_CACHE, [...new Set([...STATIC_FILES, ...buildAssets])]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, DATA_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("contaglobal-") && !keep.has(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "SKIP_WAITING") self.skipWaiting();
  if (message.type === "CLEAR_OFFLINE_CACHE") {
    event.waitUntil(Promise.all([
      caches.delete(STATIC_CACHE),
      caches.delete(RUNTIME_CACHE),
      caches.delete(DATA_CACHE)
    ]));
  }
  if (message.type === "WARM_OFFLINE_PAGES") {
    event.waitUntil(warmOfflinePages());
  }
});

async function warmOfflinePages() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(OFFLINE_ROUTES.map(async (route) => {
    try {
      const response = await fetch(route, { cache: "reload" });
      if (response.ok) await cache.put(route, response);
    } catch {
      // O app shell já é suficiente para rotas SPA durante a falta de rede.
    }
  }));
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !isSameOrigin(request)) return;

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url.pathname));
    return;
  }

  if (isAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (isDataRequest(request)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function handleNavigation(request, pathname) {
  try {
    const response = await fetch(request);
    if (response.ok && isOfflineRoute(pathname)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(request)) ||
      (await cache.match(pathname)) ||
      (await cache.match("/index.html")) ||
      (await cache.match("/")) ||
      (await cache.match(OFFLINE_PAGE));
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || update || new Response("Recurso offline indisponível", { status: 503 });
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || new Response(JSON.stringify({
      offline: true,
      message: "Este dado ainda não foi guardado neste dispositivo."
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}
