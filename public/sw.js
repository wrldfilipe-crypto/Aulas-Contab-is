const CACHE_NAME   = "global-account-offline-v2";
const OFFLINE_PAGE = "/sem-ligacao.html";

// Pré-carregamento explícito de assets críticos
const CRITICAL_STATIC_ASSETS = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/manifest.json",
  "/logo_icone_512x512.png",
  "/logo_icone_512.png",
  "/logo_icone_192.png",
  "/logo_contabilidade_unificada.svg",
  "/logo.svg",
  "/icon-invoice.png",
  "/icon-ai.png",
  "/icon-study.png",
  "/icon-calc.png",
  "/sem-ligacao.html",
  "/offline.html"
];

// Rotas autorizadas para navegação offline
const OFFLINE_ALLOWED = [
  "/",
  "/Estudos",
  "/Estudos/Contabilidade",
  "/Estudos/Cambio",
  "/Estudos/Fiscalizacao",
  "/Quizzes",
  "/sem-ligacao.html",
  "/offline.html"
];

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW Install] Pré-carregando assets críticos no cache:", CRITICAL_STATIC_ASSETS);
      return cache.addAll(CRITICAL_STATIC_ASSETS).catch((err) => {
        console.warn("[SW Install] Alguns assets críticos falharam ao pré-carregar:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url  = new URL(event.request.url);
  const path = url.pathname;

  if (!event.request.url.startsWith("http")) return;

  // Intercepta navegação de páginas (HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(handlePageRequest(path, event.request));
    return;
  }

  // 1. ESTRATÉGIA NETWORK-FIRST: APENAS para consultas de mensagens recentes / chat
  const isRecentMessagesApi = path.includes("/api/messages") || 
                              path.includes("/conversations") || 
                              path.includes("/messages") || 
                              path.includes("/chat/messages") ||
                              url.searchParams.has("recent_messages");

  if (isRecentMessagesApi) {
    event.respondWith(handleNetworkFirstMessages(event.request));
    return;
  }

  // 2. ESTRATÉGIA STALE-WHILE-REVALIDATE: Conteúdos de aprendizagem e assets estáticos
  const isLearningContentOrAsset = path.includes("/api/ai-learn") || 
                                   path.includes("/api/offline-material") || 
                                   path.includes("/Estudos") || 
                                   path.includes("/quizzes") ||
                                   /\.(png|jpg|jpeg|svg|webp|ico|gif|js|css|woff2?)$/i.test(path) ||
                                   path.includes("logo") || 
                                   path.includes("icon") ||
                                   path.includes("assets");

  if (isLearningContentOrAsset) {
    event.respondWith(handleStaleWhileRevalidate(event.request));
    return;
  }

  // Fallback padrão: busca na rede
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── HANDLER: Network-First para Mensagens Recentes ─────────
async function handleNetworkFirstMessages(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    console.log(`[SW Network-First] Mensagens recentes obtidas via rede: ${request.url}`);
    return networkResponse;
  } catch (error) {
    console.warn(`[SW Network-First Offline] Falha na rede para mensagens. A tentar servir da cache: ${request.url}`);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ 
      error: "Mensagens offline indisponíveis sem ligação à rede.",
      offlineFallback: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── HANDLER: Stale-While-Revalidate para Aprendizagem e Assets ────────
async function handleStaleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  // Revalidação em segundo plano se houver ligação à rede
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((err) => {
    console.warn(`[SW Stale-While-Revalidate] Falha na revalidação em segundo plano: ${request.url}`, err);
  });

  // Serve imediatamente do cache se existir; senão aguarda a resposta da rede
  return cachedResponse || fetchPromise;
}

// ── HANDLER: Navegação de Páginas ─────────────────────────
async function handlePageRequest(path, request) {
  const normalizedPath = path.toLowerCase();
  
  const isAllowed = OFFLINE_ALLOWED.some(allowed => {
    const normAllowed = allowed.toLowerCase();
    return normalizedPath === normAllowed || normalizedPath.startsWith(normAllowed + "/");
  }) || normalizedPath === "/" || normalizedPath === "/index.html" || normalizedPath.includes("estudos") || normalizedPath.includes("quizzes");

  try {
    const response = await fetch(request);
    if (response.ok && isAllowed) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (isAllowed) {
      const cached = await caches.match(request)
                  || await caches.match("/")
                  || await caches.match("/index.html");
      if (cached) return cached;
      return (await caches.match(OFFLINE_PAGE)) || (await caches.match("/offline.html")) || (await caches.match("/"));
    } else {
      const page = await caches.match(OFFLINE_PAGE) || await caches.match("/offline.html");
      if (page) return page;
      return caches.match("/");
    }
  }
}
