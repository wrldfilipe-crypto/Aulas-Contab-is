import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  UserPlus, 
  Users, 
  UserCheck, 
  Plus, 
  Circle,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Conversation } from '../../lib/social/types';

interface SidebarConversasProps {
  conversations: Conversation[];
  activeConvId: string | null;
  meuUid: string;
  pendingRequestsCount: number;
  onSelectConversation: (conv: Conversation) => void;
  onOpenSearch: () => void;
  onOpenRequests: () => void;
  onOpenNewGroup: () => void;
}

export default function SidebarConversas({
  conversations,
  activeConvId,
  meuUid,
  pendingRequestsCount,
  onSelectConversation,
  onOpenSearch,
  onOpenRequests,
  onOpenNewGroup
}: SidebarConversasProps) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredConversations = conversations.filter((c) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (c.name || c.title || (c.otherUser?.name ?? '')).toLowerCase();
    const lastMsgText = (
      c.ultimaMensagem ||
      c.lastMessage?.content ||
      c.lastMessage?.texto ||
      (c.lastMessage as any)?.arquivoNome ||
      ''
    ).toLowerCase();
    return name.includes(q) || lastMsgText.includes(q);
  });

  const formatMessageTime = (dateStr?: string | any) => {
    if (!dateStr) return '';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr?.toDate ? dateStr.toDate() : new Date();
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside 
      className="w-full md:w-80 lg:w-96 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex shrink-0 h-full overflow-hidden"
      id="sidebar-conversas"
    >
      {/* Top action bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
              Conversas
            </h2>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1.5">
            {/* Friend Requests Badge Button */}
            <button
              onClick={onOpenRequests}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-900 transition-colors cursor-pointer"
              title="Pedidos de Amizade"
              aria-label="Ver pedidos de amizade"
              id="btn-pedidos-amizade"
            >
              <UserCheck className="w-4 h-4" />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </span>
              )}
            </button>

            {/* Create Group Button */}
            <button
              onClick={onOpenNewGroup}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-blue-900 transition-colors cursor-pointer"
              title="Criar Grupo"
              aria-label="Criar novo grupo"
              id="btn-criar-grupo"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* Find Users Button */}
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white transition-colors cursor-pointer shadow-sm"
              title="Pesquisar Utilizadores"
              aria-label="Pesquisar pessoas"
              id="btn-pesquisar-pessoas"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="input-pesquisa-global-conversas"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Pesquisar por nome ou mensagem..."
            className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              title="Limpar pesquisa"
            >
              <Search className="hidden" />
              <span className="text-xs font-bold leading-none">&times;</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {filterQuery ? 'Nenhuma conversa encontrada' : 'Ainda sem conversas ativas'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              {filterQuery ? 'Verifique o filtro introduzido.' : 'Pesquise por colegas para iniciar uma conversa 1:1 ou crie um grupo.'}
            </p>
            {!filterQuery && (
              <button
                onClick={onOpenSearch}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Encontrar Colegas</span>
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConvId === conv.id;
            const isGroup = conv.type === 'group';
            const displayName = conv.name || conv.title || (conv.otherUser?.name ?? 'Conversa');
            const displayAvatar = conv.avatar || conv.otherUser?.avatar || conv.otherUser?.fotoUrl;
            const isOnline = conv.otherUser?.status === 'online';
            const lastMsg = conv.ultimaMensagem || conv.lastMessage?.content || conv.lastMessage?.texto || 'Conversa iniciada';
            const timeFormatted = formatMessageTime(conv.updatedAt || conv.atualizadoEm || conv.lastMessage?.createdAt);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                }`}
                id={`conv-item-${conv.id}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {isGroup ? (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}>
                      <Users className="w-5 h-5" />
                    </div>
                  ) : displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm uppercase ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-blue-900/15 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300'
                    }`}>
                      {displayName.substring(0, 2)}
                    </div>
                  )}

                  {/* Online dot for direct chats */}
                  {!isGroup && (
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ${
                        isActive ? 'ring-blue-900' : 'ring-white dark:ring-slate-900'
                      } ${isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`}
                      title={isOnline ? 'Online' : 'Offline'}
                    />
                  )}
                </div>

                {/* Info & Last Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {displayName}
                    </h4>
                    {timeFormatted && (
                      <span className={`text-[10px] shrink-0 font-medium ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                        {timeFormatted}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs truncate ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {lastMsg}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
