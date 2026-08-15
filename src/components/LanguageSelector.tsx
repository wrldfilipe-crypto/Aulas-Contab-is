import React, { useState, useRef, useEffect } from 'react';
import { i18n } from '../translations';
import { Globe } from 'lucide-react';
import { getCurrentUser } from '../lib/db';
import { salvarPreferencias } from '../lib/firebase';

export const languageOptions = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', label: 'Português (Portugal)', flag: '🇵🇹' },
  { code: 'en',    label: 'English',              flag: '🇺🇸' },
  { code: 'fr',    label: 'Français',              flag: '🇫🇷' },
  { code: 'de',    label: 'Deutsch',               flag: '🇩🇪' },
  { code: 'ru',    label: 'Русский',               flag: '🇷🇺' },
  { code: 'es',    label: 'Español',               flag: '🇪🇸' },
];

interface LanguageSelectorProps {
  className?: string;
  isTopbar?: boolean;
}

export default function LanguageSelector({ className = '', isTopbar = false }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentLangCode, setCurrentLangCode] = useState(() => i18n.currentLang || 'pt-PT');

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.lang) {
        setCurrentLangCode(customEvent.detail.lang);
      }
    };
    document.addEventListener('languageChanged', handleLangChange);
    return () => {
      document.removeEventListener('languageChanged', handleLangChange);
    };
  }, []);

  const currentLang = languageOptions.find(o => o.code === currentLangCode)
    || languageOptions.find(o => o.code.toLowerCase() === currentLangCode.toLowerCase())
    || (currentLangCode.startsWith('pt') ? languageOptions.find(o => o.code === 'pt-PT') : null)
    || languageOptions[1]
    || languageOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (code: string) => {
    i18n.setLanguage(code);
    const user = getCurrentUser();
    if (user?.userId) {
      salvarPreferencias(user.userId, { language: code }).catch(() => {});
    }
    setIsOpen(false);
  };

  if (isTopbar) {
    return (
      <div className={`relative ${className}`} ref={dropdownRef} id="topbar-language-selector">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10"
        >
          <span>{currentLang.flag}</span>
          <span className="uppercase">{currentLang.code}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50 animate-fade-in">
            <div className="px-3.5 py-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Select Language</span>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {languageOptions.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => handleSelect(opt.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-xs text-left transition-colors ${
                    opt.code === currentLangCode
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm shrink-0">{opt.flag}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Onboarding Style / Full Select style
  return (
    <div className={`relative ${className}`} ref={dropdownRef} id="onboarding-language-selector">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{currentLang.flag}</span>
          <span>{currentLang.label}</span>
        </div>
        <Globe className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-fade-in max-h-60 overflow-y-auto">
          {languageOptions.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                opt.code === currentLangCode
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-base shrink-0">{opt.flag}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
