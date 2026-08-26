import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { motion } from 'motion/react';
import ThemeCustomizationDrawer from './ThemeCustomizationDrawer';

interface ThemeCustomizerFloatingButtonProps {
  className?: string;
  userId?: string;
}

export const ThemeCustomizerFloatingButton: React.FC<ThemeCustomizerFloatingButtonProps> = ({
  className = '',
  userId
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 
        Positioning:
        - Mobile (<640px): fixed bottom: 24px; right: 16px; width: 40px; height: 40px; font-size: 16px;
        - Tablet (640px - 1024px): fixed bottom: 24px; right: 20px; width: 44px; height: 44px;
        - Desktop (>1024px): fixed bottom: 24px; right: 24px; width: 48px; height: 48px;
        - z-index: 100 (below topbar and sidebar navigation which have z-index 200+)
      */}
      <div 
        className={`fixed bottom-[24px] right-[16px] sm:bottom-[24px] sm:right-[20px] lg:bottom-[24px] lg:right-[24px] flex items-center group select-none pointer-events-auto ${className}`}
        style={{ zIndex: 100 }}
        id="theme-customizer-floating-container"
      >
        {/* Tooltip on hover for desktop */}
        <div 
          role="tooltip"
          className="mr-3 hidden lg:group-hover:flex items-center px-3 py-1.5 rounded-xl bg-[#0A1628]/95 border border-white/15 text-white text-xs font-semibold shadow-2xl backdrop-blur-md whitespace-nowrap pointer-events-none transition-all duration-200"
        >
          <span>Personalizar Tema & Fundo 🎨</span>
        </div>

        {/* Floating Button */}
        <motion.button
          type="button"
          id="btn-open-theme-customizer"
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="w-[40px] h-[40px] text-[16px] sm:w-[44px] sm:h-[44px] sm:text-[18px] lg:w-[48px] lg:h-[48px] lg:text-[20px] rounded-2xl bg-gradient-to-br from-[#4A90E2] via-[#6366F1] to-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/25 backdrop-blur-md cursor-pointer hover:shadow-blue-500/50 transition-shadow focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Abrir painel de personalização visual e temas"
          title="Personalizar Tema & Fundo"
        >
          <Palette className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm transition-transform group-hover:rotate-12" />
        </motion.button>
      </div>

      {/* Drawer / Bottom Sheet */}
      <ThemeCustomizationDrawer 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
};

export default ThemeCustomizerFloatingButton;
