import React, { useState } from 'react';

interface AccountingLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export const AccountingLogo: React.FC<AccountingLogoProps> = ({ 
  size = 24, 
  className = '',
  showGlow = false 
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-lg bg-blue-500/25 blur-sm pointer-events-none animate-pulse" 
          aria-hidden="true" 
        />
      )}

      {!imgError ? (
        <img
          src="/logo_contabilidade.png"
          alt="Contabilidade - ContaEstudo"
          className="w-full h-full object-contain rounded-md relative z-10 drop-shadow-sm"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        /* Símbolo Vetorial Oficial: Calculadora Real + Documento Contabilístico com Gráficos + Moeda AOA */
        <svg 
          viewBox="0 0 100 100" 
          width={size} 
          height={size} 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="rounded-lg shadow-xs relative z-10"
        >
          <defs>
            <linearGradient id="accBg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#1C2541" />
            </linearGradient>
            <linearGradient id="accCalc" x1="10" y1="30" x2="48" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="accDoc" x1="30" y1="12" x2="85" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="accAoa" x1="50" y1="65" x2="75" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
          </defs>

          {/* Background Squircle */}
          <rect width="100" height="100" rx="22" fill="url(#accBg)" />
          <rect x="1" y="1" width="98" height="98" rx="21" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1.5" />

          {/* Document with folded corner & charts */}
          <path d="M32 16 H68 L82 30 V80 H32 Z" fill="url(#accDoc)" />
          <path d="M68 16 V30 H82 Z" fill="#CBD5E1" />
          {/* Document lines */}
          <rect x="38" y="24" width="22" height="3" rx="1.5" fill="#3B82F6" fillOpacity="0.8" />
          <rect x="38" y="31" width="16" height="2.5" rx="1.25" fill="#94A3B8" />
          {/* Bar chart inside document */}
          <rect x="52" y="44" width="5" height="12" rx="1" fill="#3B82F6" />
          <rect x="60" y="38" width="5" height="18" rx="1" fill="#2563EB" />
          <rect x="68" y="32" width="5" height="24" rx="1" fill="#1D4ED8" />
          <line x1="48" y1="58" x2="76" y2="58" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Calculator in front left */}
          <rect x="12" y="36" width="36" height="52" rx="6" fill="url(#accCalc)" stroke="#60A5FA" strokeWidth="1" />
          {/* Calc Screen */}
          <rect x="16" y="42" width="28" height="10" rx="3" fill="#93C5FD" />
          {/* Calc Keypad buttons */}
          <rect x="16" y="56" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="23.5" y="56" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="31" y="56" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="39" y="56" width="5" height="5" rx="1.5" fill="#38BDF8" />

          <rect x="16" y="63" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="23.5" y="63" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="31" y="63" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="39" y="63" width="5" height="12" rx="1.5" fill="#38BDF8" />

          <rect x="16" y="70" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="23.5" y="70" width="5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="31" y="70" width="5" height="5" rx="1.5" fill="#60A5FA" />

          <rect x="16" y="77" width="12.5" height="5" rx="1.5" fill="#60A5FA" />
          <rect x="31" y="77" width="5" height="5" rx="1.5" fill="#60A5FA" />

          {/* Coins stack right */}
          <ellipse cx="78" cy="69" rx="10" ry="4" fill="#1E40AF" />
          <ellipse cx="78" cy="74" rx="10" ry="4" fill="#2563EB" />
          <ellipse cx="78" cy="79" rx="10" ry="4" fill="#3B82F6" />

          {/* Foreground AOA Coin */}
          <circle cx="62" cy="78" r="12" fill="url(#accAoa)" stroke="#93C5FD" strokeWidth="1.5" />
          <text x="62" y="82" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#FFFFFF" fontFamily="sans-serif">
            AOA
          </text>
        </svg>
      )}
    </div>
  );
};

export default AccountingLogo;
