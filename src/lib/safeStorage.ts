/**
 * Safe LocalStorage & SessionStorage wrapper
 * Prevents QuotaExceededError crashes in sandboxed iframes and restricted browser environments
 */

export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] localStorage.setItem falhou para a chave "${key}":`, err?.message || err);
    // Tenta libertar espaço limpando caches não essenciais
    try {
      evictNonEssentialCache();
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[SafeStorage] Falha persistente após limpeza de cache para "${key}"`);
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] localStorage.getItem falhou para "${key}":`, err);
    return null;
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

/**
 * Remove chaves antigas de cache para evitar atingir o limite de 5MB do browser
 */
function evictNonEssentialCache() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  const cachePrefixes = [
    'dashboard_cache',
    'quiz_progress_cache',
    'firestore_',
    '__firestore_',
    'ga_temp_',
    'ga_doc_cache_'
  ];

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && cachePrefixes.some(p => k.startsWith(p))) {
      keysToRemove.push(k);
    }
  }

  keysToRemove.forEach(k => {
    try {
      localStorage.removeItem(k);
    } catch (_) {}
  });
}
