import React, { useState, useEffect } from 'react';
import { RefreshCw, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { onFirestoreStatusChanged } from '../lib/firebase';

interface SyncBannerProps {
  onOpenModal?: () => void;
  onOpenFirestoreModal?: () => void;
  compact?: boolean;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ 
  onOpenModal, 
  onOpenFirestoreModal, 
  compact = false 
}) => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync();
  const [firestoreOk, setFirestoreOk] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onFirestoreStatusChanged((disponivel) => {
      setFirestoreOk(disponivel);
    });
    return unsub;
  }, []);

  const handleClick = () => {
    if (!firestoreOk && onOpenFirestoreModal) {
      onOpenFirestoreModal();
    } else if (onOpenModal) {
      onOpenModal();
    } else {
      triggerSync();
    }
  };

  if (!isOnline) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-full text-[11px] font-bold text-amber-800 transition-all cursor-pointer shadow-2xs"
        title="Modo Sem Ligação — Alterações guardadas localmente. Clique para gerir sincronização."
        aria-label="Estado da sincronização: Offline"
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        {!compact && (
          <span>
            Offline {pendingCount > 0 ? `(${pendingCount} pendente${pendingCount > 1 ? 's' : ''})` : ''}
          </span>
        )}
      </button>
    );
  }

  if (!firestoreOk) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-full text-[11px] font-bold text-rose-800 transition-all cursor-pointer shadow-2xs"
        title="Base de dados Firestore indisponível no projeto. As escritas na nuvem estão desativadas para evitar erros de quota."
        aria-label="Estado da base de dados: Firestore Indisponível"
      >
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        {!compact && <span>Firestore Indisponível</span>}
      </button>
    );
  }

  if (isSyncing) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-full text-[11px] font-bold text-blue-800 transition-all cursor-pointer shadow-2xs"
        title="A sincronizar dados em tempo real com a nuvem..."
        aria-label="Estado da sincronização: A sincronizar"
      >
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
        {!compact && <span>A sincronizar...</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-full text-[11px] font-bold text-emerald-800 transition-all cursor-pointer shadow-2xs"
      title="Sincronizado em tempo real com o servidor central Firestore."
      aria-label="Estado da sincronização: Sincronizado em tempo real"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      {!compact && <span>Sincronizado</span>}
    </button>
  );
};

export default SyncBanner;




