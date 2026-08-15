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

// AbortControllers map for canceling pending API requests when route changes
const pendingAbortControllers = new Map<string, AbortController>();

/**
 * Gets cached item from memory or localStorage if valid.
 */
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
 * Creates or gets an AbortSignal for a specific route / API key.
 * If an active request exists for this key, it aborts the previous request.
 */
export function getAbortSignal(requestKey: string): AbortSignal {
  cancelPendingRequests(requestKey);
  const controller = new AbortController();
  pendingAbortControllers.set(requestKey, controller);
  return controller.signal;
}

/**
 * Cancels pending requests for a specific key or all pending requests.
 */
export function cancelPendingRequests(requestKey?: string): void {
  if (requestKey) {
    const controller = pendingAbortControllers.get(requestKey);
    if (controller) {
      controller.abort();
      pendingAbortControllers.delete(requestKey);
    }
  } else {
    pendingAbortControllers.forEach(controller => controller.abort());
    pendingAbortControllers.clear();
  }
}

/**
 * Debounce helper with default 300ms delay.
 */
export function createDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
