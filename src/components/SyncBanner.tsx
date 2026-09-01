import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { onFirestoreStatusChanged } from '../lib/firebase';
import { syncOfflineDataWithServer } from '../services/dashboardCache';
import { OfflineSyncQueueD3Chart } from './OfflineSyncQueueD3Chart';

interface SyncBannerProps {
  onOpenModal?: () => void;
  onOpenFirestoreModal?: () => void;
  compact?: boolean;
  showForceSyncButton?: boolean;
  showD3Gauge?: boolean;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ 
  onOpenModal, 
  onOpenFirestoreModal, 
  compact = false,
  showForceSyncButton = true,
  showD3Gauge = true
}) => {
  const { isOnline, pendingCount, failedCount, isSyncing, triggerSync, lastSyncTime, lastSyncError } = useOfflineSync();
  const [firestoreOk, setFirestoreOk] = useState<boolean>(true);
  const [showJustSyncedTick, setShowJustSyncedTick] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const prevSyncingRef = useRef<boolean>(isSyncing);

  useEffect(() => {
    const unsub = onFirestoreStatusChanged((disponivel) => {
      setFirestoreOk(disponivel);
    });
    return unsub;
  }, []);

  // Monitor transition from isSyncing = true to false to trigger green tick animation
  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && !lastSyncError && isOnline) {
      setShowJustSyncedTick(true);
      const timer = setTimeout(() => {
        setShowJustSyncedTick(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, lastSyncError, isOnline, lastSyncTime]);

  const handleClick = () => {
    if (!firestoreOk && onOpenFirestoreModal) {
      onOpenFirestoreModal();
    } else if (onOpenModal) {
      onOpenModal();
    } else {
      handleForceSync();
    }
  };

  const handleForceSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isOnline || isSyncing || isManualSyncing) return;

    setIsManualSyncing(true);
    try {
      await Promise.all([
        triggerSync(),
        syncOfflineDataWithServer()
      ]);
      setShowJustSyncedTick(true);
      setTimeout(() => setShowJustSyncedTick(false), 3500);
    } catch (err) {
      console.warn('[SyncBanner] Erro ao forçar sincronização:', err);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isCurrentlySyncing = isSyncing || isManualSyncing;

  return (
    <div className="inline-flex items-center gap-2" id="sync-banner-container">
      {/* D3 Real-Time Animated Queue Status Ring */}
      {showD3Gauge && (
        <OfflineSyncQueueD3Chart 
          compact={compact} 
          onOpenModal={onOpenModal} 
        />
      )}

      <AnimatePresence mode="wait">
        {!isOnline ? (
          <motion.button
            key="offline-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-700/60 rounded-full text-[11px] font-bold text-amber-800 dark:text-amber-300 transition-colors cursor-pointer shadow-xs"
            title="Modo Sem Ligação — Alterações guardadas localmente. Clique para gerir sincronização."
            aria-label="Estado da sincronização: Offline"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            {!compact && (
              <span>
                Offline {pendingCount > 0 ? `(${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
              </span>
            )}
          </motion.button>
        ) : !firestoreOk ? (
          <motion.button
            key="firestore-err-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-700/60 rounded-full text-[11px] font-bold text-rose-800 dark:text-rose-300 transition-colors cursor-pointer shadow-xs"
            title="Base de dados Firestore indisponível no projeto. As escritas na nuvem estão desativadas para evitar erros de quota."
            aria-label="Estado da base de dados: Firestore Indisponível"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            {!compact && <span>Firestore Indisponível</span>}
          </motion.button>
        ) : failedCount > 0 ? (
          <motion.button
            key="failed-sync-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-700/70 rounded-full text-[11px] font-bold text-rose-800 dark:text-rose-300 transition-colors cursor-pointer shadow-xs"
            title={`${failedCount} item(ns) falharam na sincronização. Clique para verificar integridade e reenviar.`}
            aria-label="Estado da sincronização: Itens com falha"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            {!compact && (
              <span>
                {failedCount} com falha {pendingCount > failedCount ? `(+${pendingCount - failedCount} na fila)` : ''}
              </span>
            )}
          </motion.button>
        ) : pendingCount > 0 ? (
          <motion.button
            key="pending-sync-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-700/60 rounded-full text-[11px] font-bold text-blue-800 dark:text-blue-300 transition-colors cursor-pointer shadow-xs"
            title={`${pendingCount} item(ns) na fila de sincronização.`}
            aria-label="Estado da sincronização: Fila com itens pendentes"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            {!compact && <span>{pendingCount} na fila</span>}
          </motion.button>
        ) : isCurrentlySyncing ? (
          <motion.button
            key="syncing-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: [
                "0 0 0 rgba(37,99,235,0)", 
                "0 0 8px rgba(37,99,235,0.35)", 
                "0 0 0 rgba(37,99,235,0)"
              ]
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-300/80 dark:border-blue-700/80 rounded-full text-[11px] font-bold text-blue-800 dark:text-blue-300 transition-colors cursor-pointer shadow-xs"
            title="A sincronizar dados em tempo real com a nuvem..."
            aria-label="Estado da sincronização: Sincronizando..."
          >
            <motion.span 
              className="w-2 h-2 rounded-full bg-blue-500 shrink-0"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="shrink-0 flex items-center justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </motion.div>
            {!compact && <span>Sincronizando...</span>}
          </motion.button>
        ) : showJustSyncedTick ? (
          <motion.button
            key="just-synced-tick-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: [0.85, 1.08, 1] }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 450, damping: 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/90 dark:bg-emerald-900/60 hover:bg-emerald-200/90 dark:hover:bg-emerald-800/70 border border-emerald-400 dark:border-emerald-500 rounded-full text-[11px] font-extrabold text-emerald-900 dark:text-emerald-200 transition-colors cursor-pointer shadow-sm ring-2 ring-emerald-400/30"
            title="Sincronização concluída com sucesso!"
            aria-label="Estado da sincronização: Concluída com sucesso"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-300"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </motion.div>
            {!compact && (
              <motion.span
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              >
                Sincronizado com Sucesso!
              </motion.span>
            )}
          </motion.button>
        ) : (
          <motion.button
            key="synced-banner"
            type="button"
            onClick={handleClick}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-700/60 rounded-full text-[11px] font-bold text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer shadow-2xs"
            title="Sincronizado em tempo real com o servidor central Firestore."
            aria-label="Estado da sincronização: Sincronizado em tempo real"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {!compact && <span>Sincronizado</span>}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Botão dedicado 'Forçar Sincronização' quando online */}
      {showForceSyncButton && isOnline && (
        <button
          type="button"
          onClick={handleForceSync}
          disabled={isCurrentlySyncing}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
            isCurrentlySyncing 
              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 opacity-90' 
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
          title="Forçar envio de dados offline e sincronização com o servidor"
          aria-label="Forçar Sincronização manual"
        >
          <RefreshCw className={`w-3 h-3 ${isCurrentlySyncing ? 'animate-spin text-blue-500' : ''}`} />
          <span>{isCurrentlySyncing ? 'Sincronizando...' : 'Forçar'}</span>
        </button>
      )}
    </div>
  );
};

export default SyncBanner;
