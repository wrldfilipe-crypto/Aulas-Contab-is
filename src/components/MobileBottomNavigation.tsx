import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Sparkles, 
  CheckSquare, 
  Menu,
  Calculator
} from 'lucide-react';
import { AppTab } from '../App';

interface MobileBottomNavigationProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  onOpenMenu: () => void;
  unreadNotificationsCount?: number;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeTab,
  onNavigate,
  onOpenMenu,
  unreadNotificationsCount = 0
}) => {
  const navItems = [
    {
      id: 'dashboard' as AppTab,
      label: 'Painel',
      icon: LayoutDashboard,
      ariaLabel: 'Ir para o Painel Principal'
    },
    {
      id: 'learning' as AppTab,
      label: 'Estudar',
      icon: BookOpen,
      ariaLabel: 'Ir para o Centro de Estudos'
    },
    {
      id: 'assistant' as AppTab,
      label: 'Yohan AI',
      icon: Sparkles,
      isAi: true,
      ariaLabel: 'Aceder ao Yohan AI Consultor Contabilístico'
    },
    {
      id: 'accounting' as AppTab,
      label: 'Contabilidade',
      icon: Calculator,
      ariaLabel: 'Ir para Contabilidade e Balancete PGC'
    },
    {
      id: 'quizzes' as AppTab,
      label: 'Quizzes',
      icon: CheckSquare,
      ariaLabel: 'Ir para Quizzes e Avaliações'
    }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 px-2"
      aria-label="Navegação Principal Mobile"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[46px] rounded-xl px-1.5 py-1 transition-all active:scale-95 cursor-pointer select-none ${
                isActive
                  ? item.isAi
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Highlight pill behind active icon */}
              {isActive && (
                <span
                  className={`absolute inset-0 rounded-xl transition-all ${
                    item.isAi
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'bg-blue-500/10 dark:bg-blue-500/20'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Icon Container with AI pulse if active */}
              <div className="relative z-10 flex items-center justify-center">
                {item.isAi ? (
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    isActive
                      ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs shadow-indigo-500/30'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                ) : (
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                )}
              </div>

              {/* Label */}
              <span className="relative z-10 text-[10px] tracking-tight mt-0.5 whitespace-nowrap leading-none">
                {item.label}
              </span>

              {/* Small Active Dot */}
              {isActive && !item.isAi && (
                <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />
              )}
            </button>
          );
        })}

        {/* 'Mais' / Drawer Menu Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir Menu Completo de Ferramentas"
          className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[46px] rounded-xl px-1.5 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-all active:scale-95 cursor-pointer select-none"
        >
          <div className="relative flex items-center justify-center">
            <Menu className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap leading-none">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNavigation;
