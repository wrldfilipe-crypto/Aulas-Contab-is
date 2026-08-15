import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MessageSquare, Check, Clock, User, X, Loader2 } from 'lucide-react';
import { SocialUser } from '../../lib/social/types';
import { pesquisarUsuarios, verificarRelacao, enviarPedidoAmizade, getDeterministicConvId } from '../../lib/social/socialService';

interface PesquisaUsuariosProps {
  meuUid: string;
  onClose: () => void;
  onStartChat: (convId: string, user: SocialUser) => void;
  onFriendRequestSent?: () => void;
}

export default function PesquisaUsuarios({
  meuUid,
  onClose,
  onStartChat,
  onFriendRequestSent
}: PesquisaUsuariosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [relationMap, setRelationMap] = useState<Record<string, 'amigo' | 'pedido_enviado' | 'pedido_recebido' | 'nenhum'>>({});

  // Debounced search on term change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await pesquisarUsuarios(searchTerm, meuUid);
        if (!isMounted) return;
        setUsers(results);

        // Fetch relations for returned users in parallel
        const rels: Record<string, 'amigo' | 'pedido_enviado' | 'pedido_recebido' | 'nenhum'> = {};
        await Promise.all(
          results.map(async (u) => {
            const rel = await verificarRelacao(meuUid, u.id);
            rels[u.id] = rel;
          })
        );
        if (isMounted) {
          setRelationMap(rels);
        }
      } catch (err) {
        console.error('[PesquisaUsuarios] Erro ao buscar utilizadores:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, meuUid]);

  const handleSendRequest = async (user: SocialUser) => {
    setActionLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      await enviarPedidoAmizade(meuUid, user.id);
      setRelationMap(prev => ({ ...prev, [user.id]: 'pedido_enviado' }));
      if (onFriendRequestSent) onFriendRequestSent();
    } catch (err) {
      console.error('[PesquisaUsuarios] Falha ao enviar pedido:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleOpenDirectChat = (user: SocialUser) => {
    const convId = getDeterministicConvId(meuUid, user.id);
    onStartChat(convId, user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        id="modal-pesquisa-usuarios"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Pesquisar Utilizadores
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Encontre colegas e profissionais pelo nome
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar pesquisa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digitar nome do utilizador..."
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[260px] max-h-[420px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900 dark:text-blue-400" />
              <span className="text-xs font-medium">A procurar utilizadores...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <User className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {searchTerm ? 'Nenhum utilizador encontrado' : 'Nenhum utilizador registado'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {searchTerm ? 'Tente pesquisar por outro nome ou termo.' : 'Digite um nome para começar a busca.'}
              </p>
            </div>
          ) : (
            users.map((u) => {
              const relation = relationMap[u.id] || 'nenhum';
              const isWorking = actionLoading[u.id] || false;

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all gap-3"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {u.avatar || u.fotoUrl ? (
                        <img
                          src={u.avatar || u.fotoUrl}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm uppercase">
                          {u.name.substring(0, 2)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                          u.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {u.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {u.roleTitle || u.email || 'Profissional'}
                      </p>
                    </div>
                  </div>

                  {/* Contextual Action Button */}
                  <div className="shrink-0">
                    {relation === 'amigo' ? (
                      <button
                        onClick={() => handleOpenDirectChat(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                        id={`btn-chat-${u.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Conversar</span>
                      </button>
                    ) : relation === 'pedido_enviado' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 select-none">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pedido enviado</span>
                      </span>
                    ) : relation === 'pedido_recebido' ? (
                      <button
                        onClick={() => handleOpenDirectChat(u)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Responder</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(u)}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-blue-900 dark:hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        id={`btn-add-${u.id}`}
                      >
                        {isWorking ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5" />
                        )}
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span>{users.length} utilizador(es) listado(s)</span>
          <span className="text-[11px] text-slate-400">Pesquisa em tempo real</span>
        </div>
      </div>
    </div>
  );
}
