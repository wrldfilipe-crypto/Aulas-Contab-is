import { useState, useEffect, useCallback } from 'react';
import { i18n } from '../translations';

export type SupportedLanguage = 'pt-BR' | 'pt-PT' | 'en' | 'fr' | 'de' | 'ru' | 'es';

export function useI18n() {
  const [currentLang, setCurrentLang] = useState<string>(i18n.currentLang || 'pt-PT');

  useEffect(() => {
    const handleLanguageChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang: string }>;
      if (customEvent.detail?.lang) {
        setCurrentLang(customEvent.detail.lang);
      } else if (i18n.currentLang) {
        setCurrentLang(i18n.currentLang);
      }
    };

    document.addEventListener('languageChanged', handleLanguageChanged);
    return () => {
      document.removeEventListener('languageChanged', handleLanguageChanged);
    };
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    return i18n.t(key, replacements);
  }, []);

  const setLanguage = useCallback((langCode: string) => {
    i18n.setLanguage(langCode);
    setCurrentLang(langCode);
  }, []);

  return {
    t,
    currentLang,
    setLanguage,
    i18n,
  };
}

export default useI18n;
