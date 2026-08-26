import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  HardDrive, 
  Zap, 
  Clock, 
  Download,
  BookOpen,
  Calculator,
  Brain
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import {
  getPendingActions,
  getOfflineInvoices,
  getOfflineAccountingEntries,
  clearAllOfflineStorage,
  getSyncHistory,
  clearSyncHistory,
  PendingAction,
  OfflineInvoice,
  OfflineAccountingEntry,
  SyncHistoryRecord
} from '../lib/offlineDb';

interface OfflineSyncManagerModalProps {
  onClose: () => void;
}

export const OfflineSyncManagerModal: React.FC<OfflineSyncManagerModalProps> = ({ onClose }) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    lastSyncError,
    successfulSyncCount,
    drafts,
    installPrompt,
    isInstalled,
    triggerSync,
    promptPWAInstall,
    removeDraft
  } = useOfflineSync();

  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'invoices' | 'accounting' | 'drafts' | 'sw'>('queue');
  const [pendingItems, setPendingItems] = useState<PendingAction[]>([]);
  const [invoices, setInvoices] = useState<OfflineInvoice[]>([]);
  const [entries, setEntries] = useState<OfflineAccountingEntry[]>([]);
  const [syncHistoryList, setSyncHistoryList] = useState<SyncHistoryRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      const [pending, invs, accs] = await Promise.all([
        getPendingActions(),
        getOfflineInvoices(),
        getOfflineAccountingEntries()
      ]);
      setPendingItems(pending);
      setInvoices(invs);
      setEntries(accs);
      setSyncHistoryList(getSyncHistory(5));
    } catch (e) {
      console.warn("Error loading offline modal data:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [pendingCount]);

  const handleManualSync = async () => {
    setStatusMessage('A iniciar sincronização...');
    const result = await triggerSync();
    if (result.success) {
      setStatusMessage(`Sincronizados ${result.syncedCount} item(ns) com sucesso!`);
    } else {
      setStatusMessage(`Erro: ${result.errors[0] || 'Falha na sincronização.'}`);
    }
    await loadAllData();
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleClearStorage = async () => {
    if (window.confirm('Tem certeza de que deseja limpar todos os dados em cache e histórico offline? Operações não sincronizadas poderão ser perdidas.')) {
      await clearAllOfflineStorage();
      setStatusMessage('Armazenamento offline limpo com sucesso.');
      await loadAllData();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleClearCacheWorker = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      setStatusMessage('Cache do Service Worker recarregado!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in" id="offline-sync-modal">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${!isOnline ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' : 'bg-blue-950/60 text-blue-400 border-blue-800/60'}`}>
              {!isOnline ? <WifiOff className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Gestor de Sincronização & Modo Offline (PWA)</span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                  !isOnline ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {!isOnline ? 'Offline' : 'Online'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe a fila de sincronização, rascunhos salvos localmente e estado do aplicativo offline.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Status Banner */}
        {statusMessage && (
          <div className="bg-blue-900/60 border-b border-blue-800 px-5 py-2.5 text-xs text-blue-200 font-medium flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              {statusMessage}
            </span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/30 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Estado de Conexão</div>
            <div className="font-bold flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">Sem Ligação</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Fila Pendente</div>
            <div className="font-bold text-white text-sm flex items-center justify-between">
              <span>{pendingCount} itens</span>
              {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Última Sincronização</div>
            <div className="font-medium text-slate-200 text-xs flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nenhuma'}</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Aplicação PWA</div>
            <div className="font-medium text-slate-200 text-xs flex items-center gap-1">
              {isInstalled ? (
                <span className="text-emerald-400 font-bold">Instalada</span>
              ) : installPrompt ? (
                <button
                  onClick={promptPWAInstall}
                  className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Instalar App
                </button>
              ) : (
                <span className="text-slate-400">Web Standalone</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'queue' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Fila de Sincronização ({pendingItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico de Sincronização ({syncHistoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Faturas Offline ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('accounting')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'accounting' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lançamentos ({entries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('drafts')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'drafts' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Rascunhos ({drafts.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 min-h-[250px]">
          
          {/* TAB 1: QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Operações pendentes aguardando sincronização com os servidores</span>
                {pendingItems.length > 0 && isOnline && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Forçar Sincronização</span>
                  </button>
                )}
              </div>

              {pendingItems.length > 0 ? (
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-900/60 text-blue-300 font-bold rounded text-[10px] uppercase">
                            {item.method}
                          </span>
                          <span className="font-mono text-slate-300 truncate">{item.url}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          Tipo: <strong className="text-slate-200">{item.type}</strong> • Criado: {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full font-bold text-[10px]">
                          Pendente
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
                  <h3 className="font-bold text-sm text-slate-200">Sem operações na fila de espera</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Todas as suas operações e lançamentos locais estão totalmente sincronizados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 1.5: SYNC HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Últimas 5 tentativas de sincronização armazenadas localmente</span>
                {syncHistoryList.length > 0 && (
                  <button
                    onClick={() => {
                      clearSyncHistory();
                      setSyncHistoryList([]);
                      setStatusMessage('Histórico de sincronização limpo.');
                      setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-[11px] underline cursor-pointer"
                  >
                    Limpar Histórico
                  </button>
                )}
              </div>

              {syncHistoryList.length > 0 ? (
                <div className="space-y-2.5">
                  {syncHistoryList.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors ${
                        log.success 
                          ? 'bg-slate-800/50 border-emerald-500/30' 
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                          log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {log.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold ${log.success ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {log.success ? 'Sincronização Bem-Sucedida' : 'Falha na Sincronização'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {log.type === 'manual' ? 'Manual' : 'Automática'}
                            </span>
                            {log.syncedCount > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800">
                                {log.syncedCount} item(ns)
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {log.message}
                          </p>
                          {log.errorDetails && (
                            <p className="text-rose-400 font-mono text-[10px] bg-rose-950/40 p-1.5 rounded border border-rose-900/60">
                              Detalhes: {log.errorDetails}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-[11px] text-slate-400">
                        <div className="font-mono text-slate-200">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="font-bold text-sm text-slate-200">Nenhum registo no histórico recente</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    As próximas sincronizações realizadas (automáticas ou manuais) serão registadas aqui para transparência do sistema.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Faturas emitidas ou guardadas no armazenamento IndexedDB local
              </div>

              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100">{inv.clientName}</div>
                        <div className="text-slate-400 text-[11px]">
                          NIF: {inv.taxId || 'N/A'} • Valor: <strong className="text-emerald-400">{inv.amount} {inv.currency}</strong>
                        </div>
                      </div>

                      <div>
                        {inv.synced ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Sincronizada
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full font-bold text-[10px]">
                            Aguardando Sync
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs">Nenhuma fatura emitida offline até ao momento.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNTING ENTRIES */}
          {activeTab === 'accounting' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Lançamentos no Diário e razão mantidos localmente no navegador
              </div>

              {entries.length > 0 ? (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100">{entry.description}</div>
                        <div className="text-slate-400 text-[11px]">
                          Débito: {entry.debitAccount} • Crédito: {entry.creditAccount} • Total: <strong className="text-blue-400">{entry.amount} {entry.currency}</strong>
                        </div>
                      </div>

                      <div>
                        {entry.synced ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full font-bold text-[10px]">
                            Sincronizado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full font-bold text-[10px]">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs">Nenhum lançamento contabilístico em cache offline.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DRAFTS */}
          {activeTab === 'drafts' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Rascunhos temporários salvos durante a utilização offline
              </div>

              {drafts.length > 0 ? (
                <div className="space-y-2">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100">{draft.title}</div>
                        <div className="text-slate-400 text-[11px]">
                          Tipo: {draft.entityType} • Atualizado: {new Date(draft.updatedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <button
                        onClick={() => removeDraft(draft.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar rascunho"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Zap className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs">Sem rascunhos guardados.</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCacheWorker}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Limpar Cache SW</span>
            </button>

            <button
              onClick={handleClearStorage}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar BD Offline</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Concluído
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OfflineSyncManagerModal;
