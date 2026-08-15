import React, { useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, BookOpen, LayoutDashboard, ShieldAlert } from 'lucide-react';

interface OfflineBlockedViewProps {
  onGoToDashboard: () => void;
  onGoToEstudos: () => void;
}

export const OfflineBlockedView: React.FC<OfflineBlockedViewProps> = ({
  onGoToDashboard,
  onGoToEstudos
}) => {
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState('Sem ligação à internet. Aguardando rede...');
  const [isOnlineState, setIsOnlineState] = useState(false);

  const tryReconnect = async () => {
    if (checking) return;
    setChecking(true);
    setStatusText('⏳ A testar ligação à rede...');

    try {
      await fetch('/manifest.json', { cache: 'no-store' });
      setIsOnlineState(true);
      setStatusText('✅ Ligação restaurada! A carregar página...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setStatusText('❌ Ainda sem internet. Tente novamente mais tarde.');
      setTimeout(() => {
        setChecking(false);
        setStatusText('Sem ligação à internet. Aguardando rede...');
      }, 2500);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-slate-100 rounded-3xl my-4 shadow-2xl border border-slate-800 text-center animate-fade-in max-w-3xl mx-auto">
      
      {/* Illustrative Icon */}
      <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 text-red-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl animate-pulse">
        <WifiOff className="w-10 h-10" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
        Sem ligação à internet
      </h1>

      <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed mb-8 font-medium">
        Verifica a tua rede WiFi ou dados móveis para aceder a esta página.
      </p>

      {/* Available Pages */}
      <div className="w-full max-w-md mb-8">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
          ✅ Conteúdos disponíveis em Modo Offline
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onGoToDashboard}
            className="bg-slate-800/80 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 rounded-2xl p-4 text-center transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Painel Principal</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Resumo e indicadores</div>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold rounded-full">
              DISPONÍVEL
            </span>
          </button>

          <button
            onClick={onGoToEstudos}
            className="bg-slate-800/80 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 rounded-2xl p-4 text-center transition-all cursor-pointer group shadow-sm"
          >
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-white">Aprendizados</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Estudos e Quizzes</div>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold rounded-full">
              DISPONÍVEL
            </span>
          </button>
        </div>
      </div>

      {/* Blocked Modules Note */}
      <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-6 text-left">
        <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Requerem Ligação Ativa
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          AI Assistant, cotações de câmbio em tempo real, envio de auditorias e sincronização com a cloud necessitam de ligação à internet.
        </p>
      </div>

      {/* Tentar novamente Button */}
      <button
        onClick={tryReconnect}
        disabled={checking}
        className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 mb-4"
      >
        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        <span>Tentar novamente</span>
      </button>

      {/* Status Footer */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className={`w-2 h-2 rounded-full ${isOnlineState ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
        <span>{statusText}</span>
      </div>

    </div>
  );
};

export default OfflineBlockedView;

