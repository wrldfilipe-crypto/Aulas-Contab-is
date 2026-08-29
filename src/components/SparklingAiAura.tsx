import React from 'react';
import { Sparkles } from 'lucide-react';

interface SparklingAiAuraProps {
  isActive: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const SparklingAiAura: React.FC<SparklingAiAuraProps> = ({
  isActive,
  className = '',
  size = 'md',
  label
}) => {
  if (!isActive) return null;

  return (
    <div
      className={`relative inline-flex items-center justify-center pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* Outer Radiating Pulse Wave Ring 1 */}
      <div className="absolute inset-0 -m-1.5 rounded-2xl bg-indigo-500/30 animate-ping opacity-75 duration-1000" />

      {/* Outer Radiating Pulse Wave Ring 2 */}
      <div className="absolute inset-0 -m-3 rounded-2xl bg-purple-500/20 animate-pulse duration-700" />

      {/* Multi-layered Particle Sparks */}
      <div className="absolute -top-2.5 -right-2 text-amber-300 animate-bounce text-xs transition-transform duration-300">
        ✨
      </div>
      <div className="absolute -bottom-2 -left-2 text-indigo-300 animate-pulse text-[10px] duration-500">
        ✦
      </div>
      <div className="absolute -top-1.5 -left-2 text-pink-300 animate-pulse text-[11px] duration-700 delay-150">
        ★
      </div>
      <div className="absolute -bottom-2 -right-1 text-cyan-300 animate-bounce text-[10px] duration-600 delay-100">
        ✧
      </div>

      {/* Center Ambient Glowing Core */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 blur-xs animate-pulse" />

      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
};

export default SparklingAiAura;
