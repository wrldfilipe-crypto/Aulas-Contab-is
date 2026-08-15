import React, { useState, useEffect } from 'react';
import { Users, X, Check, Loader2, Search } from 'lucide-react';
import { SocialUser } from '../../lib/social/types';
import { ouvirAmigos, criarConversaGrupo } from '../../lib/social/socialService';

interface GrupoFormProps {
  meuUid: string;
  onClose: () => void;
  onGroupCreated: (convId: string) => void;
}

export default function GrupoForm({
  meuUid,
  onClose,
  onGroupCreated
}: GrupoFormProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [amigos, setAmigos] = useState<SocialUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchFriend, setSearchFriend] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!meuUid) return;
    setLoadingFriends(true);

    const unsub = ouvirAmigos(meuUid, (list) => {
      setAmigos(list);
      setLoadingFriends(false);
    });

    return () => unsub();
  }, [meuUid]);

  const toggleSelectFriend = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('Por favor insira o nome do grupo.');
      return;
    }
    if (selectedIds.length === 0) {
      setErrorMsg('Selecione pelo menos um membro para o grupo.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const convId = await criarConversaGrupo(
        meuUid,
        titulo.trim(),
        descricao.trim(),
        selectedIds
      );
      onGroupCreated(convId);
      onClose();
    } catch (err: any) {
      console.error('[GrupoForm] Erro ao criar grupo:', err);
      setErrorMsg(err?.message || 'Falha ao criar o grupo. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAmigos = amigos.filter(a =>
    a.name.toLowerCase().includes(searchFriend.toLowerCase()) ||
    (a.roleTitle && a.roleTitle.toLowerCase().includes(searchFriend.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        id="modal-criar-grupo"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Criar Novo Grupo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reúna colegas e membros da equipa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar modal de grupo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Nome do Grupo */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider mb-1.5">
                Nome do Grupo *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Auditoria Fiscal 2026, Equipa Contabilidade"
                required
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider mb-1.5">
                Descrição ou Tópico (Opcional)
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Espaço de coordenação técnica e partilha de documentos..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Seleção de Membros */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                  Adicionar Membros ({selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}) *
                </label>
                <span className="text-[11px] text-slate-400">
                  {amigos.length} amigo(s) disponível(is)
                </span>
              </div>

              {/* Filtro rápido de amigos */}
              {amigos.length > 4 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFriend}
                    onChange={(e) => setSearchFriend(e.target.value)}
                    placeholder="Filtrar amigos..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-900"
                  />
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                {loadingFriends ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A carregar lista de amigos...</span>
                  </div>
                ) : amigos.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <p className="font-medium text-slate-600 dark:text-slate-300">Sem amigos adicionados</p>
                    <p className="mt-1">Adicione outros utilizadores através da pesquisa para os convidar para grupos.</p>
                  </div>
                ) : filteredAmigos.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Nenhum amigo encontrado com esse filtro.
                  </div>
                ) : (
                  filteredAmigos.map((amigo) => {
                    const isSelected = selectedIds.includes(amigo.id);
                    return (
                      <div
                        key={amigo.id}
                        onClick={() => toggleSelectFriend(amigo.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-900/10 dark:bg-blue-500/20 border border-blue-900/30 dark:border-blue-500/40 text-blue-900 dark:text-blue-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {amigo.avatar || amigo.fotoUrl ? (
                            <img
                              src={amigo.avatar || amigo.fotoUrl}
                              alt={amigo.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs uppercase shrink-0">
                              {amigo.name.substring(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">
                              {amigo.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {amigo.roleTitle || amigo.email}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-900 text-white'
                              : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !titulo.trim() || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="btn-confirm-create-group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A criar grupo...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Criar Grupo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
