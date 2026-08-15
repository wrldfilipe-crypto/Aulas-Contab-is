import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type AppThemeMode = 'light' | 'dark' | 'auto';

interface ThemeSelectorProps {
  compact?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false }) => {
  const [theme, setTheme] = useState<AppThemeMode>(() => {
    try {
      const stored = localStorage.getItem('app_theme');
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        return stored;
      }
    } catch (e) {
      console.warn("Failed reading theme from localStorage:", e);
    }
    return 'light';
  });

  const applyTheme = (mode: AppThemeMode) => {
    try {
      localStorage.setItem('app_theme', mode);
      localStorage.setItem('ga:theme', mode);
    } catch (e) {
      console.warn("Failed saving theme to localStorage:", e);
    }

    const isDark =
      mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    window.dispatchEvent(
      new CustomEvent('app_theme_changed', { detail: { theme: mode } })
    );
  };

  const handleSelectTheme = (mode: AppThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
  };

  // Sync on mount & listen to system or external events
  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };

    try {
      mediaQuery.addEventListener('change', handleSystemChange);
    } catch (e) {
      mediaQuery.addListener(handleSystemChange);
    }

    const handleCustomEvent = (e: any) => {
      if (e?.detail?.theme && e.detail.theme !== theme) {
        setTheme(e.detail.theme);
      }
    };

    window.addEventListener('app_theme_changed', handleCustomEvent);

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } catch (e) {
        mediaQuery.removeListener(handleSystemChange);
      }
      window.removeEventListener('app_theme_changed', handleCustomEvent);
    };
  }, [theme]);

  return (
    <div 
      className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
      id="header-theme-selector-bar"
      role="radiogroup"
      aria-label="Seletor de Tema do Sistema"
    >
      {/* Light Theme Button */}
      <button
        type="button"
        onClick={() => handleSelectTheme('light')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-2xs border border-slate-200/60 dark:bg-slate-700 dark:text-amber-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="Tema Claro"
        aria-checked={theme === 'light'}
        role="radio"
      >
        <Sun className="w-3.5 h-3.5" />
        {!compact && <span className="hidden lg:inline text-[11px]">Claro</span>}
      </button>

      {/* Dark Theme Button */}
      <button
        type="button"
        onClick={() => handleSelectTheme('dark')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          theme === 'dark'
            ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200/60 dark:bg-slate-700 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="Tema Escuro"
        aria-checked={theme === 'dark'}
        role="radio"
      >
        <Moon className="w-3.5 h-3.5" />
        {!compact && <span className="hidden lg:inline text-[11px]">Escuro</span>}
      </button>

      {/* Auto / System Theme Button */}
      <button
        type="button"
        onClick={() => handleSelectTheme('auto')}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
          theme === 'auto'
            ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/60 dark:bg-slate-700 dark:text-blue-400'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
        }`}
        title="Tema Automático (Acompanha o sistema)"
        aria-checked={theme === 'auto'}
        role="radio"
      >
        <Monitor className="w-3.5 h-3.5" />
        {!compact && <span className="hidden lg:inline text-[11px]">Auto</span>}
      </button>
    </div>
  );
};

export default ThemeSelector;
