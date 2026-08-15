import React, { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, User, X, Loader2 } from 'lucide-react';
import { FriendRequest } from '../../lib/social/types';
import { ouvirPedidosRecebidos, aceitarPedidoAmizade, recusarPedidoAmizade } from '../../lib/social/socialService';

interface PedidosAmizadeProps {
  meuUid: string;
  onClose: () => void;
  onAccepted?: (remetenteUid: string) => void;
}

export default function PedidosAmizade({
  meuUid,
  onClose,
  onAccepted
}: PedidosAmizadeProps) {
  const [pedidos, setPedidos] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!meuUid) return;
    setLoading(true);

    const unsub = ouvirPedidosRecebidos(meuUid, (list) => {
      setPedidos(list);
      setLoading(false);
    });

    return () => unsub();
  }, [meuUid]);

  const handleAccept = async (pedido: FriendRequest) => {
    const fromUid = pedido.from || pedido.fromUserId;
    if (!fromUid) return;

    setActionLoading(prev => ({ ...prev, [pedido.id]: true }));
    try {
      await aceitarPedidoAmizade(pedido.id, meuUid, fromUid);
      setPedidos(prev => prev.filter(p => p.id !== pedido.id));
      if (onAccepted) onAccepted(fromUid);
    } catch (err) {
      console.error('[PedidosAmizade] Erro ao aceitar pedido:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [pedido.id]: false }));
    }
  };

  const handleReject = async (pedidoId: string) => {
    setActionLoading(prev => ({ ...prev, [pedidoId]: true }));
    try {
      await recusarPedidoAmizade(pedidoId);
      setPedidos(prev => prev.filter(p => p.id !== pedidoId));
    } catch (err) {
      console.error('[PedidosAmizade] Erro ao recusar pedido:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [pedidoId]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        id="modal-pedidos-amizade"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Pedidos de Amizade
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Responda aos convites para iniciar conversas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar pedidos de amizade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[420px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900 dark:text-blue-400" />
              <span className="text-xs font-medium">A verificar pedidos...</span>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum pedido pendente
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Quando outros utilizadores lhe enviarem um pedido de amizade, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            pedidos.map((req) => {
              const u = req.fromUser;
              const isWorking = actionLoading[req.id] || false;
              const displayName = u?.name || 'Colega Profissional';
              const displaySub = u?.roleTitle || u?.email || 'Utilizador';

              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  {/* Sender user avatar & info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {u?.avatar || u?.fotoUrl ? (
                        <img
                          src={u.avatar || u.fotoUrl}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm uppercase">
                          {displayName.substring(0, 2)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {displayName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {displaySub}
                      </p>
                      {req.criadoEm && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(req.criadoEm).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Aceitar / Recusar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={isWorking}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Recusar pedido"
                    >
                      <UserX className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAccept(req)}
                      disabled={isWorking}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      id={`btn-accept-${req.id}`}
                    >
                      {isWorking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Aceitar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span>{pedidos.length} pedido(s) pendente(s)</span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-blue-900 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
