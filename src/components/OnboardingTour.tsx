import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2, Globe, 
  HelpCircle, Lightbulb, Compass, Award, Play
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string; // DOM element ID to highlight
  title: string;
  description: string;
  badge?: string;
  tabToActivate?: string;
  placement?: 'right' | 'left' | 'bottom' | 'top' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome-adaptive-menu',
    targetId: 'sidebar-panel-desktop',
    title: 'Menu Adaptativo (Adaptive Sidebar)',
    description: 'O menu ajusta-se automaticamente ao seu espaço de trabalho! Passe o cursor para expandir ou recolher o painel, ou utilize o botão de Fixação (Pin) no topo para mantê-lo sempre aberto.',
    badge: 'MENU ADAPTATIVO',
    placement: 'right'
  },
  {
    id: 'smart-suggestions',
    targetId: 'sidebar-smart-suggestions',
    title: 'Sugestões Inteligentes (Smart Suggestions)',
    description: 'Integrado na parte inferior do menu, este painel analisa a sua memória de estudo e sugere automaticamente a próxima aula recomendada, testes rápidos e lembretes de obrigações fiscais.',
    badge: 'SUGESTÕES IA',
    placement: 'right'
  },
  {
    id: 'context-bar',
    targetId: 'global-context-bar',
    title: 'Barra de Contexto Global (Context Bar)',
    description: 'A barra de topo fixa apresenta o seu enquadramento em tempo real: a norma contabilística em utilização, o tópico em estudo e contadores regressivos para prazos fiscais.',
    badge: 'CONTEXTO GLOBAL',
    placement: 'bottom'
  },
  {
    id: 'accounting-standard',
    targetId: 'accounting-standard-selector-btn',
    title: 'Seletor Multinorma de Jurisdição',
    description: 'Alterne rapidamente entre Angola (PGC), Brasil (NBC), Portugal (SNC) e IFRS Internacional. Todo o sistema — plano de contas, impostos e respostas da IA — adapta-se no instante!',
    badge: 'MULTINORMA',
    placement: 'bottom'
  },
  {
    id: 'ai-assistant',
    targetId: 'nav-btn-assistant',
    title: 'Consultor IA Contabilístico & Fiscal',
    description: 'Esclareça dúvidas complexas sobre IRT, IVA, IRC e lançamentos contabilísticos com a IA Generativa dotada de Memória Orgânica Contínua.',
    badge: 'CONSULTOR IA',
    tabToActivate: 'assistant',
    placement: 'right'
  },
  {
    id: 'learnings',
    targetId: 'nav-btn-learnings',
    title: 'Aprendizados & Análise Didática IA',
    description: 'Submeta qualquer material de estudo (PDF, imagem, texto, Word, Excel). A IA analisa o conteúdo completo, explica todos os pontos didaticamente, organiza secções com exemplos e exercícios, e gera infográficos visuais.',
    badge: 'APRENDIZADOS IA',
    tabToActivate: 'learning',
    placement: 'right'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  currentLanguage?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  currentLanguage = 'pt'
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Function to calculate position of current highlighted element
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    if (step.placement === 'center') {
      setTargetRect(null);
      return;
    }

    const element = document.getElementById(step.targetId);
    if (element) {
      // Scroll element into view smoothly if offscreen
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // Fallback if element not found in DOM
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen && step) {
      if (step.tabToActivate && onNavigateTab) {
        onNavigateTab(step.tabToActivate);
      }
      // Small timeout to allow tab layout changes to complete
      const timer = setTimeout(() => {
        updateTargetRect();
      }, 150);

      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect, true);
      };
    }
  }, [isOpen, currentStepIndex, step, updateTargetRect, onNavigateTab]);

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
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
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
    localStorage.setItem('ga_onboarding_tour_completed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  // Calculate Tooltip Box Coordinates
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  if (targetRect) {
    const padding = 12;
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      tooltipStyle = {
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        zIndex: 9999,
      };
    } else if (step.placement === 'right') {
      tooltipStyle = {
        top: Math.max(20, Math.min(window.innerHeight - 320, targetRect.top)),
        left: `${targetRect.right + padding}px`,
        maxWidth: '380px',
        zIndex: 9999,
      };
    } else if (step.placement === 'left') {
      tooltipStyle = {
        top: Math.max(20, Math.min(window.innerHeight - 320, targetRect.top)),
        left: `${targetRect.left - 400}px`,
        maxWidth: '380px',
        zIndex: 9999,
      };
    } else if (step.placement === 'bottom') {
      tooltipStyle = {
        top: `${targetRect.bottom + padding}px`,
        left: Math.max(20, Math.min(window.innerWidth - 400, targetRect.left)),
        maxWidth: '400px',
        zIndex: 9999,
      };
    } else if (step.placement === 'top') {
      tooltipStyle = {
        bottom: `${window.innerHeight - targetRect.top + padding}px`,
        left: Math.max(20, Math.min(window.innerWidth - 400, targetRect.left)),
        maxWidth: '400px',
        zIndex: 9999,
      };
    }
  } else {
    // Center Modal fallback
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '450px',
      width: '90%',
      zIndex: 9999,
    };
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
        {/* Dark Spotlight Backdrop Overlay */}
        <div 
          className="absolute inset-0 bg-slate-950/75 transition-all duration-300 cursor-pointer"
          onClick={handleFinish}
          title="Clique em qualquer lugar fora para fechar o tour guiado"
        >
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed',
                top: `${targetRect.top - 6}px`,
                left: `${targetRect.left - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                borderRadius: '12px',
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 20px 4px rgba(59, 130, 246, 0.6)',
                border: '2px solid rgba(96, 165, 250, 0.9)',
                pointerEvents: 'none',
                zIndex: 9991
              }}
              className="animate-pulse"
            />
          )}
        </div>

        {/* Floating Tooltip Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          style={tooltipStyle}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-white font-sans space-y-4"
        >
          {/* Card Header & Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {step.badge || 'TOUR'}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                Passo {currentStepIndex + 1} de {TOUR_STEPS.length}
              </span>
            </div>

            <button
              onClick={handleFinish}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition-colors cursor-pointer"
              title="Saltar Tour Guiado (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-white leading-tight flex items-center gap-2">
              <span>{step.title}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {step.description}
            </p>
          </div>

          {/* Progress Indicator Dots */}
          <div className="flex items-center justify-center gap-1.5 py-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex 
                    ? 'w-6 bg-blue-500' 
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
              Saltar Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Concluir Tour</span>
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
