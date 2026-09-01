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
  AlertTriangle,
  Layers, 
  HardDrive, 
  Zap, 
  Clock, 
  Download,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Eye,
  Send
} from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import {
  getPendingActions,
  getOfflineInvoices,
  getOfflineAccountingEntries,
  clearAllOfflineStorage,
  getSyncHistory,
  clearSyncHistory,
  deletePendingAction,
  PendingAction,
  OfflineInvoice,
  OfflineAccountingEntry,
  SyncHistoryRecord
} from '../lib/offlineDb';

interface OfflineSyncManagerModalProps {
  onClose: () => void;
  initialTab?: 'integrity' | 'queue' | 'history' | 'invoices' | 'accounting' | 'drafts';
}

export const OfflineSyncManagerModal: React.FC<OfflineSyncManagerModalProps> = ({ 
  onClose,
  initialTab = 'integrity'
}) => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncTime,
    lastSyncError,
    successfulSyncCount,
    drafts,
    installPrompt,
    isInstalled,
    triggerSync,
    syncSingleItem,
    promptPWAInstall,
    removeDraft
  } = useOfflineSync();

  const [activeTab, setActiveTab] = useState<'integrity' | 'history' | 'invoices' | 'accounting' | 'drafts'>(
    initialTab === 'queue' ? 'integrity' : initialTab
  );
  const [filterType, setFilterType] = useState<'all' | 'failed' | 'invoices' | 'accounting'>('all');
  const [pendingItems, setPendingItems] = useState<PendingAction[]>([]);
  const [invoices, setInvoices] = useState<OfflineInvoice[]>([]);
  const [entries, setEntries] = useState<OfflineAccountingEntry[]>([]);
  const [syncHistoryList, setSyncHistoryList] = useState<SyncHistoryRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<PendingAction | null>(null);
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
      setSyncHistoryList(getSyncHistory(10));
    } catch (e) {
      console.warn("Error loading offline modal data:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [pendingCount, failedCount]);

  const handleManualSync = async () => {
    setStatusMessage({ text: 'A sincronizar todos os itens da fila com o servidor...', type: 'info' });
    const result = await triggerSync();
    if (result.success) {
      setStatusMessage({ 
        text: `Sincronização concluída! ${result.syncedCount} item(ns) sincronizados com sucesso.`, 
        type: 'success' 
      });
    } else {
      setStatusMessage({ 
        text: `Atenção: ${result.errors[0] || 'Ocorreram falhas na sincronização.'}`, 
        type: 'error' 
      });
    }
    await loadAllData();
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleRetrySingle = async (actionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOnline) {
      setStatusMessage({ text: 'Não é possível sincronizar: o dispositivo está offline.', type: 'error' });
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    setRetryingItemId(actionId);
    try {
      const res = await syncSingleItem(actionId);
      if (res.success) {
        setStatusMessage({ text: 'Item sincronizado com sucesso!', type: 'success' });
      } else {
        setStatusMessage({ text: `Falha ao reenviar: ${res.error || 'Erro desconhecido'}`, type: 'error' });
      }
      await loadAllData();
    } catch (err: any) {
      setStatusMessage({ text: `Erro: ${err?.message || 'Falha na comunicação'}`, type: 'error' });
    } finally {
      setRetryingItemId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDiscardAction = async (actionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Deseja descartar este item da fila de sincronização? As alterações locais não enviadas serão removidas da fila.')) {
      await deletePendingAction(actionId);
      setStatusMessage({ text: 'Item removido da fila com sucesso.', type: 'info' });
      await loadAllData();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleClearStorage = async () => {
    if (window.confirm('Tem certeza de que deseja limpar todos os dados em cache e histórico offline? Operações não sincronizadas poderão ser perdidas.')) {
      await clearAllOfflineStorage();
      setStatusMessage({ text: 'Armazenamento offline limpo com sucesso.', type: 'info' });
      await loadAllData();
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleClearCacheWorker = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      setStatusMessage({ text: 'Cache do Service Worker recarregado!', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Integrity calculation
  const totalPending = pendingItems.length;
  const failedItems = pendingItems.filter(p => p.status === 'failed' || p.retryCount > 0);
  const totalFailed = failedItems.length;
  const integrityRate = totalPending === 0 ? 100 : Math.max(0, Math.round(((totalPending - totalFailed) / totalPending) * 100));

  const filteredPendingItems = pendingItems.filter(item => {
    if (filterType === 'failed') return item.status === 'failed' || item.retryCount > 0;
    if (filterType === 'invoices') return item.type === 'sync-invoices';
    if (filterType === 'accounting') return item.type === 'sync-accounting';
    return true;
  });

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in" id="offline-sync-modal">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              totalFailed > 0 
                ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                : !isOnline 
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60' 
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
            }`}>
              {totalFailed > 0 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : !isOnline ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Painel de Integridade & Sincronização Offline</span>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full border ${
                  !isOnline ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {!isOnline ? 'Offline' : 'Online'}
                </span>
                {totalFailed > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                    {totalFailed} Falha{totalFailed > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Monitorização da integridade de dados locais, reenvio individual de transações falhadas e sincronização em lote.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
            id="close-sync-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Status Banner */}
        {statusMessage && (
          <div className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between border-b animate-fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200' 
              : statusMessage.type === 'error'
                ? 'bg-rose-950/70 border-rose-800 text-rose-200'
                : 'bg-blue-950/70 border-blue-800 text-blue-200'
          }`}>
            <span className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
              {statusMessage.text}
            </span>
            <button 
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Quick Stats & Integrity Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/30 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Índice de Integridade</div>
            <div className="font-bold flex items-center gap-1.5">
              {totalFailed === 0 ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-extrabold">{integrityRate}% Íntegro</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-300 font-extrabold">{totalFailed} item(ns) com falha</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px] mb-1">Fila Total Pendente</div>
            <div className="font-bold text-white text-sm flex items-center justify-between">
              <span>{totalPending} transações</span>
              {totalPending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
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
            <div className="text-slate-400 text-[11px] mb-1">Modo PWA Offline</div>
            <div className="font-medium text-slate-200 text-xs flex items-center gap-1">
              {isInstalled ? (
                <span className="text-emerald-400 font-bold">App Instalada</span>
              ) : installPrompt ? (
                <button
                  onClick={promptPWAInstall}
                  className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Instalar App
                </button>
              ) : (
                <span className="text-slate-400">Navegador Web</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-800 bg-slate-950/40 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('integrity')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'integrity' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-integrity-queue"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Fila & Integridade ({pendingItems.length})</span>
            {totalFailed > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                {totalFailed}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-sync-history"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Histórico ({syncHistoryList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3.5 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Faturas Locais ({invoices.length})</span>
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
        <div className="p-5 flex-1 overflow-y-auto space-y-4 min-h-[280px]">
          
          {/* TAB 1: INTEGRITY & QUEUE */}
          {activeTab === 'integrity' && (
            <div className="space-y-4">
              
              {/* Header Controls with Filter & Batch Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 mr-1">Filtrar:</span>
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      filterType === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Todos ({pendingItems.length})
                  </button>
                  <button
                    onClick={() => setFilterType('failed')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      filterType === 'failed' ? 'bg-rose-900/80 text-rose-200 border border-rose-700' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>Falhas ({totalFailed})</span>
                  </button>
                  <button
                    onClick={() => setFilterType('invoices')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      filterType === 'invoices' ? 'bg-slate-700 text-white' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Faturas
                  </button>
                  <button
                    onClick={() => setFilterType('accounting')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      filterType === 'accounting' ? 'bg-slate-700 text-white' : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Lançamentos
                  </button>
                </div>

                {pendingItems.length > 0 && isOnline && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                    id="sync-all-pending-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Reenviar Toda a Fila ({pendingItems.length})</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              {filteredPendingItems.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredPendingItems.map((item) => {
                    const isFailed = item.status === 'failed' || item.retryCount > 0;
                    const isItemRetrying = retryingItemId === item.id;
                    const itemData = item.data || {};
                    const title = itemData.description || itemData.clientName || item.url;
                    const amount = itemData.amount ? `${itemData.amount} ${itemData.currency || 'AOA'}` : null;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          isFailed 
                            ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60' 
                            : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isFailed 
                                ? 'bg-rose-900/70 text-rose-300 border border-rose-800' 
                                : 'bg-blue-900/60 text-blue-300'
                            }`}>
                              {item.type === 'sync-invoices' ? 'Fatura' : item.type === 'sync-accounting' ? 'Lançamento' : item.type}
                            </span>
                            <span className="font-bold text-white truncate max-w-xs">{title}</span>
                            {amount && (
                              <span className="text-emerald-400 font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
                                {amount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
                            <span>Endpoint: <code className="text-slate-300 font-mono">{item.url}</code></span>
                            <span>•</span>
                            <span>Criado: {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            {item.retryCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">Tentativas: {item.retryCount}</span>
                              </>
                            )}
                          </div>

                          {isFailed && item.errorMessage && (
                            <div className="mt-1 flex items-center gap-1.5 text-rose-300 bg-rose-950/50 p-2 rounded-lg border border-rose-900/60 font-mono text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                              <span className="truncate">Causa da Falha: {item.errorMessage}</span>
                            </div>
                          )}
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => setInspectedItem(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                            title="Inspecionar dados"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleRetrySingle(item.id, e)}
                            disabled={!isOnline || isItemRetrying}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isFailed 
                                ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            } disabled:opacity-50`}
                            title="Tentar reenviar este item individualmente para o servidor"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isItemRetrying ? 'animate-spin' : ''}`} />
                            <span>{isItemRetrying ? 'A reenviar...' : 'Reenviar'}</span>
                          </button>

                          <button
                            onClick={(e) => handleDiscardAction(item.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Descartar item da fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-90" />
                  <h3 className="font-bold text-sm text-slate-200">Integridade Perfeita — Nenhuma Pendência</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Todas as faturas, lançamentos e transações locais estão totalmente sincronizados com os servidores centrais.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SYNC HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Histórico recente de sincronizações locais</span>
                {syncHistoryList.length > 0 && (
                  <button
                    onClick={() => {
                      clearSyncHistory();
                      setSyncHistoryList([]);
                      setStatusMessage({ text: 'Histórico de sincronização limpo.', type: 'info' });
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
                    As próximas sincronizações realizadas serão registadas aqui para transparência.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Faturas emitidas ou guardadas no armazenamento IndexedDB local ({invoices.length})
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

          {/* TAB 4: ACCOUNTING ENTRIES */}
          {activeTab === 'accounting' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Lançamentos no Diário mantidos localmente no navegador ({entries.length})
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

          {/* TAB 5: DRAFTS */}
          {activeTab === 'drafts' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Rascunhos temporários salvos durante a utilização offline ({drafts.length})
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

        {/* Inspection Drawer / Overlay */}
        {inspectedItem && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Dados Detalhados da Ação: {inspectedItem.id}</span>
              </span>
              <button
                onClick={() => setInspectedItem(null)}
                className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
              >
                Fechar Inspeção
              </button>
            </div>
            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-36 overflow-y-auto">
              {JSON.stringify(inspectedItem, null, 2)}
            </pre>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCacheWorker}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Recarregar Cache PWA</span>
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
