import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  CloudOff, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  HardDrive, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  ArrowRight,
  Info
} from 'lucide-react';
import { firestoreDisponivel, onFirestoreStatusChanged } from '../lib/firebase';

interface FirestoreStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage?: string;
  onOpenSyncManager?: () => void;
}

export const FirestoreStatusModal: React.FC<FirestoreStatusModalProps> = ({
  isOpen,
  onClose,
  currentLanguage = 'pt-PT',
  onOpenSyncManager
}) => {
  const isPt = currentLanguage.startsWith('pt');
  const [isFirestoreOnline, setIsFirestoreOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [checkResultMsg, setCheckResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onFirestoreStatusChanged((available) => {
      setIsFirestoreOnline(available);
      setLastCheck(new Date());
    });
    return () => {
      unsub();
    };
  }, []);

  const handleTestConnection = async () => {
    setIsChecking(true);
    setCheckResultMsg(null);
    const start = performance.now();
    try {
      const isAvailable = await firestoreDisponivel(true);
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
      setIsFirestoreOnline(isAvailable);
      setLastCheck(new Date());
      if (isAvailable) {
        setCheckResultMsg(isPt ? `Ligação confirmada (${elapsed}ms). A base de dados na nuvem está ativa!` : `Connection verified (${elapsed}ms). Cloud database is online!`);
      } else {
        setCheckResultMsg(isPt ? 'Base de dados na nuvem inacessível. O modo offline local seguro continua ativo.' : 'Cloud database unreachable. Local offline mode is active.');
      }
    } catch {
      setIsFirestoreOnline(false);
      setCheckResultMsg(isPt ? 'Erro ao contactar o servidor.' : 'Failed to reach server.');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="firestore-status-modal-overlay" 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-[#0F1929] rounded-2xl shadow-2xl border border-slate-200 dark:border-[rgba(255,255,255,0.1)] overflow-hidden text-slate-900 dark:text-[#E8EDF5]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[rgba(255,255,255,0.07)] bg-slate-50/70 dark:bg-[#1A2540]">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isFirestoreOnline 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {isFirestoreOnline ? <Database className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold font-sans">
                  {isPt ? 'Estado do Banco de Dados Firestore' : 'Firestore Database Status'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A8C4E8]">
                  {isPt ? 'Monitor de conectividade em tempo real' : 'Real-time database connectivity monitor'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title={isPt ? 'Fechar' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
              isFirestoreOnline 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
            }`}>
              {isFirestoreOnline ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    {isFirestoreOnline
                      ? (isPt ? 'Firestore Operacional & Conectado' : 'Firestore Online & Connected')
                      : (isPt ? 'Modo Offline Local Ativo' : 'Local Offline Mode Active')}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isFirestoreOnline 
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                  }`}>
                    {isFirestoreOnline ? (isPt ? 'Nuvem OK' : 'Cloud OK') : (isPt ? 'Offline Local' : 'Offline Local')}
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-600 dark:text-[#A8C4E8] leading-relaxed">
                  {isFirestoreOnline
                    ? (isPt 
                        ? 'As transações, entidades e conversas estão a ser sincronizadas em tempo real com a nuvem Firebase Firestore.'
                        : 'Transactions, entities, and chats are syncing in real time with the Firebase Firestore cloud.')
                    : (isPt
                        ? 'O Firestore está indisponível ou inacessível no momento. A aplicação continua a funcionar sem perda de dados graças à persistência em memória e fila local.'
                        : 'Firestore is currently unreachable. The application continues to operate without data loss thanks to in-memory persistence and offline queue.')}
                </p>
              </div>
            </div>

            {/* Technical Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#1A2540] rounded-xl border border-slate-200/60 dark:border-[rgba(255,255,255,0.07)] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#A8C4E8] text-[11px] font-semibold">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isPt ? 'Mecanismo de Cache' : 'Cache Mechanism'}</span>
                </div>
                <p className="font-bold text-slate-800 dark:text-[#E8EDF5]">
                  MemoryLocalCache (Anti-Conflito)
                </p>
                <p className="text-[10px] text-slate-400">
                  {isPt ? 'Sem erros de WebStorage / garbage collection' : 'Free of WebStorage tab conflicts'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#1A2540] rounded-xl border border-slate-200/60 dark:border-[rgba(255,255,255,0.07)] space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#A8C4E8] text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isPt ? 'Última Verificação' : 'Last Check'}</span>
                </div>
                <p className="font-bold font-mono text-slate-800 dark:text-[#E8EDF5]">
                  {lastCheck.toLocaleTimeString()} {pingLatency !== null ? `(${pingLatency}ms)` : ''}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isPt ? 'Health check automático a cada 4s' : 'Automatic health check every 4s'}
                </p>
              </div>
            </div>

            {checkResultMsg && (
              <div className="p-3 bg-indigo-50 dark:bg-[#1F3050] border border-indigo-200 dark:border-[rgba(255,255,255,0.1)] rounded-xl text-xs text-indigo-900 dark:text-[#E8EDF5] flex items-center gap-2 animate-in fade-in duration-150">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{checkResultMsg}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-[rgba(255,255,255,0.07)] bg-slate-50/50 dark:bg-[#0A1628] flex-wrap gap-2">
            {onOpenSyncManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSyncManager();
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isPt ? 'Ver Fila de Sincronização' : 'View Sync Queue'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isChecking}
                className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? (isPt ? 'A testar...' : 'Testing...') : (isPt ? 'Testar Ligação' : 'Test Connection')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 rounded-xl transition-all cursor-pointer"
              >
                {isPt ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FirestoreStatusModal;
