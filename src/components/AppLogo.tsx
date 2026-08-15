import React from 'react';

interface AppLogoProps {
  isExpanded?: boolean;
  variant?: 'full' | 'horizontal' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  darkTheme?: boolean;
  className?: string;
  showTagline?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  isExpanded = true,
  variant,
  size = 'md',
  darkTheme = true,
  className = '',
  showTagline = true
}) => {
  // SVG Graphic Icon (Book + Ledger + Graduation Cap + Pencil)
  const renderIcon = (iconSizeClass: string = 'w-9 h-9') => (
    <div className={`relative inline-flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-1.5 shadow-md shadow-blue-900/30 ring-1 ring-white/15 ${iconSizeClass}`}>
      <svg viewBox="0 0 350 250" className="w-full h-full object-contain filter drop-shadow-xs">
        <g transform="translate(10, 10)">
          {/* Book Left Cover & Pages */}
          <path d="M 35,80 Q 115,100 180,85 L 180,220 Q 115,230 35,210 Z" fill="#1E3A8A"/>
          <path d="M 40,85 Q 115,103 175,89 L 175,215 Q 115,225 40,205 Z" fill="#2563EB"/>
          <line x1="55" y1="110" x2="155" y2="110" stroke="#93C5FD" strokeWidth="3" opacity="0.8"/>
          <line x1="55" y1="130" x2="155" y2="130" stroke="#93C5FD" strokeWidth="3" opacity="0.8"/>
          <line x1="55" y1="150" x2="140" y2="150" stroke="#93C5FD" strokeWidth="3" opacity="0.8"/>
          
          {/* Spine & Right Cover */}
          <path d="M 175,85 Q 180,84 185,85 L 185,220 Q 180,219 175,220 Z" fill="#1D4ED8"/>
          <path d="M 185,85 Q 250,103 325,85 L 325,205 Q 250,225 185,215 Z" fill="#3B82F6"/>
          <path d="M 185,88 Q 250,105 320,89 L 320,202 Q 250,222 185,212 Z" fill="#2563EB"/>
          
          {/* Ledger Table */}
          <text x="195" y="108" fill="#E2E8F0" fontSize="13" fontWeight="bold" fontFamily="monospace">D C</text>
          <line x1="192" y1="114" x2="310" y2="114" stroke="#60A5FA" strokeWidth="1.5"/>
          <line x1="222" y1="100" x2="222" y2="192" stroke="#60A5FA" strokeWidth="1.5"/>
          <text x="195" y="130" fill="#E2E8F0" fontSize="12" fontFamily="monospace">1.200</text>
          <text x="238" y="130" fill="#E2E8F0" fontSize="12" fontFamily="monospace">1.200</text>
          <text x="195" y="150" fill="#E2E8F0" fontSize="12" fontFamily="monospace">3.400</text>
          <text x="238" y="150" fill="#E2E8F0" fontSize="12" fontFamily="monospace">3.400</text>
          <rect x="193" y="165" width="115" height="18" fill="#1E3A8A" rx="4" opacity="0.9"/>
          <text x="195" y="178" fill="#FACC15" fontSize="13" fontWeight="bold" fontFamily="monospace">5.450 5.450</text>
          
          {/* Graduation Cap */}
          <g transform="translate(85, 30)">
            <path d="M 20,40 Q 60,52 100,40 L 100,52 Q 60,64 20,52 Z" fill="#0F172A"/>
            <polygon points="60,15 115,35 60,50 5,35" fill="#1E293B"/>
            <circle cx="60" cy="33" r="3.5" fill="#F59E0B"/>
            <path d="M 60,33 Q 80,40 85,55" fill="none" stroke="#F59E0B" strokeWidth="2.5"/>
          </g>
          
          {/* Pencil */}
          <g transform="translate(260, 40) rotate(25)">
            <polygon points="12,0 15,8 24,9 17,15 19,24 12,19 5,24 7,15 0,9 9,8" fill="#F59E0B"/>
            <rect x="8" y="36" width="8" height="65" fill="#D97706"/>
            <polygon points="8,101 16,101 12,118" fill="#FED7AA"/>
          </g>
        </g>
      </svg>
    </div>
  );

  // Collapsed Sidebar View (Only Icon Centered)
  if (!isExpanded || variant === 'icon') {
    return (
      <div className={`flex items-center justify-center shrink-0 w-full transition-all duration-300 ${className}`} title="Global Account — Contabilidade Unificada">
        {renderIcon('w-10 h-10 hover:scale-105 transition-transform')}
      </div>
    );
  }

  // Expanded Sidebar View (Icon + Full Clear "Global Account" Title + Subtitle)
  return (
    <div className={`flex items-center gap-3 shrink-0 min-w-0 max-w-full overflow-hidden transition-all duration-300 ${className}`}>
      {renderIcon('w-11 h-11')}
      
      <div className="flex flex-col min-w-0 leading-tight">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-lg font-black tracking-tight text-white font-sans drop-shadow-xs select-none">
            Global<span className="text-blue-400 font-extrabold ml-1">Account</span>
          </span>
          <span className="px-1.5 py-0.5 bg-blue-500/25 text-blue-300 text-[9px] font-black rounded-md border border-blue-400/40 uppercase tracking-widest shrink-0">
            PRO
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase truncate mt-0.5 select-none">
            Contabilidade Unificada
          </span>
        )}
      </div>
    </div>
  );
};

export default AppLogo;

