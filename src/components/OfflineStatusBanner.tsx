import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { processOfflineQueue } from '../services/offlineQueue';

interface OfflineStatusBannerProps {
  className?: string;
  onSyncComplete?: (count: number) => void;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ 
  className = '', 
  onSyncComplete 
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        const res = await processOfflineQueue();
        if (res.syncedCount > 0) {
          setSyncSuccessMsg(`${res.syncedCount} acções sincronizadas!`);
          setTimeout(() => setSyncSuccessMsg(null), 4000);
          if (onSyncComplete) onSyncComplete(res.syncedCount);
        }
      } catch (e) {
        console.error("Erro durante a sincronização online:", e);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onSyncComplete]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await processOfflineQueue();
      setSyncSuccessMsg(res.syncedCount > 0 ? `${res.syncedCount} itens sincronizados.` : 'Dados já atualizados.');
      setTimeout(() => setSyncSuccessMsg(null), 3500);
      if (onSyncComplete) onSyncComplete(res.syncedCount);
    } catch (err) {
      console.error("Erro na sincronização manual:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={`rounded-xl p-3 border transition-all duration-300 ${
      !isOnline 
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' 
        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
    } ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  Modo Offline
                </span>
                <span className="ml-2 text-amber-700/80 dark:text-amber-300/80">
                  Conteúdos e lições salvos localmente no IndexedDB.
                </span>
              </div>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Ligado à Internet
                </span>
                <span className="ml-2 text-emerald-700/80 dark:text-emerald-300/80">
                  Sincronização em tempo real ativa.
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {syncSuccessMsg && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {syncSuccessMsg}
            </span>
          )}

          {isOnline && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
