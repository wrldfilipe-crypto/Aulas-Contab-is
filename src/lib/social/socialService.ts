import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, firestoreDisponivel, safeWaitForPendingWrites } from '../firebase';
import { SocialUser, FriendRequest, Friendship, Conversation, Message } from './types';

// In-memory cache for user profiles to avoid repeated Firestore lookups
const userProfileCache = new Map<string, SocialUser>();

/**
 * Normaliza o ID determinístico para conversas diretas 1:1
 */
export function getDeterministicConvId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/**
 * Obtém ou carrega os dados de perfil de um utilizador
 */
export async function getCachedUserProfile(uid: string): Promise<SocialUser | null> {
  if (!uid) return null;
  if (userProfileCache.has(uid)) {
    return userProfileCache.get(uid)!;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const profile: SocialUser = {
        id: uid,
        name: data.name || data.nome || 'Utilizador',
        nomeLower: data.nomeLower || data.nameLower || (data.name || '').toLowerCase(),
        nameLower: data.nameLower || (data.name || '').toLowerCase(),
        email: data.email || '',
        username: data.username || '',
        avatar: data.avatar || data.fotoUrl || '',
        fotoUrl: data.fotoUrl || data.avatar || '',
        roleTitle: data.roleTitle || data.role || '',
        company: data.company || '',
        country: data.country || '',
        status: data.status || 'offline',
        bio: data.bio || '',
        updatedAt: data.updatedAt
      };
      userProfileCache.set(uid, profile);
      return profile;
    }
  } catch (err) {
    console.error(`[socialService:getCachedUserProfile] Erro ao carregar perfil ${uid}:`, err);
  }
  return null;
}

/**
 * Pesquisa utilizadores no Firestore por nome (range query no campo nomeLower)
 */
export async function pesquisarUsuarios(termo: string, meuUid: string): Promise<SocialUser[]> {
  try {
    const term = termo.toLowerCase().trim();
    const usersCol = collection(db, 'users');

    let results: SocialUser[] = [];

    if (!term) {
      // Retorna os utilizadores recentes
      const qRecent = query(usersCol, limit(25));
      const snap = await getDocs(qRecent);
      results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.nome || 'Utilizador',
          nomeLower: data.nomeLower || (data.name || '').toLowerCase(),
          nameLower: data.nameLower || (data.name || '').toLowerCase(),
          email: data.email || '',
          avatar: data.avatar || data.fotoUrl || '',
          fotoUrl: data.fotoUrl || data.avatar || '',
          roleTitle: data.roleTitle || data.role || '',
          company: data.company || '',
          country: data.country || '',
          status: data.status || 'offline',
          bio: data.bio || ''
        };
      });
    } else {
      // Query de range em nomeLower sem índice composto
      const qNome = query(
        usersCol,
        where('nomeLower', '>=', term),
        where('nomeLower', '<=', term + '\uf8ff'),
        limit(20)
      );

      const snap = await getDocs(qNome);
      results = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || data.nome || 'Utilizador',
          nomeLower: data.nomeLower || (data.name || '').toLowerCase(),
          nameLower: data.nameLower || (data.name || '').toLowerCase(),
          email: data.email || '',
          avatar: data.avatar || data.fotoUrl || '',
          fotoUrl: data.fotoUrl || data.avatar || '',
          roleTitle: data.roleTitle || data.role || '',
          company: data.company || '',
          country: data.country || '',
          status: data.status || 'offline',
          bio: data.bio || ''
        };
      });

      // Se não encontrou por nomeLower, tenta fallback com nameLower
      if (results.length === 0) {
        const qName = query(
          usersCol,
          where('nameLower', '>=', term),
          where('nameLower', '<=', term + '\uf8ff'),
          limit(20)
        );
        const snapFallback = await getDocs(qName);
        results = snapFallback.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || data.nome || 'Utilizador',
            nomeLower: data.nomeLower || (data.name || '').toLowerCase(),
            nameLower: data.nameLower || (data.name || '').toLowerCase(),
            email: data.email || '',
            avatar: data.avatar || data.fotoUrl || '',
            fotoUrl: data.fotoUrl || data.avatar || '',
            roleTitle: data.roleTitle || data.role || '',
            company: data.company || '',
            country: data.country || '',
            status: data.status || 'offline',
            bio: data.bio || ''
          };
        });
      }
    }

    // Exclui o próprio utilizador e atualiza cache
    const filtered = results.filter(u => u.id !== meuUid);
    filtered.forEach(u => userProfileCache.set(u.id, u));
    return filtered;
  } catch (err) {
    console.error('[socialService:pesquisarUsuarios] Erro ao pesquisar utilizadores:', err);
    return [];
  }
}

/**
 * Verifica a relação de amizade entre dois utilizadores
 */
export async function verificarRelacao(
  meuUid: string,
  outroUid: string
): Promise<'amigo' | 'pedido_enviado' | 'pedido_recebido' | 'nenhum'> {
  if (!meuUid || !outroUid || meuUid === outroUid) return 'nenhum';

  try {
    // 1. Verifica se já existe amizade (ID determinístico)
    const friendshipId = getDeterministicConvId(meuUid, outroUid);
    const fDoc = await getDoc(doc(db, 'friendships', friendshipId));
    if (fDoc.exists()) {
      return 'amigo';
    }

    // 2. Verifica se enviei pedido pendente
    const qSent = query(
      collection(db, 'friendRequests'),
      where('from', '==', meuUid),
      where('to', '==', outroUid),
      where('status', '==', 'pendente')
    );
    const snapSent = await getDocs(qSent);
    if (!snapSent.empty) {
      return 'pedido_enviado';
    }

    // 3. Verifica se recebi pedido pendente
    const qReceived = query(
      collection(db, 'friendRequests'),
      where('from', '==', outroUid),
      where('to', '==', meuUid),
      where('status', '==', 'pendente')
    );
    const snapReceived = await getDocs(qReceived);
    if (!snapReceived.empty) {
      return 'pedido_recebido';
    }

    return 'nenhum';
  } catch (err) {
    console.error(`[socialService:verificarRelacao] Erro ao verificar relação entre ${meuUid} e ${outroUid}:`, err);
    return 'nenhum';
  }
}

/**
 * Envia um pedido de amizade
 */
export async function enviarPedidoAmizade(
  meuUid: string,
  destinatarioUid: string
): Promise<FriendRequest> {
  if (!meuUid || !destinatarioUid || meuUid === destinatarioUid) {
    const err = new Error('Parâmetros inválidos para envio de pedido de amizade.');
    console.error('[socialService:enviarPedidoAmizade]', err);
    throw err;
  }

  try {
    const reqRef = doc(collection(db, 'friendRequests'));
    const nowIso = new Date().toISOString();

    const requestData: FriendRequest = {
      id: reqRef.id,
      from: meuUid,
      to: destinatarioUid,
      fromUserId: meuUid,
      toUserId: destinatarioUid,
      status: 'pendente',
      criadoEm: nowIso,
      createdAt: nowIso
    };

    await setDoc(reqRef, requestData);
    await safeWaitForPendingWrites();
    console.log(`[socialService:enviarPedidoAmizade] Pedido enviado para ${destinatarioUid} (ID: ${reqRef.id})`);
    return requestData;
  } catch (err) {
    console.error('[socialService:enviarPedidoAmizade] Erro ao enviar pedido de amizade:', err);
    throw err;
  }
}

/**
 * Ouve pedidos de amizade recebidos em tempo real (where to == meuUid && status == 'pendente')
 */
export function ouvirPedidosRecebidos(
  meuUid: string,
  callback: (pedidos: FriendRequest[]) => void
): () => void {
  if (!meuUid) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', meuUid),
      where('status', '==', 'pendente')
    );

    return onSnapshot(
      q,
      async (snap) => {
        const pedidos: FriendRequest[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          const fromUid = data.from || data.fromUserId;
          let fromUser: SocialUser | undefined = undefined;

          if (fromUid) {
            const loaded = await getCachedUserProfile(fromUid);
            if (loaded) fromUser = loaded;
          }

          pedidos.push({
            id: d.id,
            from: fromUid,
            to: data.to || data.toUserId,
            fromUserId: fromUid,
            toUserId: data.to || data.toUserId,
            status: data.status,
            criadoEm: data.criadoEm || data.createdAt,
            createdAt: data.createdAt || data.criadoEm,
            fromUser
          });
        }
        callback(pedidos);
      },
      (error) => {
        console.error('[socialService:ouvirPedidosRecebidos] Erro no listener de pedidos recebidos:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[socialService:ouvirPedidosRecebidos] Exceção ao configurar listener:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Aceita um pedido de amizade atomicamente:
 * 1. Atualiza o status do pedido para 'aceito'
 * 2. Cria o documento de amizade em 'friendships' com members [meuUid, remetenteUid]
 * 3. Cria/atualiza a conversa 1:1 com ID determinístico members.sort().join("_")
 */
export async function aceitarPedidoAmizade(
  pedidoId: string,
  meuUid: string,
  remetenteUid: string
): Promise<boolean> {
  if (!pedidoId || !meuUid || !remetenteUid) {
    const err = new Error('Parâmetros inválidos para aceitar pedido de amizade.');
    console.error('[socialService:aceitarPedidoAmizade]', err);
    throw err;
  }

  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 1. Atualiza pedido
    const reqRef = doc(db, 'friendRequests', pedidoId);
    batch.update(reqRef, {
      status: 'aceito',
      updatedAt: nowIso
    });

    // 2. Cria amizade determinística
    const friendshipId = getDeterministicConvId(meuUid, remetenteUid);
    const friendshipRef = doc(db, 'friendships', friendshipId);
    batch.set(friendshipRef, {
      id: friendshipId,
      members: [meuUid, remetenteUid].sort(),
      criadoEm: nowIso,
      createdAt: nowIso
    }, { merge: true });

    // 3. Cria conversa 1:1 determinística
    const convId = friendshipId;
    const convRef = doc(db, 'conversations', convId);
    batch.set(convRef, {
      id: convId,
      type: 'direct',
      members: [meuUid, remetenteUid].sort(),
      updatedAt: nowIso,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    await safeWaitForPendingWrites();
    console.log(`[socialService:aceitarPedidoAmizade] Pedido ${pedidoId} aceite com sucesso.`);
    return true;
  } catch (err) {
    console.error('[socialService:aceitarPedidoAmizade] Erro ao aceitar pedido de amizade:', err);
    throw err;
  }
}

/**
 * Recusa um pedido de amizade
 */
export async function recusarPedidoAmizade(pedidoId: string): Promise<boolean> {
  if (!pedidoId) return false;
  try {
    const reqRef = doc(db, 'friendRequests', pedidoId);
    await setDoc(reqRef, {
      status: 'recusado',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    await safeWaitForPendingWrites();
    console.log(`[socialService:recusarPedidoAmizade] Pedido ${pedidoId} recusado.`);
    return true;
  } catch (err) {
    console.error('[socialService:recusarPedidoAmizade] Erro ao recusar pedido:', err);
    throw err;
  }
}

/**
 * Ouve a lista de amizades do utilizador
 */
export function ouvirAmigos(
  meuUid: string,
  callback: (amigos: SocialUser[]) => void
): () => void {
  if (!meuUid) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'friendships'),
      where('members', 'array-contains', meuUid)
    );

    return onSnapshot(
      q,
      async (snap) => {
        const friendIds: string[] = [];
        snap.docs.forEach(d => {
          const members: string[] = d.data().members || [];
          const other = members.find(m => m !== meuUid);
          if (other) friendIds.push(other);
        });

        const amigos: SocialUser[] = [];
        for (const fId of friendIds) {
          const profile = await getCachedUserProfile(fId);
          if (profile) amigos.push(profile);
        }
        callback(amigos);
      },
      (error) => {
        console.error('[socialService:ouvirAmigos] Erro no listener de amigos:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[socialService:ouvirAmigos] Exceção em ouvirAmigos:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Cria uma conversa de grupo
 */
export async function criarConversaGrupo(
  meuUid: string,
  titulo: string,
  descricao: string,
  membrosUids: string[]
): Promise<string> {
  if (!meuUid || !titulo.trim()) {
    const err = new Error('Título do grupo e criador são obrigatórios.');
    console.error('[socialService:criarConversaGrupo]', err);
    throw err;
  }

  try {
    const convId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const convRef = doc(db, 'conversations', convId);
    const uniqueMembers = Array.from(new Set([meuUid, ...membrosUids]));
    const nowIso = new Date().toISOString();

    const groupData: Conversation = {
      id: convId,
      type: 'group',
      name: titulo.trim(),
      title: titulo.trim(),
      description: (descricao || '').trim(),
      members: uniqueMembers,
      adminIds: [meuUid],
      createdBy: meuUid,
      updatedAt: nowIso,
      atualizadoEm: serverTimestamp()
    };

    await setDoc(convRef, groupData);
    await safeWaitForPendingWrites();
    console.log(`[socialService:criarConversaGrupo] Grupo criado: ${titulo} (${convId})`);
    return convId;
  } catch (err) {
    console.error('[socialService:criarConversaGrupo] Erro ao criar grupo:', err);
    throw err;
  }
}

/**
 * Ouve a lista de conversas do utilizador (1:1 e grupos)
 */
export function ouvirConversas(
  meuUid: string,
  callback: (conversas: Conversation[]) => void
): () => void {
  if (!meuUid) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', meuUid)
    );

    return onSnapshot(
      q,
      async (snap) => {
        const list: Conversation[] = [];
        for (const d of snap.docs) {
          const data = d.data() as Conversation;
          const conv: Conversation = {
            id: d.id,
            type: data.type || (data.name || data.title ? 'group' : 'direct'),
            name: data.name || data.title,
            title: data.title || data.name,
            description: data.description,
            avatar: data.avatar,
            members: data.members || [],
            adminIds: data.adminIds,
            createdBy: data.createdBy,
            lastMessage: data.lastMessage,
            ultimaMensagem: data.ultimaMensagem,
            updatedAt: data.updatedAt,
            atualizadoEm: data.atualizadoEm
          };

          // Se for conversa 1:1, enriquece com os dados do outro interlocutor
          if (conv.type === 'direct') {
            const otherUid = conv.members.find(m => m !== meuUid);
            if (otherUid) {
              const otherProfile = await getCachedUserProfile(otherUid);
              if (otherProfile) {
                conv.otherUser = otherProfile;
                if (!conv.name) conv.name = otherProfile.name;
              }
            }
          }
          list.push(conv);
        }

        // Ordena por data de atualização descrescente
        list.sort((a, b) => {
          const tA = new Date(a.updatedAt || 0).getTime();
          const tB = new Date(b.updatedAt || 0).getTime();
          return tB - tA;
        });

        callback(list);
      },
      (error) => {
        console.error('[socialService:ouvirConversas] Erro ao ouvir conversas:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.error('[socialService:ouvirConversas] Exceção em ouvirConversas:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Envia uma mensagem de texto simples
 */
export async function enviarMensagemTexto(
  convId: string,
  remetenteId: string,
  texto: string,
  receiverId?: string
): Promise<Message> {
  if (!convId || !remetenteId || !texto.trim()) {
    const err = new Error('Parâmetros inválidos para envio de mensagem de texto.');
    console.error('[socialService:enviarMensagemTexto]', err);
    throw err;
  }

  try {
    const msgRef = doc(collection(db, 'conversations', convId, 'messages'));
    const convRef = doc(db, 'conversations', convId);
    const nowIso = new Date().toISOString();

    const messageData: Message = {
      id: msgRef.id,
      convId,
      conversationId: convId,
      senderId: remetenteId,
      receiverId: receiverId || '',
      content: texto.trim(),
      texto: texto.trim(),
      tipo: 'texto',
      criadoEm: nowIso,
      createdAt: nowIso,
      readAt: null,
      delivered: true
    };

    const batch = writeBatch(db);
    batch.set(msgRef, messageData);
    batch.set(convRef, {
      lastMessage: {
        id: msgRef.id,
        senderId: remetenteId,
        content: texto.trim(),
        texto: texto.trim(),
        tipo: 'texto',
        createdAt: nowIso,
        criadoEm: nowIso
      },
      ultimaMensagem: texto.trim(),
      updatedAt: nowIso,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    await safeWaitForPendingWrites();
    console.log(`[socialService:enviarMensagemTexto] Mensagem enviada para conversa ${convId}`);
    return messageData;
  } catch (err) {
    console.error('[socialService:enviarMensagemTexto] Erro ao enviar mensagem de texto:', err);
    throw err;
  }
}

/**
 * Envia uma mensagem com anexo de arquivo/imagem
 */
export async function enviarMensagemArquivo(
  convId: string,
  remetenteId: string,
  arquivo: { url: string; nome: string; tamanho: number; tipo: string },
  receiverId?: string
): Promise<Message> {
  if (!convId || !remetenteId || !arquivo?.url) {
    const err = new Error('Parâmetros inválidos para envio de ficheiro.');
    console.error('[socialService:enviarMensagemArquivo]', err);
    throw err;
  }

  try {
    const msgRef = doc(collection(db, 'conversations', convId, 'messages'));
    const convRef = doc(db, 'conversations', convId);
    const nowIso = new Date().toISOString();
    const isImg = arquivo.tipo.startsWith('image/');
    const previewText = isImg ? `📷 Foto: ${arquivo.nome}` : `📎 ${arquivo.nome}`;

    const messageData: Message = {
      id: msgRef.id,
      convId,
      conversationId: convId,
      senderId: remetenteId,
      receiverId: receiverId || '',
      content: previewText,
      texto: previewText,
      tipo: isImg ? 'imagem' : 'arquivo',
      arquivoUrl: arquivo.url,
      arquivoNome: arquivo.nome,
      arquivoTipo: arquivo.tipo,
      arquivoTamanho: arquivo.tamanho,
      attachmentUrl: arquivo.url,
      attachmentName: arquivo.nome,
      attachmentType: isImg ? 'image' : 'file',
      criadoEm: nowIso,
      createdAt: nowIso,
      readAt: null,
      delivered: true
    };

    const batch = writeBatch(db);
    batch.set(msgRef, messageData);
    batch.set(convRef, {
      lastMessage: {
        id: msgRef.id,
        senderId: remetenteId,
        content: previewText,
        texto: previewText,
        tipo: isImg ? 'imagem' : 'arquivo',
        attachmentUrl: arquivo.url,
        attachmentName: arquivo.nome,
        createdAt: nowIso,
        criadoEm: nowIso
      },
      ultimaMensagem: previewText,
      updatedAt: nowIso,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    await safeWaitForPendingWrites();
    console.log(`[socialService:enviarMensagemArquivo] Ficheiro enviado para conversa ${convId}`);
    return messageData;
  } catch (err) {
    console.error('[socialService:enviarMensagemArquivo] Erro ao enviar ficheiro:', err);
    throw err;
  }
}

/**
 * Ouve mensagens de uma conversa em tempo real
 */
export function ouvirMensagensConversa(
  convId: string,
  callback: (mensagens: Message[]) => void
): () => void {
  if (!convId) {
    callback([]);
    return () => {};
  }

  try {
    const msgsCol = collection(db, 'conversations', convId, 'messages');
    const q = query(msgsCol, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as Message[];
        callback(msgs);
      },
      (error) => {
        console.error(`[socialService:ouvirMensagensConversa] Erro ao escutar mensagens de ${convId}:`, error);
        callback([]);
      }
    );
  } catch (err) {
    console.error(`[socialService:ouvirMensagensConversa] Exceção ao escutar mensagens de ${convId}:`, err);
    callback([]);
    return () => {};
  }
}

/**
 * Marca mensagens de uma conversa como lidas (Read Receipts / Recibos de Leitura)
 */
export async function marcarMensagensComoLidas(convId: string, meuUid: string): Promise<void> {
  if (!convId || !meuUid) return;

  try {
    const msgsCol = collection(db, 'conversations', convId, 'messages');
    const q = query(msgsCol, where('readAt', '==', null), limit(50));
    const snap = await getDocs(q);

    const toUpdate = snap.docs.filter(d => {
      const data = d.data();
      return data.senderId !== meuUid;
    });

    if (toUpdate.length === 0) return;

    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    for (const d of toUpdate) {
      batch.update(d.ref, {
        readAt: nowIso,
        delivered: true
      });
    }

    await batch.commit();
    console.log(`[socialService:marcarMensagensComoLidas] ${toUpdate.length} mensagens marcadas como lidas na conversa ${convId}`);
  } catch (err) {
    console.error(`[socialService:marcarMensagensComoLidas] Erro ao marcar mensagens como lidas:`, err);
  }
}

/**
 * Adiciona ou remove uma reação emoji de uma mensagem
 */
export async function alternarReacaoMensagem(
  convId: string,
  msgId: string,
  emoji: string,
  meuUid: string
): Promise<boolean> {
  if (!convId || !msgId || !emoji || !meuUid) return false;

  try {
    const msgRef = doc(db, 'conversations', convId, 'messages', msgId);
    const msgSnap = await getDoc(msgRef);

    if (!msgSnap.exists()) return false;

    const data = msgSnap.data();
    const currentReactions: Record<string, string[]> = { ...(data.reactions || data.reacoes || {}) };

    const uids = currentReactions[emoji] || [];
    const hasReacted = uids.includes(meuUid);

    let newUids: string[];
    if (hasReacted) {
      // Remove reação
      newUids = uids.filter(u => u !== meuUid);
    } else {
      // Adiciona reação
      newUids = [...uids, meuUid];
    }

    if (newUids.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = newUids;
    }

    await setDoc(msgRef, {
      reactions: currentReactions,
      reacoes: currentReactions
    }, { merge: true });

    return true;
  } catch (err) {
    console.error('[socialService:alternarReacaoMensagem] Erro ao alternar reação:', err);
    return false;
  }
}

/**
 * Atualiza o status de presença (online / offline) e timestamp de última atividade do utilizador
 */
export async function atualizarStatusPresenca(uid: string, status: 'online' | 'offline'): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();
    await setDoc(userRef, {
      status,
      updatedAt: nowIso,
      lastActive: nowIso,
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    // Atualiza cache local
    const cached = userProfileCache.get(uid);
    if (cached) {
      cached.status = status;
      cached.updatedAt = nowIso;
    }
  } catch (err) {
    console.error(`[socialService:atualizarStatusPresenca] Erro ao atualizar presença de ${uid}:`, err);
  }
}

/**
 * Atualiza o estado de "a escrever..." (typing indicator) na conversa em tempo real
 */
export async function atualizarDigitando(
  convId: string,
  meuUid: string,
  meuNome: string,
  isTyping: boolean
): Promise<void> {
  if (!convId || !meuUid) return;

  try {
    const typingDocRef = doc(db, 'conversations', convId, 'typing', meuUid);
    if (isTyping) {
      await setDoc(typingDocRef, {
        uid: meuUid,
        nome: meuNome || 'Utilizador',
        isTyping: true,
        updatedAt: new Date().getTime(),
        timestamp: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(typingDocRef, {
        uid: meuUid,
        nome: meuNome || 'Utilizador',
        isTyping: false,
        updatedAt: new Date().getTime(),
        timestamp: serverTimestamp()
      }, { merge: true });
    }
  } catch (err) {
    // Silencioso para não interromper fluxo de digitação
    console.warn(`[socialService:atualizarDigitando] Erro ao atualizar estado digitando:`, err);
  }
}

/**
 * Escuta em tempo real utilizadores que estão a escrever na conversa
 */
export function ouvirDigitando(
  convId: string,
  meuUid: string,
  callback: (digitando: { uid: string; nome: string }[]) => void
): () => void {
  if (!convId) {
    callback([]);
    return () => {};
  }

  try {
    const typingCol = collection(db, 'conversations', convId, 'typing');
    return onSnapshot(
      typingCol,
      (snap) => {
        const now = Date.now();
        const ativos: { uid: string; nome: string }[] = [];

        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.uid !== meuUid && data.isTyping === true) {
            // Verifica se a atualização ocorreu nos últimos 5 segundos para evitar estados órfãos
            const lastUpdated = data.updatedAt || (data.timestamp?.toMillis ? data.timestamp.toMillis() : now);
            if (now - lastUpdated < 5000) {
              ativos.push({
                uid: data.uid,
                nome: data.nome || 'Utilizador'
              });
            }
          }
        });

        callback(ativos);
      },
      (err) => {
        console.warn(`[socialService:ouvirDigitando] Erro no listener de digitando:`, err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn(`[socialService:ouvirDigitando] Exceção ao escutar digitando:`, err);
    callback([]);
    return () => {};
  }
}

/**
 * Permite a um utilizador sair de um grupo
 */
export async function sairDoGrupo(convId: string, meuUid: string): Promise<boolean> {
  if (!convId || !meuUid) return false;

  try {
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    const members: string[] = (data.members || []).filter((m: string) => m !== meuUid);
    const adminIds: string[] = (data.adminIds || []).filter((a: string) => a !== meuUid);

    if (members.length === 0) {
      // Se não restarem membros, apaga a conversa
      await deleteDoc(convRef);
    } else {
      // Se era o único admin e restam membros, nomeia o primeiro membro como admin
      if (adminIds.length === 0 && members.length > 0) {
        adminIds.push(members[0]);
      }
      await setDoc(convRef, {
        members,
        adminIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    await safeWaitForPendingWrites();
    console.log(`[socialService:sairDoGrupo] Utilizador ${meuUid} saiu do grupo ${convId}`);
    return true;
  } catch (err) {
    console.error(`[socialService:sairDoGrupo] Erro ao sair do grupo:`, err);
    throw err;
  }
}

/**
 * Apaga um grupo permanentemente (disponível para administradores ou criador)
 */
export async function apagarGrupo(convId: string, meuUid: string): Promise<boolean> {
  if (!convId || !meuUid) return false;

  try {
    const convRef = doc(db, 'conversations', convId);
    const snap = await getDoc(convRef);
    if (!snap.exists()) return false;

    const data = snap.data();
    const isAdmin = (data.adminIds || []).includes(meuUid) || data.createdBy === meuUid;
    if (!isAdmin) {
      throw new Error('Apenas os administradores podem apagar este grupo.');
    }

    await deleteDoc(convRef);
    await safeWaitForPendingWrites();
    console.log(`[socialService:apagarGrupo] Grupo ${convId} apagado pelo admin ${meuUid}`);
    return true;
  } catch (err) {
    console.error(`[socialService:apagarGrupo] Erro ao apagar grupo:`, err);
    throw err;
  }
}

