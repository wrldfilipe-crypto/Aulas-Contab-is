/**
 * Global Memory & LocalStorage Cache Service with TTL & AbortController API management.
 * 
 * TTL Policies:
 * - Dynamic Data (5 min / 300,000ms): Chat messages, quizzes, rankings, transactions
 * - Static Data (30 min / 1,800,000ms): Learning materials, menu structure, workspace config
 * - Long Static Data (24 hrs / 86,400,000ms): Glossary, accounting standards (normas), country data
 */

export type CacheCategory = 'DYNAMIC' | 'STATIC' | 'LONG_STATIC';

const TTL_MAP: Record<CacheCategory, number> = {
  DYNAMIC: 5 * 60 * 1000,          // 5 minutos
  STATIC: 30 * 60 * 1000,          // 30 minutos
  LONG_STATIC: 24 * 60 * 60 * 1000  // 24 horas
};

interface CacheRecord<T = any> {
  data: T;
  timestamp: number;
  category: CacheCategory;
  ttl: number;
}

// In-Memory Fast Cache for instant zero-latency return
const memoryCache = new Map<string, CacheRecord>();

// Mapa global de controllers para cancelar pedidos pendentes
const pendingControllers = new Map<string, AbortController>();

export const cancelPendingRequests = (key?: string): void => {
  if (key) {
    // Cancelar apenas o pedido com esta chave
    const controller = pendingControllers.get(key);
    if (controller) {
      controller.abort();
      pendingControllers.delete(key);
    }
  } else {
    // Cancelar todos os pedidos pendentes
    pendingControllers.forEach((controller) => controller.abort());
    pendingControllers.clear();
  }
};

export const createRequest = (key: string): AbortSignal => {
  // Cancelar pedido anterior com a mesma chave se existir
  cancelPendingRequests(key);
  const controller = new AbortController();
  pendingControllers.set(key, controller);
  return controller.signal;
};

/**
 * Creates or gets an AbortSignal for a specific route / API key.
 * If an active request exists for this key, it aborts the previous request.
 */
export function getAbortSignal(requestKey: string): AbortSignal {
  return createRequest(requestKey);
}
export function getCacheItem<T = any>(key: string): T | null {
  const now = Date.now();

  // 1. Check memory cache first
  const memItem = memoryCache.get(key);
  if (memItem) {
    if (now - memItem.timestamp < memItem.ttl) {
      return memItem.data as T;
    } else {
      memoryCache.delete(key);
    }
  }

  // 2. Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`app_cache_${key}`);
      if (raw) {
        const record: CacheRecord<T> = JSON.parse(raw);
        if (now - record.timestamp < record.ttl) {
          // Re-populate memory cache
          memoryCache.set(key, record);
          return record.data;
        } else {
          localStorage.removeItem(`app_cache_${key}`);
        }
      }
    } catch (e) {
      console.warn('[CacheService] Error reading from localStorage:', e);
    }
  }

  return null;
}

/**
 * Saves item into memory and localStorage cache with appropriate TTL.
 */
export function setCacheItem<T = any>(
  key: string,
  data: T,
  category: CacheCategory = 'DYNAMIC'
): void {
  const ttl = TTL_MAP[category];
  const record: CacheRecord<T> = {
    data,
    timestamp: Date.now(),
    category,
    ttl
  };

  memoryCache.set(key, record);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`app_cache_${key}`, JSON.stringify(record));
    } catch (e) {
      console.warn('[CacheService] Error saving to localStorage:', e);
    }
  }
}

/**
 * Invalidates a specific key or all keys matching a prefix.
 */
export function invalidateAppCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('app_cache_')) localStorage.removeItem(k);
      });
    }
    return;
  }

  memoryCache.forEach((_, k) => {
    if (k.startsWith(keyOrPrefix)) memoryCache.delete(k);
  });

  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`app_cache_${keyOrPrefix}`) || k.startsWith(keyOrPrefix)) {
        localStorage.removeItem(k);
      }
    });
  }
}

/**
 * Estimates the size and count of resources cached in 'contaglobal-runtime-v5'.
 */
export async function estimateCacheUsage(): Promise<{ count: number; bytes: number; formattedSize: string }> {
  try {
    let count = 0;
    let totalBytes = 0;

    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheExists = await caches.has('contaglobal-runtime-v5');
      if (cacheExists) {
        const cache = await caches.open('contaglobal-runtime-v5');
        const requests = await cache.keys();
        count = requests.length;

        // Estimate size by inspecting responses in parallel
        const responsePromises = requests.map(async (req) => {
          try {
            const resp = await cache.match(req);
            if (resp) {
              const blob = await resp.clone().blob();
              return blob.size;
            }
          } catch {
            return 0;
          }
          return 0;
        });

        const sizes = await Promise.all(responsePromises);
        totalBytes = sizes.reduce((acc, curr) => acc + (curr || 0), 0);
      }
    }

    // Format human-readable size
    let formattedSize = '0 KB';
    if (totalBytes > 1024 * 1024) {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalBytes > 0) {
      formattedSize = `${Math.max(1, Math.round(totalBytes / 1024))} KB`;
    }

    return {
      count,
      bytes: totalBytes,
      formattedSize
    };
  } catch (error) {
    console.warn('[appCacheService] Could not estimate cache usage:', error);
    return { count: 0, bytes: 0, formattedSize: '0 KB' };
  }
}

/**
 * Specifically deletes the runtime cache 'contaglobal-runtime-v5' using the Cache API
 * and notifies the Service Worker.
 */
export async function clearRuntimeCache(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    let deletedCount = 0;
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheExists = await caches.has('contaglobal-runtime-v5');
      if (cacheExists) {
        const runtimeCache = await caches.open('contaglobal-runtime-v5');
        const keys = await runtimeCache.keys();
        deletedCount = keys.length;
        await caches.delete('contaglobal-runtime-v5');
      }
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_RUNTIME_CACHE' });
    }

    return { success: true, deletedCount };
  } catch (error: any) {
    console.error('[appCacheService] Error clearing contaglobal-runtime-v5:', error);
    return { success: false, deletedCount: 0, error: error?.message || 'Error deleting cache' };
  }
}
