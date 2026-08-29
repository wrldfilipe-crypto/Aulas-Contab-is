import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, initializeFirestore, memoryLocalCache, setLogLevel,
  collection, doc, setDoc, getDoc, getDocs, deleteDoc, getDocFromServer,
  query, where, orderBy, onSnapshot, writeBatch, runTransaction, serverTimestamp, waitForPendingWrites 
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App & Services
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Suppress internal Firestore connection/retry noise in development & offline environments
try {
  setLogLevel('silent');
} catch (_) {}

// Configurar persistência de sessão local no browser
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Auth Persistence] Info ao configurar browserLocalPersistence:', err);
});

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, (firebaseConfig as any).firestoreDatabaseId);
  console.log('[Firestore] Inicializado com memoryLocalCache (seguro e sem conflitos de WebStorage).');
} catch (err) {
  try {
    firestoreInstance = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  } catch (_) {
    firestoreInstance = getFirestore(app);
  }
}

export const db = firestoreInstance;
export const storage = getStorage(app);
try {
  storage.maxUploadRetryTime = 6000;
  storage.maxOperationRetryTime = 6000;
} catch (_) {}

// ── VERIFICAÇÃO E MONITORIZAÇÃO DO ESTADO DO FIRESTORE ──────────────────────────
let lastHealthCheckTime = 0;
let lastHealthCheckResult = true;
const HEALTH_CACHE_TTL = 4000; // 4s TTL para evitar múltiplos pings em rajadas de cliques

let ultimoAvisoFirestore = '';
let ultimoAvisoFirestoreEm = 0;

export function notificarFirestoreLog(online: boolean, detalhe?: string) {
  const agora = Date.now();
  const mensagem = online
    ? 'Conectividade Firestore restaurada.'
    : `Conectividade Firestore indisponível (modo offline ativo)${detalhe ? `: ${detalhe}` : '.'}`;

  const mudou = lastHealthCheckResult !== online;
  const repetidoRecentemente = ultimoAvisoFirestore === mensagem && agora - ultimoAvisoFirestoreEm < 10_000;

  if (!mudou && repetidoRecentemente) return;

  ultimoAvisoFirestore = mensagem;
  ultimoAvisoFirestoreEm = agora;

  if (online) {
    console.info(`[Firestore] ${mensagem}`);
  } else {
    console.warn(`[Firestore] ${mensagem}`);
  }
}

type FirestoreStatusListener = (disponivel: boolean) => void;
const firestoreStatusListeners = new Set<FirestoreStatusListener>();

export function onFirestoreStatusChanged(listener: FirestoreStatusListener): () => void {
  firestoreStatusListeners.add(listener);
  listener(lastHealthCheckResult);
  return () => {
    firestoreStatusListeners.delete(listener);
  };
}

function notificarStatusFirestore(disponivel: boolean) {
  if (lastHealthCheckResult !== disponivel) {
    lastHealthCheckResult = disponivel;
    notificarFirestoreLog(disponivel);
    firestoreStatusListeners.forEach((fn) => {
      try { fn(disponivel); } catch (_) {}
    });
  }
}

/**
 * Espera segura por escritas pendentes com timeout para evitar bloqueios em modo offline
 */
export async function safeWaitForPendingWrites(timeoutMs = 1500): Promise<void> {
  try {
    await Promise.race([
      waitForPendingWrites(db),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  } catch (_) {}
}

/**
 * Testa se a base de dados Firestore está ativa, aprovisionada e com conectividade.
 * Não polui o console com erros alarmistas quando a app está em modo offline.
 */
export async function firestoreDisponivel(forcar = false): Promise<boolean> {
  const agora = Date.now();
  if (!forcar && agora - lastHealthCheckTime < HEALTH_CACHE_TTL) {
    return lastHealthCheckResult;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notificarStatusFirestore(false);
    lastHealthCheckTime = agora;
    return false;
  }

  try {
    const healthDocPromise = getDocFromServer(doc(db, '_health', 'ping'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de ligação ao Firestore')), 2000)
    );

    await Promise.race([healthDocPromise, timeoutPromise]);
    lastHealthCheckTime = agora;
    notificarStatusFirestore(true);
    return true;
  } catch (e: any) {
    const msg = e?.message || String(e);
    // Se o servidor respondeu com not-found ou permission-denied, o Firestore está ativo e acessível
    if (
      e?.code === 'not-found' ||
      e?.code === 'permission-denied' ||
      msg.includes('No document to update') ||
      msg.includes('Missing or insufficient permissions')
    ) {
      lastHealthCheckTime = agora;
      notificarStatusFirestore(true);
      return true;
    }

    lastHealthCheckTime = agora;
    notificarStatusFirestore(false);
    return false;
  }
}

/** Central de estado de sessão - ouve alterações em tempo real */
export function ouvirSessao(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Firestore Entities and Transactions Sync Helper Functions
export async function saveEntityToFirestore(workspaceId: string, entity: any) {
  try {
    if (!workspaceId || !entity || !entity.id) return;
    if (!(await firestoreDisponivel())) {
      console.info('[Firestore Entities] Armazenamento local ativo (Firestore offline).');
      return;
    }
    const entityRef = doc(db, 'workspaces', workspaceId, 'entities', String(entity.id));
    await setDoc(entityRef, {
      ...entity,
      id: String(entity.id),
      workspaceId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await safeWaitForPendingWrites();
    console.log(`[Firestore Entities] Saved entity ${entity.id} (${entity.name}) to workspace ${workspaceId}`);
  } catch (err: any) {
    console.warn(`[Firestore Entities] Sync aviso para entidade ${entity?.id}:`, err?.message || err);
  }
}

export async function deleteEntityFromFirestore(workspaceId: string, entityId: string) {
  try {
    if (!workspaceId || !entityId) return;
    if (!(await firestoreDisponivel())) {
      console.info('[Firestore Entities] Exclusão local concluída (Firestore offline).');
      return;
    }
    const entityRef = doc(db, 'workspaces', workspaceId, 'entities', String(entityId));
    await deleteDoc(entityRef);
    await safeWaitForPendingWrites();
    console.log(`[Firestore Entities] Deleted entity ${entityId} from workspace ${workspaceId}`);
  } catch (err: any) {
    console.warn(`[Firestore Entities] Sync aviso ao excluir entidade ${entityId}:`, err?.message || err);
  }
}

export function subscribeToFirestoreEntities(workspaceId: string, callback: (entities: any[]) => void) {
  try {
    if (!workspaceId) return () => {};
    const entitiesCol = collection(db, 'workspaces', workspaceId, 'entities');
    return onSnapshot(
      entitiesCol,
      (snapshot) => {
        const list = snapshot.docs.map(d => d.data());
        callback(list);
      },
      (err) => {
        console.warn(`[Firestore Entities Listener] Info ao ouvir entidades para workspace ${workspaceId}:`, err?.message || err);
      }
    );
  } catch (err: any) {
    console.warn(`[Firestore Entities Listener] Exceção para workspace ${workspaceId}:`, err?.message || err);
    return () => {};
  }
}

export async function saveTransactionToFirestore(workspaceId: string, transaction: any) {
  try {
    if (!workspaceId || !transaction || !transaction.id) return;
    if (!(await firestoreDisponivel())) {
      console.info('[Firestore Transactions] Armazenamento local ativo (Firestore offline).');
      return;
    }
    const txRef = doc(db, 'workspaces', workspaceId, 'transactions', String(transaction.id));
    await setDoc(txRef, {
      ...transaction,
      id: String(transaction.id),
      workspaceId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await safeWaitForPendingWrites();
    console.log(`[Firestore Transactions] Saved transaction ${transaction.id} to workspace ${workspaceId}`);
  } catch (err: any) {
    console.warn(`[Firestore Transactions] Sync aviso para transação ${transaction?.id}:`, err?.message || err);
  }
}

export async function deleteTransactionFromFirestore(workspaceId: string, transactionId: string) {
  try {
    if (!workspaceId || !transactionId) return;
    if (!(await firestoreDisponivel())) {
      console.info('[Firestore Transactions] Exclusão local concluída (Firestore offline).');
      return;
    }
    const txRef = doc(db, 'workspaces', workspaceId, 'transactions', String(transactionId));
    await deleteDoc(txRef);
    await safeWaitForPendingWrites();
    console.log(`[Firestore Transactions] Deleted transaction ${transactionId} from workspace ${workspaceId}`);
  } catch (err: any) {
    console.warn(`[Firestore Transactions] Sync aviso ao excluir transação ${transactionId}:`, err?.message || err);
  }
}

export function subscribeToFirestoreTransactions(workspaceId: string, callback: (transactions: any[]) => void) {
  try {
    if (!workspaceId) return () => {};
    const txCol = collection(db, 'workspaces', workspaceId, 'transactions');
    return onSnapshot(
      txCol,
      (snapshot) => {
        const list = snapshot.docs.map(d => d.data());
        callback(list);
      },
      (err) => {
        console.warn(`[Firestore Transactions Listener] Info ao ouvir transações para workspace ${workspaceId}:`, err?.message || err);
      }
    );
  } catch (err: any) {
    console.warn(`[Firestore Transactions Listener] Exceção para workspace ${workspaceId}:`, err?.message || err);
    return () => {};
  }
}

// Firebase Auth Helpers
export async function signInWithFirebaseAuth(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (err: any) {
    console.warn('[Firebase Auth] Sign in failed/fallback:', err?.message || err);
    throw err;
  }
}

export async function signUpWithFirebaseAuth(email: string, pass: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (err: any) {
    console.warn('[Firebase Auth] Sign up failed/fallback:', err?.message || err);
    throw err;
  }
}

export async function signOutFirebaseAuth() {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.warn('[Firebase Auth] Sign out failed:', err?.message || err);
  }
}


export interface FirestoreUserProfile {
  id: string;
  name: string;
  nameLower: string;
  nomeLower: string;
  email: string;
  username: string;
  avatar?: string;
  roleTitle?: string;
  company?: string;
  country?: string;
  standard?: string;
  status: 'online' | 'offline';
  bio?: string;
  updatedAt?: string;
}

// Helper: Ensure user profile exists in Firestore with normalized lowercase name (nomeLower & nameLower)
export async function syncUserProfileToFirestore(profile: Partial<FirestoreUserProfile> & { id: string; name: string }) {
  try {
    if (!profile || !profile.id) return;
    if (!(await firestoreDisponivel())) {
      console.info('[Firestore Sync] Perfil mantido localmente (Firestore offline).');
      return;
    }
    const userRef = doc(db, 'users', profile.id);
    const normalizedName = (profile.name || '').toLowerCase().trim();
    const payload = {
      ...profile,
      nameLower: normalizedName,
      nomeLower: normalizedName,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, payload, { merge: true });
    await safeWaitForPendingWrites();
    console.log(`[Firestore Sync] Perfil do utilizador ${profile.id} (${normalizedName}) sincronizado com sucesso.`);
  } catch (error: any) {
    console.warn('[Firestore Sync] Aviso ao sincronizar perfil no Firestore:', error?.message || error);
  }
}

// Multi-Device Session Management Helpers
export interface DeviceSession {
  id: string;
  userId: string;
  device: string;
  type: 'desktop' | 'mobile' | 'tablet';
  location: string;
  ip: string;
  lastActive: string;
  createdAt: string;
  active: boolean;
}

export function getDeviceId(): string {
  try {
    let devId = localStorage.getItem('ga_device_session_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      try { localStorage.setItem('ga_device_session_id', devId); } catch (_) {}
    }
    return devId;
  } catch (_) {
    return 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
}

export function getDeviceInfo(): { name: string; type: 'desktop' | 'mobile' | 'tablet' } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = 'tablet';
  } else if (/mobile|iphone|android|touch/i.test(ua)) {
    type = 'mobile';
  }
  
  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  let os = 'Dispositivo';
  if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    name: `${os} (${browser})`,
    type
  };
}

export async function registerDeviceSession(userId: string) {
  try {
    if (!userId) return null;
    const deviceId = getDeviceId();
    const info = getDeviceInfo();
    const sessionRef = doc(db, 'users', userId, 'sessions', deviceId);
    
    const snap = await getDoc(sessionRef);

    const sessionData: DeviceSession = {
      id: deviceId,
      userId,
      device: info.name,
      type: info.type,
      location: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Luanda, AO',
      ip: '197.231.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
      lastActive: new Date().toISOString(),
      createdAt: snap.exists() ? snap.data()?.createdAt || new Date().toISOString() : new Date().toISOString(),
      active: true
    };

    await setDoc(sessionRef, sessionData, { merge: true });
    return sessionData;
  } catch (err: any) {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');
    const esperadoOffline =
      code.includes('unavailable') ||
      code.includes('offline') ||
      /client is offline|network|timeout/i.test(msg);

    if (esperadoOffline) {
      notificarFirestoreLog(false, 'sessão local ativa');
    } else {
      console.warn('[Sessions] Erro ao registar sessão no Firestore:', msg || err);
    }
    return null;
  }
}

export function subscribeUserSessions(userId: string, callback: (sessions: DeviceSession[]) => void) {
  try {
    if (!userId) return () => {};
    const colRef = collection(db, 'users', userId, 'sessions');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map(d => d.data() as DeviceSession);
        callback(list);
      },
      (err) => {
        console.warn(`[Sessions Listener] Erro nas sessões do utilizador ${userId}:`, err?.message || err);
      }
    );
  } catch (err: any) {
    console.warn(`[Sessions Listener] Exceção para utilizador ${userId}:`, err?.message || err);
    return () => {};
  }
}

export async function terminateUserSession(userId: string, sessionId: string) {
  try {
    if (!userId || !sessionId) return;
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await setDoc(sessionRef, { active: false, terminatedAt: new Date().toISOString() }, { merge: true });
    console.log(`[Sessions] Sessão ${sessionId} terminada com sucesso.`);
  } catch (err: any) {
    console.warn(`[Sessions] Erro ao terminar sessão ${sessionId}:`, err?.message || err);
  }
}

export async function terminateAllOtherUserSessions(userId: string) {
  try {
    if (!userId) return;
    const currentDeviceId = getDeviceId();
    const colRef = collection(db, 'users', userId, 'sessions');
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      if (d.id !== currentDeviceId) {
        batch.set(d.ref, { active: false, terminatedAt: new Date().toISOString() }, { merge: true });
      }
    });
    await batch.commit();
    console.log(`[Sessions] Todas as outras sessões foram encerradas para ${userId}`);
  } catch (err: any) {
    console.warn('[Sessions] Erro ao encerrar outras sessões:', err?.message || err);
  }
}

export function subscribeUserPreferences(userId: string, callback: (data: any) => void) {
  try {
    if (!userId) return () => {};
    const userRef = doc(db, 'users', userId);
    return onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data());
        }
      },
      (err) => {
        console.warn(`[User Sync Listener] Erro ao escutar dados do utilizador ${userId}:`, err?.message || err);
      }
    );
  } catch (err: any) {
    console.warn(`[User Sync Listener] Exceção para utilizador ${userId}:`, err?.message || err);
    return () => {};
  }
}

// Search users in Firestore with single field range query (nomeLower >= term and nomeLower <= term + '\uf8ff')
export async function searchFirestoreUsers(searchTerm: string): Promise<FirestoreUserProfile[]> {
  try {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      const allDocs = await getDocs(collection(db, 'users'));
      return allDocs.docs.map(d => d.data() as FirestoreUserProfile);
    }

    // Range query on 'nomeLower' without compound index dependencies
    const qNome = query(
      collection(db, 'users'),
      where('nomeLower', '>=', term),
      where('nomeLower', '<=', term + '\uf8ff')
    );

    const snapshot = await getDocs(qNome);
    let results = snapshot.docs.map(d => d.data() as FirestoreUserProfile);

    // Fallback search on 'nameLower' if nomeLower returned empty
    if (results.length === 0) {
      const qName = query(
        collection(db, 'users'),
        where('nameLower', '>=', term),
        where('nameLower', '<=', term + '\uf8ff')
      );
      const snapshotName = await getDocs(qName);
      results = snapshotName.docs.map(d => d.data() as FirestoreUserProfile);
    }

    return results;
  } catch (error: any) {
    console.warn('[Firestore Search] Base de dados Firestore indisponível para busca de utilizadores:', error?.message || error);
    return [];
  }
}

// Get deterministic 1:1 conversation ID
export function getDirectConversationId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('_');
}

// Send message & update conversation document atomically inside a Firestore writeBatch with server write confirmation
export async function sendFirestoreMessage(params: {
  convId: string;
  members: string[];
  senderId: string;
  receiverId?: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file' | 'code';
  attachmentName?: string;
}) {
  if (!(await firestoreDisponivel())) {
    const errMsg = 'Não foi possível enviar a mensagem: base de dados Firestore indisponível no projeto.';
    console.warn(`[Firestore Chat] ${errMsg}`);
    throw new Error(errMsg);
  }

  const msgRef = doc(collection(db, 'conversations', params.convId, 'messages'));
  const convRef = doc(db, 'conversations', params.convId);

  const messageData = {
    id: msgRef.id,
    conversationId: params.convId,
    senderId: params.senderId,
    receiverId: params.receiverId || '',
    content: params.content,
    attachmentUrl: params.attachmentUrl || null,
    attachmentType: params.attachmentType || null,
    attachmentName: params.attachmentName || null,
    createdAt: new Date().toISOString(),
    readAt: null,
    delivered: true
  };

  const uniqueMembers = Array.from(
    new Set([...params.members, params.senderId, params.receiverId].filter((m): m is string => Boolean(m)))
  );

  try {
    const batch = writeBatch(db);
    batch.set(msgRef, messageData);
    batch.set(convRef, {
      id: params.convId,
      members: uniqueMembers,
      lastMessage: messageData,
      ultimaMensagem: params.content,
      updatedAt: new Date().toISOString(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    await safeWaitForPendingWrites();
    console.log(`✅ [Firestore Chat] Mensagem ${msgRef.id} persistida e confirmada pelo servidor Firestore.`);
    return messageData;
  } catch (error: any) {
    console.warn('[Firestore Chat] Erro ao gravar mensagem no Firestore:', error?.message || error);
    throw error;
  }
}

// Subscribe to real-time conversation messages
export function subscribeToFirestoreMessages(
  convId: string, 
  callback: (messages: any[]) => void
) {
  try {
    const msgsRef = collection(db, 'conversations', convId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q, 
      (snapshot) => {
        const msgs = snapshot.docs.map(d => d.data());
        callback(msgs);
      },
      (error) => {
        console.warn(`[Firestore Realtime] Subscrição Firestore pausada/indisponível para conversa ${convId}:`, error?.message || error);
      }
    );
  } catch (error: any) {
    console.warn(`[Firestore Realtime] Exceção ao iniciar subscrição para conversa ${convId}:`, error?.message || error);
    return () => {};
  }
}

// Migration Helper: Ensure all existing conversations have the 'members' field populated
export async function migrateFirestoreConversationsMembers(): Promise<{ migratedCount: number }> {
  try {
    const convsSnap = await getDocs(collection(db, 'conversations'));
    let count = 0;
    const batch = writeBatch(db);

    for (const convDoc of convsSnap.docs) {
      const data = convDoc.data();
      let members: string[] = Array.isArray(data.members) ? data.members : [];

      if (members.length === 0) {
        // Infer members from document ID (e.g. userIdA_userIdB) or fields
        const docId = convDoc.id;
        if (docId.includes('_')) {
          members = docId.split('_').filter(Boolean);
        } else {
          const possible = [data.senderId, data.receiverId, data.ownerId, ...(Array.isArray(data.participants) ? data.participants : [])];
          members = Array.from(new Set(possible.filter((p): p is string => Boolean(p))));
        }

        if (members.length > 0) {
          batch.update(convDoc.ref, { members, updatedAt: new Date().toISOString() });
          count++;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`[Firestore Migration] ${count} conversas antigas foram atualizadas com o campo "members".`);
    } else {
      console.log('[Firestore Migration] Nenhuma conversa pendente de migração.');
    }

    return { migratedCount: count };
  } catch (error: any) {
    console.warn('[Firestore Migration] Não foi possível migrar conversas do Firestore (base de dados não aprovisionada ou indisponível):', error?.message || error);
    return { migratedCount: 0 };
  }
}

// ── FIRESTORE SOCIAL & CHAT HELPERS ────────────────────────────

let searchDebounceTimer: any = null;

export function buscarUsuariosDebounced(termo: string, delay = 300): Promise<FirestoreUserProfile[]> {
  return new Promise((resolve, reject) => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(async () => {
      try {
        const results = await searchFirestoreUsers(termo);
        resolve(results);
      } catch (err: any) {
        console.error('[buscarUsuariosDebounced] Erro na pesquisa com debounce:', err);
        reject(err);
      }
    }, delay);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload da foto de perfil para o Firebase Storage com fallback automático para Data URL
 */
export async function uploadFotoPerfil(
  uid: string, 
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!uid) {
    const err = new Error("UID do utilizador não fornecido.");
    console.error("[uploadFotoPerfil]", err);
    throw err;
  }
  if (!file) {
    const err = new Error("Ficheiro de imagem inválido.");
    console.error("[uploadFotoPerfil]", err);
    throw err;
  }

  let downloadUrl = '';

  try {
    const storagePath = `profilePhotos/${uid}/foto.jpg`;
    const storageRef = ref(storage, storagePath);

    try {
      await deleteObject(storageRef);
    } catch (_) {
      // Normal se for a primeira foto
    }

    const task = uploadBytesResumable(storageRef, file);

    downloadUrl = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch (_) {}
        reject(new Error("Storage upload timeout"));
      }, 5000);

      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (erro) => {
          clearTimeout(timeoutId);
          reject(erro);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  } catch (err: any) {
    console.warn("[uploadFotoPerfil] Firebase Storage indisponível (" + (err?.code || err?.message) + "). A utilizar fallback de Data URL base64...");
    if (onProgress) onProgress(50);
    downloadUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
  }

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { 
      fotoUrl: downloadUrl,
      avatar: downloadUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (dbErr) {
    console.error("[uploadFotoPerfil] Erro ao atualizar utilizador no Firestore:", dbErr);
  }

  try {
    const rawSession = localStorage.getItem('ga_session');
    if (rawSession) {
      const sess = JSON.parse(rawSession);
      if (sess.userId === uid) {
        sess.photoUrl = downloadUrl;
        sess.fotoUrl = downloadUrl;
        localStorage.setItem('ga_session', JSON.stringify(sess));
      }
    }
  } catch (e) {
    console.error("Erro ao atualizar foto na sessão local:", e);
  }

  console.log("Foto de perfil enviada e atualizada com sucesso.");
  return downloadUrl;
}

/**
 * Envia um ficheiro (imagem, PDF, DOCX, TXT, etc.) no chat via Firebase Storage com fallback para Data URL
 */
export async function enviarArquivo(
  convId: string,
  senderId: string,
  file: File,
  onProgress?: (percent: number) => void,
  receiverId?: string
): Promise<any> {
  if (!convId || !senderId || !file) {
    const err = new Error("Parâmetros inválidos para envio de ficheiro.");
    console.error("[enviarArquivo]", err);
    throw err;
  }

  let downloadUrl = '';

  try {
    const ext = file.name.split('.').pop() || 'bin';
    const nomeUnico = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storagePath = `conversations/${convId}/files/${nomeUnico}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file);

    downloadUrl = await new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch (_) {}
        reject(new Error("Storage upload timeout"));
      }, 5000);

      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (erro) => {
          clearTimeout(timeoutId);
          reject(erro);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  } catch (err: any) {
    console.warn("[enviarArquivo] Firebase Storage indisponível (" + (err?.code || err?.message) + "). A utilizar fallback de Data URL base64...");
    if (onProgress) onProgress(50);
    downloadUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(100);
  }

  if (!(await firestoreDisponivel())) {
    const errMsg = 'Não foi possível enviar ficheiro: base de dados Firestore indisponível no projeto.';
    console.warn(`[enviarArquivo] ${errMsg}`);
    throw new Error(errMsg);
  }

  const msgRef = doc(collection(db, 'conversations', convId, 'messages'));
  const messageData = {
    id: msgRef.id,
    convId,
    tipo: 'arquivo',
    senderId,
    receiverId: receiverId || '',
    content: `📎 ${file.name}`,
    texto: `📎 ${file.name}`,
    arquivoUrl: downloadUrl,
    arquivoNome: file.name,
    arquivoTipo: file.type || 'application/octet-stream',
    arquivoTamanho: file.size,
    criadoEm: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const batch = writeBatch(db);
  batch.set(msgRef, messageData);

  const convRef = doc(db, 'conversations', convId);
  batch.set(convRef, {
    id: convId,
    members: [senderId, ...(receiverId ? [receiverId] : [])],
    lastMessage: messageData,
    ultimaMensagem: `📎 ${file.name}`,
    atualizadoEm: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await batch.commit();
  await safeWaitForPendingWrites();
  console.log('✅ [enviarArquivo] Ficheiro enviado e confirmado pelo servidor Firestore:', file.name);
  return messageData;
}

/**
 * Script de migração no Firestore que move mensagens incorretamente alocadas
 * em 'users/{uid}/messages' para 'conversations/{convId}/messages'
 */
export async function migrarMensagensIncorretas(): Promise<{ migrados: number }> {
  try {
    if (!(await firestoreDisponivel())) {
      console.warn('[Migração Firestore] Cancelada: Firestore indisponível.');
      return { migrados: 0 };
    }
    let count = 0;
    const usersSnap = await getDocs(collection(db, 'users'));

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const legacyMsgsRef = collection(db, 'users', uid, 'messages');
      let legacySnap: any;
      try {
        legacySnap = await getDocs(legacyMsgsRef);
      } catch (e) {
        continue;
      }

      if (legacySnap && !legacySnap.empty) {
        const batch = writeBatch(db);

        for (const msgDoc of legacySnap.docs) {
          const data = msgDoc.data();
          const senderId = data.senderId || uid;
          const receiverId = data.receiverId || data.toUserId || data.targetUserId;

          if (receiverId) {
            const convId = getDirectConversationId(senderId, receiverId);
            const targetMsgRef = doc(db, 'conversations', convId, 'messages', msgDoc.id);

            batch.set(targetMsgRef, {
              ...data,
              id: msgDoc.id,
              convId,
              senderId,
              receiverId,
              criadoEm: data.criadoEm || data.createdAt || new Date().toISOString(),
              createdAt: data.createdAt || data.criadoEm || new Date().toISOString()
            }, { merge: true });

            batch.delete(msgDoc.ref);
            count++;
          }
        }

        await batch.commit();
      }
    }

    if (count > 0) {
      await safeWaitForPendingWrites();
      console.log(`[Migração Firestore] ${count} mensagens foram movidas com sucesso de 'users/{uid}/messages' para 'conversations/{convId}/messages'.`);
    } else {
      console.log('[Migração Firestore] Nenhuma mensagem antiga pendente de migração.');
    }
    return { migrados: count };
  } catch (err: any) {
    console.warn('[Migração Firestore] Erro ao executar migração de mensagens:', err);
    return { migrados: 0 };
  }
}

export async function garantirPerfil(user: { id: string; name: string; email: string; avatar?: string; roleTitle?: string; country?: string }) {
  return syncUserProfileToFirestore(user);
}

export async function buscarUsuarios(termo: string): Promise<FirestoreUserProfile[]> {
  return searchFirestoreUsers(termo);
}

export async function enviarPedidoAmizade(meuUid: string, uidDestino: string) {
  if (!(await firestoreDisponivel())) {
    const errMsg = 'Não foi possível enviar pedido de amizade: base de dados Firestore indisponível.';
    console.warn(`[Firestore Amizades] ${errMsg}`);
    throw new Error(errMsg);
  }
  try {
    const reqRef = doc(collection(db, 'friendRequests'));
    const data = {
      id: reqRef.id,
      from: meuUid,
      fromUserId: meuUid,
      to: uidDestino,
      toUserId: uidDestino,
      status: 'pendente',
      criadoEm: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(reqRef, data);
    await safeWaitForPendingWrites();
    console.log('✅ [Firestore Amizades] Pedido de amizade enviado e confirmado pelo servidor.');
    return data;
  } catch (err: any) {
    console.warn('[Firestore] Erro ao enviar pedido de amizade:', err);
    throw err;
  }
}

export function ouvirPedidosRecebidos(
  meuUid: string, 
  callback: (pedidos: any[], loading: boolean) => void
) {
  try {
    if (!meuUid) {
      callback([], false);
      return () => {};
    }
    callback([], true); // Informa estado de carregamento inicial

    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', meuUid),
      where('status', '==', 'pendente')
    );

    return onSnapshot(q, (snap) => {
      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(pedidos, false);
    }, (err) => {
      console.warn('[Firestore Listener] Erro ao ouvir pedidos de amizade:', err?.message || err);
      callback([], false);
    });
  } catch (err) {
    console.warn('[Firestore] Exceção em ouvirPedidosRecebidos:', err);
    callback([], false);
    return () => {};
  }
}

export async function aceitarPedido(reqId: string, meuUid: string, uidRemetente: string) {
  if (!(await firestoreDisponivel())) {
    const errMsg = 'Não foi possível aceitar pedido: base de dados Firestore indisponível.';
    console.warn(`[Firestore Amizades] ${errMsg}`);
    throw new Error(errMsg);
  }
  try {
    const batch = writeBatch(db);
    const reqRef = doc(db, 'friendRequests', reqId);
    batch.set(reqRef, { status: 'aceito', updatedAt: new Date().toISOString() }, { merge: true });

    const fId = [meuUid, uidRemetente].sort().join('_');
    const fRef = doc(db, 'friendships', fId);
    batch.set(fRef, {
      id: fId,
      members: [meuUid, uidRemetente],
      criadoEm: new Date().toISOString()
    }, { merge: true });

    const convId = getDirectConversationId(meuUid, uidRemetente);
    const convRef = doc(db, 'conversations', convId);
    batch.set(convRef, {
      id: convId,
      members: [meuUid, uidRemetente].sort(),
      atualizadoEm: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await batch.commit();
    await safeWaitForPendingWrites();
    console.log('✅ [Firestore Amizades] Pedido aceito e confirmado pelo servidor.');
    return true;
  } catch (err: any) {
    console.warn('[Firestore] Erro ao aceitar pedido de amizade:', err);
    throw err;
  }
}

export function ouvirAmigos(meuUid: string, callback: (amigos: any[]) => void) {
  try {
    const q = query(
      collection(db, 'friendships'),
      where('members', 'array-contains', meuUid)
    );
    return onSnapshot(q, (snap) => {
      const friendships = snap.docs.map(d => d.data());
      callback(friendships);
    }, (err) => {
      console.warn('[Firestore Listener] Erro ao ouvir amizades:', err?.message || err);
    });
  } catch (err) {
    console.warn('[Firestore] Exceção em ouvirAmigos:', err);
    return () => {};
  }
}

export async function criarConversa1x1(meuUid: string, uidOutro: string): Promise<string> {
  const convId = getDirectConversationId(meuUid, uidOutro);
  try {
    if (!(await firestoreDisponivel())) {
      console.warn('[Firestore] Impossível criar conversa 1x1: base de dados indisponível.');
      return convId;
    }
    const convRef = doc(db, 'conversations', convId);
    await setDoc(convRef, {
      id: convId,
      members: [meuUid, uidOutro].sort(),
      atualizadoEm: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await waitForPendingWrites(db).catch(() => {});
    return convId;
  } catch (err: any) {
    console.error('[Firestore] Erro ao criar conversa 1x1:', err);
    return convId;
  }
}

export function ouvirConversas(meuUid: string, callback: (conversas: any[]) => void) {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', meuUid)
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => d.data());
      callback(list);
    }, (err) => {
      console.warn('[Firestore Listener] Erro ao ouvir conversas:', err?.message || err);
    });
  } catch (err) {
    console.warn('[Firestore] Exceção em ouvirConversas:', err);
    return () => {};
  }
}

export async function enviarMensagem(
  convId: string,
  meuUid: string,
  receiverId: string,
  texto: string,
  attachment?: { url?: string; type?: 'image' | 'file' | 'code'; name?: string }
) {
  return sendFirestoreMessage({
    convId,
    members: [meuUid, receiverId],
    senderId: meuUid,
    receiverId,
    content: texto,
    attachmentUrl: attachment?.url,
    attachmentType: attachment?.type,
    attachmentName: attachment?.name
  });
}

export function ouvirMensagens(convId: string, callback: (mensagens: any[]) => void) {
  return subscribeToFirestoreMessages(convId, callback);
}

// ==========================================
// PREFERÊNCIAS E CONFLITOS (serverTimestamp)
// ==========================================
export async function salvarPreferencias(uid: string, prefs: Record<string, unknown>) {
  if (!uid) return;
  if (!(await firestoreDisponivel())) {
    console.info(`[Firestore Preferences] Preferências mantidas localmente para ${uid} (Firestore offline).`);
    return;
  }
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      preferencias: prefs,
      preferences: prefs,
      updatedAt: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    }, { merge: true });
    await safeWaitForPendingWrites();
    console.log(`✅ [Firestore Preferences] Preferências atualizadas no servidor para ${uid}`);
    notificarOutrasAbas({ tipo: 'preferencias_atualizadas', uid, prefs });
  } catch (err) {
    console.warn(`[Firestore Preferences] Erro ao salvar preferências do utilizador ${uid}:`, err);
    throw err;
  }
}

// ==========================================
// MULTI-ABA (BroadcastChannel + Storage Event)
// ==========================================
const CANAL_MULTI_ABA = "sync_multi_aba";

export function notificarOutrasAbas(dados: unknown) {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(CANAL_MULTI_ABA);
      bc.postMessage(dados);
      bc.close();
    } else {
      localStorage.setItem("ultima_alteracao_app", JSON.stringify({ dados, ts: Date.now() }));
    }
  } catch (e) {
    console.warn("[MultiAba] BroadcastChannel falhou, a recorrer a storage event:", e);
    try {
      localStorage.setItem("ultima_alteracao_app", JSON.stringify({ dados, ts: Date.now() }));
    } catch (err) {
      console.warn("[MultiAba] Aviso ao gravar evento de storage para multi-aba:", err);
    }
  }
}

export function ouvirOutrasAbas(callback: (dados: unknown) => void) {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(CANAL_MULTI_ABA);
      bc.onmessage = (e) => callback(e.data);
    } catch (err) {
      console.warn("[MultiAba] Erro ao instanciar BroadcastChannel:", err);
    }
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === "ultima_alteracao_app" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.dados) {
          callback(parsed.dados);
        }
      } catch (err) {
        console.warn("[MultiAba] Erro ao processar evento storage:", err);
      }
    }
  };

  window.addEventListener("storage", storageHandler);

  return () => {
    if (bc) {
      try { bc.close(); } catch (_) {}
    }
    window.removeEventListener("storage", storageHandler);
  };
}

// ==========================================
// SYNC ENGINE / ESCRITAS DIRETAS
// Substituído o enfileiramento infinito de localStorage por escritas com confirmação do servidor.
// ==========================================
export type Op = {
  id: string;
  tipo: string;
  dados: Record<string, unknown>;
  criadoEm: number;
};

export async function executarOp(op: Op): Promise<void> {
  switch (op.tipo) {
    case "mensagem":
      await sendFirestoreMessage({
        convId: op.dados.convId as string,
        members: (op.dados.members as string[]) || [(op.dados.senderId || op.dados.meuUid) as string],
        senderId: (op.dados.senderId || op.dados.meuUid) as string,
        receiverId: op.dados.receiverId as string,
        content: (op.dados.texto || op.dados.content) as string
      });
      break;
    case "arquivo":
      if (op.dados.file instanceof File) {
        await enviarArquivo(
          op.dados.convId as string,
          (op.dados.senderId || op.dados.meuUid) as string,
          op.dados.file as File,
          undefined,
          op.dados.receiverId as string
        );
      } else {
        console.warn("[Sync Engine] Ficheiro não é uma instância válida de File.");
      }
      break;
    case "amizade":
      await enviarPedidoAmizade(
        (op.dados.from || op.dados.meuUid) as string,
        (op.dados.to || op.dados.uidDestino) as string
      );
      break;
    case "preferencias":
      await salvarPreferencias(op.dados.uid as string, op.dados.prefs as Record<string, unknown>);
      break;
    default:
      console.warn("[Sync Engine] Operação desconhecida:", op.tipo);
      throw new Error("Operação desconhecida: " + op.tipo);
  }
}

export async function enfileirarOperacao(uid: string, op: Omit<Op, "id" | "criadoEm">) {
  if (!uid) {
    console.warn("[Sync Engine] Impossível executar operação sem UID.");
    return;
  }
  const item: Op = {
    ...op,
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
    criadoEm: Date.now()
  };

  try {
    if (!(await firestoreDisponivel())) {
      console.info("[Sync Engine] Operação mantida localmente: base de dados Firestore offline.");
      return;
    }
    await executarOp(item);
    console.log("✅ [Sync Engine] Operação executada com sucesso:", item.tipo);
    notificarOutrasAbas({ tipo: `sync_${item.tipo}`, item });
  } catch (err) {
    console.warn("[Sync Engine] Falha na execução da operação:", item.tipo, err);
  }
}

export async function sincronizarFila(uid: string) {
  // O sistema agora opera com escritas diretas confirmadas; não mantém fila de mutações no localStorage
  if (!uid) return;
  if (!(await firestoreDisponivel())) {
    return;
  }
  // Limpeza de segurança caso houvesse lixo antigo
  try {
    localStorage.removeItem(`fila_offline_${uid}`);
  } catch (_) {}
}

export function iniciarSyncAutomatico(uid: string) {
  if (typeof window === 'undefined' || !uid) return () => {};

  const handleOnline = async () => {
    if (await firestoreDisponivel(true)) {
      console.log("[Sync Engine] Ligação ao Firestore restabelecida.");
    }
  };

  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

// ── SINCRONIZAÇÃO DE NOTAS NO FIRESTORE (users/{UID}/notas/{ID_DA_NOTA}) ────────
/**
 * Salva ou atualiza uma nota no Firestore na subcoleção do utilizador.
 */
export async function salvarNotaNoFirestore(uid: string, nota: Record<string, any>): Promise<void> {
  if (!uid || uid === 'guest' || !nota || !nota.id) return;
  try {
    const notaRef = doc(db, 'users', uid, 'notas', String(nota.id));
    const payload = {
      ...nota,
      atualizadaEm: nota.updatedAt || nota.atualizadaEm || Date.now(),
      updatedAt: nota.updatedAt || nota.atualizadaEm || Date.now()
    };
    await setDoc(notaRef, payload, { merge: true });
  } catch (err: any) {
    console.warn(`[Firestore Notas] Erro ao gravar nota ${nota.id}:`, err?.message || err);
    throw err;
  }
}

/**
 * Remove uma nota do Firestore.
 */
export async function apagarNotaNoFirestore(uid: string, idNota: string): Promise<void> {
  if (!uid || uid === 'guest' || !idNota) return;
  try {
    const notaRef = doc(db, 'users', uid, 'notas', String(idNota));
    await deleteDoc(notaRef);
  } catch (err: any) {
    console.warn(`[Firestore Notas] Erro ao apagar nota ${idNota}:`, err?.message || err);
    throw err;
  }
}

/**
 * Escuta alterações em tempo real nas notas do utilizador no Firestore.
 */
export function ouvirNotasDoFirestore(
  uid: string,
  onNotasAtualizadas: (notas: any[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!uid || uid === 'guest') {
    return () => {};
  }

  try {
    const notasCollRef = collection(db, 'users', uid, 'notas');
    return onSnapshot(
      notasCollRef,
      (snapshot) => {
        const lista: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && (data.id || docSnap.id)) {
            lista.push({
              id: data.id || docSnap.id,
              ...data
            });
          }
        });
        onNotasAtualizadas(lista);
      },
      (error) => {
        console.warn('[Firestore Notas] Erro ou modo offline no listener:', error?.message || error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('[Firestore Notas] Falha ao registar listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

// ── SINCRONIZAÇÃO DE CONVERSAS IA NO FIRESTORE (users/{UID}/ai_conversations/{ID}) ──
/**
 * Salva ou atualiza uma conversa de IA no Firestore na subcoleção do utilizador.
 */
export async function salvarConversaNoFirestore(uid: string, conversa: Record<string, any>): Promise<void> {
  if (!uid || uid === 'guest' || !conversa || !conversa.id) return;
  try {
    const convRef = doc(db, 'users', uid, 'ai_conversations', String(conversa.id));
    const payload = {
      ...conversa,
      updatedAt: conversa.updatedAt || Date.now(),
      atualizadaEm: conversa.updatedAt || Date.now(),
      uid
    };
    await setDoc(convRef, payload, { merge: true });
    console.log(`[Firestore AI Chat] Conversa ${conversa.id} salva com sucesso para o utilizador ${uid}`);
  } catch (err: any) {
    console.warn(`[Firestore AI Chat] Erro ao gravar conversa ${conversa.id}:`, err?.message || err);
    throw err;
  }
}

/**
 * Remove uma conversa de IA do Firestore.
 */
export async function apagarConversaNoFirestore(uid: string, idConversa: string): Promise<void> {
  if (!uid || uid === 'guest' || !idConversa) return;
  try {
    const convRef = doc(db, 'users', uid, 'ai_conversations', String(idConversa));
    await deleteDoc(convRef);
    console.log(`[Firestore AI Chat] Conversa ${idConversa} apagada para o utilizador ${uid}`);
  } catch (err: any) {
    console.warn(`[Firestore AI Chat] Erro ao apagar conversa ${idConversa}:`, err?.message || err);
    throw err;
  }
}

/**
 * Carrega todas as conversas do utilizador a partir do Firestore.
 */
export async function carregarConversasDoFirestore(uid: string): Promise<any[]> {
  if (!uid || uid === 'guest') return [];
  try {
    const convCollRef = collection(db, 'users', uid, 'ai_conversations');
    const q = query(convCollRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const lista: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        lista.push({
          id: docSnap.id,
          ...data
        });
      }
    });
    return lista;
  } catch (err: any) {
    console.warn('[Firestore AI Chat] Falha ao carregar conversas:', err?.message || err);
    return [];
  }
}

/**
 * Escuta alterações em tempo real nas conversas de IA do utilizador no Firestore.
 */
export function ouvirConversasDoFirestore(
  uid: string,
  onConversasAtualizadas: (conversas: any[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!uid || uid === 'guest') {
    return () => {};
  }

  try {
    const convCollRef = collection(db, 'users', uid, 'ai_conversations');
    return onSnapshot(
      convCollRef,
      (snapshot) => {
        const lista: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && (data.id || docSnap.id)) {
            lista.push({
              id: data.id || docSnap.id,
              ...data
            });
          }
        });
        // Ordenar por updatedAt desc
        lista.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onConversasAtualizadas(lista);
      },
      (error) => {
        console.warn('[Firestore AI Chat] Erro ou modo offline no listener:', error?.message || error);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('[Firestore AI Chat] Falha ao registar listener de conversas:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Regista o feedback persistente (positivo ou negativo) do utilizador no Firestore
 * para auditoria e calibração contínua das respostas de IA do Yohan.
 */
export async function salvarFeedbackYohanFirestore(
  uid: string,
  messageId: string,
  rating: 'up' | 'down',
  conversationId?: string,
  messageContent?: string,
  comments?: string
): Promise<boolean> {
  const effectiveUid = uid || 'anonymous_user';
  try {
    const feedbackDocRef = doc(collection(db, 'users', effectiveUid, 'yohan_feedback'), `fb_${messageId}`);
    await setDoc(feedbackDocRef, {
      messageId,
      rating,
      conversationId: conversationId || 'default_chat',
      messagePreview: messageContent ? messageContent.substring(0, 200) : '',
      comments: comments || '',
      updatedAt: Date.now(),
      createdAt: serverTimestamp()
    }, { merge: true });

    // Registo global de telemetria de feedback para melhorias
    try {
      const globalFeedbackRef = doc(collection(db, 'yohan_feedback_telemetry'), `fb_${effectiveUid}_${messageId}`);
      await setDoc(globalFeedbackRef, {
        userId: effectiveUid,
        messageId,
        rating,
        conversationId: conversationId || 'default_chat',
        updatedAt: Date.now()
      }, { merge: true });
    } catch (_) {}

    return true;
  } catch (err) {
    console.warn('[Firestore Yohan Feedback] Erro ao persistir feedback:', err);
    return false;
  }
}



