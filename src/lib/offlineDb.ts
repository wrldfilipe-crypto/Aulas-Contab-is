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

const DB_NAME = 'ContaGlobalOfflineDB';
const DB_VERSION = 2;

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB não é suportado neste ambiente.'));
      return;
    }

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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── Pending Actions (Ações em fila para sincronização) ──────────

export async function savePendingAction(action: {
  url: string;
  method: string;
  data: any;
  type: string;
}): Promise<PendingAction> {
  const db = await openOfflineDB();
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

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const request = store.add(pendingAction);

    request.onsuccess = () => resolve(pendingAction);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readonly');
    const store = tx.objectStore('pendingActions');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingAction(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ── Offline Invoices (Faturas Offline) ─────────────────────────

export async function saveOfflineInvoice(invoice: Omit<OfflineInvoice, 'id' | 'createdAt' | 'synced'> & { id?: string }): Promise<OfflineInvoice> {
  const db = await openOfflineDB();
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

  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineInvoices', 'readwrite');
    const store = tx.objectStore('offlineInvoices');
    const request = store.put(fullInvoice);

    request.onsuccess = () => resolve(fullInvoice);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineInvoices(): Promise<OfflineInvoice[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineInvoices', 'readonly');
    const store = tx.objectStore('offlineInvoices');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function markInvoiceSynced(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineInvoices', 'readwrite');
    const store = tx.objectStore('offlineInvoices');
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
}

// ── Offline Accounting Entries (Lançamentos Contabilísticos) ──

export async function saveOfflineAccountingEntry(entry: Omit<OfflineAccountingEntry, 'id' | 'createdAt' | 'synced'> & { id?: string }): Promise<OfflineAccountingEntry> {
  const db = await openOfflineDB();
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

  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineAccounting', 'readwrite');
    const store = tx.objectStore('offlineAccounting');
    const request = store.put(fullEntry);

    request.onsuccess = () => resolve(fullEntry);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineAccountingEntries(): Promise<OfflineAccountingEntry[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineAccounting', 'readonly');
    const store = tx.objectStore('offlineAccounting');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function markAccountingEntrySynced(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineAccounting', 'readwrite');
    const store = tx.objectStore('offlineAccounting');
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
}

// ── Key-Value Data Cache (Cache Geral) ──────────────────────────

export async function setCacheData(key: string, data: any): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cachedData', 'readwrite');
    const store = tx.objectStore('cachedData');
    const request = store.put({ key, data, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCacheData<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cachedData', 'readonly');
      const store = tx.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ── Offline Drafts (Rascunhos Offline) ──────────────────────────

export async function saveDraft(
  id: string,
  entityType: OfflineDraft['entityType'],
  title: string,
  content: any
): Promise<OfflineDraft> {
  const db = await openOfflineDB();
  const draft: OfflineDraft = {
    id,
    entityType,
    title,
    content,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineDrafts', 'readwrite');
    const store = tx.objectStore('offlineDrafts');
    const request = store.put(draft);

    request.onsuccess = () => resolve(draft);
    request.onerror = () => reject(request.error);
  });
}

export async function getDrafts(): Promise<OfflineDraft[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineDrafts', 'readonly');
    const store = tx.objectStore('offlineDrafts');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offlineDrafts', 'readwrite');
    const store = tx.objectStore('offlineDrafts');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ── Helper: Limpar armazenamento offline ───────────────────────

export async function clearAllOfflineStorage(): Promise<void> {
  const db = await openOfflineDB();
  const stores = ['pendingActions', 'offlineInvoices', 'offlineAccounting', 'cachedData', 'offlineDrafts'];
  
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
  }
}
