import React from 'react';

interface AppLogoProps {
  isExpanded?: boolean;
  variant?: 'full' | 'horizontal' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  darkTheme?: boolean;
  className?: string;
  showTagline?: boolean;
}

const logoSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-11 w-11',
  xl: 'h-14 w-14',
};

export const AppLogo: React.FC<AppLogoProps> = ({
  isExpanded = true,
  variant,
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const iconOnly = !isExpanded || variant === 'icon';
  const sizeClass = logoSizes[size] || logoSizes.md;

  const LogoIcon = (
    <div
      className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-md shadow-blue-900/30 ring-1 ring-white/20 select-none`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-4/5 h-4/5 text-white"
      >
        {/* Modern stylized ledger book & AI chevron mark */}
        <rect x="5" y="6" width="26" height="24" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="22" x2="17" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Glowing AI spark mark */}
        <path d="M25 20L26 23L29 24L26 25L25 28L24 25L21 24L24 23L25 20Z" fill="#38BDF8" />
        <circle cx="9" cy="12" r="1" fill="#38BDF8" />
        <circle cx="9" cy="17" r="1" fill="#38BDF8" />
        <circle cx="9" cy="22" r="1" fill="#38BDF8" />
      </svg>
    </div>
  );

  if (iconOnly) {
    return (
      <div
        className={`flex w-full shrink-0 items-center justify-center transition-all duration-300 ${className}`}
        title="ContaEstudo — Contabilidade, Aprenda, Evolua"
        aria-label="ContaEstudo"
      >
        {LogoIcon}
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 max-w-full shrink-0 items-center gap-3 overflow-hidden transition-all duration-300 ${className}`}
      title="ContaEstudo — Contabilidade, Aprenda, Evolua"
    >
      {LogoIcon}
      <div className="flex min-w-0 flex-col leading-tight">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-lg font-black tracking-tight text-white drop-shadow-sm select-none">
            Conta<span className="ml-0.5 bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">Estudo</span>
          </span>
          <span className="shrink-0 rounded-md border border-cyan-400/40 bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-200">
            PRO
          </span>
        </div>
        {showTagline && (
          <span className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            Contabilidade • Aprenda • Evolua
          </span>
        )}
      </div>
    </div>
  );
};

export default AppLogo;

