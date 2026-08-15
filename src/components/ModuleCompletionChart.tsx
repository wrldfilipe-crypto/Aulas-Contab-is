import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, AlertCircle, CheckCircle2, TrendingUp, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { LearningItem } from './LearningWorkspace';

interface ModuleCompletionChartProps {
  library: LearningItem[];
  onSelectLearning: (item: LearningItem) => void;
}

export const ModuleCompletionChart: React.FC<ModuleCompletionChartProps> = ({
  library,
  onSelectLearning
}) => {
  const [viewMode, setViewMode] = useState<'category' | 'item'>('category');

  if (!library || library.length === 0) return null;

  // Aggregate completion stats by Category
  const categoryStats: Record<string, { totalItems: number; sumProgress: number; items: LearningItem[] }> = {};

  library.forEach(item => {
    const cat = item.category || 'Geral';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { totalItems: 0, sumProgress: 0, items: [] };
    }
    categoryStats[cat].totalItems += 1;
    categoryStats[cat].sumProgress += (item.progress || 0);
    categoryStats[cat].items.push(item);
  });

  const categoryList = Object.entries(categoryStats).map(([cat, data]) => ({
    category: cat,
    avgProgress: Math.round(data.sumProgress / (data.totalItems || 1)),
    totalItems: data.totalItems,
    items: data.items
  })).sort((a, b) => a.avgProgress - b.avgProgress); // Lowest progress first to highlight areas requiring dedication

  const itemsList = [...library].sort((a, b) => (a.progress || 0) - (b.progress || 0));

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-5" id="module-completion-chart-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Progresso de Conclusão dos Módulos</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                Análise Visual
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Acompanha o progresso por categoria de estudo para identificar quais matérias exigem mais atenção.
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('category')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'category'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por Categoria
          </button>
          <button
            type="button"
            onClick={() => setViewMode('item')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'item'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por Material ({library.length})
          </button>
        </div>
      </div>

      {/* Bar Charts Section */}
      {viewMode === 'category' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {categoryList.map((catData) => {
              const isNeedsFocus = catData.avgProgress < 50;
              const isCompleted = catData.avgProgress >= 90;

              return (
                <div 
                  key={catData.category}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-extrabold text-xs text-slate-900 truncate">
                        {catData.category}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                        {catData.totalItems} {catData.totalItems === 1 ? 'módulo' : 'módulos'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isNeedsFocus && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Requer Mais Dedicação
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Excelente Dominio
                        </span>
                      )}
                      <span className="font-black text-xs text-slate-900">
                        {catData.avgProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Bar Visualization */}
                  <div className="h-3 w-full bg-slate-200/80 rounded-full overflow-hidden relative shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, catData.avgProgress)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        catData.avgProgress >= 80 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                          : catData.avgProgress >= 50 
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-400' 
                            : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {itemsList.map((item) => {
              const prog = item.progress || 0;
              const isLow = prog < 50;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectLearning(item)}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider truncate max-w-[140px]">
                      {item.category || 'Geral'}
                    </span>
                    <span className={`text-[11px] font-black ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {prog}% Concluído
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>

                  {/* Simple Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        prog >= 80 
                          ? 'bg-emerald-500' 
                          : prog >= 50 
                            ? 'bg-indigo-500' 
                            : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(5, prog)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Módulos com menos de 50% de conclusão são priorizados para revisão diária.
        </span>
      </div>

    </div>
  );
};
