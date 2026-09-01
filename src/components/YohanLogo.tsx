import React from 'react';

interface YohanLogoProps {
  size?: number | string;
  className?: string;
  showGlow?: boolean;
  animated?: boolean;
}

/**
 * Yohan AI - Símbolo Oficial da Identidade Visual
 * Letra 'Y' estilizada em fita 3D com gradiente roxo, azul e ciano, com estrela radiante no topo direito.
 * Funciona com fidelidade máxima em 16px, 24px, 32px, 48px, 64px, 128px e 256px tanto em modo claro como escuro.
 */
export const YohanLogo: React.FC<YohanLogoProps> = ({
  size = 24,
  className = '',
  showGlow = true,
  animated = false
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div 
      className={`inline-flex items-center justify-center relative shrink-0 select-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-contain ${showGlow ? 'drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)] dark:drop-shadow-[0_2px_12px_rgba(99,102,241,0.5)]' : ''} ${animated ? 'transition-transform duration-300 hover:scale-105' : ''}`}
        aria-label="Yohan AI Logo Oficial"
      >
        <defs>
          {/* Gradiente da haste esquerda (Roxo / Índigo para Azul) */}
          <linearGradient id="yh-grad-left" x1="28" y1="32" x2="52" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="45%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Gradiente da haste direita / curva superior (Ciano / Azul Elétrico) */}
          <linearGradient id="yh-grad-right" x1="68" y1="36" x2="44" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Gradiente da dobra frontal da fita 3D (Luz Ciano para Azul Profundo) */}
          <linearGradient id="yh-grad-fold" x1="42" y1="52" x2="55" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="40%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* Gradiente da base inferior (Azul Real / Índigo escuro com profundidade) */}
          <linearGradient id="yh-grad-base" x1="44" y1="55" x2="54" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="60%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Gradiente da Estrela Radiante de 4 pontas */}
          <linearGradient id="yh-grad-star" x1="64" y1="24" x2="76" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Sombra interna de oclusão para o efeito de fita sobreposta */}
          <radialGradient id="yh-shadow-occlusion" cx="46" cy="58" r="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. HASTE ESQUERDA (Braço roxo / violeta com topo arredondado) */}
        <path
          d="M 29.5 35 C 29.5 33.5 30.5 32.5 32 32.5 L 42.5 32.5 C 44 32.5 45.2 33.5 46 34.8 L 52.5 50 C 50 51.5 47 54.5 45 58 Z"
          fill="url(#yh-grad-left)"
        />

        {/* 2. BASE POSTERIOR / CAULE INFERIOR (Profundidade em sombra) */}
        <path
          d="M 45 56 L 54.5 49 L 54 68 C 54 74.5 49.5 78 44 78 C 42.5 78 42 77.2 42.2 76 C 42.5 73.5 44 68 45 56 Z"
          fill="url(#yh-grad-base)"
        />

        {/* Sombra de contacto por baixo da fita frontal */}
        <ellipse cx="48" cy="57" rx="9" ry="6" fill="url(#yh-shadow-occlusion)" />

        {/* 3. BRAÇO DIREITO E DOBRA FRONTAL 3D (Fita em gradiente azul-ciano que cruza à frente) */}
        <path
          d="M 66 36 C 64 36 62.5 37 60 40 L 44 60 C 42.8 62.5 42.5 66 43 69.5 C 43.5 73 45.5 75 48.5 74.5 C 52 74 54.5 70 55.5 65.5 L 66 41 C 67.2 39 67.5 37 66 36 Z"
          fill="url(#yh-grad-right)"
        />

        {/* 4. SOBREPOSIÇÃO SUAVE DA FITA FRONTAL (Reflexo e realce volumétrico) */}
        <path
          d="M 44 60 C 47.5 54 53.5 48 60 40 C 62.5 37 64 36 66 36 C 65.5 38 64 41 62 45 L 49.5 64 C 47.5 68 45 72 43 69.5 C 42.5 66 42.8 62.5 44 60 Z"
          fill="url(#yh-grad-fold)"
        />

        {/* 5. ESTRELA RADIANTE DE 4 PONTAS (Top-Right Sparkle) */}
        {/* Curvas bezier cúbicas para criar a ponta de brilho afiada e orgânica */}
        <path
          d="M 70 24 C 70.3 29.5 72 31.2 77.5 31.5 C 72 31.8 70.3 33.5 70 39 C 69.7 33.5 68 31.8 62.5 31.5 C 68 31.2 69.7 29.5 70 24 Z"
          fill="url(#yh-grad-star)"
        />

        {/* Ponto central luminoso da estrela */}
        <circle cx="70" cy="31.5" r="1.2" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
};

export default YohanLogo;
