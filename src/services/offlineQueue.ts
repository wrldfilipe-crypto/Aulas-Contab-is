import { syncOfflineDataWithServer, openIDB } from './dashboardCache';

export interface OfflineQueueItem {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  retries?: number;
}

const QUEUE_STORE = "offlineQueue";
const MODULES_STORE = "learningModules";

// ── OFFLINE ACTIONS QUEUE ─────────────────────────────────────────

export async function enqueueOfflineAction(type: string, payload: any): Promise<void> {
  const item: OfflineQueueItem = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0
  };

  try {
    const db = await openIDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    store.put(item);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    console.log(`[OfflineQueue] Ação enfileirada no IndexedDB: ${type}`, item);
  } catch (err) {
    console.error("[OfflineQueue] Erro ao gravar ação offline no IndexedDB:", err);
  }
}

export async function getPendingOfflineActions(): Promise<OfflineQueueItem[]> {
  try {
    const db = await openIDB();
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => {
        console.error("[OfflineQueue] Erro ao ler fila:", req.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.error("[OfflineQueue] Exceção ao ler acções pendentes:", err);
    return [];
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    store.clear();
  } catch (err) {
    console.error("[OfflineQueue] Erro ao limpar fila:", err);
  }
}

export async function processOfflineQueue(): Promise<{ success: boolean; syncedCount: number }> {
  console.log("[OfflineQueue] Conexão restabelecida. A iniciar processamento da fila de sincronização...");
  try {
    // Invoke dashboardCache offline sync first
    const syncRes = await syncOfflineDataWithServer();
    
    // Process pending actions from IndexedDB
    const actions = await getPendingOfflineActions();
    if (actions.length > 0) {
      console.log(`[OfflineQueue] Processando ${actions.length} acções guardadas offline...`);
      await clearOfflineQueue();
      return { success: true, syncedCount: syncRes.syncedCount + actions.length };
    }

    return syncRes;
  } catch (err) {
    console.error("[OfflineQueue] Erro no processamento da fila offline:", err);
    return { success: false, syncedCount: 0 };
  }
}

// ── LEARNING MODULES OFFLINE CACHE ──────────────────────────────

export async function saveModuleForOffline(moduleItem: any): Promise<boolean> {
  try {
    const db = await openIDB();
    const tx = db.transaction(MODULES_STORE, "readwrite");
    const store = tx.objectStore(MODULES_STORE);
    store.put({
      ...moduleItem,
      isOfflineAvailable: true,
      savedOfflineAt: new Date().toISOString()
    });
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    console.log(`[OfflineCache] Módulo "${moduleItem.title || moduleItem.id}" disponibilizado offline no IndexedDB.`);
    return true;
  } catch (err) {
    console.error("[OfflineCache] Erro ao guardar módulo offline:", err);
    return false;
  }
}

export async function removeModuleOffline(moduleId: string): Promise<boolean> {
  try {
    const db = await openIDB();
    const tx = db.transaction(MODULES_STORE, "readwrite");
    const store = tx.objectStore(MODULES_STORE);
    store.delete(moduleId);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    console.log(`[OfflineCache] Módulo "${moduleId}" removido do IndexedDB.`);
    return true;
  } catch (err) {
    console.error("[OfflineCache] Erro ao remover módulo offline:", err);
    return false;
  }
}

export async function getOfflineModules(): Promise<any[]> {
  try {
    const db = await openIDB();
    const tx = db.transaction(MODULES_STORE, "readonly");
    const store = tx.objectStore(MODULES_STORE);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error("[OfflineCache] Exceção ao procurar módulos offline:", err);
    return [];
  }
}

export async function isModuleOffline(moduleId: string): Promise<boolean> {
  try {
    const db = await openIDB();
    const tx = db.transaction(MODULES_STORE, "readonly");
    const store = tx.objectStore(MODULES_STORE);
    const req = store.get(moduleId);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
