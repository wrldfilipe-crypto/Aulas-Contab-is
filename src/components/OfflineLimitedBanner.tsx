import React, { useState, useEffect } from 'react';

interface OfflineLimitedBannerProps {
  onNavigateToEstudos?: () => void;
}

export const OfflineLimitedBanner: React.FC<OfflineLimitedBannerProps> = ({ onNavigateToEstudos }) => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-slate-900 border border-blue-800 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3 text-white shadow-xl animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-xl p-2 bg-blue-900/60 rounded-xl border border-blue-700/60">📵</span>
        <div>
          <div className="text-xs font-black text-blue-300 uppercase tracking-wider flex items-center gap-2">
            <span>Modo Offline — Acesso Local Ativo</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="text-xs text-slate-300 mt-0.5">
            Estás offline — a mostrar módulos e matérias guardados localmente. Ações dinâmicas (IA, pesquisa online) estão suspensas temporariamente.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onNavigateToEstudos && (
          <button 
            onClick={onNavigateToEstudos}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            📚 Ir para Aprendizados
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineLimitedBanner;
