import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  UserPlus, 
  Users, 
  UserCheck, 
  Search, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Conversation, SocialUser } from '../../lib/social/types';
import { 
  ouvirConversas, 
  ouvirPedidosRecebidos, 
  getDeterministicConvId,
  atualizarStatusPresenca 
} from '../../lib/social/socialService';
import SidebarConversas from './SidebarConversas';
import ChatView from './ChatView';
import PesquisaUsuarios from './PesquisaUsuarios';
import PedidosAmizade from './PedidosAmizade';
import GrupoForm from './GrupoForm';

interface ConversasPageProps {
  currentUserId: string;
  onNavigateTab?: (tab: string) => void;
}

export default function ConversasPage({
  currentUserId,
  onNavigateTab
}: ConversasPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const activeConvRef = useRef<Conversation | null>(activeConv);
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);

  // Subscribe to user's active conversations & presence
  useEffect(() => {
    if (!currentUserId) return;
    
    // Set online status
    atualizarStatusPresenca(currentUserId, 'online');
    const interval = setInterval(() => {
      atualizarStatusPresenca(currentUserId, 'online');
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        atualizarStatusPresenca(currentUserId, 'online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubConv = ouvirConversas(currentUserId, (list) => {
      setConversations(list);
      // If currently active conversation is in the updated list, keep it synchronized
      if (activeConvRef.current) {
        const found = list.find((c) => c.id === activeConvRef.current?.id);
        if (found) setActiveConv(found);
      }
    });

    const unsubReq = ouvirPedidosRecebidos(currentUserId, (reqs) => {
      setPendingRequestsCount(reqs.length);
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubConv();
      unsubReq();
    };
  }, [currentUserId]);

  const handleStartChatWithUser = (convId: string, targetUser: SocialUser) => {
    // Find or create transient conversation representation
    let existing = conversations.find(c => c.id === convId);
    if (!existing) {
      existing = {
        id: convId,
        type: 'direct',
        members: [currentUserId, targetUser.id],
        name: targetUser.name,
        avatar: targetUser.avatar || targetUser.fotoUrl,
        otherUser: targetUser
      };
    }
    setActiveConv(existing);
  };

  const handleGroupCreated = (convId: string) => {
    const existing = conversations.find(c => c.id === convId);
    if (existing) {
      setActiveConv(existing);
    }
  };

  return (
    <div 
      className="w-full h-[calc(100vh-140px)] min-h-[550px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
      id="conversas-workspace"
    >
      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Conversations List */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
          <SidebarConversas
            conversations={conversations}
            activeConvId={activeConv?.id || null}
            meuUid={currentUserId}
            pendingRequestsCount={pendingRequestsCount}
            onSelectConversation={(conv) => setActiveConv(conv)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenRequests={() => setIsRequestsOpen(true)}
            onOpenNewGroup={() => setIsNewGroupOpen(true)}
          />
        </div>

        {/* Right Area: Active Chat or Welcome Placeholder */}
        <div className={`${activeConv ? 'flex' : 'hidden md:flex'} flex-1 h-full overflow-hidden`}>
          {activeConv ? (
            <ChatView
              conversation={activeConv}
              meuUid={currentUserId}
              onBack={() => setActiveConv(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Conversas & Colaboração
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
                Comunique em tempo real com colegas, partilhe balancetes, ficheiros contabilísticos e organize grupos de trabalho.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  id="btn-empty-search-users"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Pesquisar Colegas</span>
                </button>

                <button
                  onClick={() => setIsNewGroupOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  id="btn-empty-create-group"
                >
                  <Users className="w-4 h-4" />
                  <span>Criar Grupo</span>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mensagens sincronizadas com Firestore & Cloud Storage</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Pesquisa de Utilizadores */}
      {isSearchOpen && (
        <PesquisaUsuarios
          meuUid={currentUserId}
          onClose={() => setIsSearchOpen(false)}
          onStartChat={(convId, user) => {
            handleStartChatWithUser(convId, user);
            setIsSearchOpen(false);
          }}
          onFriendRequestSent={() => {
            // Optional feedback
          }}
        />
      )}

      {/* MODAL: Pedidos de Amizade */}
      {isRequestsOpen && (
        <PedidosAmizade
          meuUid={currentUserId}
          onClose={() => setIsRequestsOpen(false)}
          onAccepted={(remetenteUid) => {
            const convId = getDeterministicConvId(currentUserId, remetenteUid);
            const found = conversations.find(c => c.id === convId);
            if (found) setActiveConv(found);
          }}
        />
      )}

      {/* MODAL: Criar Grupo */}
      {isNewGroupOpen && (
        <GrupoForm
          meuUid={currentUserId}
          onClose={() => setIsNewGroupOpen(false)}
          onGroupCreated={(convId) => {
            handleGroupCreated(convId);
            setIsNewGroupOpen(false);
          }}
        />
      )}
    </div>
  );
}
