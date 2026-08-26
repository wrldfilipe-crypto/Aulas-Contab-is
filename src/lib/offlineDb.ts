/**
 * IndexedDB Database Engine for Offline Storage & Sync
 * Contabilidade Unificada — Global Account
 */

export interface PendingAction {
  id: string;
  url: string;
  method: string;
  data: any;
  type: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

export interface OfflineInvoice {
  id: string;
  clientName: string;
  taxId: string;
  amount: number;
  currency: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'issued' | 'pending_sync';
  synced: boolean;
  createdAt: number;
}

export interface OfflineAccountingEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  referenceDoc?: string;
  synced: boolean;
  createdAt: number;
}

export interface OfflineDraft {
  id: string;
  entityType: 'invoice' | 'journal_entry' | 'ai_prompt' | 'study_note' | 'calculator_preset';
  title: string;
  content: any;
  updatedAt: number;
}

export interface SyncHistoryRecord {
  id: string;
  timestamp: number;
  success: boolean;
  syncedCount: number;
  message: string;
  type: 'auto' | 'manual';
  errorDetails?: string;
}

const DB_NAME = 'ContaGlobalOfflineDB';
const DB_VERSION = 2;

let activeDbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

function resetDBConnection() {
  if (activeDbInstance) {
    try { activeDbInstance.close(); } catch (_) {}
    activeDbInstance = null;
  }
  dbOpenPromise = null;
}

export function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB não é suportado neste ambiente.'));
  }

  if (activeDbInstance) {
    return Promise.resolve(activeDbInstance);
  }

  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('pendingActions')) {
          const store = db.createObjectStore('pendingActions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineInvoices')) {
          const store = db.createObjectStore('offlineInvoices', { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineAccounting')) {
          const store = db.createObjectStore('offlineAccounting', { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          db.createObjectStore('cachedData', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('offlineDrafts')) {
          const store = db.createObjectStore('offlineDrafts', { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('entityType', 'entityType', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        activeDbInstance = db;
        db.onversionchange = () => {
          resetDBConnection();
        };
        db.onclose = () => {
          resetDBConnection();
        };
        resolve(db);
      };

      request.onerror = () => {
        resetDBConnection();
        reject(request.error);
      };
      
      request.onblocked = () => {
        resetDBConnection();
      };
    } catch (e) {
      resetDBConnection();
      reject(e);
    }
  });

  return dbOpenPromise;
}

/** Executa uma transação de forma segura com auto-recuperação de 'Database is closing' */
async function runWithStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      return await operation(store, tx);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        attempt === 0 &&
        (msg.includes('closing') ||
          msg.includes('closed') ||
          err?.name === 'InvalidStateError')
      ) {
        console.warn('[IndexedDB] Conexão terminada ou fechada. A restabelecer nova ligação...');
        resetDBConnection();
        continue;
      }
      throw err;
    }
  }
  throw new Error('Falha ao executar operação IndexedDB.');
}

// ── Pending Actions (Ações em fila para sincronização) ──────────

export async function savePendingAction(action: {
  url: string;
  method: string;
  data: any;
  type: string;
}): Promise<PendingAction> {
  const pendingAction: PendingAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url: action.url,
    method: action.method,
    data: action.data,
    type: action.type,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0
  };

  return runWithStore('pendingActions', 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.add(pendingAction);
      request.onsuccess = () => resolve(pendingAction);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getPendingActions(): Promise<PendingAction[]> {
  try {
    return await runWithStore('pendingActions', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function deletePendingAction(id: string): Promise<void> {
  try {
    await runWithStore('pendingActions', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  } catch (_) {}
}

// ── Offline Invoices (Faturas Offline) ─────────────────────────

export async function saveOfflineInvoice(invoice: Omit<OfflineInvoice, 'id' | 'createdAt' | 'synced'> & { id?: string }): Promise<OfflineInvoice> {
  const fullInvoice: OfflineInvoice = {
    ...invoice,
    id: invoice.id || `inv_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    synced: false,
    createdAt: Date.now()
  };

  await savePendingAction({
    url: '/api/erp/invoices',
    method: 'POST',
    data: fullInvoice,
    type: 'sync-invoices'
  });

  return runWithStore('offlineInvoices', 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(fullInvoice);
      request.onsuccess = () => resolve(fullInvoice);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getOfflineInvoices(): Promise<OfflineInvoice[]> {
  try {
    return await runWithStore('offlineInvoices', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function markInvoiceSynced(id: string): Promise<void> {
  try {
    await runWithStore('offlineInvoices', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const inv = getReq.result;
          if (inv) {
            inv.synced = true;
            inv.status = 'issued';
            store.put(inv);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      });
    });
  } catch (_) {}
}

// ── Offline Accounting Entries (Lançamentos Contabilísticos) ──

export async function saveOfflineAccountingEntry(entry: Omit<OfflineAccountingEntry, 'id' | 'createdAt' | 'synced'> & { id?: string }): Promise<OfflineAccountingEntry> {
  const fullEntry: OfflineAccountingEntry = {
    ...entry,
    id: entry.id || `acc_off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    synced: false,
    createdAt: Date.now()
  };

  await savePendingAction({
    url: '/api/erp/accounting/entries',
    method: 'POST',
    data: fullEntry,
    type: 'sync-accounting'
  });

  return runWithStore('offlineAccounting', 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(fullEntry);
      request.onsuccess = () => resolve(fullEntry);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getOfflineAccountingEntries(): Promise<OfflineAccountingEntry[]> {
  try {
    return await runWithStore('offlineAccounting', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function markAccountingEntrySynced(id: string): Promise<void> {
  try {
    await runWithStore('offlineAccounting', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result;
          if (item) {
            item.synced = true;
            store.put(item);
          }
          resolve();
        };
        getReq.onerror = () => reject(getReq.error);
      });
    });
  } catch (_) {}
}

// ── Key-Value Data Cache (Cache Geral) ──────────────────────────

export async function setCacheData(key: string, data: any): Promise<void> {
  try {
    await runWithStore('cachedData', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put({ key, data, updatedAt: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    try {
      localStorage.setItem(`ga_cache_${key}`, JSON.stringify(data));
    } catch (_) {}
  }
}

export async function getCacheData<T = any>(key: string): Promise<T | null> {
  try {
    return await runWithStore('cachedData', 'readonly', (store) => {
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = () => resolve(null);
      });
    });
  } catch {
    try {
      const fallback = localStorage.getItem(`ga_cache_${key}`);
      return fallback ? JSON.parse(fallback) : null;
    } catch {
      return null;
    }
  }
}

// ── Offline Drafts (Rascunhos Offline) ──────────────────────────

export async function saveDraft(
  id: string,
  entityType: OfflineDraft['entityType'],
  title: string,
  content: any
): Promise<OfflineDraft> {
  const draft: OfflineDraft = {
    id,
    entityType,
    title,
    content,
    updatedAt: Date.now()
  };

  return runWithStore('offlineDrafts', 'readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(draft);
      request.onsuccess = () => resolve(draft);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getDrafts(): Promise<OfflineDraft[]> {
  try {
    return await runWithStore('offlineDrafts', 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    return [];
  }
}

export async function deleteDraft(id: string): Promise<void> {
  try {
    await runWithStore('offlineDrafts', 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  } catch (_) {}
}

// ── Helper: Limpar armazenamento offline ───────────────────────

export async function clearAllOfflineStorage(): Promise<void> {
  const stores = ['pendingActions', 'offlineInvoices', 'offlineAccounting', 'cachedData', 'offlineDrafts'];
  for (const storeName of stores) {
    try {
      await runWithStore(storeName, 'readwrite', (store) => {
        return new Promise<void>((resolve) => {
          store.clear();
          resolve();
        });
      });
    } catch (_) {}
  }
}

// ── Sync History (Histórico de Sincronização Local) ────────────
const SYNC_HISTORY_STORAGE_KEY = 'ga_sync_history_log_v1';

export function recordSyncHistory(entry: Omit<SyncHistoryRecord, 'id' | 'timestamp'>): SyncHistoryRecord {
  const record: SyncHistoryRecord = {
    id: `sync_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    ...entry
  };

  try {
    const raw = localStorage.getItem(SYNC_HISTORY_STORAGE_KEY);
    const list: SyncHistoryRecord[] = raw ? JSON.parse(raw) : [];
    // Keep the latest 20 in storage, we present the top 5
    list.unshift(record);
    const trimmed = list.slice(0, 20);
    localStorage.setItem(SYNC_HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[SyncHistory] Erro ao gravar histórico de sincronização:', e);
  }

  return record;
}

export function getSyncHistory(limit: number = 5): SyncHistoryRecord[] {
  try {
    const raw = localStorage.getItem(SYNC_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const list: SyncHistoryRecord[] = JSON.parse(raw);
    return list.slice(0, limit);
  } catch (e) {
    console.warn('[SyncHistory] Erro ao ler histórico:', e);
    return [];
  }
}

export function clearSyncHistory(): void {
  try {
    localStorage.removeItem(SYNC_HISTORY_STORAGE_KEY);
  } catch (_) {}
}
