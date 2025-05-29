import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { translations, DEFAULT_LOCALE, Locale, Translations, createTranslateFunction } from './i18n';

type TranslateFunction = (key: string, interpolations?: Record<string, string | number | undefined>) => string;

interface LocalizationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFunction;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('appLocale') as Locale | null;
      if (storedLocale && translations[storedLocale]) {
        return storedLocale;
      }
      // Fallback to browser language if supported, then default
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (translations[browserLang]) {
        return browserLang;
      }
    }
    return DEFAULT_LOCALE;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appLocale', locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useMemo(() => {
    return createTranslateFunction(locale, translations[locale]);
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
    } else {
      console.warn(`Locale "${newLocale}" is not supported. Falling back to default.`);
      setLocaleState(DEFAULT_LOCALE);
    }
  };

  return (
    <LocalizationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
