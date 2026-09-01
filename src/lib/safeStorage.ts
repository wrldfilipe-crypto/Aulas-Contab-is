/**
 * Safe LocalStorage & SessionStorage wrapper
 * Prevents QuotaExceededError crashes in sandboxed iframes and restricted browser environments
 */

/**
 * Safe LocalStorage & SessionStorage wrapper
 * Prevents QuotaExceededError and Safari iOS Private Browsing SecurityError crashes
 */

const memoryStorage = new Map<string, string>();

export const safeStorage = {
  get: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const val = sessionStorage.getItem(key);
          if (val !== null) return val;
        }
      } catch {}
    }
    return memoryStorage.get(key) || null;
  },

  set: (key: string, value: string): void => {
    let saved = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        saved = true;
      }
    } catch (err) {
      // Tenta libertar espaço limpando caches não essenciais
      try {
        evictNonEssentialCache();
        localStorage.setItem(key, value);
        saved = true;
      } catch {
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem(key, value);
            saved = true;
          }
        } catch {}
      }
    }
    memoryStorage.set(key, value);
  },

  remove: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.removeItem(key);
        }
      } catch {}
    }
    memoryStorage.delete(key);
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.clear();
        }
      } catch {}
    }
    memoryStorage.clear();
  },

  key: (index: number): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.key(index);
      }
    } catch {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return sessionStorage.key(index);
        }
      } catch {}
    }
    return Array.from(memoryStorage.keys())[index] || null;
  }
};

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    safeStorage.set(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageGet(key: string): string | null {
  return safeStorage.get(key);
}

export function safeLocalStorageRemove(key: string): void {
  safeStorage.remove(key);
}

/**
 * Instala proteção global no window.localStorage para browsers com restrições severas (iOS Safari Privado)
 */
export function initializeStoragePolyfill(): void {
  if (typeof window === 'undefined') return;

  let storageWorks = false;
  try {
    const testKey = '__cg_safari_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    storageWorks = true;
  } catch (e) {
    console.warn('[SafeStorage] Modo privado do Safari iOS detetado ou localStorage bloqueado. A ativar armazenamento seguro em memória.');
    storageWorks = false;
  }

  if (!storageWorks) {
    try {
      const mockStorage: Storage = {
        length: 0,
        clear: () => memoryStorage.clear(),
        getItem: (k: string) => memoryStorage.get(k) || null,
        key: (i: number) => Array.from(memoryStorage.keys())[i] || null,
        removeItem: (k: string) => {
          memoryStorage.delete(k);
        },
        setItem: (k: string, v: string) => {
          memoryStorage.set(k, String(v));
        }
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (defErr) {
      console.warn('[SafeStorage] Não foi possível redefinir window.localStorage:', defErr);
    }
  }
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
  try {
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
  } catch (_) {}
}

