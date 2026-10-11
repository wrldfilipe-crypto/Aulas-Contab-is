import React from 'react';
import { Menu } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onOpenNav: () => void;
  rightAction?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  onOpenNav,
  rightAction
}) => {
  return (
    <div 
      className="lg:hidden flex h-14 shrink-0 items-center justify-between px-3 sm:px-4 bg-slate-900 border-b border-slate-800 text-white select-none z-30"
      style={{ flexShrink: 0 }}
      role="banner"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenNav}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer -ml-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          aria-label="Abrir Menu de Navegação"
          title="Abrir navegação principal"
        >
          <Menu className="w-5 h-5 text-slate-200" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold tracking-tight text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[10px] text-slate-400 font-medium truncate -mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {rightAction && (
        <div className="flex items-center gap-1.5 shrink-0">
          {rightAction}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
