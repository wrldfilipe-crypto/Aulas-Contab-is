import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, Globe, 
  HelpCircle, Lightbulb, Compass, Award, Play, BookOpen, Layers,
  Calculator, FileText, Check, ShieldCheck, ArrowRight, BookMarked
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string; // DOM element ID to highlight (or 'center' if modal)
  title: string;
  subtitle?: string;
  description: string;
  conceptPoints?: { label: string; detail: string; badge?: string }[];
  exampleSnippet?: { debito: string; credito: string; explicacao: string };
  badge?: string;
  tabToActivate?: string;
  placement?: 'right' | 'left' | 'bottom' | 'top' | 'center';
}

export type TourTrack = 'pgc_fundamentals' | 'platform_tour';

// ── TOUR TRACK 1: CONCEITOS FUNDAMENTAIS DO PGC ANGOLA (Dec. 82/01) ───
const PGC_FUNDAMENTALS_STEPS: TourStep[] = [
  {
    id: 'pgc-intro-classes',
    targetId: 'accounting-standard-selector-btn',
    title: '1. O Plano Geral de Contabilidade (PGC Angola)',
    subtitle: 'Estrutura Normativa (Decreto 82/01 de 16 de Novembro)',
    description: 'O PGC Angola organiza a contabilidade em 8 Classes de contas harmónicas, divididas entre Balanço (Património) e Demonstração de Resultados (Desempenho Económico).',
    conceptPoints: [
      { label: 'Classe 1 (Meios Fixos)', detail: 'Imobilizações corpóreas, incorpóreas e investimentos financeiros.', badge: 'Ativo Não Corrente' },
      { label: 'Classe 2 (Existências)', detail: 'Mercadorias, matérias-primas e produtos acabados.', badge: 'Ativo Corrente' },
      { label: 'Classe 3 (Terceiros)', detail: 'Clientes (31), Fornecedores (32), Estado e Impostos (34).', badge: 'Ativo / Passivo' },
      { label: 'Classe 4 (Meios Monetários)', detail: 'Caixa (41), Depósitos à Ordem (43) e Outros.', badge: 'Liquidez Imediata' },
      { label: 'Classe 5 (Capital e Reservas)', detail: 'Capital Social (51), Reservas Legais (55) e Resultados Transitados.', badge: 'Capital Próprio' },
      { label: 'Classes 6, 7 e 8', detail: 'Custos por Natureza (6), Proveitos por Natureza (7) e Resultados Finais (8).', badge: 'Rendimentos' }
    ],
    badge: 'ESTRUTURA PGC',
    placement: 'bottom'
  },
  {
    id: 'pgc-partidas-dobradas',
    targetId: 'nav-btn-accounting',
    title: '2. O Método das Partidas Dobradas & Regra Débito/Crédito',
    subtitle: 'Princípio da Equivalência Financeira Universal',
    description: 'Em cada lançamento contabilístico, o Total a Débito deve ser rigorosamente igual ao Total a Crédito (∑ Débitos = ∑ Créditos).',
    conceptPoints: [
      { label: 'Contas de Ativo & Custos (Classes 1, 2, 4 e 6)', detail: 'Aumentam a DÉBITO e diminuem a CRÉDITO.', badge: 'Natureza Devedora' },
      { label: 'Contas de Passivo, Capital & Proveitos (Classes 3, 5 e 7)', detail: 'Aumentam a CRÉDITO e diminuem a DÉBITO.', badge: 'Natureza Credora' }
    ],
    exampleSnippet: {
      debito: 'Conta 43.1 (Depósitos à Ordem BFA) — Akz 100.000 (Aumento de Ativo)',
      credito: 'Conta 31.1 (Clientes Conta-Corrente) — Akz 100.000 (Diminuição de Direito)',
      explicacao: 'Recebimento de fatura de cliente por transferência bancária.'
    },
    badge: 'MÉTODO CONTABILÍSTICO',
    tabToActivate: 'accounting',
    placement: 'right'
  },
  {
    id: 'pgc-fiscalidade-agt',
    targetId: 'global-context-bar',
    title: '3. Enquadramento Fiscal em Angola (AGT)',
    subtitle: 'Impostos Diretos, Indiretos e Retenções Obrigatórias',
    description: 'A legislação fiscal angolana exige cumprimento escrupuloso de retenções e declarações periódicas junto da AGT (Administração Geral Tributária):',
    conceptPoints: [
      { label: 'IRT (Imposto sobre o Rendimento do Trabalho)', detail: 'Tabela de taxas progressivas até 25% para Grupo A e taxa liberatória de 6.5% para serviços pontuais (Grupo B).', badge: 'Conta 34.2' },
      { label: 'IVA (Imposto sobre o Valor Acrescentado)', detail: 'Taxa geral de 14% (ou 7% em bens essenciais), com dedutibilidade e regimes de exclusão/geral.', badge: 'Conta 34.5' },
      { label: 'Imposto Industrial', detail: 'Taxa geral de 25% sobre os lucros tributáveis (ou 15% para setor agrícola/pescas).', badge: 'Conta 34.1' }
    ],
    badge: 'FISCALIDADE AGT',
    placement: 'bottom'
  },
  {
    id: 'pgc-demonstracoes-financeiras',
    targetId: 'nav-btn-learnings',
    title: '4. As Peças Financeiras Obrigatórias',
    subtitle: 'Relatório e Contas de Fim de Exercício',
    description: 'O fecho de contas no PGC Angola requer a emissão de relatórios oficiais para auditoria e prestação de contas:',
    conceptPoints: [
      { label: 'Balancete de Verificação de 6 Colunas', detail: 'Compara Saldos Iniciais, Movimentos do Mês e Saldos Finais antes e após regularização.', badge: 'Controlo' },
      { label: 'Balanço Patrimonial', detail: 'Apresenta a posição do Ativo Líquido, Passivo e Capital Próprio no encerramento do exercício.', badge: 'Património' },
      { label: 'Demonstração dos Resultados por Natureza', detail: 'Calcula a Margem Bruta, Resultados Operacionais, Financeiros e o Resultado Líquido do Exercício.', badge: 'Desempenho' }
    ],
    badge: 'DEMONSTRAÇÕES',
    tabToActivate: 'learning',
    placement: 'right'
  },
  {
    id: 'pgc-ai-validator',
    targetId: 'nav-btn-assistant',
    title: '5. Validador Inteligente & Assistente IA PGC',
    subtitle: 'Verificação em Tempo Real de Conformidade Angolana',
    description: 'O ContaGlobal integra um motor de IA especializado que audita lançamentos, detecta discrepâncias no plano de contas e explica o cálculo de retenções fiscais instantaneamente.',
    conceptPoints: [
      { label: 'Auditoria de Lançamentos', detail: 'Garante que os códigos de subcontas (ex: 31.1, 43.1, 62.2) respeitam o PGC Angola.', badge: 'Auto-Correção' },
      { label: 'Memória Orgânica Contínua', detail: 'Aprende com o histórico dos seus estudos e sugere exercícios direcionados para as suas dúvidas.', badge: 'IA Adaptativa' }
    ],
    badge: 'CONSULTOR IA',
    tabToActivate: 'assistant',
    placement: 'right'
  },
  {
    id: 'pgc-offline-resilience',
    targetId: 'd3-offline-queue-gauge-container',
    title: '6. Fila Offline & Sincronização em Tempo Real',
    subtitle: 'Disponibilidade Sem Interrupções Mesmo Sem Internet',
    description: 'Trabalhe livremente sem conexão. Todos os lançamentos, notas e testes são enfileirados localmente no IndexedDB e sincronizados automaticamente com o servidor central.',
    conceptPoints: [
      { label: 'Monitor D3 em Tempo Real', detail: 'Visualizador circular animado no topo indica o estado da fila de sincronização.', badge: 'D3 Live' },
      { label: 'Garantia de Integridade', detail: 'Nenhum dado é perdido ao fechar o navegador ou em redes móveis instáveis.', badge: 'Resiliente' }
    ],
    badge: 'OFFLINE & SYNC',
    placement: 'bottom'
  }
];

// ── TOUR TRACK 2: VISITA GUIADA À PLATAFORMA ───
const PLATFORM_STEPS: TourStep[] = [
  {
    id: 'platform-sidebar',
    targetId: 'sidebar-panel-desktop',
    title: 'Menu Adaptativo & Navegação Rápida',
    description: 'O menu lateral ajusta-se automaticamente ao seu espaço de trabalho! Passe o cursor para expandir ou recolher o painel, ou utilize o botão de Fixação (Pin) no topo para mantê-lo sempre aberto.',
    badge: 'MENU LATERAL',
    placement: 'right'
  },
  {
    id: 'platform-context-bar',
    targetId: 'global-context-bar',
    title: 'Barra de Contexto Global & Prazos Fiscais',
    description: 'A barra de topo fixa apresenta o seu enquadramento em tempo real: a norma contabilística activa, o tópico em estudo e alertas regressivos para prazos da AGT.',
    badge: 'CONTEXTO GLOBAL',
    placement: 'bottom'
  },
  {
    id: 'platform-assistant',
    targetId: 'nav-btn-assistant',
    title: 'Consultor IA Contabilístico & Fiscal',
    description: 'Esclareça dúvidas complexas sobre IRT, IVA, IRC e lançamentos contabilísticos com a IA Generativa dotada de Memória Orgânica Contínua.',
    badge: 'CONSULTOR IA',
    tabToActivate: 'assistant',
    placement: 'right'
  },
  {
    id: 'platform-learnings',
    targetId: 'nav-btn-learnings',
    title: 'Módulos Didáticos & Modo Imersivo',
    description: 'Envie qualquer ficheiro (PDF, Word, imagem) para análise automática, infográficos e exercícios didáticos. Use o novo Modo Imersivo para estudar sem distrações.',
    badge: 'APRENDIZADOS',
    tabToActivate: 'learning',
    placement: 'right'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  currentLanguage?: string;
  initialTrack?: TourTrack;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  currentLanguage = 'pt',
  initialTrack = 'pgc_fundamentals'
}) => {
  const [activeTrack, setActiveTrack] = useState<TourTrack>(initialTrack);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = activeTrack === 'pgc_fundamentals' ? PGC_FUNDAMENTALS_STEPS : PLATFORM_STEPS;
  const step = steps[currentStepIndex] || steps[0];

  // Function to calculate position of current highlighted element
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    if (step.placement === 'center' || step.targetId === 'center') {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen && step) {
      if (step.tabToActivate && onNavigateTab) {
        onNavigateTab(step.tabToActivate);
      }
      const timer = setTimeout(() => {
        updateTargetRect();
      }, 180);

      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect, true);
      };
    }
  }, [isOpen, currentStepIndex, activeTrack, step, updateTargetRect, onNavigateTab]);

  // Keyboard Navigation Support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('ga_onboarding_tour_completed', 'true');
    } catch (e) {}
    onClose();
  };

  const switchTrack = (track: TourTrack) => {
    setActiveTrack(track);
    setCurrentStepIndex(0);
  };

  if (!isOpen || !step) return null;

  // Calculate Tooltip Box Coordinates
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  if (targetRect) {
    const padding = 14;
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      tooltipStyle = {
        position: 'fixed',
        bottom: '16px',
        left: '12px',
        right: '12px',
        maxHeight: '85vh',
        overflowY: 'auto',
        zIndex: 9999,
      };
    } else if (step.placement === 'right') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - 440, targetRect.top - 20)),
        left: `${targetRect.right + padding}px`,
        maxWidth: '460px',
        width: '460px',
        zIndex: 9999,
      };
    } else if (step.placement === 'left') {
      tooltipStyle = {
        top: Math.max(16, Math.min(window.innerHeight - 440, targetRect.top - 20)),
        left: `${Math.max(16, targetRect.left - 480)}px`,
        maxWidth: '460px',
        width: '460px',
        zIndex: 9999,
      };
    } else if (step.placement === 'bottom') {
      tooltipStyle = {
        top: `${targetRect.bottom + padding}px`,
        left: Math.max(20, Math.min(window.innerWidth - 480, targetRect.left - 40)),
        maxWidth: '460px',
        width: '460px',
        zIndex: 9999,
      };
    } else if (step.placement === 'top') {
      tooltipStyle = {
        bottom: `${window.innerHeight - targetRect.top + padding}px`,
        left: Math.max(20, Math.min(window.innerWidth - 480, targetRect.left - 40)),
        maxWidth: '460px',
        width: '460px',
        zIndex: 9999,
      };
    }
  } else {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '480px',
      width: '92%',
      maxHeight: '90vh',
      overflowY: 'auto',
      zIndex: 9999,
    };
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto select-none" id="onboarding-tour-modal-wrapper">
        {/* Dark Spotlight Backdrop Overlay */}
        <div 
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs transition-all duration-300 cursor-pointer"
          onClick={handleFinish}
          title="Clique fora para fechar o tutorial interativo"
        >
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                position: 'fixed',
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                borderRadius: '14px',
                boxShadow: '0 0 0 9999px rgba(10, 22, 40, 0.82), 0 0 24px 6px rgba(59, 130, 246, 0.65)',
                border: '2px solid rgba(96, 165, 250, 0.9)',
                pointerEvents: 'none',
                zIndex: 9991
              }}
              className="animate-pulse"
            />
          )}
        </div>

        {/* Floating Tooltip Card with PGC Concept Breakdown */}
        <motion.div
          key={`${activeTrack}-${step.id}`}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={tooltipStyle}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900/98 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white font-sans space-y-4 ring-1 ring-white/10"
        >
          {/* Track Switcher & Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              {/* Tour Track Selector Tabs */}
              <div className="inline-flex p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => switchTrack('pgc_fundamentals')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTrack === 'pgc_fundamentals'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  <span>Fundamentos PGC</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchTrack('platform_tour')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTrack === 'platform_tour'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Plataforma</span>
                </button>
              </div>

              <button
                onClick={handleFinish}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-xl transition-colors cursor-pointer"
                title="Fechar Tutorial (Esc)"
                aria-label="Fechar Tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Counter & Category Badge */}
            <div className="flex items-center justify-between text-xs">
              <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {step.badge || 'PGC ANGOLA'}
              </span>
              <span className="text-[11px] font-extrabold text-slate-400">
                Passo {currentStepIndex + 1} de {steps.length}
              </span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {step.title}
            </h3>
            {step.subtitle && (
              <div className="text-xs font-semibold text-blue-400">
                {step.subtitle}
              </div>
            )}
            <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
              {step.description}
            </p>
          </div>

          {/* Structured PGC Concept Points (if present) */}
          {step.conceptPoints && step.conceptPoints.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
              {step.conceptPoints.map((pt, i) => (
                <div key={i} className="text-[11px] flex flex-col gap-0.5 border-b border-slate-800/50 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      {pt.label}
                    </span>
                    {pt.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {pt.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 pl-2.5 leading-tight">{pt.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Practical Accounting Example Snippet (if present) */}
          {step.exampleSnippet && (
            <div className="bg-blue-950/40 border border-blue-500/30 p-3 rounded-2xl space-y-1.5 text-[11px]">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                <span>Exemplo Prático de Lançamento</span>
              </div>
              <div className="font-mono text-[10px] space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                <div className="text-emerald-300 flex items-center gap-1">
                  <strong className="text-emerald-400">D:</strong> {step.exampleSnippet.debito}
                </div>
                <div className="text-cyan-300 flex items-center gap-1">
                  <strong className="text-cyan-400">C:</strong> {step.exampleSnippet.credito}
                </div>
              </div>
              <div className="text-[10px] text-slate-300 italic">
                {step.exampleSnippet.explicacao}
              </div>
            </div>
          )}

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-7 bg-blue-500 shadow-sm shadow-blue-500/50' 
                    : idx < currentStepIndex 
                    ? 'w-2 bg-blue-800 hover:bg-blue-600' 
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Ir para o passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
            <button
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2 py-1"
            >
              Terminar Tutorial
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 border border-slate-700 cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
              >
                {currentStepIndex === steps.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Concluir Tutorial</span>
                  </>
                ) : (
                  <>
                    <span>Seguinte</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
