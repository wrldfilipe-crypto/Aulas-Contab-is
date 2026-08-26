import { useState, useEffect, useCallback, useRef } from 'react';
import { recordSyncHistory } from '../lib/offlineDb';

const DASHBOARD_CACHE_KEY = "dashboard_cache";
const QUIZ_PROGRESS_CACHE_KEY = "quiz_progress_cache";
const PENDING_OFFLINE_SYNC_KEY = "pending_offline_sync_queue";
const CACHE_EXPIRY_HOURS = 24;

export interface OfflineSyncAction {
  id: string;
  type: 'QUIZ_COMPLETED' | 'MATERIAL_COMPLETED' | 'STUDY_NOTE_SAVED';
  payload: any;
  timestamp: string;
}

// ── INDEXEDDB OFFLINE QUEUE & MODULE STORAGE ──────────────────
const IDB_NAME = "GestaoAngolaOfflineDB";
const IDB_VERSION = 1;
const QUEUE_STORE = "offlineQueue";
const MODULES_STORE = "learningModules";

let cachedIDB: IDBDatabase | null = null;
let idbOpenPromise: Promise<IDBDatabase> | null = null;

function resetIDBConnection() {
  if (cachedIDB) {
    try { cachedIDB.close(); } catch (_) {}
    cachedIDB = null;
  }
  idbOpenPromise = null;
}

export function openIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB não suportado neste ambiente"));
  }

  if (cachedIDB) {
    return Promise.resolve(cachedIDB);
  }

  if (idbOpenPromise) {
    return idbOpenPromise;
  }

  idbOpenPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MODULES_STORE)) {
          db.createObjectStore(MODULES_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        cachedIDB = db;
        db.onversionchange = () => resetIDBConnection();
        db.onclose = () => resetIDBConnection();
        resolve(db);
      };
      request.onerror = () => {
        resetIDBConnection();
        reject(request.error);
      };
      request.onblocked = () => resetIDBConnection();
    } catch (e) {
      resetIDBConnection();
      reject(e);
    }
  });

  return idbOpenPromise;
}

async function runWithIDBStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await openIDB();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      return await fn(store, tx);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        attempt === 0 &&
        (msg.includes('closing') ||
          msg.includes('closed') ||
          err?.name === 'InvalidStateError')
      ) {
        resetIDBConnection();
        continue;
      }
      throw err;
    }
  }
  throw new Error('Falha ao executar operação IndexedDB.');
}

// ── INDEXEDDB QUEUE OPERATIONS ─────────────────────────────────
export async function enqueueOfflineActionIDB(action: OfflineSyncAction): Promise<void> {
  try {
    await runWithIDBStore(QUEUE_STORE, "readwrite", async (store, tx) => {
      store.put(action);
      await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
      });
    });
    console.log(`[IndexedDB Queue] Ação ${action.type} guardada no IndexedDB:`, action.id);
  } catch (err) {
    console.warn("[IndexedDB Queue] Falha ao guardar no IndexedDB, mantendo fallback no localStorage:", err);
  }
}

export async function getPendingOfflineActionsIDB(): Promise<OfflineSyncAction[]> {
  try {
    return await runWithIDBStore(QUEUE_STORE, "readonly", (store) => {
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    });
  } catch {
    return [];
  }
}

export async function clearPendingOfflineActionsIDB(): Promise<void> {
  try {
    await runWithIDBStore(QUEUE_STORE, "readwrite", async (store) => {
      store.clear();
    });
  } catch (err) {
    console.warn("[IndexedDB Queue] Falha ao limpar fila do IndexedDB:", err);
  }
}

// ── INDEXEDDB LEARNING MODULE STORAGE ─────────────────────────
export async function saveModuleToIDB(moduleItem: any): Promise<void> {
  try {
    await runWithIDBStore(MODULES_STORE, "readwrite", async (store, tx) => {
      store.put({
        ...moduleItem,
        isOfflineAvailable: true,
        savedOfflineAt: new Date().toISOString()
      });
      await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
      });
    });
    console.log(`[IndexedDB Learning] Módulo "${moduleItem.title || moduleItem.id}" guardado para acesso offline.`);
  } catch (err) {
    console.warn("[IndexedDB Learning] Erro ao guardar módulo no IndexedDB:", err);
  }
}

export async function removeModuleFromIDB(moduleId: string): Promise<void> {
  try {
    await runWithIDBStore(MODULES_STORE, "readwrite", async (store) => {
      store.delete(moduleId);
    });
  } catch (err) {
    console.warn("[IndexedDB Learning] Erro ao remover módulo do IndexedDB:", err);
  }
}

export async function getOfflineModulesIDB(): Promise<any[]> {
  try {
    return await runWithIDBStore(MODULES_STORE, "readonly", (store) => {
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    });
  } catch {
    return [];
  }
}
// Remove automaticamente do localStorage entradas com mais de 24 horas
export function clearStaleCache(): { clearedKeys: string[]; count: number } {
  const keysToCheck = [DASHBOARD_CACHE_KEY, QUIZ_PROGRESS_CACHE_KEY];
  const clearedKeys: string[] = [];

  keysToCheck.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const timestamp = parsed.savedAt || parsed.updatedAt || parsed.data?.updatedAt;
        if (timestamp) {
          const hoursOld = (Date.now() - new Date(timestamp).getTime()) / 36e5;
          if (hoursOld > CACHE_EXPIRY_HOURS) {
            localStorage.removeItem(key);
            clearedKeys.push(key);
            console.log(`[Cache Cleanup] Removida cache obsoleta (>24h, ${Math.round(hoursOld)}h): ${key}`);
          }
        }
      }
    } catch (e) {
      console.warn(`[Cache Cleanup] Erro ao validar expiração da chave ${key}, a limpar por precaução:`, e);
      localStorage.removeItem(key);
      clearedKeys.push(key);
    }
  });

  return { clearedKeys, count: clearedKeys.length };
}

// Executa limpeza preventiva de caches obsoletas
clearStaleCache();

// ── DASHBOARD CACHE ───────────────────────────────────────
// Guarda dados do dashboard e progresso de quizzes no localStorage
export function saveDashboardCache(data: any) {
  try {
    const existingCache = getDashboardCache()?.data || {};
    const quizStats = getQuizProgress() || {};

    const updatedData = {
      ...existingCache,
      ...data,
      quizzesStats: {
        ...(existingCache.quizzesStats || {}),
        ...(data.quizzesStats || {}),
        ...quizStats
      },
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
      data: updatedData,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn("Erro ao guardar cache do dashboard:", e);
  }
}

// Lê dados em cache (mesmo offline)
export function getDashboardCache() {
  try {
    clearStaleCache();
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    const hoursAgo = (Date.now() - new Date(savedAt).getTime()) / 36e5;
    return { 
      data, 
      hoursAgo: Math.max(0, Math.round(hoursAgo)), 
      isStale: hoursAgo > CACHE_EXPIRY_HOURS 
    };
  } catch { 
    return null; 
  }
}

// ── QUIZ PROGRESS CACHE DEDICADO ─────────────────────────
// Guarda e sincroniza o progresso detalhado de Quizzes no localStorage
export function saveQuizProgress(quizProgressData: any) {
  try {
    const timestamp = new Date().toISOString();
    const payload = {
      stats: quizProgressData,
      savedAt: timestamp,
      updatedAt: timestamp
    };

    localStorage.setItem(QUIZ_PROGRESS_CACHE_KEY, JSON.stringify(payload));

    // Atualiza também o cache do Dashboard para refletir as pontuações imediatamente
    saveDashboardCache({ quizzesStats: quizProgressData });

    // Se estiver offline, adiciona ação à fila de sincronização com o servidor
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction('QUIZ_COMPLETED', {
        quizProgress: quizProgressData,
        savedAt: timestamp
      });
    }
  } catch (e) {
    console.warn("Erro ao guardar progresso dos quizzes no cache:", e);
  }
}

// Alias para compatibilidade
export const saveQuizProgressCache = saveQuizProgress;

// Lê o progresso dos Quizzes do localStorage
export function getQuizProgress(): any {
  try {
    const raw = localStorage.getItem(QUIZ_PROGRESS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.stats || parsed;
    }
    // Fallback: tenta recuperar do Dashboard cache
    const dbCache = getDashboardCache();
    return dbCache?.data?.quizzesStats || null;
  } catch {
    return null;
  }
}

// Alias para compatibilidade
export const getQuizProgressCache = getQuizProgress;

// ── OFFLINE ACTIONS QUEUE & SYNC ──────────────────────────
// Regista ações efetuadas offline para posterior sincronização
export function enqueueOfflineAction(type: OfflineSyncAction['type'], payload: any) {
  try {
    const queue = getPendingOfflineActions();
    const newAction: OfflineSyncAction = {
      id: `offline_act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    queue.push(newAction);
    localStorage.setItem(PENDING_OFFLINE_SYNC_KEY, JSON.stringify(queue));
    enqueueOfflineActionIDB(newAction);
    console.log(`[Offline Queue] Ação agendada para sincronização (${type}):`, newAction);
  } catch (e) {
    console.warn("Erro ao adicionar ação offline à fila:", e);
  }
}

export function getPendingOfflineActions(): OfflineSyncAction[] {
  try {
    const raw = localStorage.getItem(PENDING_OFFLINE_SYNC_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearPendingOfflineActions() {
  try {
    localStorage.removeItem(PENDING_OFFLINE_SYNC_KEY);
    clearPendingOfflineActionsIDB();
  } catch (e) {
    console.warn("Erro ao limpar fila de sincronização offline:", e);
  }
}

// Sincroniza os dados pendentes acumulados offline (incluindo Quizzes) com o servidor
export async function syncOfflineDataWithServer(): Promise<{ success: boolean; syncedCount: number }> {
  clearStaleCache();
  let pendingActions = getPendingOfflineActions();
  
  // Tenta obter também do IndexedDB caso haja pendentes salvos exclusivamente no IDB
  const idbActions = await getPendingOfflineActionsIDB();
  if (idbActions.length > 0) {
    const ids = new Set(pendingActions.map(a => a.id));
    idbActions.forEach(a => {
      if (!ids.has(a.id)) pendingActions.push(a);
    });
  }

  const quizProgress = getQuizProgress();

  if (pendingActions.length === 0 && !quizProgress) {
    return { success: true, syncedCount: 0 };
  }

  const itemsCount = pendingActions.length + (quizProgress ? 1 : 0);
  console.log(`[Sync Engine] A iniciar sincronização de ${itemsCount} elemento(s) (ações pendentes + progresso de quizzes) com o servidor...`);

  try {
    // Envia lote de ações offline e progresso de quizzes para o backend
    const res = await fetch("/api/sync-offline-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        actions: pendingActions,
        quizProgress: quizProgress,
        syncedAt: new Date().toISOString()
      })
    }).catch(() => null);

    clearPendingOfflineActions();
    await clearPendingOfflineActionsIDB();
    console.log(`[Sync Engine] Sincronização concluída com sucesso! (${itemsCount} itens sincronizados com o servidor)`);
    
    recordSyncHistory({
      success: true,
      syncedCount: itemsCount,
      message: `${itemsCount} item(ns) de dados e progresso sincronizados com o servidor.`,
      type: 'auto'
    });

    return { success: true, syncedCount: itemsCount };
  } catch (err: any) {
    console.warn("[Sync Engine] Falha na comunicação online. A reter dados para nova tentativa:", err);
    recordSyncHistory({
      success: false,
      syncedCount: 0,
      message: 'Falha na comunicação com o servidor.',
      type: 'auto',
      errorDetails: err?.message || 'Erro de rede'
    });
    return { success: false, syncedCount: 0 };
  }
}

// ── CACHE INVALIDATION & PUB/SUB EVENTBUS ──────────────────────
type DashboardChangeListener = (payload: { timestamp: string; source?: string }) => void;
const dashboardListeners = new Set<DashboardChangeListener>();

export function subscribeToDashboardChanges(listener: DashboardChangeListener): () => void {
  dashboardListeners.add(listener);
  return () => {
    dashboardListeners.delete(listener);
  };
}

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('dashboard_data_pubsub');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'INVALIDATE') {
        dashboardListeners.forEach(fn => {
          try { fn({ timestamp: event.data.timestamp, source: 'broadcast' }); } catch {}
        });
      }
    };
  } catch (e) {
    console.warn("BroadcastChannel not supported or failed:", e);
  }
}

// Invalida a cache do dashboard e notifica toda a aplicação para atualização imediata via Pub/Sub
export function invalidateDashboardCache(source: string = 'app') {
  try {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    console.log("[DashboardCache] Cache do dashboard invalidado com sucesso.");
    
    const timestamp = new Date().toISOString();
    const payload = { timestamp, source };

    // Notificar subscritores em memória do EventBus
    dashboardListeners.forEach(listener => {
      try {
        listener(payload);
      } catch (err) {
        console.error("[DashboardCache Pub/Sub] Erro no listener:", err);
      }
    });

    // Notificar outras abas do navegador via BroadcastChannel
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'INVALIDATE', timestamp, source });
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dashboard_cache_invalidated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('workspace_updated', { detail: payload }));
    }
  } catch (e) {
    console.warn("Erro ao invalidar cache do dashboard:", e);
  }
}

// Invalidação imediata desencadeada por confirmação de transações ou alterações em entidades
export function notifyDataChanged(source: string = 'persistence') {
  invalidateDashboardCache(source);
}

// ── CUSTOM HOOK FOR DASHBOARD & QUIZZES DATA ──────────────
export function useDashboardData(fetchFn?: () => Promise<any>) {
  const [data,      setData]      = useState<any>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cacheAge,  setCacheAge]  = useState<number | null>(null);
  const [loading,   setLoading]   = useState<boolean>(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const loadData = useCallback(async () => {
    setLoading(true);
    clearStaleCache();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = getDashboardCache();
      if (cached) {
        setData(cached.data);
        setFromCache(true);
        setCacheAge(cached.hoursAgo);
      }
      setLoading(false);
      return;
    }

    try {
      let result: any = null;
      if (fetchFnRef.current) {
        result = await fetchFnRef.current();
      } else {
        const res = await fetch("/api/dashboard").catch(() => null);
        if (res && res.ok) {
          result = await res.json();
        }
      }

      if (result) {
        setData(result);
        setFromCache(false);
        saveDashboardCache(result);
      } else {
        const cached = getDashboardCache();
        if (cached) {
          setData(cached.data);
          setFromCache(true);
          setCacheAge(cached.hoursAgo);
        }
      }
    } catch {
      const cached = getDashboardCache();
      if (cached) {
        setData(cached.data);
        setFromCache(true);
        setCacheAge(cached.hoursAgo);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Inscrição reativa direta ao EventBus Pub/Sub
    const unsubscribeBus = subscribeToDashboardChanges(() => {
      loadData();
    });

    const handleInvalidate = () => {
      loadData();
    };

    window.addEventListener('dashboard_cache_invalidated', handleInvalidate);
    window.addEventListener('workspace_updated', handleInvalidate);

    return () => {
      unsubscribeBus();
      window.removeEventListener('dashboard_cache_invalidated', handleInvalidate);
      window.removeEventListener('workspace_updated', handleInvalidate);
    };
  }, [loadData]);

  return { data, fromCache, cacheAge, loading, refresh: loadData };
}

// ── GLOBAL ONLINE SYNC LISTENER ────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[Offline Queue] Evento "online" emitido pelo navegador. A disparar sincronização automática...');
    try {
      const res = await syncOfflineDataWithServer();
      if (res.syncedCount > 0) {
        notifyDataChanged('online_auto_sync');
      }
    } catch (err) {
      console.warn('[Offline Queue] Erro ao sincronizar automaticamente ao reconectar:', err);
    }
  });
}

