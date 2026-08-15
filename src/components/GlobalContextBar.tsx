import React, { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, ArrowRight, Globe, Sparkles } from 'lucide-react';
import { SessionContext } from '../lib/accountingStandards';
import { getLongtermMemory, getNextRecommendedTopic } from '../lib/memoryManager';

interface GlobalContextBarProps {
  sessionContext: SessionContext;
  onOpenStandardModal: () => void;
  onNavigateTo: (page: string, payload?: any) => void;
  currentTopic?: string;
}

export const GlobalContextBar: React.FC<GlobalContextBarProps> = ({
  sessionContext,
  onOpenStandardModal,
  onNavigateTo,
  currentTopic = 'Lançamentos Contabilísticos PGC'
}) => {
  const [recommendedTopic, setRecommendedTopic] = useState<string>('');

  useEffect(() => {
    const topic = getNextRecommendedTopic();
    setRecommendedTopic(topic);
  }, []);

  return (
    <div id="global-context-bar" className="h-8 bg-[#1B3A6B] text-white text-[11px] px-4 flex items-center justify-between shadow-sm z-30 shrink-0 border-b border-blue-900/60 overflow-x-auto whitespace-nowrap gap-4 font-sans">
      <div className="flex items-center gap-4">
        {/* Active Standard Badge */}
        <button
          id="accounting-standard-selector-btn"
          onClick={onOpenStandardModal}
          className="flex items-center gap-1.5 bg-blue-900/60 hover:bg-blue-800/80 px-2 py-0.5 rounded text-blue-100 font-semibold transition-all border border-blue-400/30 cursor-pointer"
          title="Mudar Norma Contabilística"
        >
          <Globe className="w-3 h-3 text-cyan-300" />
          <span>Norma: <strong className="text-white font-bold">{sessionContext.standard || 'PGC Angola'} (🇦🇴 AO)</strong></span>
        </button>

        <span className="text-blue-400/60">|</span>

        {/* Current Topic in Study */}
        <div className="flex items-center gap-1.5 text-blue-200">
          <BookOpen className="w-3 h-3 text-emerald-400" />
          <span>Tópico Activo: <strong className="text-white font-medium">{currentTopic}</strong></span>
        </div>

        <span className="text-blue-400/60">|</span>

        {/* Next Recommended Exercise Link */}
        <button
          onClick={() => onNavigateTo('study-materials', recommendedTopic)}
          className="flex items-center gap-1.5 text-emerald-300 hover:text-white font-semibold transition-colors group"
        >
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Próxima Aula: <strong>{recommendedTopic || 'Depreciação PGC'}</strong></span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Urgent Compliance Alert Pill */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigateTo('assistant')}
          className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse transition-all cursor-pointer"
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>IRT Angola: 4 dias para entrega</span>
        </button>
      </div>
    </div>
  );
};
