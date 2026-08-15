import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X, Command, Sparkles, Navigation, Layers } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Navegação Rápida entre Abas (Alt + Número)',
    shortcuts: [
      { key: 'Alt + 1', label: 'Painel Principal (Dashboard)', tab: 'dashboard' },
      { key: 'Alt + 2', label: 'AI Accountant (Consultor IA)', tab: 'assistant' },
      { key: 'Alt + 3', label: 'Aprendizados (Biblioteca)', tab: 'learning' },
      { key: 'Alt + 4', label: 'Quizzes & Duelo Contábil', tab: 'quizzes' },
      { key: 'Alt + 5', label: 'Contabilidade (PGC Angola)', tab: 'accounting' },
      { key: 'Alt + 6', label: 'Faturação ERP', tab: 'faturacao' },
      { key: 'Alt + 7', label: 'Recursos Humanos (RH)', tab: 'rh' },
      { key: 'Alt + 8', label: 'Taxas de Câmbio BNA', tab: 'exchange_rates' },
    ]
  },
  {
    title: 'Acções Gerais & Utilitários',
    shortcuts: [
      { key: 'Ctrl + K  /  ⌘ + K', label: 'Pesquisa Global do Sistema' },
      { key: 'Shift + ?  /  ?', label: 'Abrir este Modal de Atalhos de Teclas' },
      { key: 'Esc', label: 'Fechar Modais / Diálogos Ativos' },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" id="keyboard-shortcuts-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-10 space-y-0"
            id="keyboard-shortcuts-modal-card"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Keyboard className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>Ajuda de Atalhos de Teclas</span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full">
                      Teclado Global
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Navega instantaneamente entre os módulos com atalhos de teclado.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {SHORTCUT_GROUPS.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{group.title}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {group.shortcuts.map((sc, scIdx) => (
                      <div
                        key={scIdx}
                        onClick={() => {
                          if (sc.tab && onNavigateTab) {
                            onNavigateTab(sc.tab);
                            onClose();
                          }
                        }}
                        className={`p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 transition-all ${
                          sc.tab ? 'hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer group' : ''
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                          {sc.label}
                        </span>
                        <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-mono font-extrabold text-slate-800 shadow-2xs shrink-0 whitespace-nowrap">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Pressiona <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold">Shift + ?</kbd> a qualquer momento para abrir esta ajuda.
              </span>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Compreendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
