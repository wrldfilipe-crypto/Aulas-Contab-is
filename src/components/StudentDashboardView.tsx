import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Brain,
  Clock,
  Star,
  Flame,
  X,
  RotateCcw,
  ArrowRight,
  Calculator,
  ChevronRight,
  PlayCircle,
  FileText,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { getCurrentUser } from '../lib/db';
import { OfflineLimitedBanner } from './OfflineLimitedBanner';
import { getDashboardCache, saveDashboardCache, subscribeToDashboardChanges } from '../services/dashboardCache';
import { getStudentProgress } from '../services/studentProgressService';

interface InactiveFavoriteItem {
  id: string;
  title: string;
  category: string;
  progress: number;
  daysInactive: number;
  updatedAt: string;
}

interface StudentDashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAiAssistant: (customPrompt?: string) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  onNavigateTab,
  onOpenAiAssistant
}) => {
  const currentUser = getCurrentUser();
  const userName = currentUser?.name || 'Estudante';
  const userId = currentUser?.userId || 'usr_default';

  // Real user data & Student Progress state
  const [studentProgressData, setStudentProgressData] = useState(() => getStudentProgress());
  const [userMaterialsCount, setUserMaterialsCount] = useState<number>(0);
  const [quizzesStats, setQuizzesStats] = useState<{ completed: number; totalScore: number }>({ completed: 0, totalScore: 0 });
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);

  // Smart Inactive Favorite Alert State
  const [inactiveFavorite, setInactiveFavorite] = useState<InactiveFavoriteItem | null>(null);
  const [dismissedAlert, setDismissedAlert] = useState(false);

  // Load Recent Materials from User Library
  const loadRecentMaterials = () => {
    try {
      const rawMaterials = localStorage.getItem(`ga_learnings_lib_${userId}`);
      if (rawMaterials) {
        const parsed: any[] = JSON.parse(rawMaterials);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserMaterialsCount(parsed.length);
          // Sort by lastAccessedAt or updatedAt or createdAt descending
          const sorted = [...parsed].sort((a, b) => {
            const tA = new Date(a.lastAccessedAt || a.updatedAt || a.createdAt || 0).getTime();
            const tB = new Date(b.lastAccessedAt || b.updatedAt || b.createdAt || 0).getTime();
            return tB - tA;
          });
          setRecentMaterials(sorted.slice(0, 3));
        }
      }
    } catch (e) {
      console.warn("Failed fetching recent materials:", e);
    }
  };

  useEffect(() => {
    // Refresh global student progress
    const freshProgress = getStudentProgress();
    setStudentProgressData(freshProgress);

    loadRecentMaterials();

    // 1. Fetch user's uploaded materials & check inactive favorites
    try {
      const rawMaterials = localStorage.getItem(`ga_learnings_lib_${userId}`);
      if (rawMaterials) {
        const parsed: any[] = JSON.parse(rawMaterials);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const now = Date.now();
          const favCandidates = parsed.filter(i => i.isFavorite || i.progress < 100);
          let targetFav: any = null;
          let maxDaysInactive = 0;

          favCandidates.forEach(item => {
            const itemTime = item.updatedAt ? new Date(item.updatedAt).getTime() : new Date(item.createdAt || now).getTime();
            const days = Math.max(3, Math.floor((now - itemTime) / (1000 * 60 * 60 * 24)));
            if (days >= 3 && days >= maxDaysInactive) {
              maxDaysInactive = days;
              targetFav = {
                id: item.id,
                title: item.title || 'Material Favorito',
                category: item.category || 'Geral',
                progress: item.progress || 0,
                daysInactive: days,
                updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
              };
            }
          });

          if (targetFav) {
            setInactiveFavorite(targetFav);
          } else if (parsed.length > 0) {
            const firstFav = parsed.find(i => i.isFavorite) || parsed[0];
            setInactiveFavorite({
              id: firstFav.id,
              title: firstFav.title,
              category: firstFav.category || 'Contabilidade',
              progress: firstFav.progress || 25,
              daysInactive: 3,
              updatedAt: firstFav.updatedAt || new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed fetching materials count & favorites:", e);
    }

    // 2. Fetch user's quiz completion stats
    try {
      const rawQuizStats = localStorage.getItem(`ga_user_quiz_stats_${userId}`);
      if (rawQuizStats) {
        const parsed = JSON.parse(rawQuizStats);
        setQuizzesStats({
          completed: parsed.completed || 0,
          totalScore: parsed.totalScore || 0
        });
      }
    } catch (e) {
      console.warn("Failed fetching quiz stats:", e);
    }

    // Event listeners & Pub/Sub subscription to update materials and stats only when visible
    const handleUpdate = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      loadRecentMaterials();
      setStudentProgressData(getStudentProgress());
    };

    const unsubscribeBus = subscribeToDashboardChanges(() => {
      handleUpdate();
    });

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('visibilitychange', handleUpdate);
    window.addEventListener('learnings_updated', handleUpdate);
    return () => {
      unsubscribeBus();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('visibilitychange', handleUpdate);
      window.removeEventListener('learnings_updated', handleUpdate);
    };
  }, [userId]);

  // Handle continuing a material directly
  const handleContinueMaterial = (item: any) => {
    try {
      localStorage.setItem(`ga_last_selected_learning_${userId}`, item.id);
    } catch (e) {}
    onNavigateTab('learning');
  };

  // Cache state for offline mode
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = getDashboardCache();
      if (cached) {
        setFromCache(true);
        setCacheAge(cached.hoursAgo);
      }
    } else {
      setFromCache(false);
      saveDashboardCache({
        userMaterialsCount,
        quizzesStats,
        updatedAt: new Date().toISOString()
      });
    }
  }, [userMaterialsCount, quizzesStats]);

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" id="student-dashboard-root">
      
      {/* Offline Limited Banner */}
      <OfflineLimitedBanner onNavigateToEstudos={() => onNavigateTab('learning')} />

      {fromCache && (
        <div style={{
          fontSize: "11px", color: "#64748B",
          textAlign: "right", marginBottom: "8px"
        }}>
          🕐 Dados de há {cacheAge ?? 0}h — atualiza ao voltar online
        </div>
      )}

      {/* 1. PAINEL DE BOAS-VINDAS */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800" 
        id="welcome-panel"
      >
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>Painel Global de Gestão & Estudo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bem-vindo(a), {userName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Acompanha o teu progresso de aprendizagem, quizzes e materiais de estudo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              id="welcome-btn-learnings"
              onClick={() => onNavigateTab('learning')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Aprendizados</span>
            </button>
            <button
              id="welcome-btn-ai-accountant"
              onClick={() => onNavigateTab('assistant')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Accountant</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* SMART INACTIVE FAVORITE STUDY ALERT */}
      {inactiveFavorite && !dismissedAlert && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden"
          id="inactive-favorite-study-alert"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce">
                <Star className="w-5 h-5 fill-white" />
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-white" />
                    Lembrete de Estudo Inteligente
                  </span>
                  <span className="text-xs font-bold text-amber-900">
                    Sem estudo há {inactiveFavorite.daysInactive} dias
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 truncate">
                  Retome o seu Aprendizado Favorito: "{inactiveFavorite.title}"
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Notámos que marcou este material como favorito mas não o consulta há mais de {inactiveFavorite.daysInactive} dias (Progresso atual: <strong className="text-amber-800">{inactiveFavorite.progress}%</strong>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                onClick={() => onNavigateTab('learning')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retomar Estudo Agora</span>
              </button>
              
              <button
                onClick={() => setDismissedAlert(true)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition-all cursor-pointer"
                title="Dispensar Notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </motion.div>
      )}

      {/* 2. SECÇÃO DE ACESSO RÁPIDO */}
      <div className="space-y-3" id="quick-access-section">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Acesso Rápido</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="quick-access-cards-grid">
          {/* Card: Contabilidade (PGC) — Lançamentos & Balancete */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            onClick={() => onNavigateTab('accounting')}
            className="bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            id="card-quick-accounting"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Calculator className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                  ERP PGC
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                Contabilidade (PGC) — Lançamentos & Balancete
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                Lançamentos contábeis, diário geral, razão, balancete de verificação e demonstrações financeiras PGC.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Abrir Contabilidade</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card: AI Accountant — Consultoria & Análise */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            onClick={() => onNavigateTab('assistant')}
            className="bg-white border border-gray-200 hover:border-blue-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            id="card-quick-ai-assistant"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                  IA Ativa
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                AI Accountant — Consultoria & Análise
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                Assistente inteligente para resolução de dúvidas contabilísticas, fiscais, auditoria e geração de relatórios.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Aceder ao AI Assistant</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card: Aprendizados — Biblioteca de Estudos */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            onClick={() => onNavigateTab('learning')}
            className="bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            id="card-quick-learnings"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                  Estudos
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                Aprendizados — Biblioteca de Estudos
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                Aceda aos materiais, resumos gerados por IA e manuais interativos para o PGC.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-bold text-emerald-600">
              <span>Ir para Aprendizados</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3. CARD: MÓDULOS DE ESTUDO RECENTES */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs space-y-4"
        id="card-recent-study-modules"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Módulos de Estudo Recentes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Últimos materiais acedidos e em progresso na página Aprendizados
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('learning')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            id="btn-recent-modules-see-all"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMaterials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentMaterials.map((item) => (
              <div 
                key={item.id}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider truncate max-w-[120px]">
                      {item.category || 'Geral'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {item.progress || 0}%
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, item.progress || 0))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.progress === 100 ? 'Concluído' : 'Em progresso'}
                  </span>
                  <button
                    onClick={() => handleContinueMaterial(item)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer active:scale-[0.98]"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Continuar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">Ainda não tens módulos acedidos recentemente</p>
              <p className="text-[11px] text-slate-500">Explora a biblioteca Aprendizados para iniciares os teus estudos.</p>
            </div>
            <button
              onClick={() => onNavigateTab('learning')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explorar Materiais</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </motion.div>

      {/* 4. SUMMARY KPI CARDS SECTION (RESUMO DE PROGRESSO DO ESTUDANTE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Resumo do Teu Progresso Global de Estudo</span>
          </h2>
          <button
            onClick={() => onNavigateTab('learning')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Ver biblioteca completa</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="student-kpi-cards-grid">
          {studentProgressData.cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {card.label}
                  </span>
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${card.cor}15` }}
                  >
                    <span>{card.icone}</span>
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                  {card.valor}
                </div>

                <p className="text-xs text-slate-500 font-medium mt-1">
                  {card.subtexto}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="text-[11px] text-slate-400">Atualizado em tempo real</span>
                <button
                  onClick={() => onNavigateTab(idx === 1 || idx === 2 ? 'quizzes' : 'learning')}
                  className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <span>Aceder</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default StudentDashboardView;
