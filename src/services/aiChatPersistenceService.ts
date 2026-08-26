/**
 * AI Chat Persistence Service
 * High-performance offline-first synchronization between IndexedDB and Firestore.
 * Ensures AI conversation sessions persist across refreshes, device logins, and offline usage.
 */

import { openIDB } from './dashboardCache';
import { 
  salvarConversaNoFirestore, 
  apagarConversaNoFirestore, 
  carregarConversasDoFirestore, 
  ouvirConversasDoFirestore 
} from '../lib/firebase';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
  isVisual?: boolean;
  diagramSvg?: string;
  hasArtifact?: boolean;
  artifactType?: 'word' | 'excel' | 'powerpoint';
  artifactTitle?: string;
  documentAnalysis?: any;
  accountingAnalysis?: any;
  confidenceScore?: number;
  tags?: string[];
  offlineGenerated?: boolean;
}

export interface ChatConversation {
  id: string;
  uid: string;
  title: string;
  date: string;
  timestamp: string;
  standard: string;
  tag: string;
  messages: ChatMessage[];
  updatedAt: number;
  synced?: boolean;
}

const CHAT_STORE = 'ai_conversations';
const IDB_NAME = 'GestaoAngolaOfflineDB';
const IDB_VERSION = 2; // Upgraded version to include ai_conversations

let cachedChatDB: IDBDatabase | null = null;
let idbChatPromise: Promise<IDBDatabase> | null = null;

function resetChatDB() {
  if (cachedChatDB) {
    try { cachedChatDB.close(); } catch (_) {}
    cachedChatDB = null;
  }
  idbChatPromise = null;
}

export function openChatIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (cachedChatDB) {
    return Promise.resolve(cachedChatDB);
  }

  if (idbChatPromise) {
    return idbChatPromise;
  }

  idbChatPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        // Check existing stores from v1
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('learningModules')) {
          db.createObjectStore('learningModules', { keyPath: 'id' });
        }
        // Chat store
        if (!db.objectStoreNames.contains(CHAT_STORE)) {
          const store = db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
          store.createIndex('uid', 'uid', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        cachedChatDB = db;
        db.onversionchange = () => resetChatDB();
        db.onclose = () => resetChatDB();
        resolve(db);
      };

      request.onerror = () => {
        resetChatDB();
        // Fallback to basic openIDB if version mismatch
        openIDB().then(resolve).catch(reject);
      };

      request.onblocked = () => resetChatDB();
    } catch (e) {
      resetChatDB();
      reject(e);
    }
  });

  return idbChatPromise;
}

/**
 * Loads all conversations for a user from local IndexedDB cache.
 */
export async function getLocalConversations(uid: string): Promise<ChatConversation[]> {
  if (!uid || uid === 'guest') {
    // Return localStorage fallback for guest
    try {
      const raw = localStorage.getItem(`ga_ai_accountant_history_guest`);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  try {
    const db = await openChatIDB();
    if (!db.objectStoreNames.contains(CHAT_STORE)) {
      const raw = localStorage.getItem(`ga_ai_accountant_history_${uid}`);
      return raw ? JSON.parse(raw) : [];
    }

    const tx = db.transaction(CHAT_STORE, 'readonly');
    const store = tx.objectStore(CHAT_STORE);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all: ChatConversation[] = request.result || [];
        const userItems = all.filter(c => c.uid === uid || !c.uid);
        userItems.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(userItems);
      };
      request.onerror = () => {
        console.warn('[AI Chat DB] Error reading IndexedDB, using localStorage fallback');
        const raw = localStorage.getItem(`ga_ai_accountant_history_${uid}`);
        resolve(raw ? JSON.parse(raw) : []);
      };
    });
  } catch (err) {
    console.warn('[AI Chat DB] IndexedDB exception:', err);
    try {
      const raw = localStorage.getItem(`ga_ai_accountant_history_${uid}`);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }
}

/**
 * Saves a conversation to IndexedDB (and localStorage backup) and synchronizes with Firestore if online.
 */
export async function saveConversation(uid: string, conversation: ChatConversation): Promise<void> {
  if (!uid || !conversation.id) return;

  const item: ChatConversation = {
    ...conversation,
    uid,
    updatedAt: conversation.updatedAt || Date.now(),
    synced: false
  };

  // 1. Save to IndexedDB immediately
  try {
    const db = await openChatIDB();
    if (db.objectStoreNames.contains(CHAT_STORE)) {
      const tx = db.transaction(CHAT_STORE, 'readwrite');
      const store = tx.objectStore(CHAT_STORE);
      store.put(item);
      await new Promise((res, rej) => {
        tx.oncomplete = res;
        tx.onerror = rej;
      });
      console.log(`[AI Chat DB] Saved to IndexedDB: ${conversation.id} (${conversation.title})`);
    }
  } catch (e) {
    console.warn('[AI Chat DB] Failed writing to IndexedDB:', e);
  }

  // 2. Backup to localStorage for safety
  try {
    const current = await getLocalConversations(uid);
    const updated = [item, ...current.filter(c => c.id !== item.id)];
    localStorage.setItem(`ga_ai_accountant_history_${uid}`, JSON.stringify(updated.slice(0, 50)));
  } catch (_) {}

  // 3. If online, sync to Firestore
  if (navigator.onLine && uid !== 'guest') {
    try {
      await salvarConversaNoFirestore(uid, item);
      // Mark as synced in IndexedDB
      try {
        const db = await openChatIDB();
        if (db.objectStoreNames.contains(CHAT_STORE)) {
          const tx = db.transaction(CHAT_STORE, 'readwrite');
          const store = tx.objectStore(CHAT_STORE);
          store.put({ ...item, synced: true });
        }
      } catch (_) {}
    } catch (err) {
      console.warn('[AI Chat Sync] Could not sync to Firestore immediately, queued for retry:', err);
    }
  }
}

/**
 * Deletes a conversation locally from IndexedDB, localStorage, and Firestore.
 */
export async function deleteConversation(uid: string, conversationId: string): Promise<void> {
  if (!uid || !conversationId) return;

  // 1. Delete from IndexedDB
  try {
    const db = await openChatIDB();
    if (db.objectStoreNames.contains(CHAT_STORE)) {
      const tx = db.transaction(CHAT_STORE, 'readwrite');
      const store = tx.objectStore(CHAT_STORE);
      store.delete(conversationId);
    }
  } catch (e) {
    console.warn('[AI Chat DB] Error deleting from IndexedDB:', e);
  }

  // 2. Update localStorage
  try {
    const raw = localStorage.getItem(`ga_ai_accountant_history_${uid}`);
    if (raw) {
      const list: ChatConversation[] = JSON.parse(raw);
      const filtered = list.filter(c => c.id !== conversationId);
      localStorage.setItem(`ga_ai_accountant_history_${uid}`, JSON.stringify(filtered));
    }
  } catch (_) {}

  // 3. Delete from Firestore if online
  if (navigator.onLine && uid !== 'guest') {
    try {
      await apagarConversaNoFirestore(uid, conversationId);
    } catch (e) {
      console.warn('[AI Chat Sync] Error deleting from Firestore:', e);
    }
  }
}

/**
 * Synchronizes pending/local conversations with Firestore and merges remote ones.
 */
export async function syncConversationsWithFirestore(
  uid: string, 
  onUpdated?: (conversations: ChatConversation[]) => void
): Promise<ChatConversation[]> {
  if (!uid || uid === 'guest' || !navigator.onLine) {
    const local = await getLocalConversations(uid);
    if (onUpdated) onUpdated(local);
    return local;
  }

  try {
    console.log(`[AI Chat Sync] Starting synchronization for user ${uid}...`);
    // 1. Get local items
    const localItems = await getLocalConversations(uid);
    const localMap = new Map<string, ChatConversation>();
    localItems.forEach(item => localMap.set(item.id, item));

    // 2. Fetch remote items from Firestore
    const remoteDocs = await carregarConversasDoFirestore(uid);
    console.log(`[AI Chat Sync] Retrieved ${remoteDocs.length} conversations from Firestore`);

    // 3. Merge strategies:
    const mergedMap = new Map<string, ChatConversation>();

    // Add all remote items
    for (const rem of remoteDocs) {
      const conv: ChatConversation = {
        id: rem.id,
        uid,
        title: rem.title || 'Consulta Contabilística',
        date: rem.date || new Date(rem.updatedAt || Date.now()).toLocaleDateString(),
        timestamp: rem.timestamp || 'Hoje',
        standard: rem.standard || 'PGC Angola',
        tag: rem.tag || '#Contabilidade',
        messages: rem.messages || [],
        updatedAt: rem.updatedAt || Date.now(),
        synced: true
      };
      mergedMap.set(conv.id, conv);
    }

    // Add local items that are newer or unsynced
    for (const loc of localItems) {
      const existing = mergedMap.get(loc.id);
      if (!existing || (loc.updatedAt && loc.updatedAt > existing.updatedAt)) {
        mergedMap.set(loc.id, loc);
        // Upload newer local to Firestore
        try {
          await salvarConversaNoFirestore(uid, loc);
        } catch (_) {}
      }
    }

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    // 4. Save merged list back to IndexedDB and localStorage
    try {
      const db = await openChatIDB();
      if (db.objectStoreNames.contains(CHAT_STORE)) {
        const tx = db.transaction(CHAT_STORE, 'readwrite');
        const store = tx.objectStore(CHAT_STORE);
        for (const item of mergedList) {
          store.put({ ...item, synced: true });
        }
      }
    } catch (_) {}

    try {
      localStorage.setItem(`ga_ai_accountant_history_${uid}`, JSON.stringify(mergedList.slice(0, 50)));
    } catch (_) {}

    console.log(`[AI Chat Sync] Completed sync. Total conversations: ${mergedList.length}`);
    if (onUpdated) onUpdated(mergedList);
    return mergedList;
  } catch (err) {
    console.warn('[AI Chat Sync] Sync failed, returning local items:', err);
    const local = await getLocalConversations(uid);
    if (onUpdated) onUpdated(local);
    return local;
  }
}

/**
 * Sets up an automatic online listener to re-sync conversations when connection returns.
 */
export function setupChatSyncListener(
  uid: string, 
  onUpdated: (conversations: ChatConversation[]) => void
): () => void {
  if (typeof window === 'undefined' || !uid) return () => {};

  const handleOnline = () => {
    console.log('[AI Chat Listener] Online event detected, syncing conversations...');
    syncConversationsWithFirestore(uid, onUpdated);
  };

  window.addEventListener('online', handleOnline);

  // Also setup real-time listener from Firestore if available
  let unsubscribeFirestore: (() => void) | null = null;
  if (uid !== 'guest') {
    try {
      unsubscribeFirestore = ouvirConversasDoFirestore(uid, (remoteList) => {
        if (remoteList && remoteList.length > 0) {
          syncConversationsWithFirestore(uid, onUpdated);
        }
      });
    } catch (_) {}
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
}
