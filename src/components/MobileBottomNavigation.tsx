import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CheckSquare, 
  MoreHorizontal,
  FileText,
  User,
  Settings,
  SunMoon,
  Shield,
  LogOut,
  X,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { AppTab } from '../App';
import { UserSession } from '../lib/db';
import { YohanLogo } from './YohanLogo';
import { AccountingLogo } from './AccountingLogo';
import { ThemeSelector } from './ThemeSelector';

interface MobileBottomNavigationProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
  onOpenMenu?: () => void;
  unreadNotificationsCount?: number;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  onLogout,
  onOpenMenu,
  unreadNotificationsCount = 0
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

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
      icon: null,
      isAi: true,
      ariaLabel: 'Aceder ao Yohan AI Consultor Contabilístico'
    },
    {
      id: 'accounting' as AppTab,
      label: 'Contabilidade',
      icon: null,
      isAccounting: true,
      ariaLabel: 'Ir para Contabilidade e Balancete PGC'
    },
    {
      id: 'quizzes' as AppTab,
      label: 'Quizzes',
      icon: CheckSquare,
      ariaLabel: 'Ir para Quizzes e Avaliações'
    }
  ];

  const handleSelectTab = (tab: AppTab) => {
    setIsMoreSheetOpen(false);
    onNavigate(tab);
  };

  const handleOpenMore = () => {
    setIsMoreSheetOpen(true);
    if (onOpenMenu) {
      // Optional fallback
    }
  };

  const userName = currentUser?.name || 'Usuário';
  const userEmail = currentUser?.email || 'membro@estudos.ao';
  const userInitials = (userName || 'U').substring(0, 2).toUpperCase();

  return (
    <>
      {/* 1. FIXED BOTTOM TAB BAR (MOBILE & TABLET: <1024px) */}
      <nav
        className="fixed bottom-0 left-0 right-0 w-full h-16 z-[500] lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)] px-1 flex items-center justify-around"
        aria-label="Navegação Principal Mobile e Tablet"
        id="mobile-bottom-tab-bar"
      >
        <div className="flex items-center justify-around w-full max-w-xl mx-auto h-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                aria-label={item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 cursor-pointer select-none ${
                  isActive
                    ? item.isAi
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                }`}
                id={`mobile-tab-${item.id}`}
              >
                {/* Highlight pill behind active icon */}
                {isActive && (
                  <span
                    className={`absolute inset-1 rounded-xl transition-all ${
                      item.isAi
                        ? 'bg-indigo-500/10 dark:bg-indigo-500/20'
                        : 'bg-blue-500/10 dark:bg-blue-500/20'
                    }`}
                    aria-hidden="true"
                  />
                )}

                {/* Icon Container */}
                <div className="relative z-10 flex items-center justify-center">
                  {item.isAi ? (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isActive
                        ? 'bg-slate-900 border border-indigo-500/40 p-0.5 shadow-xs shadow-indigo-500/30'
                        : ''
                    }`}>
                      <YohanLogo size={20} showGlow={isActive} />
                    </div>
                  ) : (item as any).isAccounting ? (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isActive
                        ? 'bg-slate-900 border border-blue-500/40 p-0.5 shadow-xs shadow-blue-500/30'
                        : ''
                    }`}>
                      <AccountingLogo size={20} showGlow={isActive} />
                    </div>
                  ) : (
                    Icon && <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
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

          {/* 6TH ITEM: 'Mais' / Bottom Sheet Trigger */}
          <button
            type="button"
            onClick={handleOpenMore}
            aria-label="Abrir Menu Mais Opções"
            aria-expanded={isMoreSheetOpen}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 cursor-pointer select-none ${
              isMoreSheetOpen || ['notes', 'profile', 'admin'].includes(activeTab)
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
            id="mobile-tab-more"
          >
            {(isMoreSheetOpen || ['notes', 'profile', 'admin'].includes(activeTab)) && (
              <span className="absolute inset-1 rounded-xl bg-blue-500/10 dark:bg-blue-500/20" aria-hidden="true" />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
              )}
            </div>
            <span className="relative z-10 text-[10px] tracking-tight mt-0.5 whitespace-nowrap leading-none">
              Mais
            </span>
          </button>
        </div>
      </nav>

      {/* 2. 'MAIS' BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {isMoreSheetOpen && (
          <div className="fixed inset-0 z-[600] lg:hidden flex flex-col justify-end" id="more-bottom-sheet-root">
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMoreSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
              id="more-bottom-sheet-backdrop"
            />

            {/* Slide-Up Bottom Sheet Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              id="more-bottom-sheet-panel"
            >
              {/* Sheet Drag Indicator */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

              {/* User Profile Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm border-2 border-blue-400 shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {userName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>

                {/* Close Button ✕ */}
                <button
                  type="button"
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                  aria-label="Fechar painel de opções"
                  id="btn-close-more-sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sheet Items / Navigation Links */}
              <div className="p-4 space-y-2 overflow-y-auto flex-1">
                {/* Link: Notas — Bloco de Anotações */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('notes')}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                    activeTab === 'notes'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                  }`}
                  id="more-link-notes"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Notas & Bloco de Anotações</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Anotações pessoais e resumos PGC</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Link: Perfil */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('profile')}
                  className={`w-full text-left p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                  }`}
                  id="more-link-profile"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">O Meu Perfil</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Informações pessoais e dados</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Link: Definições */}
                <button
                  type="button"
                  onClick={() => handleSelectTab('profile')}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer"
                  id="more-link-settings"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Definições do Sistema</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Preferências, segurança e conta</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Link: Aparência & Tema */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <SunMoon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Aparência & Tema</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Alternar modo claro, escuro ou sistema</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <ThemeSelector />
                  </div>
                </div>

                {/* Admin Option if role === admin */}
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleSelectTab('admin')}
                    className="w-full text-left p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 flex items-center justify-between transition-all cursor-pointer"
                    id="more-link-admin"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">Painel de Administração</p>
                        <p className="text-[11px] text-purple-600/80 dark:text-purple-300/80">Gestão global e auditoria</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </button>
                )}

                {/* Link: Terminar Sessão (Bottom Button) */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreSheetOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center gap-3 transition-all cursor-pointer font-bold text-xs"
                    id="more-link-logout"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span>Terminar Sessão</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileBottomNavigation;
